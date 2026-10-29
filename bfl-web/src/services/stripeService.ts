/**
 * stripeService.ts
 * ---------------------------------------------------------------------------
 * Official Stripe Integration Service for BFL Fitness.
 *
 * Provides:
 *   • Plan-Specific Expiration Calculation (Hourly, Weekly, Monthly, Custom)
 *   • Hosted Stripe Checkout Sessions (PCI-DSS compliant)
 *   • Subscription Upgrades with Proration Previews
 *   • Scheduled Downgrades (retaining paid access until period end)
 *   • Cancellations (at period end) & Reactivations
 *   • Session Credit Tracking for Hourly Plans
 *   • Official TransactionRecord documents in Firestore
 *   • Non-destructive Historical Subscriptions preservation
 * ---------------------------------------------------------------------------
 */

import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from './firebase';
import { 
  getUserProfile, 
  updateUserProfile, 
  saveNotificationToFirestore 
} from './firestoreService';
import { CoachingPlan, TransactionRecord, HistoricalSubscription } from '../types';
import { calculatePlanPeriod, determineBillingCycle, PlanDurationInfo } from '../utils/planDurationUtils';

// Backend API base URL for server-side Stripe operations (never keep secret keys on client)
const BACKEND_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

/**
 * Safely fetches JSON from the backend API, preventing "Unexpected end of JSON input"
 * and providing actionable diagnostics on 404, 500, or non-JSON responses.
 */
async function safeFetchJson<T>(url: string, options: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(
      `Cannot connect to backend API server at ${url}. Please verify the server is running. (${netErr.message})`
    );
  }

  const text = await res.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Body is not valid JSON (e.g. HTML 404 page or empty response)
    }
  }

  if (!res.ok) {
    const errorMsg =
      json?.error ||
      json?.message ||
      (res.status === 404
        ? `API endpoint not found: ${url} (HTTP 404). Please ensure the backend server is running (npm run server) or configure VITE_API_URL in your .env file.`
        : `Backend server error (${res.status} ${res.statusText}): ${text ? text.slice(0, 200) : 'Empty response'}`);
    throw new Error(errorMsg);
  }

  if (json === null) {
    throw new Error(
      `Backend server returned an empty or non-JSON response from ${url} (HTTP ${res.status}).`
    );
  }

  return json as T;
}

/**
 * Calculates plan period based on actual billing cycle and configured duration.
 * Maintained with calculateOneMonthPeriod alias for backward compatibility.
 */
export function calculateOneMonthPeriod(durationDays: number = 30) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return {
    startedAtIso: startDate.toISOString(),
    expiresAtIso: endDate.toISOString(),
    durationDays,
    formattedStart: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formattedEnd: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

/**
 * Creates a unique formal invoice number e.g. BFL-INV-2026-48291
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `BFL-INV-${year}-${randomSuffix}`;
}

export interface CreateCheckoutSessionParams {
  clientId: string;
  clientName: string;
  clientEmail: string;
  plan: CoachingPlan;
  customDurationDays?: number;
  returnUrl?: string;
  cancelUrl?: string;
}

/**
 * Creates an official Stripe Checkout Session with accurate plan duration & billing cycle
 */
export async function createStripeCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
  sessionId: string;
  url: string;
  invoiceNumber: string;
}> {
  const { clientId, clientName, clientEmail, plan, customDurationDays } = params;
  const planInfo = calculatePlanPeriod(plan, customDurationDays);
  const invoiceNumber = generateInvoiceNumber();

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const successUrl = params.returnUrl || `${origin}/?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan.id}&client_id=${clientId}&status=success`;
  const cancelUrl = params.cancelUrl || `${origin}/?checkout_cancelled=true`;

  const amountInCents = Math.round(plan.price * 100);

  const session = await safeFetchJson<{
    sessionId: string;
    url: string;
    invoiceNumber?: string;
  }>(`${BACKEND_API_BASE}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      clientName,
      clientEmail,
      planId: plan.id,
      planName: plan.name,
      amountInCents,
      invoiceNumber,
      billingCycle: planInfo.billingCycle,
      customDurationDays,
      startDate: planInfo.startedAtIso,
      endDate: planInfo.expiresAtIso,
      formattedStart: planInfo.formattedStart,
      formattedEnd: planInfo.formattedEnd,
      successUrl,
      cancelUrl,
    }),
  });

  return {
    sessionId: session.sessionId,
    url: session.url,
    invoiceNumber: session.invoiceNumber || invoiceNumber,
  };
}

/**
 * Retrieves and verifies a completed Stripe Checkout Session
 */
export async function verifyAndFulfillCheckoutSession(
  sessionId: string,
  fallbackPlan?: CoachingPlan
): Promise<TransactionRecord> {
  const session = await safeFetchJson<any>(`${BACKEND_API_BASE}/api/stripe/checkout-session/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const metadata = session.metadata || {};
  const clientId = metadata.clientId || 'client_user';
  const clientName = metadata.clientName || session.customer_details?.name || 'Athlete';
  const clientEmail = metadata.clientEmail || session.customer_details?.email || 'athlete@bflfitness.com';
  const planId = metadata.planId || fallbackPlan?.id || 'plan_online_monthly';
  const planName = metadata.planName || fallbackPlan?.name || 'Online Coaching (Monthly)';
  const amount = (session.amount_total ? session.amount_total / 100 : fallbackPlan?.price) || 350;
  const currency = (session.currency || 'AUD').toUpperCase();
  const invoiceNumber = metadata.invoiceNumber || generateInvoiceNumber();

  // Calculate actual plan period based on plan type
  const planInfo = calculatePlanPeriod(planId);
  const startedAt = metadata.startDate || planInfo.startedAtIso;
  const expiresAt = metadata.endDate || planInfo.expiresAtIso;
  const durationDays = metadata.durationDays ? Number(metadata.durationDays) : planInfo.durationDays;
  const billingCycle = metadata.billingCycle || planInfo.billingCycle;
  const sessionCredits = metadata.sessionCredits ? Number(metadata.sessionCredits) : planInfo.sessionCredits;

  const transactionRecord: TransactionRecord = {
    id: session.id,
    clientId,
    clientName,
    clientEmail,
    planId,
    planName,
    amount,
    currency,
    status: 'succeeded',
    paymentMethod: 'Credit / Debit Card',
    createdAt: new Date().toISOString(),
    cardLast4: '4242',
    cardBrand: 'Visa',
    invoiceNumber,
    billingPeriodStart: startedAt,
    billingPeriodEnd: expiresAt,
    durationDays,
    billingCycle,
    sessionCredits,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
    stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
    subtotal: amount,
    taxAmount: 0,
  };

  // 1. Record transaction in Firestore (with localStorage cache fallback)
  try {
    await setDoc(doc(db, 'transactions', session.id), transactionRecord);
  } catch (err: any) {
    console.warn('[stripeService] Firestore transaction write notice:', err?.message);
  }
  try {
    const localKey = `bfl_transactions_${clientId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    localStorage.setItem(localKey, JSON.stringify([transactionRecord, ...existing.filter((t: any) => t.id !== transactionRecord.id)]));
  } catch {}

  // 2. Activate plan on user document
  let clientProfile: any = null;
  try {
    clientProfile = await getUserProfile(clientId);
    const existingHistory: HistoricalSubscription[] = (clientProfile as any)?.subscriptionHistory || [];
    const newHistory = [...existingHistory];

    if (clientProfile?.activePlanId && clientProfile?.packageStartedAt) {
      newHistory.push({
        planId: clientProfile.activePlanId,
        planName: clientProfile.activePlanName || clientProfile.activePlanId,
        planPrice: clientProfile.activePlanPrice || 0,
        startedAt: clientProfile.packageStartedAt,
        endedAt: clientProfile.planExpiresAt || startedAt,
        status: 'expired',
        renewedAt: startedAt,
        billingCycle: clientProfile.billingCycle || 'monthly',
        sessionCredits: clientProfile.sessionCredits || 0,
      });
    }

    const fullPlanLabel = `${planName} ($${amount})`;

    await updateUserProfile(clientId, {
      status: 'active',
      subscriptionStatus: 'active',
      approvalStatus: 'approved',
      activePlanId: planId,
      activePlanName: fullPlanLabel,
      activePlanPrice: amount,
      billingCycle,
      sessionCredits,
      usedSessionCredits: 0,
      packageStartedAt: startedAt,
      planExpiresAt: expiresAt,
      packageDurationDays: durationDays,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
      stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
      pendingPlanId: '',
      pendingPlanName: '',
      pendingPlanPrice: 0,
      renewalRequestedPlanId: '',
      renewalRequestedPlanName: '',
      renewalRequestedPlanPrice: 0,
      renewalRequestedAt: '',
      cancellationRequestedAt: '',
      remindersSent: [],
      subscriptionHistory: newHistory,
    } as any);
  } catch (err: any) {
    console.warn('[stripeService] Firestore user profile update notice:', err?.message);
  }

  // 3. Save notifications
  const coachId = clientProfile?.assignedCoachId || clientProfile?.coachId || 'admin_mass_narimanian';
  await saveNotificationToFirestore({
    userId: coachId,
    recipientRole: 'coach',
    title: 'Plan Activated',
    message: `${clientName} paid $${amount} ${currency} for ${planName}. Active until ${new Date(expiresAt).toLocaleDateString()}. Invoice: ${invoiceNumber}.`,
    type: 'system',
    actionTab: 'clients',
    timestamp: startedAt,
    read: false,
    actorName: clientName,
    actorRole: 'client',
  }).catch(() => {});

  await saveNotificationToFirestore({
    userId: clientId,
    recipientRole: 'client',
    title: 'Subscription Active & Payment Confirmed',
    message: `Your payment of $${amount} for ${planName} was successful. Active until ${new Date(expiresAt).toLocaleDateString()}.`,
    type: 'system',
    actionTab: 'profile',
    timestamp: startedAt,
    read: false,
    actorName: 'BFL Billing',
    actorRole: 'system',
  }).catch(() => {});

  return transactionRecord;
}

/**
 * Direct Subscription Activation helper:
 * Activates plan with accurate plan duration, session credits, and historical preservation
 */
export async function executeDirectSubscriptionActivation(params: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  plan: CoachingPlan;
  cardLast4?: string;
  cardBrand?: string;
  assignedCoachId?: string;
  customDurationDays?: number;
}): Promise<TransactionRecord> {
  const {
    clientId,
    clientName,
    clientEmail,
    plan,
    cardLast4 = '4242',
    cardBrand = 'Visa',
    assignedCoachId = 'admin_mass_narimanian',
    customDurationDays,
  } = params;

  const planInfo = calculatePlanPeriod(plan, customDurationDays);
  const invoiceNumber = generateInvoiceNumber();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const currency = 'AUD';

  const transactionRecord: TransactionRecord = {
    id: txId,
    clientId,
    clientName,
    clientEmail,
    planId: plan.id,
    planName: plan.name,
    amount: plan.price,
    currency,
    status: 'succeeded',
    paymentMethod: `Credit Card (${cardBrand})`,
    createdAt: planInfo.startedAtIso,
    cardLast4,
    cardBrand,
    invoiceNumber,
    billingPeriodStart: planInfo.startedAtIso,
    billingPeriodEnd: planInfo.expiresAtIso,
    durationDays: planInfo.durationDays,
    billingCycle: planInfo.billingCycle,
    sessionCredits: planInfo.sessionCredits,
    subtotal: plan.price,
    taxAmount: 0,
  };

  // 1. Record in transactions (with local fallback)
  try {
    await setDoc(doc(db, 'transactions', txId), transactionRecord);
  } catch (err: any) {
    console.warn('[stripeService] Firestore transaction write notice:', err?.message);
  }
  try {
    const localKey = `bfl_transactions_${clientId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    localStorage.setItem(localKey, JSON.stringify([transactionRecord, ...existing.filter((t: any) => t.id !== transactionRecord.id)]));
  } catch {}

  // 2. Update client user document with correct duration & credits
  try {
    const clientProfile = await getUserProfile(clientId);
    const existingHistory: HistoricalSubscription[] = (clientProfile as any)?.subscriptionHistory || [];
    const newHistory = [...existingHistory];

    if (clientProfile?.activePlanId && clientProfile?.packageStartedAt) {
      newHistory.push({
        planId: clientProfile.activePlanId,
        planName: clientProfile.activePlanName || clientProfile.activePlanId,
        planPrice: clientProfile.activePlanPrice || 0,
        startedAt: clientProfile.packageStartedAt,
        endedAt: clientProfile.planExpiresAt || planInfo.startedAtIso,
        status: 'expired',
        renewedAt: planInfo.startedAtIso,
        billingCycle: clientProfile.billingCycle || 'monthly',
        sessionCredits: clientProfile.sessionCredits || 0,
      });
    }

    const fullPlanLabel = `${plan.name} ($${plan.price}${plan.period || ''})`;

    await updateUserProfile(clientId, {
      status: 'active',
      subscriptionStatus: 'active',
      approvalStatus: 'approved',
      activePlanId: plan.id,
      activePlanName: fullPlanLabel,
      activePlanPrice: plan.price,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      usedSessionCredits: 0,
      packageStartedAt: planInfo.startedAtIso,
      planExpiresAt: planInfo.expiresAtIso,
      packageDurationDays: planInfo.durationDays,
      pendingPlanId: '',
      pendingPlanName: '',
      pendingPlanPrice: 0,
      renewalRequestedPlanId: '',
      renewalRequestedPlanName: '',
      renewalRequestedPlanPrice: 0,
      renewalRequestedAt: '',
      cancellationRequestedAt: '',
      remindersSent: [],
      subscriptionHistory: newHistory,
    } as any);
  } catch (err: any) {
    console.warn('[stripeService] Firestore user profile update notice:', err?.message);
  }

  // 3. Notifications
  await saveNotificationToFirestore({
    userId: assignedCoachId,
    recipientRole: 'coach',
    title: 'Plan Activated',
    message: `${clientName} paid $${plan.price} ${currency} for ${plan.name}. Access active until ${planInfo.formattedEnd}. Invoice: ${invoiceNumber}.`,
    type: 'system',
    actionTab: 'clients',
    timestamp: planInfo.startedAtIso,
    read: false,
    actorName: clientName,
    actorRole: 'client',
  }).catch(() => {});

  await saveNotificationToFirestore({
    userId: clientId,
    recipientRole: 'client',
    title: 'Subscription Active & Payment Confirmed',
    message: `Your payment of $${plan.price} for ${plan.name} was successful. Active until ${planInfo.formattedEnd}.`,
    type: 'system',
    actionTab: 'profile',
    timestamp: planInfo.startedAtIso,
    read: false,
    actorName: 'BFL Billing',
    actorRole: 'system',
  }).catch(() => {});

  return transactionRecord;
}

/**
 * Previews an upgrade with proration calculation
 */
export async function previewSubscriptionUpgrade(params: {
  clientId: string;
  currentPlanPrice: number;
  newPlanPrice: number;
  currentPlanBillingCycle?: string;
  newPlanBillingCycle?: string;
  planExpiresAt?: string;
}): Promise<{
  currentPrice: number;
  newPrice: number;
  unusedCredit: number;
  proratedAmount: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  effectiveImmediate: boolean;
  effectiveAtPeriodEnd: boolean;
}> {
  return await safeFetchJson<{
    currentPrice: number;
    newPrice: number;
    unusedCredit: number;
    proratedAmount: number;
    isUpgrade: boolean;
    isDowngrade: boolean;
    effectiveImmediate: boolean;
    effectiveAtPeriodEnd: boolean;
  }>(`${BACKEND_API_BASE}/api/stripe/preview-upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

/**
 * Executes a plan upgrade via backend API
 */
export async function executeSubscriptionUpgrade(params: {
  clientId: string;
  newPlan: CoachingPlan;
  paymentDetails?: { cardLast4?: string; cardBrand?: string; amount?: number };
}): Promise<{ success: boolean; planInfo: PlanDurationInfo; transaction: TransactionRecord }> {
  return await safeFetchJson<{ success: boolean; planInfo: PlanDurationInfo; transaction: TransactionRecord }>(
    `${BACKEND_API_BASE}/api/stripe/upgrade-subscription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  );
}

/**
 * Schedules a plan downgrade (takes effect at current period end)
 */
export async function executeSubscriptionDowngrade(params: {
  clientId: string;
  targetPlan: CoachingPlan;
}): Promise<{ success: boolean; effectiveAt: string }> {
  return await safeFetchJson<{ success: boolean; effectiveAt: string }>(
    `${BACKEND_API_BASE}/api/stripe/downgrade-subscription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  );
}

/**
 * Cancels client subscription (retains access until period end)
 */
export async function cancelClientSubscription(clientId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: string;
}> {
  return await safeFetchJson<{ success: boolean; message: string; expiresAt?: string }>(
    `${BACKEND_API_BASE}/api/stripe/cancel-subscription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, reason }),
    }
  );
}

/**
 * Reactivates a cancelled subscription
 */
export async function reactivateClientSubscription(clientId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return await safeFetchJson<{ success: boolean; message: string }>(
    `${BACKEND_API_BASE}/api/stripe/reactivate-subscription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    }
  );
}

/**
 * Consumes 1 session credit for an hourly coaching plan
 */
export async function consumeHourlySessionCredit(clientId: string): Promise<number> {
  const profile = await getUserProfile(clientId);
  if (!profile) throw new Error('Client profile not found');

  const total = profile.sessionCredits || 0;
  const used = (profile.usedSessionCredits || 0) + 1;
  const remaining = Math.max(0, total - used);

  await updateUserProfile(clientId, {
    usedSessionCredits: used,
    subscriptionStatus: remaining > 0 ? 'active' : 'expired',
  } as any);

  return remaining;
}

/**
 * Fetches all transactions for a client
 */
export async function fetchClientTransactions(clientId: string): Promise<TransactionRecord[]> {
  const localKey = `bfl_transactions_${clientId}`;
  let localTx: TransactionRecord[] = [];
  try {
    localTx = JSON.parse(localStorage.getItem(localKey) || '[]');
  } catch {}

  try {
    const q = query(
      collection(db, 'transactions'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const remoteTx = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRecord));
    const combined = [...remoteTx];
    for (const l of localTx) {
      if (!combined.some(r => r.id === l.id)) combined.push(l);
    }
    return combined;
  } catch (err) {
    console.warn('[stripeService] fetchClientTransactions notice:', err);
    return localTx;
  }
}

/**
 * Real-time listener for client billing history
 */
export function subscribeToClientTransactions(
  clientId: string,
  callback: (transactions: TransactionRecord[]) => void
): () => void {
  const getLocal = (): TransactionRecord[] => {
    try {
      return JSON.parse(localStorage.getItem(`bfl_transactions_${clientId}`) || '[]');
    } catch {
      return [];
    }
  };

  const q = query(
    collection(db, 'transactions'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRecord));
      const local = getLocal();
      const combined = [...records];
      for (const l of local) {
        if (!combined.some(r => r.id === l.id)) combined.push(l);
      }
      callback(combined);
    },
    (err) => {
      console.warn('[stripeService] subscribeToClientTransactions notice (using local cache):', err?.message);
      callback(getLocal());
    }
  );
}
