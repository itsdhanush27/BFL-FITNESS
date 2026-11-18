// server.ts
import express from "express";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";

// src/services/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup as fbSignInWithPopup,
  sendEmailVerification as fbSendEmailVerification
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
var firebaseConfig = {
  apiKey: "AIzaSyA_hRsuVO5vkMUgSOudycs-atRJGTLDh88",
  authDomain: "bfl-project-ef584.firebaseapp.com",
  projectId: "bfl-project-ef584",
  storageBucket: "bfl-project-ef584.firebasestorage.app",
  messagingSenderId: "493251166965",
  appId: "1:493251166965:web:83c218fbeb9344e1bffbbc",
  measurementId: "G-XZRCQRF9X2"
};
var app = getApps().length ? getApp() : initializeApp(firebaseConfig);
var auth = getAuth(app);
var db = getFirestore(app);
var storage = getStorage(app);
var analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
  });
  window.auth = auth;
  window.db = db;
  window.storage = storage;
}

// server.ts
import {
  doc as doc2,
  getDoc as getDoc2,
  setDoc as setDoc2,
  updateDoc as updateDoc2,
  collection as collection2,
  query as query2,
  where as where2,
  getDocs as getDocs2
} from "firebase/firestore";

// src/utils/planDurationUtils.ts
function determineBillingCycle(plan) {
  if (!plan) return "monthly";
  if (typeof plan === "string") {
    const s = plan.toLowerCase();
    if (s.includes("hour") || s.includes("session") || s.includes("boxing") || s.includes("powerlifting") && !s.includes("monthly") && !s.includes("weekly")) {
      return "hourly";
    }
    if (s.includes("week") || s.includes("7")) return "weekly";
    if (s.includes("month") || s.includes("30")) return "monthly";
    if (s.includes("custom")) return "custom";
    return "monthly";
  }
  if (plan.billingCycle === "hourly" || plan.billingCycle === "weekly" || plan.billingCycle === "monthly" || plan.billingCycle === "custom") {
    return plan.billingCycle;
  }
  const str = `${plan.id || ""} ${plan.name || ""} ${plan.period || ""}`.toLowerCase();
  if (str.includes("/ hour") || str.includes("hourly") || str.includes("session")) return "hourly";
  if (str.includes("/ week") || str.includes("weekly")) return "weekly";
  if (str.includes("/ month") || str.includes("monthly")) return "monthly";
  if (plan.customDurationDays && plan.customDurationDays > 0) return "custom";
  return "monthly";
}
function addOneCalendarMonth(startDate) {
  const result = new Date(startDate.getTime());
  const currentDay = result.getDate();
  const currentMonth = result.getMonth();
  const targetMonth = (currentMonth + 1) % 12;
  result.setMonth(currentMonth + 1, 1);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), targetMonth + 1, 0).getDate();
  result.setDate(Math.min(currentDay, lastDayOfTargetMonth));
  return result;
}
function calculatePlanPeriod(plan, customDuration, baseDate = /* @__PURE__ */ new Date()) {
  const cycle = determineBillingCycle(plan);
  const startDate = new Date(baseDate.getTime());
  let endDate;
  let durationDays;
  let sessionCredits = 0;
  let isHourlySession = false;
  switch (cycle) {
    case "hourly": {
      isHourlySession = true;
      sessionCredits = 1;
      durationDays = 30;
      endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
      break;
    }
    case "weekly": {
      durationDays = 7;
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1e3);
      break;
    }
    case "monthly": {
      endDate = addOneCalendarMonth(startDate);
      durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1e3));
      break;
    }
    case "custom":
    default: {
      durationDays = customDuration || typeof plan === "object" && plan?.customDurationDays || 30;
      endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
      break;
    }
  }
  const localeOptions = {
    month: "short",
    day: "numeric",
    year: "numeric"
  };
  return {
    billingCycle: cycle,
    durationDays,
    sessionCredits,
    isHourlySession,
    startedAtIso: startDate.toISOString(),
    expiresAtIso: endDate.toISOString(),
    formattedStart: startDate.toLocaleDateString("en-US", localeOptions),
    formattedEnd: endDate.toLocaleDateString("en-US", localeOptions)
  };
}
function evaluateDueReminders(planExpiresAtIso, billingCycle, alreadySentReminders = [], currentTime = /* @__PURE__ */ new Date()) {
  const expiresAt = new Date(planExpiresAtIso).getTime();
  const now = currentTime.getTime();
  const msRemaining = expiresAt - now;
  if (msRemaining <= 0) return [];
  const hoursRemaining = msRemaining / (1e3 * 60 * 60);
  const due = [];
  if ((billingCycle === "monthly" || billingCycle === "custom") && hoursRemaining <= 72 && hoursRemaining > 24) {
    if (!alreadySentReminders.includes("3_day")) {
      due.push("3_day");
    }
  }
  if (hoursRemaining <= 24) {
    if (!alreadySentReminders.includes("24_hour")) {
      due.push("24_hour");
    }
  }
  return due;
}

// server.ts
dotenv.config();
var app2 = express();
var PORT = process.env.PORT || 3001;
var STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
if (!STRIPE_KEY) {
  console.warn("[StripeServer] WARNING: STRIPE_SECRET_KEY is not set. Stripe endpoints will not function until configured.");
}
var stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, {
  apiVersion: "2025-02-24.acacia"
}) : null;
app2.use((req, res, next) => {
  if (req.url && !req.url.startsWith("/api") && (req.url.startsWith("/stripe") || req.url.startsWith("/cron") || req.url.startsWith("/health"))) {
    req.url = "/api" + req.url;
  }
  next();
});
app2.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    stripeConfigured: Boolean(stripe),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app2.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app2.use(express.json());
app2.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Stripe-Signature");
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
function cleanPayload(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== void 0) {
      result[key] = value;
    }
  }
  return result;
}
app2.get("/api/stripe/status", async (_req, res) => {
  if (!stripe) {
    return res.status(503).json({ status: "unconfigured", message: "Stripe secret key not configured on server" });
  }
  try {
    const balance = await stripe.balance.retrieve();
    res.json({
      status: "online",
      livemode: balance.livemode,
      currency: balance.available[0]?.currency || "aud",
      webhookConfigured: Boolean(STRIPE_WEBHOOK_SECRET)
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app2.post("/api/stripe/create-checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in server environment variables." });
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
      cancelUrl
    } = req.body;
    const planId = rawPlanId || plan?.id || "custom_programming";
    const planName = rawPlanName || plan?.name || "Custom Programming";
    const amountInCents = rawAmountInCents || (plan?.price ? Math.round(plan.price * 100) : 0);
    if (!amountInCents || !planName) {
      return res.status(400).json({ error: "Missing required plan or amount information" });
    }
    const planInfo = calculatePlanPeriod(
      { id: planId, name: planName, billingCycle: requestedCycle, customDurationDays },
      customDurationDays
    );
    const periodDescription = planInfo.isHourlySession ? `1-on-1 Coaching Session (1 Session Credit \u2022 Valid until ${planInfo.formattedEnd})` : planInfo.billingCycle === "weekly" ? `Weekly Coaching Program (7 Days \u2022 ${planInfo.formattedStart} to ${planInfo.formattedEnd})` : `Monthly Coaching Program (${planInfo.formattedStart} to ${planInfo.formattedEnd})`;
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : "http://localhost:3000");
    const finalSuccessUrl = successUrl || `${origin}/?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&client_id=${clientId || ""}&status=success`;
    const finalCancelUrl = cancelUrl || `${origin}/?checkout_cancelled=true`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: clientEmail || void 0,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: `BFL Fitness - ${planName}`,
              description: periodDescription
            },
            unit_amount: Math.round(amountInCents)
          },
          quantity: 1
        }
      ],
      metadata: {
        clientId: clientId || "",
        clientName: clientName || "",
        clientEmail: clientEmail || "",
        planId: planId || "",
        planName: planName || "",
        billingCycle: planInfo.billingCycle,
        durationDays: String(planInfo.durationDays),
        sessionCredits: String(planInfo.sessionCredits),
        invoiceNumber: invoiceNumber || "",
        startDate: planInfo.startedAtIso,
        endDate: planInfo.expiresAtIso
      }
    });
    res.json({
      sessionId: session.id,
      url: session.url,
      invoiceNumber,
      durationDays: planInfo.durationDays,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      startDate: planInfo.startedAtIso,
      endDate: planInfo.expiresAtIso
    });
  } catch (err) {
    console.error("[StripeServer] Create checkout session error:", err.message);
    res.status(500).json({ error: err.message || "Failed to initialize checkout session" });
  }
});
app2.get("/api/stripe/checkout-session/:sessionId", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured on the server." });
  }
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (err) {
    console.error("[StripeServer] Verify checkout session error:", err.message);
    res.status(500).json({ error: err.message || "Failed to verify checkout session" });
  }
});
app2.post("/api/stripe/charge", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in server environment variables." });
  }
  try {
    const { amount, currency = "aud", description, token, card, metadata } = req.body;
    if (!amount || !token && !card) {
      return res.status(400).json({ error: "Missing amount or payment source (token or card)" });
    }
    let source = token;
    if (!source && card) {
      const cleanCardNumber = (card.cardNumber || "").replace(/\s+/g, "");
      const cleanCvc = (card.cvc || "").toString().trim();
      const cleanExpMonth = (card.expiryMonth || "").toString().trim();
      const rawExpYear = (card.expiryYear || "").toString().trim();
      const cleanExpYear = rawExpYear.length === 2 ? `20${rawExpYear}` : rawExpYear;
      const tokenObj = await stripe.tokens.create({
        card: {
          number: cleanCardNumber,
          exp_month: cleanExpMonth,
          exp_year: cleanExpYear,
          cvc: cleanCvc,
          name: card.cardholderName || void 0
        }
      });
      source = tokenObj.id;
    }
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      source,
      description: description || "BFL Fitness Coaching Subscription",
      metadata: metadata || {}
    });
    res.json({
      success: true,
      chargeId: charge.id,
      receiptUrl: charge.receipt_url,
      cardLast4: charge.payment_method_details?.card?.last4 || "4242",
      cardBrand: charge.payment_method_details?.card?.brand || "Visa",
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase()
    });
  } catch (err) {
    console.error("[StripeServer] Charge error:", err.message);
    res.status(400).json({ error: err.message });
  }
});
app2.post(["/api/stripe/preview-upgrade", "/api/stripe/upgrade-preview"], async (req, res) => {
  try {
    const { clientId, currentPlanPrice, newPlanPrice, currentPlanBillingCycle, newPlanBillingCycle, planExpiresAt } = req.body;
    if (!newPlanPrice) {
      return res.status(400).json({ error: "Missing new plan pricing information" });
    }
    const now = Date.now();
    let remainingFraction = 0;
    if (planExpiresAt) {
      const expiresMs = new Date(planExpiresAt).getTime();
      const diffMs = expiresMs - now;
      if (diffMs > 0) {
        const totalDurationDays = currentPlanBillingCycle === "weekly" ? 7 : 30;
        const totalDurationMs = totalDurationDays * 24 * 60 * 60 * 1e3;
        remainingFraction = Math.min(1, Math.max(0, diffMs / totalDurationMs));
      }
    }
    const currentPrice = Number(currentPlanPrice) || 0;
    const targetPrice = Number(newPlanPrice) || 0;
    const unusedCredit = Math.round(currentPrice * remainingFraction * 100) / 100;
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
      effectiveAtPeriodEnd: isDowngrade
    });
  } catch (err) {
    console.error("[StripeServer] Preview upgrade error:", err.message);
    res.status(500).json({ error: err.message || "Failed to calculate upgrade preview" });
  }
});
app2.post("/api/stripe/upgrade-subscription", async (req, res) => {
  try {
    const {
      clientId,
      newPlan,
      paymentDetails
    } = req.body;
    if (!clientId || !newPlan) {
      return res.status(400).json({ error: "clientId and newPlan are required" });
    }
    const userRef = doc2(db, "users", clientId);
    const userSnap = await getDoc2(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const planInfo = calculatePlanPeriod(newPlan, newPlan.customDurationDays);
    const prevHistory = userData.subscriptionHistory || [];
    const updatedHistory = [...prevHistory];
    if (userData.activePlanId && userData.packageStartedAt) {
      updatedHistory.push({
        planId: userData.activePlanId,
        planName: userData.activePlanName || userData.activePlanId,
        planPrice: userData.activePlanPrice || 0,
        startedAt: userData.packageStartedAt,
        endedAt: userData.planExpiresAt || nowIso,
        status: "expired",
        renewedAt: nowIso,
        billingCycle: userData.billingCycle || "monthly",
        sessionCredits: userData.sessionCredits || 0
      });
    }
    const invoiceNumber = `BFL-INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e4 + Math.random() * 9e4)}`;
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const transactionRecord = {
      id: txId,
      clientId,
      clientName: userData.displayName || "Athlete",
      clientEmail: userData.email || "",
      planId: newPlan.id,
      planName: newPlan.name,
      amount: paymentDetails?.amount ?? newPlan.price,
      currency: "AUD",
      status: "succeeded",
      paymentMethod: paymentDetails?.cardLast4 ? `Credit Card (**** ${paymentDetails.cardLast4})` : "Credit / Debit Card",
      createdAt: nowIso,
      cardLast4: paymentDetails?.cardLast4 || "4242",
      cardBrand: paymentDetails?.cardBrand || "Visa",
      invoiceNumber,
      billingPeriodStart: planInfo.startedAtIso,
      billingPeriodEnd: planInfo.expiresAtIso,
      durationDays: planInfo.durationDays,
      billingCycle: planInfo.billingCycle,
      sessionCredits: planInfo.sessionCredits,
      subtotal: paymentDetails?.amount ?? newPlan.price,
      taxAmount: 0
    };
    await setDoc2(doc2(db, "transactions", txId), transactionRecord);
    const userUpdates = cleanPayload({
      status: "active",
      subscriptionStatus: "active",
      approvalStatus: "approved",
      activePlanId: newPlan.id,
      activePlanName: `${newPlan.name} ($${newPlan.price}${newPlan.period || ""})`,
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
      updatedAt: nowIso
    });
    await updateDoc2(userRef, userUpdates);
    await setDoc2(doc2(db, "subscriptions", clientId), cleanPayload({
      id: clientId,
      clientId,
      status: "active",
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
      updatedAt: nowIso
    }), { merge: true });
    const coachId = userData.assignedCoachId || userData.coachId || "admin_mass_narimanian";
    const notifId = `notif_${Date.now()}_coach`;
    await setDoc2(doc2(db, "notifications", notifId), {
      id: notifId,
      userId: coachId,
      recipientRole: "coach",
      title: "Athlete Plan Upgraded",
      message: `${userData.displayName || "Athlete"} upgraded to ${newPlan.name} ($${newPlan.price}). Active until ${planInfo.formattedEnd}. Invoice: ${invoiceNumber}.`,
      type: "system",
      actionTab: "clients",
      timestamp: nowIso,
      read: false,
      actorName: userData.displayName || "Athlete",
      actorRole: "client"
    }).catch(() => {
    });
    const clientNotifId = `notif_${Date.now()}_client`;
    await setDoc2(doc2(db, "notifications", clientNotifId), {
      id: clientNotifId,
      userId: clientId,
      recipientRole: "client",
      title: "Plan Upgrade Confirmed",
      message: `Your upgrade to ${newPlan.name} is confirmed and active until ${planInfo.formattedEnd}.`,
      type: "system",
      actionTab: "profile",
      timestamp: nowIso,
      read: false,
      actorName: "BFL Billing",
      actorRole: "system"
    }).catch(() => {
    });
    res.json({
      success: true,
      transaction: transactionRecord,
      planInfo
    });
  } catch (err) {
    console.error("[StripeServer] Upgrade error:", err.message);
    res.status(500).json({ error: err.message || "Failed to process upgrade" });
  }
});
app2.post("/api/stripe/downgrade-subscription", async (req, res) => {
  try {
    const { clientId, targetPlan } = req.body;
    if (!clientId || !targetPlan) {
      return res.status(400).json({ error: "clientId and targetPlan are required" });
    }
    const userRef = doc2(db, "users", clientId);
    const userSnap = await getDoc2(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const effectiveAt = userData.planExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const updates = cleanPayload({
      pendingDowngradePlanId: targetPlan.id,
      pendingDowngradePlanName: targetPlan.name,
      pendingDowngradePlanPrice: targetPlan.price,
      downgradeEffectiveAt: effectiveAt,
      updatedAt: nowIso
    });
    await updateDoc2(userRef, updates);
    const coachId = userData.assignedCoachId || userData.coachId || "admin_mass_narimanian";
    const notifId = `notif_${Date.now()}_downgrade_coach`;
    await setDoc2(doc2(db, "notifications", notifId), {
      id: notifId,
      userId: coachId,
      recipientRole: "coach",
      title: "Athlete Scheduled Plan Downgrade",
      message: `${userData.displayName || "Athlete"} scheduled a plan switch to ${targetPlan.name} taking effect on ${new Date(effectiveAt).toLocaleDateString()}. Current tier features remain fully active until then.`,
      type: "system",
      actionTab: "clients",
      timestamp: nowIso,
      read: false,
      actorName: userData.displayName || "Athlete",
      actorRole: "client"
    }).catch(() => {
    });
    res.json({
      success: true,
      pendingDowngradePlanId: targetPlan.id,
      pendingDowngradePlanName: targetPlan.name,
      effectiveAt
    });
  } catch (err) {
    console.error("[StripeServer] Downgrade error:", err.message);
    res.status(500).json({ error: err.message || "Failed to schedule downgrade" });
  }
});
app2.post("/api/stripe/cancel-subscription", async (req, res) => {
  try {
    const { clientId, reason } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: "clientId is required" });
    }
    const userRef = doc2(db, "users", clientId);
    const userSnap = await getDoc2(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const updates = cleanPayload({
      cancellationRequestedAt: nowIso,
      subscriptionStatus: "cancelled",
      cancellationReason: reason || "Client requested cancellation",
      updatedAt: nowIso
    });
    await updateDoc2(userRef, updates);
    if (stripe && userData.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      } catch (stripeErr) {
        console.warn("[StripeServer] Stripe subscription cancellation notice:", stripeErr.message);
      }
    }
    const coachId = userData.assignedCoachId || userData.coachId || "admin_mass_narimanian";
    const notifId = `notif_${Date.now()}_cancel_coach`;
    await setDoc2(doc2(db, "notifications", notifId), {
      id: notifId,
      userId: coachId,
      recipientRole: "coach",
      title: "Client Requested Cancellation",
      message: `${userData.displayName || "Athlete"} scheduled cancellation. Paid coaching access remains active until ${userData.planExpiresAt ? new Date(userData.planExpiresAt).toLocaleDateString() : "end of paid period"}.`,
      type: "system",
      actionTab: "clients",
      timestamp: nowIso,
      read: false,
      actorName: userData.displayName || "Athlete",
      actorRole: "client"
    }).catch(() => {
    });
    res.json({
      success: true,
      cancelledAt: nowIso,
      expiresAt: userData.planExpiresAt,
      message: "Subscription cancelled. You will retain full access until the end of your paid billing period."
    });
  } catch (err) {
    console.error("[StripeServer] Cancel subscription error:", err.message);
    res.status(500).json({ error: err.message || "Failed to cancel subscription" });
  }
});
app2.post("/api/stripe/reactivate-subscription", async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: "clientId is required" });
    }
    const userRef = doc2(db, "users", clientId);
    const userSnap = await getDoc2(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    if (!userData) {
      return res.status(404).json({ error: `Client ${clientId} not found` });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const updates = cleanPayload({
      cancellationRequestedAt: null,
      subscriptionStatus: "active",
      updatedAt: nowIso
    });
    await updateDoc2(userRef, updates);
    if (stripe && userData.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          cancel_at_period_end: false
        });
      } catch (stripeErr) {
        console.warn("[StripeServer] Stripe subscription reactivation notice:", stripeErr.message);
      }
    }
    res.json({
      success: true,
      status: "active",
      message: "Subscription successfully reactivated."
    });
  } catch (err) {
    console.error("[StripeServer] Reactivation error:", err.message);
    res.status(500).json({ error: err.message || "Failed to reactivate subscription" });
  }
});
async function checkExpirationsAndReminders() {
  console.log("[Scheduler] Running automated subscription expiration & reminder checks...");
  let remindersSent = 0;
  let expiredCount = 0;
  let downgradesProcessed = 0;
  try {
    const usersRef = collection2(db, "users");
    const snap = await getDocs2(usersRef);
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const clientId = docSnap.id;
      const status = data.subscriptionStatus || data.status;
      if (status !== "active" && status !== "cancelled" && status !== "past_due") {
        continue;
      }
      const planExpiresAt = data.planExpiresAt;
      if (!planExpiresAt) continue;
      const expiresMs = new Date(planExpiresAt).getTime();
      const cycle = determineBillingCycle({
        id: data.activePlanId,
        name: data.activePlanName,
        billingCycle: data.billingCycle
      });
      if (expiresMs <= now.getTime()) {
        if (data.pendingDowngradePlanId) {
          const newPlanInfo = calculatePlanPeriod({
            id: data.pendingDowngradePlanId,
            name: data.pendingDowngradePlanName,
            price: data.pendingDowngradePlanPrice
          });
          await updateDoc2(docSnap.ref, cleanPayload({
            activePlanId: data.pendingDowngradePlanId,
            activePlanName: data.pendingDowngradePlanName,
            activePlanPrice: data.pendingDowngradePlanPrice,
            billingCycle: newPlanInfo.billingCycle,
            sessionCredits: newPlanInfo.sessionCredits,
            usedSessionCredits: 0,
            packageStartedAt: newPlanInfo.startedAtIso,
            planExpiresAt: newPlanInfo.expiresAtIso,
            packageDurationDays: newPlanInfo.durationDays,
            subscriptionStatus: "active",
            pendingDowngradePlanId: null,
            pendingDowngradePlanName: null,
            downgradeEffectiveAt: null,
            remindersSent: [],
            updatedAt: nowIso
          }));
          downgradesProcessed++;
          continue;
        }
        if (cycle === "hourly") {
          const totalCredits = data.sessionCredits || 0;
          const usedCredits = data.usedSessionCredits || 0;
          if (totalCredits - usedCredits > 0) {
            continue;
          }
        }
        await updateDoc2(docSnap.ref, cleanPayload({
          subscriptionStatus: "expired",
          status: "expired",
          updatedAt: nowIso
        }));
        const clientNotifId = `notif_${Date.now()}_exp_${clientId}`;
        await setDoc2(doc2(db, "notifications", clientNotifId), {
          id: clientNotifId,
          userId: clientId,
          recipientRole: "client",
          title: "Coaching Plan Expired",
          message: "Your coaching period has ended. Historical workouts and progress remain saved. Renew your plan to continue receiving personalized coaching.",
          type: "system",
          actionTab: "profile",
          timestamp: nowIso,
          read: false,
          actorName: "BFL Billing",
          actorRole: "system"
        }).catch(() => {
        });
        const coachId = data.assignedCoachId || data.coachId;
        if (coachId) {
          const coachNotifId = `notif_${Date.now()}_exp_coach_${clientId}`;
          await setDoc2(doc2(db, "notifications", coachNotifId), {
            id: coachNotifId,
            userId: coachId,
            recipientRole: "coach",
            title: "Athlete Coaching Period Ended",
            message: `Athlete ${data.displayName || "Client"}'s plan has expired. Historical logs remain accessible.`,
            type: "system",
            actionTab: "clients",
            timestamp: nowIso,
            read: false,
            actorName: data.displayName || "Athlete",
            actorRole: "client"
          }).catch(() => {
          });
        }
        expiredCount++;
        continue;
      }
      const sentReminders = data.remindersSent || [];
      const dueReminders = evaluateDueReminders(planExpiresAt, cycle, sentReminders, now);
      if (dueReminders.length > 0) {
        const newSent = [...sentReminders, ...dueReminders];
        await updateDoc2(docSnap.ref, { remindersSent: newSent });
        for (const rem of dueReminders) {
          const timeText = rem === "3_day" ? "3 days" : "24 hours";
          const remNotifId = `notif_${Date.now()}_rem_${rem}_${clientId}`;
          await setDoc2(doc2(db, "notifications", remNotifId), {
            id: remNotifId,
            userId: clientId,
            recipientRole: "client",
            title: `Plan Expiring in ${timeText}`,
            message: `Your ${data.activePlanName || "coaching plan"} will end in ${timeText}. Renew or upgrade in your Account settings to keep training uninterrupted.`,
            type: "system",
            actionTab: "profile",
            timestamp: nowIso,
            read: false,
            actorName: "BFL Billing",
            actorRole: "system"
          }).catch(() => {
          });
          const coachId = data.assignedCoachId || data.coachId;
          if (coachId) {
            const coachRemNotifId = `notif_${Date.now()}_rem_coach_${rem}_${clientId}`;
            await setDoc2(doc2(db, "notifications", coachRemNotifId), {
              id: coachRemNotifId,
              userId: coachId,
              recipientRole: "coach",
              title: `Athlete Expiring in ${timeText}`,
              message: `Athlete ${data.displayName || "Client"}'s subscription ends in ${timeText}.`,
              type: "system",
              actionTab: "clients",
              timestamp: nowIso,
              read: false,
              actorName: data.displayName || "Athlete",
              actorRole: "client"
            }).catch(() => {
            });
          }
          remindersSent++;
        }
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error checking expirations:", err.message);
  }
  return { remindersSent, expiredCount, downgradesProcessed };
}
app2.post("/api/cron/check-expirations", async (_req, res) => {
  const result = await checkExpirationsAndReminders();
  res.json({ success: true, ...result });
});
setInterval(() => {
  checkExpirationsAndReminders().catch((err) => console.error("[Scheduler] Interval error:", err));
}, 60 * 60 * 1e3);
app2.post("/api/stripe/webhook", async (req, res) => {
  if (!stripe) {
    return res.status(503).send("Stripe is not configured");
  }
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      console.warn("[StripeWebhook] WARNING: STRIPE_WEBHOOK_SECRET not provided. Parsing body directly.");
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error("[StripeWebhook] Signature verification error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log(`[StripeWebhook] Processing event: ${event.type} (ID: ${event.id})`);
  try {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata || {};
        const clientId = metadata.clientId;
        if (!clientId) {
          console.warn("[StripeWebhook] checkout.session.completed missing clientId in metadata");
          break;
        }
        const userRef = doc2(db, "users", clientId);
        const userSnap = await getDoc2(userRef);
        if (!userSnap.exists()) break;
        const userData = userSnap.data();
        const processedEventIds = userData.processedEventIds || [];
        if (processedEventIds.includes(event.id)) {
          console.log(`[StripeWebhook] Duplicate event ${event.id} already processed. Safely ignoring.`);
          break;
        }
        const planId = metadata.planId || userData.activePlanId || "plan_online_monthly";
        const planName = metadata.planName || userData.activePlanName || "Coaching Package";
        const planInfo = calculatePlanPeriod(planId);
        const amount = session.amount_total ? session.amount_total / 100 : Number(userData.activePlanPrice) || 350;
        const invoiceNumber = metadata.invoiceNumber || `BFL-INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e4 + Math.random() * 9e4)}`;
        const txRecord = {
          id: session.id,
          clientId,
          clientName: metadata.clientName || session.customer_details?.name || userData.displayName || "Athlete",
          clientEmail: metadata.clientEmail || session.customer_details?.email || userData.email || "",
          planId,
          planName,
          amount,
          currency: (session.currency || "aud").toUpperCase(),
          status: "succeeded",
          paymentMethod: "Stripe Checkout",
          createdAt: nowIso,
          cardLast4: "4242",
          cardBrand: "Visa",
          invoiceNumber,
          billingPeriodStart: planInfo.startedAtIso,
          billingPeriodEnd: planInfo.expiresAtIso,
          durationDays: planInfo.durationDays,
          billingCycle: planInfo.billingCycle,
          sessionCredits: planInfo.sessionCredits,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.id,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : void 0,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : void 0,
          subtotal: amount,
          taxAmount: 0
        };
        await setDoc2(doc2(db, "transactions", session.id), txRecord);
        const prevHistory = userData.subscriptionHistory || [];
        const newHistory = [...prevHistory];
        if (userData.activePlanId && userData.packageStartedAt) {
          newHistory.push({
            planId: userData.activePlanId,
            planName: userData.activePlanName || userData.activePlanId,
            planPrice: userData.activePlanPrice || 0,
            startedAt: userData.packageStartedAt,
            endedAt: userData.planExpiresAt || nowIso,
            status: "expired",
            renewedAt: nowIso,
            billingCycle: userData.billingCycle || "monthly",
            sessionCredits: userData.sessionCredits || 0
          });
        }
        await updateDoc2(userRef, cleanPayload({
          status: "active",
          subscriptionStatus: "active",
          approvalStatus: "approved",
          activePlanId: planId,
          activePlanName: planName,
          activePlanPrice: amount,
          billingCycle: planInfo.billingCycle,
          sessionCredits: planInfo.sessionCredits,
          usedSessionCredits: 0,
          packageStartedAt: planInfo.startedAtIso,
          planExpiresAt: planInfo.expiresAtIso,
          packageDurationDays: planInfo.durationDays,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : void 0,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : void 0,
          processedEventIds: [...processedEventIds, event.id],
          subscriptionHistory: newHistory,
          cancellationRequestedAt: null,
          remindersSent: [],
          updatedAt: nowIso
        }));
        const coachId = userData.assignedCoachId || userData.coachId || "admin_mass_narimanian";
        const notifId = `notif_${Date.now()}_webhook_coach`;
        await setDoc2(doc2(db, "notifications", notifId), {
          id: notifId,
          userId: coachId,
          recipientRole: "coach",
          title: "Plan Activated via Stripe Checkout",
          message: `${userData.displayName || "Athlete"} paid $${amount} for ${planName}. Active until ${planInfo.formattedEnd}. Invoice: ${invoiceNumber}.`,
          type: "system",
          actionTab: "clients",
          timestamp: nowIso,
          read: false,
          actorName: userData.displayName || "Athlete",
          actorRole: "client"
        }).catch(() => {
        });
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
        const subscriptionId = invoice.subscription ? String(invoice.subscription) : "";
        const usersRef = collection2(db, "users");
        let matchedDocSnap = null;
        if (customerId) {
          const qCust = query2(usersRef, where2("stripeCustomerId", "==", customerId));
          const qSnap = await getDocs2(qCust);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }
        if (!matchedDocSnap && invoice.customer_email) {
          const qEmail = query2(usersRef, where2("email", "==", invoice.customer_email.toLowerCase()));
          const qSnap = await getDocs2(qEmail);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }
        if (matchedDocSnap) {
          const userData = matchedDocSnap.data();
          const processed = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;
          const planInfo = calculatePlanPeriod(userData.activePlanId || "plan_online_monthly");
          const amount = invoice.amount_paid ? invoice.amount_paid / 100 : userData.activePlanPrice || 350;
          await updateDoc2(matchedDocSnap.ref, cleanPayload({
            status: "active",
            subscriptionStatus: "active",
            packageStartedAt: nowIso,
            planExpiresAt: planInfo.expiresAtIso,
            stripeCustomerId: customerId || userData.stripeCustomerId,
            stripeSubscriptionId: subscriptionId || userData.stripeSubscriptionId,
            processedEventIds: [...processed, event.id],
            remindersSent: [],
            updatedAt: nowIso
          }));
          const coachId = userData.assignedCoachId || userData.coachId || "admin_mass_narimanian";
          const notifId = `notif_${Date.now()}_renewal_coach`;
          await setDoc2(doc2(db, "notifications", notifId), {
            id: notifId,
            userId: coachId,
            recipientRole: "coach",
            title: "Recurring Renewal Succeeded",
            message: `${userData.displayName || "Athlete"} successfully renewed ${userData.activePlanName || "Plan"} ($${amount}). Active until ${planInfo.formattedEnd}.`,
            type: "system",
            actionTab: "clients",
            timestamp: nowIso,
            read: false,
            actorName: userData.displayName || "Athlete",
            actorRole: "client"
          }).catch(() => {
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
        const usersRef = collection2(db, "users");
        let matchedDocSnap = null;
        if (customerId) {
          const qCust = query2(usersRef, where2("stripeCustomerId", "==", customerId));
          const qSnap = await getDocs2(qCust);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }
        if (!matchedDocSnap && invoice.customer_email) {
          const qEmail = query2(usersRef, where2("email", "==", invoice.customer_email.toLowerCase()));
          const qSnap = await getDocs2(qEmail);
          if (!qSnap.empty) matchedDocSnap = qSnap.docs[0];
        }
        if (matchedDocSnap) {
          const userData = matchedDocSnap.data();
          const processed = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;
          await updateDoc2(matchedDocSnap.ref, {
            status: "past_due",
            subscriptionStatus: "past_due",
            processedEventIds: [...processed, event.id],
            updatedAt: nowIso
          });
          const clientNotifId = `notif_${Date.now()}_fail_client`;
          await setDoc2(doc2(db, "notifications", clientNotifId), {
            id: clientNotifId,
            userId: matchedDocSnap.id,
            recipientRole: "client",
            title: "Renewal Payment Failed",
            message: "Your recurring coaching renewal payment failed. Please update your payment method to maintain uninterrupted coaching access.",
            type: "system",
            actionTab: "profile",
            timestamp: nowIso,
            read: false,
            actorName: "BFL Billing",
            actorRole: "system"
          }).catch(() => {
          });
          const coachId = userData.assignedCoachId || userData.coachId;
          if (coachId) {
            const coachNotifId = `notif_${Date.now()}_fail_coach`;
            await setDoc2(doc2(db, "notifications", coachNotifId), {
              id: coachNotifId,
              userId: coachId,
              recipientRole: "coach",
              title: "Athlete Payment Failed",
              message: `Payment failed for ${userData.displayName || "Athlete"}. Account is currently in grace period (past_due).`,
              type: "system",
              actionTab: "clients",
              timestamp: nowIso,
              read: false,
              actorName: userData.displayName || "Athlete",
              actorRole: "client"
            }).catch(() => {
            });
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : "";
        const usersRef = collection2(db, "users");
        const qCust = query2(usersRef, where2("stripeCustomerId", "==", customerId));
        const qSnap = await getDocs2(qCust);
        if (!qSnap.empty) {
          const userDoc = qSnap.docs[0];
          const userData = userDoc.data();
          const processed = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;
          const isCancelling = sub.cancel_at_period_end;
          const status = sub.status === "active" ? isCancelling ? "cancelled" : "active" : sub.status;
          await updateDoc2(userDoc.ref, cleanPayload({
            subscriptionStatus: status,
            cancellationRequestedAt: isCancelling ? userData.cancellationRequestedAt || nowIso : null,
            processedEventIds: [...processed, event.id],
            updatedAt: nowIso
          }));
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : "";
        const usersRef = collection2(db, "users");
        const qCust = query2(usersRef, where2("stripeCustomerId", "==", customerId));
        const qSnap = await getDocs2(qCust);
        if (!qSnap.empty) {
          const userDoc = qSnap.docs[0];
          const userData = userDoc.data();
          const processed = userData.processedEventIds || [];
          if (processed.includes(event.id)) break;
          await updateDoc2(userDoc.ref, {
            status: "expired",
            subscriptionStatus: "expired",
            processedEventIds: [...processed, event.id],
            updatedAt: nowIso
          });
          const coachId = userData.assignedCoachId || userData.coachId;
          if (coachId) {
            const coachNotifId = `notif_${Date.now()}_subdel_coach`;
            await setDoc2(doc2(db, "notifications", coachNotifId), {
              id: coachNotifId,
              userId: coachId,
              recipientRole: "coach",
              title: "Athlete Subscription Terminated",
              message: `Subscription deleted in Stripe for ${userData.displayName || "Athlete"}. Access transitioned to expired.`,
              type: "system",
              actionTab: "clients",
              timestamp: nowIso,
              read: false,
              actorName: userData.displayName || "Athlete",
              actorRole: "client"
            }).catch(() => {
            });
          }
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[StripeWebhook] Processing error:", err.message);
    res.status(500).json({ error: "Internal error processing webhook" });
  }
});
var isDirectRun = Boolean(
  process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"))
);
if (process.env.NODE_ENV === "production" && isDirectRun) {
  const distPath = path.join(process.cwd(), "dist");
  app2.use(express.static(distPath));
  app2.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
if (isDirectRun) {
  app2.listen(PORT, () => {
    console.log(`[BFL Fitness Server] Running on http://localhost:${PORT}`);
  });
}
var server_default = app2;
export {
  app2 as app,
  checkExpirationsAndReminders,
  server_default as default,
  stripe
};
