/**
 * firestoreService.ts
 * ---------------------------------------------------------------------------
 * Typed CRUD helpers and real-time subscriptions for Firestore collections:
 *   • users/{uid}      — client / coach / admin profiles
 *   • intakes/{id}     — onboarding intake submissions
 *   • workouts/{id}    — assigned workout routines & session logs
 * ---------------------------------------------------------------------------
 */

import {
  firebaseConfig,
  db,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch,
} from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

import type { 
  UserProfile, 
  IntakeFormData, 
  AssignedWorkout, 
  ClientRosterItem,
  NutritionPlan,
  WeeklyCheckIn,
  ChatMessage,
  CoachMember,
  ProgressMetricPoint,
  ProgressPhotoRecord,
  CompletedSession,
  CompleteSessionPayload,
  SubscriptionFields,
  CoachingPlan,
  SubscriptionDocument,
  TransactionRecord,
  ArchivedProgram
} from '../types';
import {
  assertClientCanReceiveCoaching,
  SubscriptionExpiredError
} from '../types/subscription';
import { CompleteSessionPayloadSchema, completedSessionConverter } from '../types/session';
import { INITIAL_COACHING_PLANS } from '../data/seedData';

// ───────────────────────────────────────────────────────────────────────────
// COLLECTION NAMES
// ───────────────────────────────────────────────────────────────────────────
export const USERS_COL     = 'users';
export const INTAKES_COL   = 'intakes';
export const WORKOUTS_COL  = 'workouts';
export const NUTRITION_COL = 'nutrition';
export const CHECKINS_COL  = 'checkins';
export const MESSAGES_COL  = 'messages';
export const COACHES_COL   = 'coaches';
export const NOTIFICATIONS_COL = 'notifications';
export const METRICS_COL   = 'metrics';
export const PROGRESS_PHOTOS_COL = 'progress_photos';
export const SUBSCRIPTIONS_COL = 'subscriptions';
export const TRANSACTIONS_COL = 'transactions';
export const ARCHIVED_PROGRAMS_COL = 'archived_programs';
export const COACHING_TIERS_COL = 'coaching_tiers';
export const PLANS_COL = 'plans';

// ───────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION ACCESS GUARD (Backend-level enforcement)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Fetches the minimal subscription-relevant fields for a client from Firestore.
 * Used by coaching mutation guards to enforce subscription access at the service layer.
 */
export async function getUserSubscriptionFields(clientId: string): Promise<SubscriptionFields | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COL, clientId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      status: data.status,
      subscriptionStatus: data.subscriptionStatus,
      approvalStatus: data.approvalStatus,
      planExpiresAt: data.planExpiresAt,
      packageStartedAt: data.packageStartedAt,
      cancellationRequestedAt: data.cancellationRequestedAt,
    };
  } catch (err) {
    console.error('[firestoreService] getUserSubscriptionFields error:', err);
    return null;
  }
}

/**
 * Backend-level guard: checks if the client's subscription allows new coaching content.
 * Call before any coaching mutation (workout assignment, nutrition prescription, etc.).
 * Throws `SubscriptionExpiredError` if the client cannot receive coaching.
 */
export async function enforceSubscriptionAccess(clientId: string): Promise<void> {
  const fields = await getUserSubscriptionFields(clientId);
  assertClientCanReceiveCoaching(clientId, fields);
}

/** Recursively strips undefined properties so Firestore doesn't reject write payloads */
export function cleanPayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanPayload(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = cleanPayload(value);
      }
    }
    return result as T;
  }
  return obj;
}

// ───────────────────────────────────────────────────────────────────────────
// USER PROFILE helpers
// ───────────────────────────────────────────────────────────────────────────

/** Read a single user document. Returns null if it doesn't exist. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COL, uid));
    if (snap.exists()) {
      return { ...snap.data(), uid, id: uid } as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('[firestoreService] getUserProfile error:', err);
    return null;
  }
}

/**
 * Create or fully overwrite a user document.
 * Uses { merge: true } so partial updates don't destroy unset fields.
 */
export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COL, uid), {
      ...profile,
      uid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[firestoreService] saveUserProfile error:', err);
    throw err;
  }
}

/** Partial field update on an existing user document. */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await updateDoc(doc(db, USERS_COL, uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] updateUserProfile error:', err);
    throw err;
  }
}

/** Real-time listener for a single user profile. Returns an unsubscribe function. */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(
    doc(db, USERS_COL, uid),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...snap.data(), uid, id: uid } as UserProfile);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('[firestoreService] subscribeToUserProfile error:', err);
      onUpdate(null);
    }
  );
}

/**
 * Real-time listener for all clients assigned to a specific coach
 * (or ALL clients if no coachId filter is provided — for admins).
 * Returns an unsubscribe function.
 */
export function subscribeToClients(
  coachId: string | null,
  onUpdate: (clients: ClientRosterItem[]) => void
): () => void {
  const colRef = collection(db, USERS_COL);
  const q = query(colRef, where('role', '==', 'client'));

  return onSnapshot(
    q,
    (snap) => {
      let list: ClientRosterItem[] = snap.docs.map((d) => {
        const data = d.data();
        const assigned = data.assignedCoachId || data.coachId || '';
        
        const isPending = Boolean(data.renewalRequestedPlanId) ||
          (data.status !== 'active' && data.approvalStatus !== 'approved' && (
            data.subscriptionStatus === 'pending_approval' || 
            data.approvalStatus === 'pending' || 
            data.status === 'pending' || 
            data.intakeStatus === 'pending_review'
          ));

        const isExpired = !isPending && (
          data.subscriptionStatus === 'expired' || 
          data.status === 'expired' ||
          (data.planExpiresAt && new Date(data.planExpiresAt).getTime() <= Date.now())
        );

        const effectiveStatus: ClientRosterItem['status'] = isPending
          ? 'pending'
          : (isExpired ? 'expired' : (data.status === 'active' || data.approvalStatus === 'approved' ? 'active' : 'pending'));

        const effectiveSubscriptionStatus: ClientRosterItem['subscriptionStatus'] = isPending
          ? 'pending_approval'
          : (isExpired ? 'expired' : (data.subscriptionStatus === 'active' || effectiveStatus === 'active' ? 'active' : (data.subscriptionStatus || 'pending_approval')));

        const effectiveIntakeStatus = effectiveStatus === 'active'
          ? (data.intakeStatus === 'pending_review' ? 'active' : (data.intakeStatus || 'active'))
          : (data.intakeStatus || 'pending_review');

        const matchingPlan = INITIAL_COACHING_PLANS.find(p => 
          p.id === data.activePlanId || 
          p.name?.toLowerCase() === data.activePlanName?.toLowerCase()
        );
        const resolvedPlanName = data.activePlanName 
          ? data.activePlanName 
          : (matchingPlan ? `${matchingPlan.name} ($${matchingPlan.price}${matchingPlan.period})` : (data.activePlanId || 'No Plan'));

        return {
          id: d.id,
          name: data.displayName || data.email || '',
          email: data.email || '',
          avatarUrl: data.photoURL || '',
          status: effectiveStatus,
          planName: resolvedPlanName,
          activePlanId: data.activePlanId,
          activePlanName: data.activePlanName || resolvedPlanName,
          activePlanPrice: data.activePlanPrice || matchingPlan?.price,
          adherenceRate: data.adherenceRate ?? 0,
          joinedDate: data.createdAt || '',
          primaryGoal: data.primaryGoal || '',
          startingWeightKg: data.startingWeightKg ?? (data.currentWeightKg ?? 0),
          currentWeightKg: data.currentWeightKg ?? 0,
          targetWeightKg: data.targetWeightKg ?? 0,
          injuryNotes: data.injuryNotes || '',
          daysPerWeek: data.daysPerWeek ?? (data.trainingDaysPerWeek ?? 0),
          availableEquipment: data.availableEquipment || [],
          assignedCoachId: assigned,
          coachId: assigned,
          intakeStatus: effectiveIntakeStatus,
          planExpiresAt: data.planExpiresAt,
          packageStartedAt: data.packageStartedAt,
          packageDurationDays: data.packageDurationDays,
          subscriptionStatus: effectiveSubscriptionStatus,
          renewalRequestedPlanId: data.renewalRequestedPlanId,
          renewalRequestedPlanName: data.renewalRequestedPlanName,
          renewalRequestedPlanPrice: data.renewalRequestedPlanPrice,
          renewalRequestedAt: data.renewalRequestedAt,
          waistCm: data.waistCm || data.baselineMeasurements?.waistCm,
          chestCm: data.chestCm || data.baselineMeasurements?.chestCm,
          bicepsCm: data.bicepsCm || data.baselineMeasurements?.bicepsCm,
          baselineMeasurements: data.baselineMeasurements || (data.waistCm ? { waistCm: data.waistCm, chestCm: data.chestCm, bicepsCm: data.bicepsCm } : undefined),
        } as ClientRosterItem;
      });

      if (coachId) {
        list = list.filter((c) => c.assignedCoachId === coachId || c.coachId === coachId);
      }

      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToClients error:', err);
      onUpdate([]);
    }
  );
}

// ───────────────────────────────────────────────────────────────────────────
// INTAKE FORM helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Submit intake form to Firestore `intakes` collection.
 * Also flips `hasCompletedIntake` and synchronizes baseline trajectory data on the client's user doc.
 */
export async function submitIntakeToFirestore(intakeData: IntakeFormData): Promise<string> {
  try {
    const cleaned = cleanPayload(intakeData);
    // 1. Write the intake document
    const docRef = await addDoc(collection(db, INTAKES_COL), {
      ...cleaned,
      submittedAt: serverTimestamp(),
      status: 'pending_review',
    });

    // 2. Mark user's intake as completed & sync baseline metrics to client profile (pending coach approval)
    await setDoc(doc(db, USERS_COL, intakeData.clientId), {
      hasCompletedIntake: true,
      intakeStatus: 'pending_review',
      approvalStatus: 'pending',
      subscriptionStatus: 'pending_approval',
      status: 'pending',
      primaryGoal: intakeData.primaryGoal || 'general_fitness',
      startingWeightKg: Number(intakeData.currentWeightKg) || 0,
      currentWeightKg: Number(intakeData.currentWeightKg) || 0,
      targetWeightKg: Number(intakeData.targetWeightKg) || 0,
      daysPerWeek: Number(intakeData.trainingDaysPerWeek) || 0,
      trainingDaysPerWeek: Number(intakeData.trainingDaysPerWeek) || 0,
      availableEquipment: intakeData.availableEquipment || [],
      injuryNotes: intakeData.injuryHistory || intakeData.medicalNotes || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 3. Automatically record baseline Day 0 progress metric point
    try {
      await addDoc(collection(db, METRICS_COL), cleanPayload({
        clientId: intakeData.clientId,
        date: new Date().toISOString().split('T')[0],
        weightKg: Number(intakeData.currentWeightKg) || 0,
        waistCm: intakeData.baselineMeasurements?.waistCm,
        chestCm: intakeData.baselineMeasurements?.chestCm,
        bicepsCm: intakeData.baselineMeasurements?.bicepsCm,
        notes: 'Baseline recorded from Onboarding Intake',
        createdAt: serverTimestamp(),
      }));

      if (intakeData.startingPhotos?.front) {
        await addDoc(collection(db, PROGRESS_PHOTOS_COL), cleanPayload({
          clientId: intakeData.clientId,
          date: new Date().toISOString().split('T')[0],
          frontUrl: intakeData.startingPhotos.front,
          sideUrl: intakeData.startingPhotos.side || '',
          backUrl: intakeData.startingPhotos.back || '',
          weightKg: Number(intakeData.currentWeightKg) || 0,
          notes: 'Baseline Onboarding Physique',
          createdAt: serverTimestamp(),
        }));
      }
    } catch (metricErr) {
      console.warn('[firestoreService] Baseline metric recording note:', metricErr);
    }

    // 4. Dispatch admin notification for intake submission
    try {
      await saveNotificationToFirestore({
        id: 'notif_intake_' + docRef.id,
        recipientRole: 'admin',
        title: 'New Intake Submitted',
        message: `${intakeData.clientName || 'A new athlete'} has submitted their onboarding intake and is pending review.`,
        type: 'intake_submitted',
        timestamp: new Date().toISOString(),
        read: false,
        actorName: intakeData.clientName || 'Athlete',
        actorRole: 'client',
        actionTab: 'intakes',
      });
    } catch (notifErr) {
      console.warn('[firestoreService] Admin intake notification note:', notifErr);
    }

    return docRef.id;
  } catch (err) {
    console.error('[firestoreService] submitIntakeToFirestore error:', err);
    throw err;
  }
}

/**
 * Real-time listener for intake forms.
 * Coaches / admins see all; clients see only their own.
 */
export function subscribeToIntakes(
  filterClientId: string | null,
  onUpdate: (intakes: IntakeFormData[]) => void
): () => void {
  const colRef = collection(db, INTAKES_COL);
  const q = filterClientId
    ? query(colRef, where('clientId', '==', filterClientId))
    : colRef;

  return onSnapshot(
    q,
    (snap) => {
      const list: IntakeFormData[] = snap.docs.map((d) => {
        const data = d.data();
        let submittedAtStr = '';
        if (data.submittedAt?.toDate) {
          submittedAtStr = data.submittedAt.toDate().toISOString();
        } else if (typeof data.submittedAt === 'string') {
          submittedAtStr = data.submittedAt;
        } else if (data.submittedAt?.seconds) {
          submittedAtStr = new Date(data.submittedAt.seconds * 1000).toISOString();
        } else {
          submittedAtStr = new Date().toISOString();
        }
        return {
          ...data,
          id: d.id,
          submittedAt: submittedAtStr
        } as IntakeFormData;
      });
      list.sort((a, b) => {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToIntakes error:', err);
    }
  );
}

/**
 * Update intake status in Firestore ('intakes' collection and 'users' collection).
 * When coach initializes a program or marks intake as reviewed:
 * 1. Updates the intake document's status to 'reviewed' (or 'active') with timestamp.
 * 2. Updates any matching documents in `intakes` with clientId.
 * 3. Updates the client's user document in `users` with intakeStatus and active status.
 */
export async function updateIntakeStatusInFirestore(
  intakeId: string,
  clientId?: string,
  status: 'pending_review' | 'program_created' | 'reviewed' | 'active' = 'reviewed'
): Promise<void> {
  try {
    const promises: Promise<any>[] = [];

    // 1. Direct update by intakeId if provided and not purely a synthetic prefix
    if (intakeId && !intakeId.startsWith('intake_synth_')) {
      const intakeDocRef = doc(db, INTAKES_COL, intakeId);
      promises.push(
        setDoc(
          intakeDocRef,
          {
            status,
            reviewedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((err) => console.warn('[firestoreService] update intakeDocRef note:', err))
      );
    }

    // 2. Query any documents in `intakes` collection where clientId == clientId
    if (clientId) {
      try {
        const q = query(collection(db, INTAKES_COL), where('clientId', '==', clientId));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          if (d.id !== intakeId) {
            promises.push(
              updateDoc(d.ref, {
                status,
                reviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }).catch((err) => console.warn('[firestoreService] updateDoc on intake doc note:', err))
            );
          }
        });
      } catch (qErr) {
        console.warn('[firestoreService] query intakes by clientId note:', qErr);
      }

      // 3. Update client profile in `users` collection to reflect reviewed intake and active/pending status
      try {
        const userDocRef = doc(db, USERS_COL, clientId);
        const isApprovedActive = status === 'active';
        promises.push(
          setDoc(
            userDocRef,
            {
              intakeStatus: status,
              status: isApprovedActive ? 'active' : 'pending',
              approvalStatus: isApprovedActive ? 'approved' : 'pending',
              subscriptionStatus: isApprovedActive ? 'active' : 'pending_approval',
              hasCompletedIntake: true,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((userErr) => console.warn('[firestoreService] update client user doc note:', userErr))
        );
      } catch (userErr) {
        console.warn('[firestoreService] update client user doc note:', userErr);
      }
    }

    await Promise.all(promises);
  } catch (err) {
    console.error('[firestoreService] updateIntakeStatusInFirestore error:', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// WORKOUT helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Publish / assign a workout to an athlete.
 * If the workout already has an `id` we update in-place, otherwise create new.
 */
export async function publishWorkoutToFirestore(
  workout: AssignedWorkout,
  coachId?: string,
  /** Set to true to skip subscription check (used during plan initialization) */
  skipSubscriptionCheck: boolean = false
): Promise<string> {
  try {
    // Backend-level subscription enforcement
    if (!skipSubscriptionCheck && workout.clientId) {
      await enforceSubscriptionAccess(workout.clientId);
    }

    const cleaned = cleanPayload({
      ...workout,
      isDraft: false,
      status: 'published',
      publishedAt: workout.publishedAt || new Date().toISOString(),
    });
    const payload: Record<string, any> = {
      ...cleaned,
      coachId: coachId || '',
      updatedAt: serverTimestamp(),
    };

    let savedId: string;
    if (workout.id && workout.id.length > 5 && !workout.id.startsWith('draft_')) {
      // Update existing document
      await setDoc(doc(db, WORKOUTS_COL, workout.id), payload, { merge: true });
      savedId = workout.id;
    } else {
      // Create new document
      delete payload.id; // Let Firestore assign the ID
      const docRef = await addDoc(collection(db, WORKOUTS_COL), payload);
      savedId = docRef.id;
    }

    // Clean up draft document if one existed for this client
    if (workout.clientId) {
      try {
        await deleteDoc(doc(db, WORKOUTS_COL, `draft_${workout.clientId}`));
      } catch {
        // ignore if didn't exist
      }
    }

    return savedId;
  } catch (err) {
    if (err instanceof SubscriptionExpiredError) throw err;
    console.error('[firestoreService] publishWorkoutToFirestore error:', err);
    throw err;
  }
}

/**
 * Saves a workout routine as an unpublished draft in Firestore.
 * Does not notify the client and is filtered out from client-facing workout queries.
 */
export async function saveDraftWorkoutToFirestore(
  workout: AssignedWorkout,
  coachId?: string
): Promise<string> {
  try {
    if (!workout.clientId) throw new Error('clientId is required to save a draft workout');
    const draftId = `draft_${workout.clientId}`;
    const cleaned = cleanPayload({
      ...workout,
      id: draftId,
      isDraft: true,
      status: 'draft',
    });
    const payload: Record<string, any> = {
      ...cleaned,
      coachId: coachId || '',
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, WORKOUTS_COL, draftId), payload, { merge: true });
    return draftId;
  } catch (err) {
    console.error('[firestoreService] saveDraftWorkoutToFirestore error:', err);
    throw err;
  }
}

/**
 * Deletes the draft workout document for a client in Firestore.
 */
export async function deleteDraftWorkoutFromFirestore(clientId: string): Promise<void> {
  if (!clientId) return;
  try {
    await deleteDoc(doc(db, WORKOUTS_COL, `draft_${clientId}`));
  } catch (err) {
    console.warn('[firestoreService] deleteDraftWorkoutFromFirestore note:', err);
  }
}

/**
 * Real-time listener for unpublished draft workout assigned to a specific client.
 */
export function subscribeToAthleteDraftWorkout(
  clientId: string,
  onUpdate: (draft: AssignedWorkout | null) => void
): () => void {
  if (!clientId) {
    onUpdate(null);
    return () => {};
  }
  const draftRef = doc(db, WORKOUTS_COL, `draft_${clientId}`);
  return onSnapshot(
    draftRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && (data.isDraft === true || data.status === 'draft')) {
          onUpdate({ ...data, id: snap.id } as AssignedWorkout);
          return;
        }
      }
      onUpdate(null);
    },
    (err) => {
      console.warn('[firestoreService] subscribeToAthleteDraftWorkout note:', err);
      onUpdate(null);
    }
  );
}

/**
 * Real-time listener for workouts assigned to a specific client.
 * Returns the most recent incomplete workout (or latest completed if none active).
 * Excludes drafts by default so clients never see unpublished routines.
 */
export function subscribeToAthleteWorkouts(
  clientId: string,
  onUpdate: (workout: AssignedWorkout | null) => void,
  includeDrafts: boolean = false
): () => void {
  const q = query(
    collection(db, WORKOUTS_COL),
    where('clientId', '==', clientId)
  );

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onUpdate(null);
        return;
      }
      const rawWorkouts = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as AssignedWorkout[];

      // By default, filter out drafts so client never sees unpublished programs
      const workouts = includeDrafts
        ? rawWorkouts
        : rawWorkouts.filter(w => !w.isDraft && w.status !== 'draft');

      if (workouts.length === 0) {
        onUpdate(null);
        return;
      }

      // Sort in memory: newest updatedAt or assignedDate first
      workouts.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
        if (timeA !== timeB) return timeB - timeA;
        return (b.assignedDate || '').localeCompare(a.assignedDate || '');
      });

      // Prefer the first incomplete workout, otherwise the latest
      const active = workouts.find((w) => !w.isCompleted);
      onUpdate(active || workouts[0] || null);
    },
    (err) => {
      console.error('[firestoreService] subscribeToAthleteWorkouts error:', err);
      // Keep existing workout state rather than wiping out on network interruption
    }
  );
}

/**
 * Permanently clears all previous workout assignments and nutrition records
 * for an athlete upon renewal or new package checkout.
/**
 * Safely clears only active, uncompleted draft workouts when reinitializing a routine.
 * Historical completed sessions and past logs are strictly PRESERVED.
 */
export async function clearAthleteWorkoutsAndNutrition(clientId: string): Promise<void> {
  if (!clientId) return;
  try {
    const promises: Promise<any>[] = [];
    
    // Only delete uncompleted draft routines for this client — NEVER completed history
    try {
      const workoutQ = query(
        collection(db, WORKOUTS_COL), 
        where('clientId', '==', clientId),
        where('isCompleted', '==', false)
      );
      const workoutSnap = await getDocs(workoutQ);
      workoutSnap.docs.forEach((d) => {
        promises.push(deleteDoc(d.ref).catch((err) => console.warn('[firestoreService] delete draft workout error:', err)));
      });
    } catch (wErr) {
      console.warn('[firestoreService] clearAthleteWorkouts error:', wErr);
    }

    await Promise.all(promises);
  } catch (err) {
    console.warn('[firestoreService] clearAthleteWorkoutsAndNutrition error:', err);
  }
}

/**
 * Real-time listener for ALL workouts (coach / admin view).
 */
export function subscribeToAllWorkouts(
  onUpdate: (workouts: AssignedWorkout[]) => void
): () => void {
  const q = query(
    collection(db, WORKOUTS_COL),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as AssignedWorkout[];
      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToAllWorkouts error:', err);
      onUpdate([]);
    }
  );
}

/**
 * Update a workout document (log sets, complete workout, rating, etc.).
 */
export async function updateWorkoutLog(
  workoutId: string,
  updates: Partial<AssignedWorkout>
): Promise<void> {
  try {
    const feedbackVal = updates.feedback ?? updates.clientGeneralFeedback;
    const normalizedUpdates = {
      ...updates,
      ...(feedbackVal !== undefined ? { feedback: feedbackVal, clientGeneralFeedback: feedbackVal } : {}),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, WORKOUTS_COL, workoutId), normalizedUpdates);
  } catch (err) {
    console.error('[firestoreService] updateWorkoutLog error:', err);
    throw err;
  }
}

/**
 * Strongly typed workout completion writer.
 * Invoked by "Log to Training History" in Client Portal.
 */
export async function logCompletedWorkoutSession(
  payload: CompleteSessionPayload
): Promise<void> {
  try {
    const validated = CompleteSessionPayloadSchema.parse(payload);
    const docRef = doc(db, WORKOUTS_COL, validated.workoutId);

    await updateDoc(docRef, {
      isCompleted: true,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completedDate: new Date().toISOString().split('T')[0],
      rating: validated.rating,
      feedback: validated.feedback,
      clientGeneralFeedback: validated.feedback,
      durationMinutes: validated.durationMinutes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] logCompletedWorkoutSession error:', err);
    throw err;
  }
}

/**
 * Real-time listener for an athlete's completed training sessions.
 * Strongly typed with Firestore CompletedSession converter and memory sorting.
 */
export function subscribeToAthleteCompletedSessions(
  clientId: string,
  onUpdate: (sessions: CompletedSession[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!clientId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, WORKOUTS_COL).withConverter(completedSessionConverter),
    where('clientId', '==', clientId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const allDocs = snapshot.docs.map((d) => d.data());
      // Filter for completed sessions and sort descending by completion/update time
      const completedSessions = allDocs
        .filter((s) => s.isCompleted)
        .sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
          if (timeA !== timeB) return timeB - timeA;
          return (b.assignedDate || '').localeCompare(a.assignedDate || '');
        });

      onUpdate(completedSessions);
    },
    (err) => {
      console.error(`[firestoreService] subscribeToAthleteCompletedSessions error for ${clientId}:`, err);
      if (onError) onError(err);
      onUpdate([]);
    }
  );
}

/** Delete a workout document. */
export async function deleteWorkout(workoutId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, WORKOUTS_COL, workoutId));
  } catch (err) {
    console.error('[firestoreService] deleteWorkout error:', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// NUTRITION helpers
// ───────────────────────────────────────────────────────────────────────────

/** Real-time listener for athlete prescribed nutrition plan. */
export function subscribeToClientNutrition(
  clientId: string,
  onUpdate: (plan: NutritionPlan | null) => void
): () => void {
  return onSnapshot(
    doc(db, NUTRITION_COL, clientId),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...snap.data(), clientId } as NutritionPlan);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('[firestoreService] subscribeToClientNutrition error:', err);
      onUpdate(null);
    }
  );
}

/** Save or update prescribed nutrition targets for an athlete. */
export async function savePrescribedNutrition(
  clientId: string,
  plan: Partial<NutritionPlan>,
  /** Set to true to skip subscription check (used during plan initialization) */
  skipSubscriptionCheck: boolean = false
): Promise<void> {
  try {
    // Backend-level subscription enforcement
    if (!skipSubscriptionCheck) {
      await enforceSubscriptionAccess(clientId);
    }

    const cleaned = cleanPayload(plan);
    await setDoc(
      doc(db, NUTRITION_COL, clientId),
      {
        ...cleaned,
        clientId,
        updatedAt: new Date().toISOString().split('T')[0],
      },
      { merge: true }
    );
  } catch (err) {
    if (err instanceof SubscriptionExpiredError) throw err;
    console.error('[firestoreService] savePrescribedNutrition error:', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// WEEKLY CHECK-IN helpers
// ───────────────────────────────────────────────────────────────────────────

/** Real-time listener for check-ins submitted by a specific client (or all checkins for admin). */
export function subscribeToClientCheckIns(
  clientId: string | null,
  onUpdate: (checkins: WeeklyCheckIn[]) => void
): () => void {
  const colRef = collection(db, CHECKINS_COL);
  const q = clientId
    ? query(colRef, where('clientId', '==', clientId))
    : colRef;

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as WeeklyCheckIn[];
      // Sort descending by weekNumber or date
      list.sort((a, b) => {
        if (b.weekNumber !== undefined && a.weekNumber !== undefined && b.weekNumber !== a.weekNumber) {
          return (b.weekNumber || 0) - (a.weekNumber || 0);
        }
        const dateA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
        const dateB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        return dateB - dateA;
      });
      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToClientCheckIns error:', err);
      onUpdate([]);
    }
  );
}

/** Submit a weekly check-in form to Firestore. */
export async function submitCheckInToFirestore(
  checkInData: Omit<WeeklyCheckIn, 'id'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, CHECKINS_COL), {
      ...checkInData,
      submissionDate: new Date().toISOString().split('T')[0],
      reviewedByCoach: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[firestoreService] submitCheckInToFirestore error:', err);
    throw err;
  }
}

/** Save coach review and feedback on a check-in. */
export async function saveCoachCheckInFeedback(
  checkInId: string,
  feedback: string
): Promise<void> {
  try {
    await updateDoc(doc(db, CHECKINS_COL, checkInId), {
      coachFeedback: feedback,
      reviewedByCoach: true,
      reviewedAt: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] saveCoachCheckInFeedback error:', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 1-ON-1 MESSAGING helpers
// ───────────────────────────────────────────────────────────────────────────

/** Real-time listener for messages in an athlete's thread. */
export function subscribeToMessages(
  clientId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  const colRef = collection(db, MESSAGES_COL);
  const q = query(
    colRef,
    where('clientId', '==', clientId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as ChatMessage[];
      // Sort ascending by timestamp
      list.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToMessages error:', err);
      onUpdate([]);
    }
  );
}

/** Send a new message to Firestore. */
export async function sendMessageToFirestore(
  msgData: Omit<ChatMessage, 'id'> & { clientId: string }
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, MESSAGES_COL), {
      ...msgData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[firestoreService] sendMessageToFirestore error:', err);
    throw err;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// COACHES & FOUNDERS DIRECTORY helpers
// ───────────────────────────────────────────────────────────────────────────

export const DEFAULT_FOUNDERS_AND_COACHES: CoachMember[] = [
  {
    id: 'admin_mass_narimanian',
    name: 'Mass Narimanian',
    email: 'mass@bflfitness.com',
    role: 'admin',
    isAdmin: true,
    avatarUrl: '/assets/founders/mass-gym.jpg',
    specialty: 'Co-Founder • Executive Physique & Hypertrophy Engineering',
    activeClientsCount: 0,
    maxClients: 25,
    status: 'active',
    joinedDate: 'Jan 2024',
    bio: 'Co-Founder & Administrator. Specializing in advanced hypertrophy mechanics, metabolic rate reconstruction, and high-performance physique transformations.'
  },
  {
    id: 'admin_pouya_marghzari',
    name: 'Pouya Marghzari',
    email: 'pouya@bflfitness.com',
    role: 'admin',
    isAdmin: true,
    avatarUrl: '/assets/founders/pouya-boxing.jpg',
    specialty: 'Co-Founder • Biomechanics & Strength Periodization',
    activeClientsCount: 0,
    maxClients: 25,
    status: 'active',
    joinedDate: 'Jan 2024',
    bio: 'Co-Founder & Administrator. Master of neuromuscular movement efficiency, injury rehabilitation, and systematic progressive overload modeling.'
  }
];

/** Real-time listener for coaches from Firestore. */
export function subscribeToCoaches(
  onUpdate: (coaches: CoachMember[]) => void
): () => void {
  const colRef = collection(db, COACHES_COL);
  const legacyMockIds = ['coach_marcus', 'coach_marcus_vance', 'coach_sarah', 'coach_sarah_jenkins', 'coach_elena', 'coach_elena_rostova'];

  return onSnapshot(
    colRef,
    (snap) => {
      const rawList = snap.docs
        .map((d) => ({
          ...d.data(),
          id: d.id,
        }))
        .filter((d: any) => !legacyMockIds.includes(d.id)) as CoachMember[];

      // Deduplicate by normalized email so founders or coaches with multiple Auth/seed records never duplicate
      const byEmail = new Map<string, CoachMember>();
      for (const c of rawList) {
        const emailKey = (c.email || '').toLowerCase().trim();
        if (!emailKey) {
          byEmail.set(c.id, c);
          continue;
        }
        if (!byEmail.has(emailKey)) {
          byEmail.set(emailKey, c);
        } else {
          // If duplicate, prefer the canonical founder ID (admin_mass_narimanian or admin_pouya_marghzari)
          const existing = byEmail.get(emailKey)!;
          if (c.id.startsWith('admin_') && !existing.id.startsWith('admin_')) {
            byEmail.set(emailKey, c);
          }
        }
      }

      const list = Array.from(byEmail.values());

      // Sort founders first, then alphabetically by name
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      onUpdate(list.length > 0 ? list : DEFAULT_FOUNDERS_AND_COACHES);
    },
    (err) => {
      console.error('[firestoreService] subscribeToCoaches error:', err);
      onUpdate(DEFAULT_FOUNDERS_AND_COACHES);
    }
  );
}

/** Save or update a coach in both 'coaches' and 'users' collections in Firestore. */
export async function saveCoachToFirestore(coach: CoachMember): Promise<void> {
  try {
    let coachId = coach.id || `coach_${Date.now()}`;
    const normEmail = (coach.email || '').toLowerCase().trim();
    if (normEmail === 'mass@bflfitness.com' || normEmail === 'mass.narimanian@bflfitness.com') {
      coachId = 'admin_mass_narimanian';
    } else if (normEmail === 'pouya@bflfitness.com' || normEmail === 'pouya.marghzari@bflfitness.com') {
      coachId = 'admin_pouya_marghzari';
    }

    const coachDoc = {
      ...coach,
      id: coachId,
      updatedAt: serverTimestamp(),
    };

    // Save to coaches collection
    await setDoc(doc(db, COACHES_COL, coachId), coachDoc, { merge: true });

    // Also synchronize user profile document for auth & security rules
    await setDoc(
      doc(db, USERS_COL, coachId),
      {
        uid: coachId,
        id: coachId,
        displayName: coach.name,
        email: coach.email,
        role: coach.role === 'admin' ? 'admin' : 'coach',
        photoURL: coach.avatarUrl,
        specialty: coach.specialty,
        bio: coach.bio,
        status: coach.status,
        coachId: coachId,
        assignedCoachId: coachId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[firestoreService] saveCoachToFirestore error:', err);
    throw err;
  }
}

/** Delete a coach from Firestore (protects founders). */
export async function deleteCoachFromFirestore(coachId: string): Promise<void> {
  if (coachId === 'admin_mass_narimanian' || coachId === 'admin_pouya_marghzari') {
    console.warn('[firestoreService] Cannot delete founders from Firestore.');
    return;
  }

  try {
    await deleteDoc(doc(db, COACHES_COL, coachId));
  } catch (err) {
    console.error('[firestoreService] deleteCoachFromFirestore error:', err);
    throw err;
  }
}

/** Assign a coach to a client in Firestore ('users' and 'intakes' collections). */
export async function assignCoachToClientInFirestore(
  clientId: string,
  coachId: string,
  coachName?: string
): Promise<void> {
  try {
    // 1. Update users/{clientId}
    await updateDoc(doc(db, USERS_COL, clientId), {
      coachId,
      assignedCoachId: coachId,
      coachName: coachName || '',
      updatedAt: serverTimestamp(),
    });

    // 2. Update any matching intake documents in intakes collection
    const q = query(collection(db, INTAKES_COL), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    const updatePromises = snap.docs.map((intakeDoc) =>
      updateDoc(intakeDoc.ref, {
        coachId,
        assignedCoachId: coachId,
        coachName: coachName || '',
        updatedAt: serverTimestamp(),
      })
    );
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('[firestoreService] assignCoachToClientInFirestore error:', err);
    throw err;
  }
}

export interface CreateCoachAccountParams {
  name: string;
  email: string;
  password?: string;
  role: 'coach' | 'admin' | 'nutritionist';
  specialty: string;
  maxClients: number;
  avatarUrl?: string;
  bio?: string;
}

/**
 * Creates a new coach account in Firebase Authentication AND initializes
 * their profile in Firestore 'coaches' and 'users' collections.
 * Uses a temporary secondary FirebaseApp instance so the active admin session is not interrupted.
 */
export async function createCoachAccountInAuthAndFirestore(
  params: CreateCoachAccountParams
): Promise<CoachMember> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const password = params.password?.trim() || 'bflCoach2026!';
  const secondaryAppName = `SecondaryAuthApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let newUid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
    newUid = cred.user.uid;
    await signOut(secondaryAuth);
  } catch (authErr: any) {
    console.error('[firestoreService] createCoachAccountInAuthAndFirestore auth error:', authErr);
    if (authErr.code === 'auth/email-already-in-use') {
      throw new Error('A user with this email address already exists in the system.');
    }
    if (authErr.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters.');
    }
    throw new Error(authErr.message || 'Failed to create coach account in Firebase Authentication.');
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch {}
  }

  const coachMember: CoachMember = {
    id: newUid,
    name: params.name.trim(),
    email: normalizedEmail,
    role: params.role,
    specialty: params.specialty.trim(),
    maxClients: Number(params.maxClients) || 20,
    activeClientsCount: 0,
    status: 'active',
    avatarUrl: params.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    bio: params.bio?.trim() || 'Certified BFL Elite Transformation Specialist.',
    joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  };

  // Save to both 'coaches' and 'users' in Firestore
  await saveCoachToFirestore(coachMember);

  return coachMember;
}

/** Seed founders (Mass & Pouya) into Firestore if not present, and purge legacy mock coaches & duplicates. */
export async function seedFoundersAndCoachesToFirestore(): Promise<void> {
  const legacyMockIds = ['coach_marcus', 'coach_marcus_vance', 'coach_sarah', 'coach_sarah_jenkins', 'coach_elena', 'coach_elena_rostova'];
  for (const legId of legacyMockIds) {
    try {
      await deleteDoc(doc(db, COACHES_COL, legId));
      await deleteDoc(doc(db, USERS_COL, legId));
    } catch {}
  }

  // Purge any duplicate founder documents with non-canonical IDs
  try {
    const coachesSnap = await getDocs(collection(db, COACHES_COL));
    for (const docSnap of coachesSnap.docs) {
      const data = docSnap.data();
      const normEmail = (data.email || '').toLowerCase().trim();
      if (
        (normEmail === 'mass@bflfitness.com' && docSnap.id !== 'admin_mass_narimanian') ||
        (normEmail === 'pouya@bflfitness.com' && docSnap.id !== 'admin_pouya_marghzari')
      ) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (cleanErr) {
    console.debug('[firestoreService] Note cleaning duplicate founder docs:', cleanErr);
  }

  for (const coach of DEFAULT_FOUNDERS_AND_COACHES) {
    try {
      const snap = await getDoc(doc(db, COACHES_COL, coach.id));
      if (!snap.exists()) {
        await saveCoachToFirestore(coach);
      }
    } catch (err) {
      // Gracefully continue to next coach if rules or network restrict this one
      console.debug(`[firestoreService] Note seeding coach ${coach.id}:`, err);
    }
  }
}
// ───────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS helpers (Firestore-backed bidirectional sync)
// ───────────────────────────────────────────────────────────────────────────

import type { InAppNotification } from '../types';

/** Persist a notification to the Firestore `notifications` collection. */
export async function saveNotificationToFirestore(
  notif: InAppNotification | Omit<InAppNotification, 'id'>
): Promise<string> {
  try {
    const docId = (notif as InAppNotification).id || 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const cleaned = cleanPayload({
      ...notif,
      id: docId,
      read: notif.read ?? false,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, NOTIFICATIONS_COL, docId), cleaned, { merge: true });
    return docId;
  } catch (err) {
    console.error('[firestoreService] saveNotificationToFirestore error:', err);
    // Non-critical — notification will still exist in-memory
    return '';
  }
}

/**
 * Real-time listener for notifications targeted at a specific user or role.
 *
 * Scopes queries so that:
 *   - Clients receive documents where `userId == uid` or `recipientRole == 'client'`
 *   - Coaches/Admins receive:
 *       1) role-wide broadcasts where `recipientRole in ['coach', 'admin']`
 *       2) personal notifications where `userId` matches any of their IDs or email
 */
export function subscribeToNotifications(
  userId: string | undefined,
  role: string | undefined,
  onUpdate: (notifications: InAppNotification[]) => void,
  userIdentifiers: string[] = []
): () => void {
  const colRef = collection(db, NOTIFICATIONS_COL);
  const isCoachOrAdmin = role === 'coach' || role === 'admin';

  // Helper: convert a snapshot's docs into typed InAppNotification[]
  const mapDocs = (docs: import('firebase/firestore').QueryDocumentSnapshot[]) =>
    docs.map((d) => {
      const data = d.data();
      let ts = 'Just now';
      if (data.createdAt && data.createdAt.toDate) {
        const created = data.createdAt.toDate() as Date;
        const diffMs = Date.now() - created.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) ts = 'Just now';
        else if (diffMin < 60) ts = `${diffMin}m ago`;
        else if (diffMin < 1440) ts = `${Math.floor(diffMin / 60)}h ago`;
        else ts = `${Math.floor(diffMin / 1440)}d ago`;
      }
      return { ...data, id: d.id, timestamp: ts } as InAppNotification;
    });

  const handleError = (err: any) => {
    if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
      console.warn('[firestoreService] Notifications restricted by rules; defaulting to empty list.');
      onUpdate([]);
      return;
    }
    console.error('[firestoreService] subscribeToNotifications error:', err);
  };

  const sortByTime = (list: InAppNotification[]): InAppNotification[] => {
    return [...list].sort((a: any, b: any) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.timestamp && a.timestamp !== 'Just now' ? new Date(a.timestamp).getTime() : Date.now());
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.timestamp && b.timestamp !== 'Just now' ? new Date(b.timestamp).getTime() : Date.now());
      return timeB - timeA;
    });
  };

  // ── Client role ───────────────────────────────────────────────────
  if (!isCoachOrAdmin) {
    if (!userId) {
      onUpdate([]);
      return () => {};
    }

    let directResults: InAppNotification[] = [];
    let roleResults: InAppNotification[] = [];

    const mergeClient = () => {
      const map = new Map<string, InAppNotification>();
      for (const n of [...directResults, ...roleResults]) {
        map.set(n.id, n);
      }
      onUpdate(sortByTime(Array.from(map.values())).slice(0, 50));
    };

    const directQuery = query(colRef, where('userId', '==', userId));
    const unsubDirect = onSnapshot(directQuery, (snap) => {
      directResults = mapDocs(snap.docs);
      mergeClient();
    }, handleError);

    const clientRoleQuery = query(colRef, where('recipientRole', '==', 'client'));
    const unsubRole = onSnapshot(clientRoleQuery, (snap) => {
      roleResults = mapDocs(snap.docs);
      mergeClient();
    }, handleError);

    return () => {
      unsubDirect();
      unsubRole();
    };
  }

  // ── Coach / Admin: merge role-targeted + personal notifications ────
  let roleResults: InAppNotification[] = [];
  const personalMap = new Map<string, InAppNotification[]>();

  const mergeCoach = () => {
    const map = new Map<string, InAppNotification>();
    for (const n of roleResults) {
      map.set(n.id, n);
    }
    for (const list of personalMap.values()) {
      for (const n of list) {
        map.set(n.id, n);
      }
    }
    onUpdate(sortByTime(Array.from(map.values())).slice(0, 75));
  };

  // 1) Role-targeted notifications (recipientRole in ['coach', 'admin'])
  const roleQuery = query(colRef, where('recipientRole', 'in', ['coach', 'admin']));
  const unsubRole = onSnapshot(roleQuery, (snap) => {
    roleResults = mapDocs(snap.docs);
    mergeCoach();
  }, handleError);

  // 2) Personal notifications (userId matches any coach identifier)
  const unsubsPersonal: (() => void)[] = [];
  const distinctIds = Array.from(new Set([userId, ...userIdentifiers].filter(Boolean))) as string[];

  for (const id of distinctIds) {
    const personalQuery = query(colRef, where('userId', '==', id));
    const unsub = onSnapshot(personalQuery, (snap) => {
      personalMap.set(id, mapDocs(snap.docs));
      mergeCoach();
    }, handleError);
    unsubsPersonal.push(unsub);
  }

  return () => {
    unsubRole();
    unsubsPersonal.forEach(u => u());
  };
}

/** Mark a single notification as read in Firestore. */
export async function markNotificationReadInFirestore(
  notifId: string
): Promise<void> {
  if (!notifId) return;
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COL, notifId), { read: true });
  } catch (err) {
    console.debug('[firestoreService] markNotificationReadInFirestore note:', err);
  }
}

/** Mark multiple notifications as read in Firestore. */
export async function markAllNotificationsReadInFirestore(
  notifIds: string[]
): Promise<void> {
  if (!notifIds || notifIds.length === 0) return;
  try {
    const promises = notifIds.map(id =>
      updateDoc(doc(db, NOTIFICATIONS_COL, id), { read: true }).catch(() => {})
    );
    await Promise.all(promises);
  } catch (err) {
    console.debug('[firestoreService] markAllNotificationsReadInFirestore note:', err);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// PROGRESS METRICS & BIOMETRICS helpers
// ───────────────────────────────────────────────────────────────────────────

/** Save or log a progress metric data point into Firestore. */
export async function saveProgressMetricToFirestore(
  metric: Omit<ProgressMetricPoint, 'id'> & { id?: string }
): Promise<string> {
  try {
    const payload = {
      ...metric,
      date: metric.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (metric.id && metric.id.length > 5) {
      await setDoc(doc(db, METRICS_COL, metric.id), payload, { merge: true });
      return metric.id;
    } else {
      const docRef = await addDoc(collection(db, METRICS_COL), payload);
      return docRef.id;
    }
  } catch (err) {
    console.error('[firestoreService] saveProgressMetricToFirestore error:', err);
    throw err;
  }
}

/** Real-time listener for progress metrics of a client (or all metrics if clientId is null). */
export function subscribeToProgressMetrics(
  clientId: string | null,
  onUpdate: (metrics: ProgressMetricPoint[]) => void
): () => void {
  const colRef = collection(db, METRICS_COL);
  const q = clientId
    ? query(colRef, where('clientId', '==', clientId))
    : colRef;

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as ProgressMetricPoint[];

      // Sort chronological (oldest to newest for graphs)
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToProgressMetrics error:', err);
      onUpdate([]);
    }
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PROGRESS PHOTOS helpers
// ───────────────────────────────────────────────────────────────────────────

/** Save a progress physique photo record to Firestore. */
export async function saveProgressPhotoToFirestore(
  photo: Omit<ProgressPhotoRecord, 'id'> & { id?: string }
): Promise<string> {
  try {
    const payload = {
      ...photo,
      date: photo.date || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (photo.id && photo.id.length > 5) {
      await setDoc(doc(db, PROGRESS_PHOTOS_COL, photo.id), payload, { merge: true });
      return photo.id;
    } else {
      const docRef = await addDoc(collection(db, PROGRESS_PHOTOS_COL), payload);
      return docRef.id;
    }
  } catch (err) {
    console.error('[firestoreService] saveProgressPhotoToFirestore error:', err);
    throw err;
  }
}

/** Real-time listener for progress photos of a client (or all photos if clientId is null). */
export function subscribeToProgressPhotos(
  clientId: string | null,
  onUpdate: (photos: ProgressPhotoRecord[]) => void
): () => void {
  const colRef = collection(db, PROGRESS_PHOTOS_COL);
  const q = clientId
    ? query(colRef, where('clientId', '==', clientId))
    : colRef;

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as ProgressPhotoRecord[];

      // Sort chronological
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error('[firestoreService] subscribeToProgressPhotos error:', err);
      onUpdate([]);
    }
  );
}

// ───────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION UPGRADE & COACH APPROVAL ASYNC WORKFLOW
// ───────────────────────────────────────────────────────────────────────────

/**
 * Queries the coaching tiers / plans collection from Firestore with fallback to seed data.
 */
export async function fetchCoachingPlansFromFirestore(): Promise<CoachingPlan[]> {
  try {
    const tiersRef = collection(db, COACHING_TIERS_COL);
    const snap = await getDocs(tiersRef);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachingPlan));
    }
    const plansRef = collection(db, PLANS_COL);
    const altSnap = await getDocs(plansRef);
    if (!altSnap.empty) {
      return altSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachingPlan));
    }
  } catch (err) {
    console.debug('[firestoreService] fetchCoachingPlansFromFirestore note (using seed data):', err);
  }
  return INITIAL_COACHING_PLANS;
}

export interface PlanUpgradeParams {
  clientId: string;
  clientName: string;
  clientEmail: string;
  assignedCoachId: string;
  currentPlanId?: string;
  currentPlanName?: string;
  newPlan: CoachingPlan;
  paymentDetails: {
    cardLast4?: string;
    amount?: number;
  };
}

/**
 * Step 1 & 2: Log client transaction and register pending subscription in Firestore.
 * Does NOT overwrite active workout or nutrition program documents!
 */
export async function submitPlanUpgradeAndTransaction(
  params: PlanUpgradeParams
): Promise<{ transactionId: string; subscriptionId: string }> {
  const {
    clientId,
    clientName,
    clientEmail,
    assignedCoachId,
    currentPlanId,
    currentPlanName,
    newPlan,
    paymentDetails
  } = params;

  const requestedAt = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const subId = clientId;

  const durationDays = (newPlan.billingCycle as string) === 'annual' || newPlan.period?.includes('yr') ? 365 : newPlan.billingCycle === 'weekly' ? 7 : 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const invoiceNumber = `BFL-INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // 1. Log transaction in transactions/{txId}
  const txRef = doc(db, TRANSACTIONS_COL, txId);
  const txData = cleanPayload({
    id: txId,
    clientId,
    clientName,
    clientEmail,
    planId: newPlan.id,
    planName: newPlan.name,
    amount: paymentDetails.amount ?? newPlan.price,
    currency: 'AUD',
    status: 'succeeded' as const,
    paymentMethod: 'Credit / Debit Card',
    cardLast4: paymentDetails.cardLast4 || '4242',
    cardBrand: 'Visa',
    createdAt: requestedAt,
    invoiceNumber,
    billingPeriodStart: requestedAt,
    billingPeriodEnd: expiresAt,
    durationDays,
    subtotal: paymentDetails.amount ?? newPlan.price,
    taxAmount: 0,
  });
  await setDoc(txRef, txData);

  // 2. Create or update subscription record in subscriptions/{subId}
  const subRef = doc(db, SUBSCRIPTIONS_COL, subId);
  const subData = cleanPayload({
    id: subId,
    clientId,
    clientName,
    clientEmail,
    assignedCoachId: assignedCoachId || 'admin_mass_narimanian',
    currentActivePlanId: currentPlanId || null,
    currentActivePlanName: currentPlanName || null,
    pendingPlanId: newPlan.id,
    pendingPlanName: newPlan.name,
    pendingPlanPrice: newPlan.price,
    status: 'pending_coach_approval' as const,
    requestedAt,
    paymentReference: txId,
    planDurationDays: durationDays
  });
  await setDoc(subRef, subData, { merge: true });

  // 3. Update users/{clientId} profile with pending_coach_approval status
  const userRef = doc(db, USERS_COL, clientId);
  const userUpdate = cleanPayload({
    subscriptionStatus: 'pending_coach_approval',
    pendingPlanId: newPlan.id,
    pendingPlanName: newPlan.name,
    pendingPlanPrice: newPlan.price,
    renewalRequestedPlanId: newPlan.id,
    renewalRequestedPlanName: `${newPlan.name} ($${newPlan.price}${newPlan.period})`,
    renewalRequestedPlanPrice: newPlan.price,
    renewalRequestedAt: requestedAt,
  });
  await updateDoc(userRef, userUpdate).catch(async () => {
    // If doc was created differently, use setDoc merge
    await setDoc(userRef, userUpdate, { merge: true });
  });

  return { transactionId: txId, subscriptionId: subId };
}

/**
 * Real-time listener for subscriptions pending coach review and initialization.
 */
export function subscribeToPendingSubscriptions(
  callback: (subscriptions: SubscriptionDocument[]) => void,
  coachId?: string
): () => void {
  const subsRef = collection(db, SUBSCRIPTIONS_COL);
  const q = query(subsRef, where('status', '==', 'pending_coach_approval'));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as SubscriptionDocument[];

      if (coachId && coachId !== 'admin' && coachId !== 'all') {
        const lowerCoach = coachId.toLowerCase();
        const filtered = items.filter(
          (s) =>
            !s.assignedCoachId ||
            s.assignedCoachId.toLowerCase() === lowerCoach ||
            s.assignedCoachId === 'admin_mass_narimanian' ||
            s.assignedCoachId === 'admin_pouya_marghzari'
        );
        callback(filtered);
      } else {
        callback(items);
      }
    },
    (err) => {
      console.warn('[firestoreService] subscribeToPendingSubscriptions error:', err);
      callback([]);
    }
  );
}

/**
 * Real-time listener for a specific client's subscription document in subscriptions/{clientId}.
 */
export function subscribeToClientSubscription(
  clientId: string,
  callback: (subscription: SubscriptionDocument | null) => void
): () => void {
  if (!clientId) return () => {};
  const subRef = doc(db, SUBSCRIPTIONS_COL, clientId);

  return onSnapshot(
    subRef,
    (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as SubscriptionDocument;
        console.log(`[subscribeToClientSubscription] Real-time snapshot for client "${clientId}":`, {
          status: data.status,
          pendingPlanId: data.pendingPlanId,
          activePlanId: (data as any).activePlanId || data.currentActivePlanId,
          activePlanName: (data as any).activePlanName || data.currentActivePlanName,
          approvedAt: data.approvedAt,
          planExpiresAt: data.planExpiresAt,
        });
        callback(data);
      } else {
        console.log(`[subscribeToClientSubscription] Document subscriptions/${clientId} does not exist yet.`);
        callback(null);
      }
    },
    (err) => {
      console.error(`[subscribeToClientSubscription] Error listening to client "${clientId}":`, err);
    }
  );
}

export interface ApproveProgramBatchParams {
  clientId: string;
  coachId: string;
  coachName: string;
  plan: CoachingPlan;
  customDurationDays?: number;
  previousWorkout?: any;
  previousNutrition?: any;
  freshDraftWorkout: AssignedWorkout;
  freshNutritionSkeleton: Partial<NutritionPlan>;
}

/**
 * Step 5: Program Initialization (Firestore Batch write):
 * - Updates client's active subscription tier to 'active'
 * - Archives the old plan & workout document into archived_programs/{archiveId}
 * - Generates initial skeleton documents for fresh workout split and nutritional protocols
 */
export async function executeApproveAndInitializeProgramBatch(
  params: ApproveProgramBatchParams
): Promise<void> {
  const {
    clientId,
    coachId,
    coachName,
    plan,
    customDurationDays,
    previousWorkout,
    previousNutrition,
    freshDraftWorkout,
    freshNutritionSkeleton
  } = params;

  console.log(`[executeApproveAndInitializeProgramBatch] Initiating atomic batch write for client "${clientId}" by coach "${coachId}":`, {
    planId: plan.id,
    planName: plan.name,
    customDurationDays
  });

  const durationDays =
    customDurationDays ||
    ((plan.billingCycle as string) === 'annual' || plan.period?.includes('yr') ? 365 : plan.billingCycle === 'weekly' ? 7 : 30);
  const startedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const fullPlanLabel = `${plan.name} ($${plan.price}${plan.period})`;
  const archiveId = `archive_${clientId}_${Date.now()}`;

  const batch = writeBatch(db);

  // 1. Archive previous program in archived_programs/{archiveId}
  const archiveRef = doc(db, ARCHIVED_PROGRAMS_COL, archiveId);
  const archiveData = cleanPayload({
    id: archiveId,
    clientId,
    archivedAt: startedAt,
    archivedByCoachId: coachId,
    archivedByCoachName: coachName,
    archivedPlanId: plan.id,
    archivedPlanName: fullPlanLabel,
    previousWorkout: previousWorkout ? cleanPayload(previousWorkout) : null,
    previousNutrition: previousNutrition ? cleanPayload(previousNutrition) : null,
    reason: 'plan_upgrade_and_reinitialization',
  });
  batch.set(archiveRef, archiveData);

  // 2. Synchronously update user profile in users/{clientId} to active (use set with merge for safety)
  const userRef = doc(db, USERS_COL, clientId);
  const userUpdateData = cleanPayload({
    status: 'active',
    subscriptionStatus: 'active',
    approvalStatus: 'approved',
    intakeStatus: 'active',
    hasCompletedIntake: true,
    activePlanId: plan.id,
    activePlanName: fullPlanLabel,
    activePlanPrice: plan.price,
    packageStartedAt: startedAt,
    planExpiresAt: expiresAt,
    packageDurationDays: durationDays,
    pendingPlanId: null,
    pendingPlanName: null,
    pendingPlanPrice: null,
    renewalRequestedPlanId: null,
    renewalRequestedPlanName: null,
    renewalRequestedPlanPrice: null,
    renewalRequestedAt: null,
    cancellationRequestedAt: null,
    updatedAt: startedAt,
  });
  batch.set(userRef, userUpdateData, { merge: true });

  // 3. Synchronously update subscription document in subscriptions/{clientId} from pending_coach_approval to active
  const subRef = doc(db, SUBSCRIPTIONS_COL, clientId);
  const subUpdateData = cleanPayload({
    id: clientId,
    clientId,
    status: 'active' as const,
    activePlanId: plan.id,
    activePlanName: fullPlanLabel,
    activePlanPrice: plan.price,
    approvedAt: startedAt,
    approvedByCoachId: coachId,
    packageStartedAt: startedAt,
    planExpiresAt: expiresAt,
    planDurationDays: durationDays,
    pendingPlanId: null,
    pendingPlanName: null,
    pendingPlanPrice: null,
    updatedAt: startedAt,
  });
  batch.set(subRef, subUpdateData, { merge: true });

  // 4. Create fresh draft workout in workouts/draft_{clientId}
  const draftWorkoutRef = doc(db, WORKOUTS_COL, `draft_${clientId}`);
  const cleanWorkout = cleanPayload({
    ...freshDraftWorkout,
    clientId,
    isDraft: true,
    status: 'draft',
    publishedToClient: false,
    updatedAt: startedAt,
  });
  batch.set(draftWorkoutRef, cleanWorkout);

  // 5. Create fresh nutrition protocol skeleton in nutrition/{clientId}
  const nutritionRef = doc(db, NUTRITION_COL, clientId);
  const cleanNutrition = cleanPayload({
    ...freshNutritionSkeleton,
    clientId,
    updatedAt: startedAt,
    isDraft: true,
  });
  batch.set(nutritionRef, cleanNutrition, { merge: true });

  // Commit all updates atomically
  await batch.commit();
  console.log(`[executeApproveAndInitializeProgramBatch] Successfully committed atomic batch write for client "${clientId}". Status is now ACTIVE.`);
}
