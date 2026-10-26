import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SUBSCRIPTIONS_COL, USERS_COL } from '../services/firestoreService';
import type { SubscriptionDocument, UserProfile } from '../types';

export interface UseClientSubscriptionResult {
  subscription: SubscriptionDocument | null;
  userProfile: Partial<UserProfile> | null;
  status: string;
  isPendingCoachApproval: boolean;
  isActive: boolean;
  activePlanId?: string;
  activePlanName?: string;
  activePlanPrice?: number;
  pendingPlanName?: string;
  pendingPlanPrice?: number;
  planExpiresAt?: string;
  packageStartedAt?: string;
  loading: boolean;
}

/**
 * Real-time hook listening to both `subscriptions/{clientId}` and `users/{clientId}`
 * via Firebase `onSnapshot`. Immediately updates component state when the coach approves.
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
    console.log(`[useClientSubscription] Initializing real-time onSnapshot listeners for client: ${clientId}`);

    // 1. Real-time listener on subscriptions/{clientId}
    const subRef = doc(db, SUBSCRIPTIONS_COL, clientId);
    const unsubSub = onSnapshot(
      subRef,
      (snap) => {
        if (snap.exists()) {
          const subData = { id: snap.id, ...snap.data() } as SubscriptionDocument;
          console.log(`[useClientSubscription] Firestore snapshot (subscriptions/${clientId}):`, {
            exists: true,
            status: subData.status,
            pendingPlanId: subData.pendingPlanId,
            pendingPlanName: subData.pendingPlanName,
            activePlanId: (subData as any).activePlanId || subData.currentActivePlanId,
            activePlanName: (subData as any).activePlanName || subData.currentActivePlanName,
            approvedAt: subData.approvedAt,
            planExpiresAt: subData.planExpiresAt,
          });
          setSubscription(subData);
        } else {
          console.log(`[useClientSubscription] Firestore snapshot (subscriptions/${clientId}): document does not exist`);
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
          console.log(`[useClientSubscription] Firestore snapshot (users/${clientId}):`, {
            exists: true,
            subscriptionStatus: userData.subscriptionStatus,
            status: userData.status,
            activePlanId: userData.activePlanId,
            activePlanName: userData.activePlanName,
            pendingPlanId: userData.pendingPlanId,
            planExpiresAt: userData.planExpiresAt,
          });
          setUserProfile(userData);
        } else {
          console.log(`[useClientSubscription] Firestore snapshot (users/${clientId}): document does not exist`);
          setUserProfile(null);
        }
      },
      (err) => {
        console.error(`[useClientSubscription] users/${clientId} onSnapshot error:`, err);
      }
    );

    return () => {
      console.log(`[useClientSubscription] Cleaning up real-time listeners for clientId: ${clientId}`);
      unsubSub();
      unsubUser();
    };
  }, [clientId]);

  // Derive canonical status:
  // If either document has been transitioned to 'active', the program is officially approved & initialized!
  const isDocActive = subscription?.status === 'active' || userProfile?.subscriptionStatus === 'active';
  const isDocPending = 
    (subscription?.status === 'pending_coach_approval' || 
     userProfile?.subscriptionStatus === 'pending_coach_approval' || 
     Boolean(userProfile?.pendingPlanId)) && 
    !isDocActive;

  const resolvedStatus = isDocActive 
    ? 'active' 
    : isDocPending 
    ? 'pending_coach_approval' 
    : (subscription?.status || userProfile?.subscriptionStatus || 'active');

  return {
    subscription,
    userProfile,
    status: resolvedStatus,
    isPendingCoachApproval: isDocPending,
    isActive: isDocActive,
    activePlanId: (subscription as any)?.activePlanId || subscription?.currentActivePlanId || userProfile?.activePlanId,
    activePlanName: (subscription as any)?.activePlanName || subscription?.currentActivePlanName || userProfile?.activePlanName,
    activePlanPrice: (subscription as any)?.activePlanPrice || userProfile?.activePlanPrice,
    pendingPlanName: subscription?.pendingPlanName || userProfile?.pendingPlanName,
    pendingPlanPrice: subscription?.pendingPlanPrice || userProfile?.pendingPlanPrice,
    planExpiresAt: subscription?.planExpiresAt || userProfile?.planExpiresAt,
    packageStartedAt: subscription?.packageStartedAt || userProfile?.packageStartedAt,
    loading
  };
}
