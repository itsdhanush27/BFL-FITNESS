import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SUBSCRIPTIONS_COL, USERS_COL } from '../services/firestoreService';
import type { SubscriptionDocument, UserProfile } from '../types';
import { getSubscriptionStatus, SubscriptionStatus } from '../types/subscription';

export interface UseClientSubscriptionResult {
  subscription: SubscriptionDocument | null;
  userProfile: Partial<UserProfile> | null;
  status: SubscriptionStatus;
  isPendingCoachApproval: boolean;
  isActive: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  activePlanId?: string;
  activePlanName?: string;
  activePlanPrice?: number;
  pendingPlanName?: string;
  pendingPlanPrice?: number;
  planExpiresAt?: string;
  packageStartedAt?: string;
  billingCycle?: 'hourly' | 'weekly' | 'monthly' | 'custom';
  sessionCredits?: number;
  usedSessionCredits?: number;
  remainingSessionCredits?: number;
  pendingDowngradePlanId?: string;
  pendingDowngradePlanName?: string;
  pendingDowngradePlanPrice?: number;
  downgradeEffectiveAt?: string;
  cancellationRequestedAt?: string;
  loading: boolean;
}

/**
 * Real-time hook listening to both `subscriptions/{clientId}` and `users/{clientId}`
 * via Firebase `onSnapshot`. Derives canonical subscription status, plan duration,
 * and session credits.
 */
export function useClientSubscription(clientId?: string): UseClientSubscriptionResult {
  const [subscription, setSubscription] = useState<SubscriptionDocument | null>(null);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(clientId));

  useEffect(() => {
    if (!clientId) {
      setSubscription(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Real-time listener on subscriptions/{clientId}
    const subRef = doc(db, SUBSCRIPTIONS_COL, clientId);
    const unsubSub = onSnapshot(
      subRef,
      (snap) => {
        if (snap.exists()) {
          const subData = { id: snap.id, ...snap.data() } as SubscriptionDocument;
          setSubscription(subData);
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`[useClientSubscription] subscriptions/${clientId} onSnapshot error:`, err);
        setLoading(false);
      }
    );

    // 2. Real-time listener on users/{clientId}
    const userRef = doc(db, USERS_COL, clientId);
    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const userData = snap.data() as UserProfile;
          setUserProfile(userData);
        } else {
          setUserProfile(null);
        }
      },
      (err) => {
        console.error(`[useClientSubscription] users/${clientId} onSnapshot error:`, err);
      }
    );

    return () => {
      unsubSub();
      unsubUser();
    };
  }, [clientId]);

  // Merge fields to check canonical subscription status
  const effectiveExpiresAt = subscription?.planExpiresAt || userProfile?.planExpiresAt;
  const effectiveStartedAt = subscription?.packageStartedAt || userProfile?.packageStartedAt;
  const effectiveSubStatus = subscription?.status || userProfile?.subscriptionStatus;
  const effectiveStatus = userProfile?.status;
  const billingCycle = subscription?.billingCycle || userProfile?.billingCycle || 'monthly';
  const sessionCredits = typeof userProfile?.sessionCredits === 'number'
    ? userProfile.sessionCredits
    : subscription?.sessionCredits;
  const usedSessionCredits = userProfile?.usedSessionCredits || 0;
  const remainingSessionCredits = typeof sessionCredits === 'number'
    ? Math.max(0, sessionCredits - usedSessionCredits)
    : undefined;

  const resolvedStatus: SubscriptionStatus = getSubscriptionStatus({
    status: effectiveStatus,
    subscriptionStatus: effectiveSubStatus,
    planExpiresAt: effectiveExpiresAt,
    packageStartedAt: effectiveStartedAt,
    cancellationRequestedAt: userProfile?.cancellationRequestedAt,
    billingCycle,
    sessionCredits,
    usedSessionCredits,
  });

  const isActive = resolvedStatus === 'active';
  const isExpired = resolvedStatus === 'expired';
  const isCancelled = resolvedStatus === 'cancelled';
  const isPendingCoachApproval = resolvedStatus === 'pending_coach_approval';

  return {
    subscription,
    userProfile,
    status: resolvedStatus,
    isPendingCoachApproval,
    isActive,
    isExpired,
    isCancelled,
    activePlanId: (subscription as any)?.activePlanId || subscription?.currentActivePlanId || userProfile?.activePlanId,
    activePlanName: (subscription as any)?.activePlanName || subscription?.currentActivePlanName || userProfile?.activePlanName,
    activePlanPrice: (subscription as any)?.activePlanPrice || userProfile?.activePlanPrice,
    pendingPlanName: subscription?.pendingPlanName || userProfile?.pendingPlanName,
    pendingPlanPrice: subscription?.pendingPlanPrice || userProfile?.pendingPlanPrice,
    planExpiresAt: effectiveExpiresAt,
    packageStartedAt: effectiveStartedAt,
    billingCycle,
    sessionCredits,
    usedSessionCredits,
    remainingSessionCredits,
    pendingDowngradePlanId: userProfile?.pendingDowngradePlanId || subscription?.pendingDowngradePlanId,
    pendingDowngradePlanName: userProfile?.pendingDowngradePlanName || subscription?.pendingDowngradePlanName,
    pendingDowngradePlanPrice: userProfile?.pendingDowngradePlanPrice || subscription?.pendingDowngradePlanPrice,
    downgradeEffectiveAt: userProfile?.downgradeEffectiveAt || subscription?.downgradeEffectiveAt,
    cancellationRequestedAt: userProfile?.cancellationRequestedAt,
    loading
  };
}
