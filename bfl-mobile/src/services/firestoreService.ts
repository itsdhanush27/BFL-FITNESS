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

export function subscribeToClientWorkouts(
  clientId: string,
  callback: (workouts: AssignedWorkout[]) => void
): () => void {
  const q = query(
    collection(db, 'workouts'),
    where('clientId', '==', clientId),
    orderBy('assignedDate', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const workouts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedWorkout));
    callback(workouts);
  }, (err) => {
    console.error('[firestoreService] subscribeToClientWorkouts error:', err);
    callback([]);
  });
}

export async function updateWorkout(workoutId: string, updates: Partial<AssignedWorkout>): Promise<void> {
  await updateDoc(doc(db, 'workouts', workoutId), {
    ...updates,
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
  await updateDoc(doc(db, 'workouts', workoutId), {
    isCompleted: true,
    completedAt: new Date().toISOString(),
    completedDate: new Date().toISOString().split('T')[0],
    rating: Math.min(Math.max(rating, 1), 5),
    feedback: feedback.slice(0, 1000),
    clientGeneralFeedback: feedback.slice(0, 1000),
    durationMinutes,
    exercises,
    status: 'completed',
    updatedAt: serverTimestamp(),
  });
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
    where('clientId', '==', clientId),
    orderBy('weekNumber', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeeklyCheckIn));
    callback(items);
  }, (err) => {
    console.error('[firestoreService] subscribeToClientCheckIns error:', err);
    callback([]);
  });
}

export async function submitWeeklyCheckIn(
  data: Omit<WeeklyCheckIn, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'checkins'), {
    ...data,
    reviewedByCoach: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Messages / Chat ───────────────────────────────────────────────────────

export function subscribeToMessages(
  userId: string,
  coachId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      .filter(
        (m) =>
          (m.senderId === userId && m.recipientId === coachId) ||
          (m.senderId === coachId && m.recipientId === userId)
      );
    callback(msgs);
  }, (err) => {
    console.error('[firestoreService] subscribeToMessages error:', err);
    callback([]);
  });
}

export async function sendMessage(message: Omit<ChatMessage, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'messages'), {
    ...message,
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
    where('clientId', '==', clientId),
    orderBy('date', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressMetricPoint));
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
    where('clientId', '==', clientId),
    orderBy('date', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressPhotoRecord));
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
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as InAppNotification))
      .filter((n) => !n.userId || n.userId === userId);
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

// ─── Coaching Plans ────────────────────────────────────────────────────────

export async function getCoachingPlans(): Promise<CoachingPlan[]> {
  try {
    const snap = await getDocs(collection(db, 'plans'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachingPlan));
  } catch (err) {
    console.error('[firestoreService] getCoachingPlans error:', err);
    return [];
  }
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

