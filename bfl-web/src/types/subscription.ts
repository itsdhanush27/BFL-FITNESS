/**
 * subscription.ts
 * ---------------------------------------------------------------------------
 * Centralized subscription status types, Zod validation, and the canonical
 * function for deriving a client's subscription status from their profile data.
 *
 * This module is the SINGLE SOURCE OF TRUTH for coaching-access decisions.
 * All components, services, and guards must use these types and functions
 * instead of ad-hoc status checks.
 * ---------------------------------------------------------------------------
 */

import { z } from 'zod';

// ─── Subscription Status Enum ──────────────────────────────────────────────

/**
 * Canonical subscription statuses.
 *
 * - `active`    – Client is within their paid coaching period
 * - `past_due`  – Payment failed; within grace/retry window
 * - `expired`   – Paid period ended without renewal
 * - `cancelled` – Client requested cancellation; may still be active until end date
 * - `pending_coach_approval` – Plan chosen & paid; awaiting coach approval & routine initialization
 */
export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'expired', 'cancelled', 'pending_approval', 'pending_coach_approval'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Zod schema for runtime validation of subscription status values */
export const SubscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

// ─── Access Result ─────────────────────────────────────────────────────────

/** Result of checking whether a client can receive coaching services */
export interface SubscriptionAccessResult {
  /** Canonical status derived from the client's profile */
  status: SubscriptionStatus;
  /** Whether the client can currently receive NEW coaching content */
  canReceiveCoaching: boolean;
  /** Human-readable reason for the access decision */
  reason: string;
}

// ─── Subscription-Relevant Profile Fields ──────────────────────────────────

/** Record of a previous subscription period, preserved for historical auditing */
export interface HistoricalSubscription {
  planId: string;
  planName: string;
  planPrice: number;
  startedAt: string;
  endedAt: string;
  status: SubscriptionStatus;
  renewedAt?: string;
}

/**
 * Minimal set of fields required to derive subscription status.
 * Both `UserProfile` and `ClientRosterItem` satisfy this interface.
 */
export interface SubscriptionFields {
  status?: string;
  subscriptionStatus?: string;
  approvalStatus?: string;
  planExpiresAt?: string;
  packageStartedAt?: string;
  cancellationRequestedAt?: string;
  subscriptionHistory?: HistoricalSubscription[];
  processedEventIds?: string[];
}

// ─── Core Derivation Function ──────────────────────────────────────────────

/**
 * Derives the canonical `SubscriptionStatus` from a client's profile fields.
 *
 * Priority order:
 * 1. Explicit `subscriptionStatus` or `status` === 'past_due'
 * 2. Explicit cancellation flag → 'cancelled' (still active until end date)
 * 3. Explicit 'expired' on either status field
 * 4. `planExpiresAt` in the past → 'expired'
 * 5. Explicit 'active' or approved status → 'active'
 * 6. Pending coach approval states → 'pending_coach_approval' (not yet active for new coaching)
 * 7. Default → 'expired' (fail-safe: no proof of active = no coaching)
 */
export function getSubscriptionStatus(client?: SubscriptionFields | null): SubscriptionStatus {
  if (!client) return 'expired';

  const subStatus = (client.subscriptionStatus || '').toLowerCase();
  const status = (client.status || '').toLowerCase();

  // 1. Past-due payment
  if (subStatus === 'past_due' || status === 'past_due') {
    return 'past_due';
  }

  // 2. Cancellation requested — still check if within paid period
  if (client.cancellationRequestedAt) {
    if (client.planExpiresAt && new Date(client.planExpiresAt).getTime() > Date.now()) {
      return 'cancelled'; // Cancelled but still within paid period
    }
    return 'expired'; // Cancelled and past end date
  }

  // 3. Explicitly expired
  if (subStatus === 'expired' || status === 'expired') {
    return 'expired';
  }

  // 4. Plan expiration date has passed
  if (client.planExpiresAt) {
    const expiresMs = new Date(client.planExpiresAt).getTime();
    if (!isNaN(expiresMs) && expiresMs <= Date.now()) {
      return 'expired';
    }
  }

  // 5. Explicitly active
  if (subStatus === 'active' || status === 'active') {
    return 'active';
  }

  // 6. Pending coach approval — payment confirmed, awaiting coach routine initialization
  if (
    subStatus === 'pending_coach_approval' ||
    status === 'pending_coach_approval' ||
    subStatus === 'pending_approval' ||
    status === 'pending'
  ) {
    return 'pending_coach_approval';
  }

  // 7. Fail-safe default
  return 'expired';
}

// ─── Access Check Functions ────────────────────────────────────────────────

/**
 * Determines whether a client can currently receive NEW coaching services.
 * Only `active` and `past_due` statuses allow new coaching content.
 * `cancelled` clients can still receive coaching until their paid period ends.
 */
export function canReceiveCoaching(client?: SubscriptionFields | null): boolean {
  const status = getSubscriptionStatus(client);
  // Active and cancelled-but-still-in-period can receive coaching
  // Past-due is a gray area — we allow it during grace period
  return status === 'active' || status === 'cancelled' || status === 'past_due';
}

/**
 * Full access check with detailed result for UI and error messages.
 */
export function checkSubscriptionAccess(client?: SubscriptionFields | null): SubscriptionAccessResult {
  const status = getSubscriptionStatus(client);

  switch (status) {
    case 'active':
      return {
        status,
        canReceiveCoaching: true,
        reason: 'Client has an active coaching subscription.',
      };
    case 'past_due':
      return {
        status,
        canReceiveCoaching: true,
        reason: 'Payment is past due. Coaching continues during the grace period.',
      };
    case 'cancelled':
      return {
        status,
        canReceiveCoaching: true,
        reason: 'Client has cancelled but remains active until the end of their paid period.',
      };
    case 'pending_coach_approval':
      return {
        status,
        canReceiveCoaching: false,
        reason: 'Payment confirmed. Awaiting coach approval and program routine initialization.',
      };
    case 'expired':
      return {
        status,
        canReceiveCoaching: false,
        reason: 'Client coaching plan has expired. Renew or activate a plan before assigning new coaching content.',
      };
  }
}

// ─── Guard Function ────────────────────────────────────────────────────────

/**
 * Typed error thrown when a coaching mutation is attempted against
 * a client whose subscription does not permit new coaching content.
 */
export class SubscriptionExpiredError extends Error {
  readonly clientId: string;
  readonly subscriptionStatus: SubscriptionStatus;

  constructor(clientId: string, status: SubscriptionStatus) {
    super(
      `Client coaching plan has expired. Renew or activate a plan before assigning new coaching content.`
    );
    this.name = 'SubscriptionExpiredError';
    this.clientId = clientId;
    this.subscriptionStatus = status;
  }
}

/**
 * Guard function — throws `SubscriptionExpiredError` if the client
 * cannot receive new coaching content. Call this before any coaching mutation.
 */
export function assertClientCanReceiveCoaching(
  clientId: string,
  client?: SubscriptionFields | null
): void {
  const result = checkSubscriptionAccess(client);
  if (!result.canReceiveCoaching) {
    throw new SubscriptionExpiredError(clientId, result.status);
  }
}
