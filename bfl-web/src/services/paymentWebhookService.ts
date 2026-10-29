/**
 * paymentWebhookService.ts
 * ---------------------------------------------------------------------------
 * Idempotent payment webhook event processor.
 *
 * Handles simulated / live provider payment and subscription lifecycle events:
 *   • invoice.payment_succeeded / customer.subscription.renewed
 *   • invoice.payment_failed
 *   • customer.subscription.deleted (cancellation)
 *   • customer.subscription.expired
 *
 * Enforces:
 *   1. Strict Zod validation on incoming events
 *   2. Idempotency via `processedEventIds` tracking on the user document
 *   3. Non-destructive historical preservation into `subscriptionHistory`
 *   4. Single notifications to coaches on renewal and expiration
 * ---------------------------------------------------------------------------
 */

import { z } from 'zod';
import { 
  getUserProfile, 
  updateUserProfile, 
  saveNotificationToFirestore 
} from './firestoreService';
import type { 
  UserProfile, 
  HistoricalSubscription, 
  SubscriptionStatus 
} from '../types';
import { calculatePlanPeriod, determineBillingCycle } from '../utils/planDurationUtils';

// ─── Webhook Event Schema ──────────────────────────────────────────────────

export const WebhookEventTypeSchema = z.enum([
  'payment_intent.succeeded',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.renewed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.expired',
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const PaymentWebhookEventSchema = z.object({
  /** Unique provider event ID — used for idempotency checks */
  id: z.string().min(1, 'Event ID is required for idempotency tracking'),
  type: WebhookEventTypeSchema,
  clientId: z.string().min(1, 'Target client ID is required'),
  planId: z.string().optional(),
  planName: z.string().optional(),
  planPrice: z.number().optional(),
  durationDays: z.number().optional(),
  timestamp: z.string().optional(),
});

export type PaymentWebhookEvent = z.infer<typeof PaymentWebhookEventSchema>;

export interface ProcessWebhookResult {
  processed: boolean;
  status: 'success' | 'duplicate_ignored' | 'error';
  reason: string;
  resultingSubscriptionStatus?: SubscriptionStatus;
}

// ─── Core Idempotent Event Handler ─────────────────────────────────────────

export async function processPaymentWebhookEvent(
  rawEvent: unknown
): Promise<ProcessWebhookResult> {
  // 1. Validate payload
  const parseResult = PaymentWebhookEventSchema.safeParse(rawEvent);
  if (!parseResult.success) {
    return {
      processed: false,
      status: 'error',
      reason: `Validation failed: ${parseResult.error.message}`,
    };
  }

  const event = parseResult.data;

  // 2. Fetch existing client document
  const clientProfile = await getUserProfile(event.clientId);
  if (!clientProfile) {
    return {
      processed: false,
      status: 'error',
      reason: `Client profile for ID "${event.clientId}" not found`,
    };
  }

  // 3. Idempotency check: if this event ID was already processed, ignore safely
  const processedIds: string[] = (clientProfile as any).processedEventIds || [];
  if (processedIds.includes(event.id)) {
    return {
      processed: false,
      status: 'duplicate_ignored',
      reason: `Event "${event.id}" has already been processed. Duplicate ignored.`,
      resultingSubscriptionStatus: clientProfile.subscriptionStatus as SubscriptionStatus,
    };
  }

  const updatedProcessedIds = [...processedIds, event.id];
  const now = new Date();
  const nowIso = now.toISOString();

  // 4. Handle event types
  switch (event.type) {
    case 'payment_intent.succeeded':
    case 'invoice.payment_succeeded':
    case 'customer.subscription.created':
    case 'customer.subscription.renewed': {
      const planName = event.planName || clientProfile.activePlanName || 'Coaching Package';
      const planPrice = event.planPrice ?? clientProfile.activePlanPrice ?? 0;
      const planId = event.planId || clientProfile.activePlanId || 'plan_online_monthly';

      // Calculate plan-specific duration & credits
      const planInfo = calculatePlanPeriod(
        { id: planId, name: planName, price: planPrice },
        event.durationDays || clientProfile.packageDurationDays
      );
      const startDate = nowIso;
      const expiresAt = planInfo.expiresAtIso;
      const durationDays = planInfo.durationDays;

      // Preserve old subscription to history if the client already had an active plan
      const existingHistory: HistoricalSubscription[] =
        (clientProfile as any).subscriptionHistory || [];
      const newHistory = [...existingHistory];

      if (clientProfile.activePlanId && clientProfile.packageStartedAt) {
        newHistory.push({
          planId: clientProfile.activePlanId,
          planName: clientProfile.activePlanName || clientProfile.activePlanId,
          planPrice: clientProfile.activePlanPrice || 0,
          startedAt: clientProfile.packageStartedAt,
          endedAt: clientProfile.planExpiresAt || nowIso,
          status: 'expired',
          renewedAt: nowIso,
          billingCycle: clientProfile.billingCycle || 'monthly',
          sessionCredits: clientProfile.sessionCredits || 0,
        });
      }

      // Update client profile to ACTIVE
      await updateUserProfile(event.clientId, {
        status: 'active',
        subscriptionStatus: 'active',
        approvalStatus: 'approved',
        activePlanId: planId,
        activePlanName: planName,
        activePlanPrice: planPrice,
        billingCycle: planInfo.billingCycle,
        sessionCredits: planInfo.sessionCredits,
        usedSessionCredits: 0,
        packageStartedAt: startDate,
        planExpiresAt: expiresAt,
        packageDurationDays: durationDays,
        cancellationRequestedAt: '',
        renewalRequestedPlanId: '',
        renewalRequestedPlanName: '',
        renewalRequestedPlanPrice: 0,
        renewalRequestedAt: '',
        remindersSent: [],
        processedEventIds: updatedProcessedIds,
        subscriptionHistory: newHistory,
      } as any);

      // Notify coach about renewal (idempotently delivered)
      const coachId = clientProfile.assignedCoachId || clientProfile.coachId;
      if (coachId) {
        const clientName = clientProfile.displayName || 'Client';
        const formattedStart = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedEnd = new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        await saveNotificationToFirestore({
          userId: coachId,
          recipientRole: 'coach',
          title: 'Client Plan Renewed',
          message: `Client ${clientName} renewed ${planName} (Active: ${formattedStart} – ${formattedEnd}).`,
          type: 'system',
          actionTab: 'clients',
          timestamp: nowIso,
          read: false,
          actorName: clientName,
          actorRole: 'client',
        }).catch((err) => console.warn('[paymentWebhookService] renewal notification error:', err));
      }

      return {
        processed: true,
        status: 'success',
        reason: `Subscription activated for client "${event.clientId}" until ${expiresAt}.`,
        resultingSubscriptionStatus: 'active',
      };
    }

    case 'invoice.payment_failed': {
      // Payment failure transitions client to past_due (grace period)
      await updateUserProfile(event.clientId, {
        status: 'past_due',
        subscriptionStatus: 'past_due',
        processedEventIds: updatedProcessedIds,
      } as any);

      // Notify client
      await saveNotificationToFirestore({
        userId: event.clientId,
        recipientRole: 'client',
        title: 'Payment Failed',
        message: 'Your scheduled subscription renewal payment failed. Please update your payment method to avoid service interruption.',
        type: 'system',
        actionTab: 'profile',
        timestamp: nowIso,
        read: false,
        actorName: 'Billing System',
        actorRole: 'system',
      }).catch((err) => console.warn('[paymentWebhookService] failure notification error:', err));

      return {
        processed: true,
        status: 'success',
        reason: `Subscription set to past_due for client "${event.clientId}".`,
        resultingSubscriptionStatus: 'past_due',
      };
    }

    case 'customer.subscription.updated': {
      // Handles plan changes or cancellation scheduling
      await updateUserProfile(event.clientId, {
        processedEventIds: updatedProcessedIds,
        updatedAt: nowIso,
      } as any);

      return {
        processed: true,
        status: 'success',
        reason: `Subscription updated for client "${event.clientId}".`,
        resultingSubscriptionStatus: clientProfile.subscriptionStatus as SubscriptionStatus,
      };
    }

    case 'customer.subscription.deleted': {
      // Client cancelled subscription — remains active until end date
      await updateUserProfile(event.clientId, {
        cancellationRequestedAt: nowIso,
        subscriptionStatus: 'cancelled',
        processedEventIds: updatedProcessedIds,
      } as any);

      return {
        processed: true,
        status: 'success',
        reason: `Cancellation recorded for client "${event.clientId}". Active until paid period ends.`,
        resultingSubscriptionStatus: 'cancelled',
      };
    }

    case 'customer.subscription.expired': {
      // Transition to expired
      await updateUserProfile(event.clientId, {
        status: 'expired',
        subscriptionStatus: 'expired',
        processedEventIds: updatedProcessedIds,
      } as any);

      // Notify coach about expiration
      const coachId = clientProfile.assignedCoachId || clientProfile.coachId;
      if (coachId) {
        const clientName = clientProfile.displayName || 'Client';
        await saveNotificationToFirestore({
          userId: coachId,
          recipientRole: 'coach',
          title: 'Client Plan Expired',
          message: `Client ${clientName}'s coaching plan has expired. Historical data is preserved. New coaching is paused.`,
          type: 'system',
          actionTab: 'clients',
          timestamp: nowIso,
          read: false,
          actorName: clientName,
          actorRole: 'client',
        }).catch((err) => console.warn('[paymentWebhookService] expiration notification error:', err));
      }

      return {
        processed: true,
        status: 'success',
        reason: `Subscription marked expired for client "${event.clientId}".`,
        resultingSubscriptionStatus: 'expired',
      };
    }
  }
}
