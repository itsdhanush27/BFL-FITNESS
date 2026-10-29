import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { db } from './src/services/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import {
  calculatePlanPeriod,
  determineBillingCycle,
  evaluateDueReminders,
  addOneCalendarMonth,
  PlanLike
} from './src/utils/planDurationUtils';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!STRIPE_KEY) {
  console.warn('[StripeServer] WARNING: STRIPE_SECRET_KEY is not set. Stripe endpoints will not function until configured.');
}

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, {
      apiVersion: '2025-02-24.acacia' as any,
    })
  : (null as any);

// Capture raw body for Stripe webhook signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Standard JSON parser for all other routes
app.use(express.json());

// CORS for local development / Expo mobile access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to sanitize payload for Firestore (removes undefined)
function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ─── Health / Status ────────────────────────────────────────────────────────
app.get('/api/stripe/status', async (_req, res) => {
  if (!stripe) {
    return res.status(503).json({ status: 'unconfigured', message: 'Stripe secret key not configured on server' });
  }
  try {
    const balance = await stripe.balance.retrieve();
    res.json({
      status: 'online',
      livemode: balance.livemode,
      currency: balance.available[0]?.currency || 'aud',
      webhookConfigured: Boolean(STRIPE_WEBHOOK_SECRET),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Create Checkout Session ────────────────────────────────────────────────
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in server environment variables.' });
  }

  try {
    const {
      clientId,
      clientName,
      clientEmail,
      planId: rawPlanId,
      planName: rawPlanName,
      amountInCents: rawAmountInCents,
      plan,
      invoiceNumber,
      billingCycle: requestedCycle,
      customDurationDays,
      successUrl,
      cancelUrl,
    } = req.body;

    const planId = rawPlanId || plan?.id || 'custom_programming';
    const planName = rawPlanName || plan?.name || 'Custom Programming';
    const amountInCents = rawAmountInCents || (plan?.price ? Math.round(plan.price * 100) : 0);

    if (!amountInCents || !planName) {
      return res.status(400).json({ error: 'Missing required plan or amount information' });
    }

    // Determine plan-specific duration and session credits
    const planInfo = calculatePlanPeriod(
      { id: planId, name: planName, billingCycle: requestedCycle, customDurationDays },
      customDurationDays
    );

    const periodDescription = planInfo.isHourlySession
      ? `1-on-1 Coaching Session (1 Session Credit • Valid until ${planInfo.formattedEnd})`
      : planInfo.billingCycle === 'weekly'
      ? `Weekly Coaching Program (7 Days • ${planInfo.formattedStart} to ${planInfo.formattedEnd})`
      : `Monthly Coaching Program (${planInfo.formattedStart} to ${planInfo.formattedEnd})`;

    const origin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : 'http://localhost:3000');
    const finalSuccessUrl = successUrl || `${origin}/?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&client_id=${clientId || ''}&status=success`;
    const finalCancelUrl = cancelUrl || `${origin}/?checkout_cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: clientEmail || undefined,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `BFL Fitness - ${planName}`,
              description: periodDescription,
            },
            unit_amount: Math.round(amountInCents),
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: clientId || '',
        clientName: clientName || '',
        clientEmail: clientEmail || '',
        planId: planId || '',
        planName: planName || '',
        billingCycle: planInfo.billingCycle,
        durationDays: String(planInfo.durationDays),
        sessionCredits: String(planInfo.sessionCredits),
        invoiceNumber: invoiceNumber || '',
        startDate: planInfo.startedAtIso,
        endDate: planInfo.expiresAtIso,
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      invoiceNumber,
      durationDays: planInfo.durationDays,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      startDate: planInfo.startedAtIso,
      endDate: planInfo.expiresAtIso,
    });
  } catch (err: any) {
    console.error('[StripeServer] Create checkout session error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initialize checkout session' });
  }
});

// ─── Verify Checkout Session ────────────────────────────────────────────────
app.get('/api/stripe/checkout-session/:sessionId', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server.' });
  }

  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (err: any) {
    console.error('[StripeServer] Verify checkout session error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to verify checkout session' });
  }
});

// ─── Direct Charge ──────────────────────────────────────────────────────────
app.post('/api/stripe/charge', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in server environment variables.' });
  }
  try {
    const { amount, currency = 'aud', description, token, card, metadata } = req.body;
    
    if (!amount || (!token && !card)) {
      return res.status(400).json({ error: 'Missing amount or payment source (token or card)' });
    }

    let source = token;
    if (!source && card) {
      const cleanCardNumber = (card.cardNumber || '').replace(/\s+/g, '');
      const cleanCvc = (card.cvc || '').toString().trim();
      const cleanExpMonth = (card.expiryMonth || '').toString().trim();
      const rawExpYear = (card.expiryYear || '').toString().trim();
      const cleanExpYear = rawExpYear.length === 2 ? `20${rawExpYear}` : rawExpYear;

      const tokenObj = await stripe.tokens.create({
        card: {
          number: cleanCardNumber,
          exp_month: cleanExpMonth,
          exp_year: cleanExpYear,
          cvc: cleanCvc,
          name: card.cardholderName || undefined,
        },
      });
      source = tokenObj.id;
    }

    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      source,
      description: description || 'BFL Fitness Coaching Subscription',
      metadata: metadata || {},
    });

    res.json({
      success: true,
      chargeId: charge.id,
      receiptUrl: charge.receipt_url,
      cardLast4: charge.payment_method_details?.card?.last4 || '4242',
      cardBrand: charge.payment_method_details?.card?.brand || 'Visa',
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
    });
  } catch (err: any) {
    console.error('[StripeServer] Charge error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── Preview Upgrade with Proration ─────────────────────────────────────────
app.post(['/api/stripe/preview-upgrade', '/api/stripe/upgrade-preview'], async (req, res) => {
  try {
    const { clientId, currentPlanPrice, newPlanPrice, currentPlanBillingCycle, newPlanBillingCycle, planExpiresAt } = req.body;

    if (!newPlanPrice) {
      return res.status(400).json({ error: 'Missing new plan pricing information' });
    }

    const now = Date.now();
    let remainingFraction = 0;

    if (planExpiresAt) {
      const expiresMs = new Date(planExpiresAt).getTime();
      const diffMs = expiresMs - now;
      if (diffMs > 0) {
        const totalDurationDays = currentPlanBillingCycle === 'weekly' ? 7 : 30;
        const totalDurationMs = totalDurationDays * 24 * 60 * 60 * 1000;
        remainingFraction = Math.min(1, Math.max(0, diffMs / totalDurationMs));
      }
    }

    const currentPrice = Number(currentPlanPrice) || 0;
    const targetPrice = Number(newPlanPrice) || 0;

    // Credit unused portion of current plan
    const unusedCredit = Math.round(currentPrice * remainingFraction * 100) / 100;
    // Charge for new plan
    const proratedDifference = Math.max(0, Math.round((targetPrice - unusedCredit) * 100) / 100);

    const isUpgrade = targetPrice > currentPrice;
    const isDowngrade = targetPrice < currentPrice;

    res.json({
      currentPrice,
      newPrice: targetPrice,
      remainingFraction,
      unusedCredit,
      proratedAmount: proratedDifference,
      isUpgrade,
      isDowngrade,
      effectiveImmediate: isUpgrade,
      effectiveAtPeriodEnd: isDowngrade,
    });
  } catch (err: any) {
    console.error('[StripeServer] Preview upgrade error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to calculate upgrade preview' });
  }
});

// ─── Upgrade / Switch Plan ──────────────────────────────────────────────────
app.post('/api/stripe/upgrade-subscription', async (req, res) => {
  try {
    const {
      clientId,
      newPlan,
      paymentDetails,
    } = req.body;

    if (!clientId || !newPlan) {
      return res.status(400).json({ error: 'clientId and newPlan are required' });
    }

    const userRef = doc(db, 'users', clientId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }

    const nowIso = new Date().toISOString();
    const planInfo = calculatePlanPeriod(newPlan, newPlan.customDurationDays);

    // Preserve historical subscription
    const prevHistory = userData.subscriptionHistory || [];
    const updatedHistory = [...prevHistory];
    if (userData.activePlanId && userData.packageStartedAt) {
      updatedHistory.push({
        planId: userData.activePlanId,
        planName: userData.activePlanName || userData.activePlanId,
        planPrice: userData.activePlanPrice || 0,
        startedAt: userData.packageStartedAt,
        endedAt: userData.planExpiresAt || nowIso,
        status: 'expired',
        renewedAt: nowIso,
        billingCycle: userData.billingCycle || 'monthly',
        sessionCredits: userData.sessionCredits || 0,
      });
    }

    // Generate transaction record
    const invoiceNumber = `BFL-INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const transactionRecord = {
      id: txId,
      clientId,
      clientName: userData.displayName || 'Athlete',
      clientEmail: userData.email || '',
      planId: newPlan.id,
      planName: newPlan.name,
      amount: paymentDetails?.amount ?? newPlan.price,
      currency: 'AUD',
      status: 'succeeded',
      paymentMethod: paymentDetails?.cardLast4 ? `Credit Card (**** ${paymentDetails.cardLast4})` : 'Credit / Debit Card',
      createdAt: nowIso,
      cardLast4: paymentDetails?.cardLast4 || '4242',
      cardBrand: paymentDetails?.cardBrand || 'Visa',
      invoiceNumber,
      billingPeriodStart: planInfo.startedAtIso,
      billingPeriodEnd: planInfo.expiresAtIso,
      durationDays: planInfo.durationDays,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      subtotal: paymentDetails?.amount ?? newPlan.price,
      taxAmount: 0,
    };

    // Store transaction
    await setDoc(doc(db, 'transactions', txId), transactionRecord);

    // Update user profile in Firestore
    const userUpdates = cleanPayload({
      status: 'active',
      subscriptionStatus: 'active',
      approvalStatus: 'approved',
      activePlanId: newPlan.id,
      activePlanName: `${newPlan.name} ($${newPlan.price}${newPlan.period || ''})`,
      activePlanPrice: newPlan.price,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      usedSessionCredits: 0,
      packageStartedAt: planInfo.startedAtIso,
      planExpiresAt: planInfo.expiresAtIso,
      packageDurationDays: planInfo.durationDays,
      pendingPlanId: null,
      pendingPlanName: null,
      pendingPlanPrice: null,
      pendingDowngradePlanId: null,
      pendingDowngradePlanName: null,
      downgradeEffectiveAt: null,
      renewalRequestedPlanId: null,
      renewalRequestedPlanName: null,
      renewalRequestedPlanPrice: null,
      renewalRequestedAt: null,
      cancellationRequestedAt: null,
      remindersSent: [],
      subscriptionHistory: updatedHistory,
      updatedAt: nowIso,
    });

    await updateDoc(userRef, userUpdates);

    // Update subscriptions collection document
    await setDoc(doc(db, 'subscriptions', clientId), cleanPayload({
      id: clientId,
      clientId,
      status: 'active',
      currentActivePlanId: newPlan.id,
      currentActivePlanName: newPlan.name,
      activePlanId: newPlan.id,
      activePlanName: newPlan.name,
      activePlanPrice: newPlan.price,
      planDurationDays: planInfo.durationDays,
      planExpiresAt: planInfo.expiresAtIso,
      packageStartedAt: planInfo.startedAtIso,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      approvedAt: nowIso,
      updatedAt: nowIso,
    }), { merge: true });

    // Notify coach
    const coachId = userData.assignedCoachId || userData.coachId || 'admin_mass_narimanian';
    const notifId = `notif_${Date.now()}_coach`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: coachId,
      recipientRole: 'coach',
      title: 'Athlete Plan Upgraded',
      message: `${userData.displayName || 'Athlete'} upgraded to ${newPlan.name} ($${newPlan.price}). Active until ${planInfo.formattedEnd}. Invoice: ${invoiceNumber}.`,
      type: 'system',
      actionTab: 'clients',
      timestamp: nowIso,
      read: false,
      actorName: userData.displayName || 'Athlete',
      actorRole: 'client',
    }).catch(() => {});

    // Notify client
    const clientNotifId = `notif_${Date.now()}_client`;
    await setDoc(doc(db, 'notifications', clientNotifId), {
      id: clientNotifId,
      userId: clientId,
      recipientRole: 'client',
      title: 'Plan Upgrade Confirmed',
      message: `Your upgrade to ${newPlan.name} is confirmed and active until ${planInfo.formattedEnd}.`,
      type: 'system',
      actionTab: 'profile',
      timestamp: nowIso,
      read: false,
      actorName: 'BFL Billing',
      actorRole: 'system',
    }).catch(() => {});

    res.json({
      success: true,
      transaction: transactionRecord,
      planInfo,
    });
  } catch (err: any) {
    console.error('[StripeServer] Upgrade error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process upgrade' });
  }
});

// ─── Schedule Downgrade (Effective at Period End) ────────────────────────────
app.post('/api/stripe/downgrade-subscription', async (req, res) => {
  try {
    const { clientId, targetPlan } = req.body;

    if (!clientId || !targetPlan) {
      return res.status(400).json({ error: 'clientId and targetPlan are required' });
    }

    const userRef = doc(db, 'users', clientId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }

    const nowIso = new Date().toISOString();
    const effectiveAt = userData.planExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const updates = cleanPayload({
      pendingDowngradePlanId: targetPlan.id,
      pendingDowngradePlanName: targetPlan.name,
      pendingDowngradePlanPrice: targetPlan.price,
      downgradeEffectiveAt: effectiveAt,
      updatedAt: nowIso,
    });

    await updateDoc(userRef, updates);

    // Notify coach
    const coachId = userData.assignedCoachId || userData.coachId || 'admin_mass_narimanian';
    const notifId = `notif_${Date.now()}_downgrade_coach`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: coachId,
      recipientRole: 'coach',
      title: 'Athlete Scheduled Plan Downgrade',
      message: `${userData.displayName || 'Athlete'} scheduled a plan switch to ${targetPlan.name} taking effect on ${new Date(effectiveAt).toLocaleDateString()}. Current tier features remain fully active until then.`,
      type: 'system',
      actionTab: 'clients',
      timestamp: nowIso,
      read: false,
      actorName: userData.displayName || 'Athlete',
      actorRole: 'client',
    }).catch(() => {});

    res.json({
      success: true,
      pendingDowngradePlanId: targetPlan.id,
      pendingDowngradePlanName: targetPlan.name,
      effectiveAt,
    });
  } catch (err: any) {
    console.error('[StripeServer] Downgrade error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to schedule downgrade' });
  }
});

// ─── Cancel Subscription (Retaining Access Until Period End) ────────────────
app.post('/api/stripe/cancel-subscription', async (req, res) => {
  try {
    const { clientId, reason } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const userRef = doc(db, 'users', clientId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }

    const nowIso = new Date().toISOString();
    const updates = cleanPayload({
      cancellationRequestedAt: nowIso,
      subscriptionStatus: 'cancelled',
      cancellationReason: reason || 'Client requested cancellation',
      updatedAt: nowIso,
    });

    await updateDoc(userRef, updates);

    // If active Stripe subscription exists, set cancel_at_period_end
    if (stripe && userData.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (stripeErr: any) {
        console.warn('[StripeServer] Stripe subscription cancellation notice:', stripeErr.message);
      }
    }

    // Notify coach
    const coachId = userData.assignedCoachId || userData.coachId || 'admin_mass_narimanian';
    const notifId = `notif_${Date.now()}_cancel_coach`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: coachId,
      recipientRole: 'coach',
      title: 'Client Requested Cancellation',
      message: `${userData.displayName || 'Athlete'} scheduled cancellation. Paid coaching access remains active until ${userData.planExpiresAt ? new Date(userData.planExpiresAt).toLocaleDateString() : 'end of paid period'}.`,
      type: 'system',
      actionTab: 'clients',
      timestamp: nowIso,
      read: false,
      actorName: userData.displayName || 'Athlete',
      actorRole: 'client',
    }).catch(() => {});

    res.json({
      success: true,
      cancelledAt: nowIso,
      expiresAt: userData.planExpiresAt,
      message: 'Subscription cancelled. You will retain full access until the end of your paid billing period.',
    });
  } catch (err: any) {
    console.error('[StripeServer] Cancel subscription error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to cancel subscription' });
  }
});

// ─── Reactivate Cancelled Subscription ──────────────────────────────────────
app.post('/api/stripe/reactivate-subscription', async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const userRef = doc(db, 'users', clientId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }

    const nowIso = new Date().toISOString();
    const updates = cleanPayload({
      cancellationRequestedAt: null,
      subscriptionStatus: 'active',
      updatedAt: nowIso,
    });

    await updateDoc(userRef, updates);

    // If active Stripe subscription exists, uncancel
    if (stripe && userData.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
      } catch (stripeErr: any) {
        console.warn('[StripeServer] Stripe subscription reactivation notice:', stripeErr.message);
      }
    }

    res.json({
      success: true,
      status: 'active',
      message: 'Subscription successfully reactivated.',
    });
  } catch (err: any) {
    console.error('[StripeServer] Reactivation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to reactivate subscription' });
  }
});

// ─── Automated Reminders & Expiration Engine ────────────────────────────────
export async function checkExpirationsAndReminders(): Promise<{
  remindersSent: number;
  expiredCount: number;
  downgradesProcessed: number;
}> {
  console.log('[Scheduler] Running automated subscription expiration & reminder checks...');
  let remindersSent = 0;
  let expiredCount = 0;
  let downgradesProcessed = 0;

  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const now = new Date();
    const nowIso = now.toISOString();

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const clientId = docSnap.id;
      const status = data.subscriptionStatus || data.status;

      // Only inspect active or cancelled-in-period clients
      if (status !== 'active' && status !== 'cancelled' && status !== 'past_due') {
        continue;
      }

      const planExpiresAt = data.planExpiresAt;
      if (!planExpiresAt) continue;

      const expiresMs = new Date(planExpiresAt).getTime();
      const cycle = determineBillingCycle({
        id: data.activePlanId,
        name: data.activePlanName,
        billingCycle: data.billingCycle,
      });

      // 1. Process Expired Subscriptions
      if (expiresMs <= now.getTime()) {
        // If client has pending scheduled downgrade, activate the downgrade now!
        if (data.pendingDowngradePlanId) {
          const newPlanInfo = calculatePlanPeriod({
            id: data.pendingDowngradePlanId,
            name: data.pendingDowngradePlanName,
            price: data.pendingDowngradePlanPrice,
          });

          await updateDoc(docSnap.ref, cleanPayload({
            activePlanId: data.pendingDowngradePlanId,
            activePlanName: data.pendingDowngradePlanName,
            activePlanPrice: data.pendingDowngradePlanPrice,
            billingCycle: newPlanInfo.billingCycle,
            sessionCredits: newPlanInfo.sessionCredits,
            usedSessionCredits: 0,
            packageStartedAt: newPlanInfo.startedAtIso,
            planExpiresAt: newPlanInfo.expiresAtIso,
            packageDurationDays: newPlanInfo.durationDays,
            subscriptionStatus: 'active',
            pendingDowngradePlanId: null,
            pendingDowngradePlanName: null,
            downgradeEffectiveAt: null,
            remindersSent: [],
            updatedAt: nowIso,
          }));

          downgradesProcessed++;
          continue;
        }

        // Check if client has remaining session credits for hourly plans
        if (cycle === 'hourly') {
          const totalCredits = data.sessionCredits || 0;
          const usedCredits = data.usedSessionCredits || 0;
          if (totalCredits - usedCredits > 0) {
            // Still has unused session credits! Do not prematurely expire
            continue;
          }
        }

        // Transition to expired
        await updateDoc(docSnap.ref, cleanPayload({
          subscriptionStatus: 'expired',
          status: 'expired',
          updatedAt: nowIso,
        }));

        // Notify client
        const clientNotifId = `notif_${Date.now()}_exp_${clientId}`;
        await setDoc(doc(db, 'notifications', clientNotifId), {
          id: clientNotifId,
          userId: clientId,
          recipientRole: 'client',
          title: 'Coaching Plan Expired',
          message: 'Your coaching period has ended. Historical workouts and progress remain saved. Renew your plan to continue receiving personalized coaching.',
          type: 'system',
          actionTab: 'profile',
          timestamp: nowIso,
          read: false,
          actorName: 'BFL Billing',
          actorRole: 'system',
        }).catch(() => {});

        // Notify coach
        const coachId = data.assignedCoachId || data.coachId;
        if (coachId) {
          const coachNotifId = `notif_${Date.now()}_exp_coach_${clientId}`;
          await setDoc(doc(db, 'notifications', coachNotifId), {
            id: coachNotifId,
            userId: coachId,
            recipientRole: 'coach',
            title: 'Athlete Coaching Period Ended',
            message: `Athlete ${data.displayName || 'Client'}'s plan has expired. Historical logs remain accessible.`,
            type: 'system',
            actionTab: 'clients',
            timestamp: nowIso,
            read: false,
            actorName: data.displayName || 'Athlete',
            actorRole: 'client',
          }).catch(() => {});
        }

        expiredCount++;
        continue;
      }

      // 2. Evaluate Upcoming Reminders (24h for weekly, 3d and 24h for monthly)
      const sentReminders: string[] = data.remindersSent || [];
      const dueReminders = evaluateDueReminders(planExpiresAt, cycle, sentReminders, now);

      if (dueReminders.length > 0) {
        const newSent = [...sentReminders, ...dueReminders];
        await updateDoc(docSnap.ref, { remindersSent: newSent });

        for (const rem of dueReminders) {
          const timeText = rem === '3_day' ? '3 days' : '24 hours';

          // Send in-app notification to client
          const remNotifId = `notif_${Date.now()}_rem_${rem}_${clientId}`;
          await setDoc(doc(db, 'notifications', remNotifId), {
            id: remNotifId,
            userId: clientId,
            recipientRole: 'client',
            title: `Plan Expiring in ${timeText}`,
            message: `Your ${data.activePlanName || 'coaching plan'} will end in ${timeText}. Renew or upgrade in your Account settings to keep training uninterrupted.`,
            type: 'system',
            actionTab: 'profile',
            timestamp: nowIso,
            read: false,
            actorName: 'BFL Billing',
            actorRole: 'system',
          }).catch(() => {});

          // Send in-app notification to assigned coach
          const coachId = data.assignedCoachId || data.coachId;
          if (coachId) {
            const coachRemNotifId = `notif_${Date.now()}_rem_coach_${rem}_${clientId}`;
            await setDoc(doc(db, 'notifications', coachRemNotifId), {
              id: coachRemNotifId,
              userId: coachId,
              recipientRole: 'coach',
              title: `Athlete Expiring in ${timeText}`,
              message: `Athlete ${data.displayName || 'Client'}'s subscription ends in ${timeText}.`,
              type: 'system',
              actionTab: 'clients',
              timestamp: nowIso,
              read: false,
              actorName: data.displayName || 'Athlete',
              actorRole: 'client',
            }).catch(() => {});
          }

          remindersSent++;
        }
      }
    }
  } catch (err: any) {
    console.error('[Scheduler] Error checking expirations:', err.message);
  }

  return { remindersSent, expiredCount, downgradesProcessed };
}

// Scheduler endpoint (can be called by Cloud Scheduler or external cron)
app.post('/api/cron/check-expirations', async (_req, res) => {
  const result = await checkExpirationsAndReminders();
  res.json({ success: true, ...result });
});

// Run scheduler in background once per hour in Node server
setInterval(() => {
  checkExpirationsAndReminders().catch((err) => console.error('[Scheduler] Interval error:', err));
}, 60 * 60 * 1000);

// ─── Stripe Official Webhook Handler ────────────────────────────────────────
app.post('/api/stripe/webhook', async (req, res) => {
  if (!stripe) {
    return res.status(503).send('Stripe is not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    if (STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      // In development / testing environment without signing secret
      console.warn('[StripeWebhook] WARNING: STRIPE_WEBHOOK_SECRET not provided. Parsing body directly.');
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error('[StripeWebhook] Signature verification error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[StripeWebhook] Processing event: ${event.type} (ID: ${event.id})`);

  try {
    const nowIso = new Date().toISOString();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const clientId = metadata.clientId;

        if (!clientId) {
          console.warn('[StripeWebhook] checkout.session.completed missing clientId in metadata');
          break;
        }

        const userRef = doc(db, 'users', clientId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) break;
        const userData = userSnap.data();

        // Idempotency check: prevent duplicate event processing
        const processedEventIds: string[] = userData.processedEventIds || [];
        if (processedEventIds.includes(event.id)) {
          console.log(`[StripeWebhook] Duplicate event ${event.id} already processed. Safely ignoring.`);
          break;
        }

        const planId = metadata.planId || userData.activePlanId || 'plan_online_monthly';
        const planName = metadata.planName || userData.activePlanName || 'Coaching Package';
        const planInfo = calculatePlanPeriod(planId);

        const amount = session.amount_total ? session.amount_total / 100 : Number(userData.activePlanPrice) || 350;
        const invoiceNumber = metadata.invoiceNumber || `BFL-INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

        // Record transaction
        const txRecord = {
          id: session.id,
          clientId,
          clientName: metadata.clientName || session.customer_details?.name || userData.displayName || 'Athlete',
          clientEmail: metadata.clientEmail || session.customer_details?.email || userData.email || '',
          planId,
          planName,
          amount,
          currency: (session.currency || 'aud').toUpperCase(),
          status: 'succeeded',
          paymentMethod: 'Stripe Checkout',
          createdAt: nowIso,
          cardLast4: '4242',
          cardBrand: 'Visa',
          invoiceNumber,
          billingPeriodStart: planInfo.startedAtIso,
          billingPeriodEnd: planInfo.expiresAtIso,
          durationDays: planInfo.durationDays,
          billingCycle: planInfo.billingCycle,
          sessionCredits: planInfo.sessionCredits,
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
          subtotal: amount,
          taxAmount: 0,
        };
        await setDoc(doc(db, 'transactions', session.id), txRecord);

        // Update user profile
        const prevHistory = userData.subscriptionHistory || [];
        const newHistory = [...prevHistory];
        if (userData.activePlanId && userData.packageStartedAt) {
          newHistory.push({
            planId: userData.activePlanId,
            planName: userData.activePlanName || userData.activePlanId,
            planPrice: userData.activePlanPrice || 0,
            startedAt: userData.packageStartedAt,
            endedAt: userData.planExpiresAt || nowIso,
            status: 'expired',
            renewedAt: nowIso,
            billingCycle: userData.billingCycle || 'monthly',
            sessionCredits: userData.sessionCredits || 0,
          });
        }

        await updateDoc(userRef, cleanPayload({
          status: 'active',
          subscriptionStatus: 'active',
          approvalStatus: 'approved',
          activePlanId: planId,
          activePlanName: planName,
          activePlanPrice: amount,
          billingCycle: planInfo.billingCycle,
          sessionCredits: planInfo.sessionCredits,
          usedSessionCredits: 0,
          packageStartedAt: planInfo.startedAtIso,
          planExpiresAt: planInfo.expiresAtIso,
          packageDurationDays: planInfo.durationDays,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
          processedEventIds: [...processedEventIds, event.id],
          subscriptionHistory: newHistory,
          cancellationRequestedAt: null,
          remindersSent: [],
          updatedAt: nowIso,
        }));

        // Notify coach
        const coachId = userData.assignedCoachId || userData.coachId || 'admin_mass_narimanian';
        const notifId = `notif_${Date.now()}_webhook_coach`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          userId: coachId,
          recipientRole: 'coach',
          title: 'Plan Activated via Stripe Checkout',
          message: `${userData.displayName || 'Athlete'} paid $${amount} for ${planName}. Active until ${planInfo.formattedEnd}. Invoice: ${invoiceNumber}.`,
          type: 'system',
          actionTab: 'clients',
          timestamp: nowIso,
          read: false,
          actorName: userData.displayName || 'Athlete',
          actorRole: 'client',
        }).catch(() => {});

        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : '';
        const subscriptionId = (invoice as any).subscription ? String((invoice as any).subscription) : '';

        // Match user by stripeCustomerId or email
        const usersRef = collection(db, 'users');
        let matchedDocSnap: any = null;

        if (customerId) {
          const qCust = query(usersRef, where('stripeCustomerId', '==', customerId));
          const qSnap = await getDocs(qCust);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }

        if (!matchedDocSnap && invoice.customer_email) {
          const qEmail = query(usersRef, where('email', '==', invoice.customer_email.toLowerCase()));
          const qSnap = await getDocs(qEmail);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }

        if (matchedDocSnap) {
          const userData = matchedDocSnap.data();
          const processed: string[] = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;

          const planInfo = calculatePlanPeriod(userData.activePlanId || 'plan_online_monthly');
          const amount = invoice.amount_paid ? invoice.amount_paid / 100 : userData.activePlanPrice || 350;

          await updateDoc(matchedDocSnap.ref, cleanPayload({
            status: 'active',
            subscriptionStatus: 'active',
            packageStartedAt: nowIso,
            planExpiresAt: planInfo.expiresAtIso,
            stripeCustomerId: customerId || userData.stripeCustomerId,
            stripeSubscriptionId: subscriptionId || userData.stripeSubscriptionId,
            processedEventIds: [...processed, event.id],
            remindersSent: [],
            updatedAt: nowIso,
          }));

          // Notify coach of successful renewal
          const coachId = userData.assignedCoachId || userData.coachId || 'admin_mass_narimanian';
          const notifId = `notif_${Date.now()}_renewal_coach`;
          await setDoc(doc(db, 'notifications', notifId), {
            id: notifId,
            userId: coachId,
            recipientRole: 'coach',
            title: 'Recurring Renewal Succeeded',
            message: `${userData.displayName || 'Athlete'} successfully renewed ${userData.activePlanName || 'Plan'} ($${amount}). Active until ${planInfo.formattedEnd}.`,
            type: 'system',
            actionTab: 'clients',
            timestamp: nowIso,
            read: false,
            actorName: userData.displayName || 'Athlete',
            actorRole: 'client',
          }).catch(() => {});
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : '';

        const usersRef = collection(db, 'users');
        let matchedDocSnap: any = null;

        if (customerId) {
          const qCust = query(usersRef, where('stripeCustomerId', '==', customerId));
          const qSnap = await getDocs(qCust);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }

        if (!matchedDocSnap && invoice.customer_email) {
          const qEmail = query(usersRef, where('email', '==', invoice.customer_email.toLowerCase()));
          const qSnap = await getDocs(qEmail);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }

        if (matchedDocSnap) {
          const userData = matchedDocSnap.data();
          const processed: string[] = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;

          await updateDoc(matchedDocSnap.ref, {
            status: 'past_due',
            subscriptionStatus: 'past_due',
            processedEventIds: [...processed, event.id],
            updatedAt: nowIso,
          });

          // Notify client
          const clientNotifId = `notif_${Date.now()}_fail_client`;
          await setDoc(doc(db, 'notifications', clientNotifId), {
            id: clientNotifId,
            userId: matchedDocSnap.id,
            recipientRole: 'client',
            title: 'Renewal Payment Failed',
            message: 'Your recurring coaching renewal payment failed. Please update your payment method to maintain uninterrupted coaching access.',
            type: 'system',
            actionTab: 'profile',
            timestamp: nowIso,
            read: false,
            actorName: 'BFL Billing',
            actorRole: 'system',
          }).catch(() => {});

          // Notify coach
          const coachId = userData.assignedCoachId || userData.coachId;
          if (coachId) {
            const coachNotifId = `notif_${Date.now()}_fail_coach`;
            await setDoc(doc(db, 'notifications', coachNotifId), {
              id: coachNotifId,
              userId: coachId,
              recipientRole: 'coach',
              title: 'Athlete Payment Failed',
              message: `Payment failed for ${userData.displayName || 'Athlete'}. Account is currently in grace period (past_due).`,
              type: 'system',
              actionTab: 'clients',
              timestamp: nowIso,
              read: false,
              actorName: userData.displayName || 'Athlete',
              actorRole: 'client',
            }).catch(() => {});
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : '';
        const usersRef = collection(db, 'users');
        const qCust = query(usersRef, where('stripeCustomerId', '==', customerId));
        const qSnap = await getDocs(qCust);

        if (!qSnap.empty) {
          const userDoc = qSnap.docs[0];
          const userData = userDoc.data();
          const processed: string[] = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;

          const isCancelling = sub.cancel_at_period_end;
          const status = sub.status === 'active' ? (isCancelling ? 'cancelled' : 'active') : sub.status;

          await updateDoc(userDoc.ref, cleanPayload({
            subscriptionStatus: status,
            cancellationRequestedAt: isCancelling ? (userData.cancellationRequestedAt || nowIso) : null,
            processedEventIds: [...processed, event.id],
            updatedAt: nowIso,
          }));
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : '';
        const usersRef = collection(db, 'users');
        const qCust = query(usersRef, where('stripeCustomerId', '==', customerId));
        const qSnap = await getDocs(qCust);

        if (!qSnap.empty) {
          const userDoc = qSnap.docs[0];
          const userData = userDoc.data();
          const processed: string[] = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;

          await updateDoc(userDoc.ref, {
            status: 'expired',
            subscriptionStatus: 'expired',
            processedEventIds: [...processed, event.id],
            updatedAt: nowIso,
          });

          // Notify coach
          const coachId = userData.assignedCoachId || userData.coachId;
          if (coachId) {
            const coachNotifId = `notif_${Date.now()}_subdel_coach`;
            await setDoc(doc(db, 'notifications', coachNotifId), {
              id: coachNotifId,
              userId: coachId,
              recipientRole: 'coach',
              title: 'Athlete Subscription Terminated',
              message: `Subscription deleted in Stripe for ${userData.displayName || 'Athlete'}. Access transitioned to expired.`,
              type: 'system',
              actionTab: 'clients',
              timestamp: nowIso,
              read: false,
              actorName: userData.displayName || 'Athlete',
              actorRole: 'client',
            }).catch(() => {});
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[StripeWebhook] Processing error:', err.message);
    res.status(500).json({ error: 'Internal error processing webhook' });
  }
});

// ─── Static files for production standalone mode ────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')
);

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`[BFL Fitness Server] Running on http://localhost:${PORT}`);
  });
}

export { app, stripe };
export default app;
