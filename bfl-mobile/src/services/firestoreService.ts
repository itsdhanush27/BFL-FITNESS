/**
 * BFL Fitness Mobile — Firestore Service
 * Reads/writes to the SAME Firestore collections as the web app.
 * No duplicate collections or backend.
 */

import {
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
  limit,
} from './firebase';
import type {
  UserProfile,
  AssignedWorkout,
  NutritionPlan,
  WeeklyCheckIn,
  ChatMessage,
  ProgressMetricPoint,
  ProgressPhotoRecord,
  InAppNotification,
  IntakeFormData,
  CoachingPlan,
  SubscriptionFields,
} from '../types';
import { INITIAL_COACHING_PLANS } from '../data/seedData';
import { assertClientCanReceiveCoaching } from '../types/subscription';

// ─── User Profile ──────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return { id: snap.id, uid: snap.id, ...snap.data() } as UserProfile;
  } catch (err) {
    console.error('[firestoreService] getUserProfile error:', err);
    return null;
  }
}

export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, uid: snap.id, ...snap.data() } as UserProfile);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('[firestoreService] subscribeToUserProfile error:', err);
    callback(null);
  });
}

export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, 'users', userId), {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── Workouts ──────────────────────────────────────────────────────────────

/**
 * Real-time listener for workouts assigned to a client.
 * Strictly excludes draft routines so client never sees unpublished programs (matches web).
 * Sorts with active updatedAt and assignedDate priority.
 */
export function subscribeToClientWorkouts(
  clientId: string,
  callback: (workouts: AssignedWorkout[]) => void
): () => void {
  const q = query(
    collection(db, 'workouts'),
    where('clientId', '==', clientId)
  );
  return onSnapshot(q, (snap) => {
    const rawWorkouts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedWorkout));
    // Filter out drafts so athlete never sees unpublished programs (1:1 with web)
    const workouts = rawWorkouts.filter(w => !w.isDraft && w.status !== 'draft');

    // Sort in memory: newest updatedAt or assignedDate first
    workouts.sort((a: any, b: any) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      if (timeA !== timeB) return timeB - timeA;
      return (b.assignedDate || '').localeCompare(a.assignedDate || '');
    });

    callback(workouts);
  }, (err) => {
    console.error('[firestoreService] subscribeToClientWorkouts error:', err);
    callback([]);
  });
}

/**
 * Real-time listener for the athlete's single active workout (mirrors web's subscribeToAthleteWorkouts).
 */
export function subscribeToActiveWorkout(
  clientId: string,
  callback: (workout: AssignedWorkout | null) => void
): () => void {
  return subscribeToClientWorkouts(clientId, (workouts) => {
    if (workouts.length === 0) {
      callback(null);
      return;
    }
    // Priority 1: First active/uncompleted workout
    const active = workouts.find((w) => !w.isCompleted);
    if (active) {
      callback(active);
      return;
    }
    // Priority 2: Latest completed workout
    callback(workouts[0]);
  });
}

/**
 * Real-time snapshot listener for a specific workout document.
 * Eliminates stale one-time getDoc fetches so mobile sees coach edits and web updates instantly.
 */
export function subscribeToWorkout(
  workoutId: string,
  callback: (workout: AssignedWorkout | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'workouts', workoutId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as AssignedWorkout);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('[firestoreService] subscribeToWorkout error:', err);
      callback(null);
    }
  );
}

/**
 * Synchronize live workout set logging directly to Firestore (1:1 with web).
 */
export async function updateWorkoutSets(
  workoutId: string,
  exercises: any[]
): Promise<void> {
  await updateDoc(doc(db, 'workouts', workoutId), {
    exercises,
    updatedAt: serverTimestamp(),
  });
}

export async function updateWorkout(workoutId: string, updates: Partial<AssignedWorkout>): Promise<void> {
  const feedbackVal = updates.feedback ?? updates.clientGeneralFeedback;
  await updateDoc(doc(db, 'workouts', workoutId), {
    ...updates,
    ...(feedbackVal !== undefined ? { feedback: feedbackVal, clientGeneralFeedback: feedbackVal } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function completeWorkout(
  workoutId: string,
  clientId: string,
  rating: number,
  feedback: string,
  durationMinutes: number,
  exercises: any[]
): Promise<void> {
  const normalizedRating = Math.min(Math.max(rating, 1), 5);
  const cleanFeedback = (feedback || '').slice(0, 1000);
  const completedDate = new Date().toISOString().split('T')[0];
  const completedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  await updateDoc(doc(db, 'workouts', workoutId), {
    isCompleted: true,
    completedAt: completedTime,
    completedDate,
    rating: normalizedRating,
    feedback: cleanFeedback,
    clientGeneralFeedback: cleanFeedback,
    durationMinutes,
    exercises,
    status: 'completed',
    updatedAt: serverTimestamp(),
  });

  // Notify coach of completed session (mirrors web FitnessDataContext)
  saveNotificationToFirestore({
    userId: 'admin_mass_narimanian',
    recipientRole: 'coach',
    title: 'Daily Workout Completed',
    message: `Athlete completed workout session (${durationMinutes} min, Rating: ${normalizedRating}/5). ${cleanFeedback ? `Notes: "${cleanFeedback.slice(0, 80)}"` : ''}`,
    type: 'workout_completed',
    actionTab: 'clients',
    timestamp: new Date().toISOString(),
    read: false,
    actorName: 'Athlete',
    actorRole: 'client',
  }).catch(() => {});
}

// ─── Nutrition ─────────────────────────────────────────────────────────────

export function subscribeToNutrition(
  clientId: string,
  callback: (plan: NutritionPlan | null) => void
): () => void {
  return onSnapshot(doc(db, 'nutrition', clientId), (snap) => {
    if (snap.exists()) {
      callback({ clientId: snap.id, ...snap.data() } as NutritionPlan);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('[firestoreService] subscribeToNutrition error:', err);
    callback(null);
  });
}

// ─── Check-Ins ─────────────────────────────────────────────────────────────

export function subscribeToClientCheckIns(
  clientId: string,
  callback: (checkIns: WeeklyCheckIn[]) => void
): () => void {
  const q = query(
    collection(db, 'checkins'),
    where('clientId', '==', clientId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeeklyCheckIn));
    // Sort in memory by weekNumber desc (prevents Firestore composite index errors)
    items.sort((a, b) => (b.weekNumber || 0) - (a.weekNumber || 0));
    callback(items);
  }, (err) => {
    console.error('[firestoreService] subscribeToClientCheckIns error:', err);
    callback([]);
  });
}

export async function submitWeeklyCheckIn(
  data: Omit<WeeklyCheckIn, 'id'>
): Promise<string> {
  const cleanData = cleanPayload(data);
  const docRef = await addDoc(collection(db, 'checkins'), {
    ...cleanData,
    submissionDate: cleanData.submissionDate || new Date().toISOString().split('T')[0],
    reviewedByCoach: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Notify coach of new weekly check-in (1:1 with web)
  saveNotificationToFirestore({
    userId: 'admin_mass_narimanian',
    recipientRole: 'coach',
    title: 'Weekly Check-In Submitted',
    message: `${cleanData.clientName || 'Athlete'} submitted Week ${cleanData.weekNumber || 1} check-in (${cleanData.weightKg}kg). Review biofeedback and physique photos.`,
    type: 'checkin_submitted',
    actionTab: 'clients',
    timestamp: new Date().toISOString(),
    read: false,
    actorName: cleanData.clientName || 'Athlete',
    actorRole: 'client',
  }).catch(() => {});

  // Sync current weight to client profile
  if (cleanData.clientId && cleanData.weightKg) {
    updateUserProfile(cleanData.clientId, {
      currentWeightKg: Number(cleanData.weightKg),
    } as any).catch(() => {});
  }

  return docRef.id;
}

// ─── Messages / Chat ───────────────────────────────────────────────────────

export function subscribeToMessages(
  userId: string,
  coachId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  // Query messages by clientId matching the user/client id (identical to web app)
  const q = query(
    collection(db, 'messages'),
    where('clientId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      .filter(
        (m) =>
          !coachId ||
          (m.senderId === userId && m.recipientId === coachId) ||
          (m.senderId === coachId && m.recipientId === userId) ||
          !m.recipientId
      );
    // Sort in memory by timestamp ascending
    msgs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
    callback(msgs);
  }, (err) => {
    console.error('[firestoreService] subscribeToMessages error:', err);
    callback([]);
  });
}

export async function sendMessage(message: Omit<ChatMessage, 'id'> & { clientId?: string }): Promise<string> {
  const clientId = message.clientId || message.senderId;
  const docRef = await addDoc(collection(db, 'messages'), {
    ...cleanPayload(message),
    clientId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Progress Metrics ──────────────────────────────────────────────────────

export function subscribeToProgressMetrics(
  clientId: string,
  callback: (metrics: ProgressMetricPoint[]) => void
): () => void {
  const q = query(
    collection(db, 'metrics'),
    where('clientId', '==', clientId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressMetricPoint));
    // Sort in memory by date asc (prevents Firestore composite index errors)
    items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    callback(items);
  }, (err) => {
    console.error('[firestoreService] subscribeToProgressMetrics error:', err);
    callback([]);
  });
}

export async function addProgressMetric(data: Omit<ProgressMetricPoint, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'metrics'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Progress Photos ───────────────────────────────────────────────────────

export function subscribeToProgressPhotos(
  clientId: string,
  callback: (photos: ProgressPhotoRecord[]) => void
): () => void {
  const q = query(
    collection(db, 'progress_photos'),
    where('clientId', '==', clientId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressPhotoRecord));
    // Sort in memory by date asc (prevents Firestore composite index errors)
    items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    callback(items);
  }, (err) => {
    console.error('[firestoreService] subscribeToProgressPhotos error:', err);
    callback([]);
  });
}

export async function addProgressPhoto(data: Omit<ProgressPhotoRecord, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'progress_photos'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: InAppNotification[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InAppNotification));
    // Sort in memory descending (prevents composite index requirements)
    items.sort((a: any, b: any) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.timestamp || 0).getTime();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    callback(items);
  }, (err: any) => {
    if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
      console.warn('[firestoreService] Mobile notifications restricted by rules; defaulting to empty list.');
      callback([]);
      return;
    }
    console.error('[firestoreService] subscribeToNotifications error:', err);
    callback([]);
  });
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

// ─── Intake ────────────────────────────────────────────────────────────────

export async function getClientIntake(clientId: string): Promise<IntakeFormData | null> {
  try {
    const q = query(
      collection(db, 'intakes'),
      where('clientId', '==', clientId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as IntakeFormData;
  } catch (err) {
    console.error('[firestoreService] getClientIntake error:', err);
    return null;
  }
}

/**
 * Real-time listener for client onboarding intake (baseline metrics & starting photos).
 */
export function subscribeToClientIntake(
  clientId: string,
  callback: (intake: IntakeFormData | null) => void
): () => void {
  const q = query(
    collection(db, 'intakes'),
    where('clientId', '==', clientId),
    limit(1)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as IntakeFormData);
  }, (err) => {
    console.error('[firestoreService] subscribeToClientIntake error:', err);
    callback(null);
  });
}

// ─── Coaching Plans ────────────────────────────────────────────────────────

export async function getCoachingPlans(): Promise<CoachingPlan[]> {
  try {
    const snap = await getDocs(collection(db, 'plans'));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachingPlan));
    }
  } catch (err) {
    console.debug('[firestoreService] getCoachingPlans notice (falling back to catalog):', err);
  }
  return INITIAL_COACHING_PLANS;
}

// ─── Helpers & Subscription Access ─────────────────────────────────────────

/** Strips undefined properties so Firestore doesn't reject write payloads */
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

/** Persist a notification to the Firestore `notifications` collection */
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
    await setDoc(doc(db, 'notifications', docId), cleaned, { merge: true });
    return docId;
  } catch (err) {
    console.warn('[firestoreService] saveNotificationToFirestore warning:', err);
    return '';
  }
}

/** Fetches minimal subscription fields for a client */
export async function getUserSubscriptionFields(clientId: string): Promise<SubscriptionFields | null> {
  try {
    const snap = await getDoc(doc(db, 'users', clientId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      status: data.status,
      subscriptionStatus: data.subscriptionStatus,
      approvalStatus: data.approvalStatus,
      planExpiresAt: data.planExpiresAt,
      packageStartedAt: data.packageStartedAt,
      cancellationRequestedAt: data.cancellationRequestedAt,
      billingCycle: data.billingCycle,
      sessionCredits: data.sessionCredits,
      usedSessionCredits: data.usedSessionCredits,
    };
  } catch (err) {
    console.error('[firestoreService] getUserSubscriptionFields error:', err);
    return null;
  }
}

/** Enforces that client can receive coaching content; throws SubscriptionExpiredError if not */
export async function enforceSubscriptionAccess(clientId: string): Promise<void> {
  const fields = await getUserSubscriptionFields(clientId);
  assertClientCanReceiveCoaching(clientId, fields);
}

