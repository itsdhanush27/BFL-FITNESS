import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CoachingPlan,
  Exercise,
  WorkoutTemplate,
  AssignedWorkout,
  WeeklyCheckIn,
  NutritionPlan,
  ChatMessage,
  CMSContent,
  IntakeFormData,
  ClientRosterItem,
  InAppNotification,
  CoachMember,
  ProgressMetricPoint,
  ProgressPhotoRecord
} from '../types';
import {
  INITIAL_COACHING_PLANS,
  INITIAL_EXERCISES,
  INITIAL_TEMPLATES,
  INITIAL_NUTRITION_PLAN,
  INITIAL_CHECKINS,
  INITIAL_MESSAGES,
  INITIAL_CMS_CONTENT,
  INITIAL_CLIENTS,
  INITIAL_COACHES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROGRESS_METRICS,
  INITIAL_PROGRESS_PHOTOS
} from '../data/seedData';
import { useAuth } from './AuthContext';
import {
  subscribeToClients as fsSubscribeToClients,
  subscribeToIntakes as fsSubscribeToIntakes,
  submitIntakeToFirestore,
  updateIntakeStatusInFirestore,
  publishWorkoutToFirestore,
  saveDraftWorkoutToFirestore,
  deleteDraftWorkoutFromFirestore,
  subscribeToAthleteDraftWorkout,
  subscribeToAthleteWorkouts,
  updateWorkoutLog as fsUpdateWorkoutLog,
  subscribeToClientNutrition,
  savePrescribedNutrition,
  subscribeToClientCheckIns,
  submitCheckInToFirestore,
  saveCoachCheckInFeedback,
  subscribeToMessages,
  sendMessageToFirestore,
  subscribeToCoaches as fsSubscribeToCoaches,
  saveCoachToFirestore,
  deleteCoachFromFirestore,
  assignCoachToClientInFirestore,
  seedFoundersAndCoachesToFirestore,
  createCoachAccountInAuthAndFirestore,
  DEFAULT_FOUNDERS_AND_COACHES,
  saveNotificationToFirestore,
  subscribeToNotifications as fsSubscribeToNotifications,
  markNotificationReadInFirestore,
  markAllNotificationsReadInFirestore,
  subscribeToProgressMetrics as fsSubscribeToProgressMetrics,
  saveProgressMetricToFirestore,
  subscribeToProgressPhotos as fsSubscribeToProgressPhotos,
  saveProgressPhotoToFirestore,
  updateUserProfile,
  clearAthleteWorkoutsAndNutrition,
  submitPlanUpgradeAndTransaction,
  subscribeToPendingSubscriptions,
  executeApproveAndInitializeProgramBatch,
} from '../services/firestoreService';
import {
  getSubscriptionStatus,
  canReceiveCoaching,
  checkSubscriptionAccess,
  SubscriptionExpiredError,
} from '../types/subscription';
import type { SubscriptionStatus, SubscriptionAccessResult, SubscriptionFields } from '../types/subscription';

// Re-export centralized subscription functions for consumers
export { getSubscriptionStatus, canReceiveCoaching, checkSubscriptionAccess, SubscriptionExpiredError };
export type { SubscriptionStatus, SubscriptionAccessResult, SubscriptionFields };

/** Helper to calculate package duration in days based on billing period */
export const getPlanDurationDays = (planOrPeriod?: string | { period?: string; billingCycle?: string; id?: string; name?: string }): number => {
  if (!planOrPeriod) return 30;
  let str = '';
  if (typeof planOrPeriod === 'string') {
    str = planOrPeriod.toLowerCase();
  } else {
    str = `${planOrPeriod.id || ''} ${planOrPeriod.name || ''} ${planOrPeriod.period || ''} ${planOrPeriod.billingCycle || ''}`.toLowerCase();
  }
  if (str.includes('week') || str.includes('7')) return 7;
  if (str.includes('month') || str.includes('30')) return 30;
  // Hourly and single-session coaching packages provide a standard 30-day coaching and booking window
  if (str.includes('hour') || str.includes('session')) return 30;
  return 30;
};

/**
 * @deprecated Use `getSubscriptionStatus()` instead for the canonical subscription status.
 * This wrapper is preserved for backwards compatibility with existing UI code.
 * Internally delegates to the centralized subscription status system.
 */
export const isPlanExpired = (item?: { planExpiresAt?: string; subscriptionStatus?: string; status?: string }): boolean => {
  if (!item) return false;
  const status = getSubscriptionStatus(item as SubscriptionFields);
  return status === 'expired';
};

/** Formats days remaining until package expiry */
export const getDaysRemaining = (planExpiresAt?: string): number => {
  if (!planExpiresAt) return 0;
  const diffMs = new Date(planExpiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

interface FitnessDataContextType {
  clients: ClientRosterItem[];
  coachingPlans: CoachingPlan[];
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  assignedWorkout: AssignedWorkout | null;
  nutritionPlan: NutritionPlan | null;
  checkIns: WeeklyCheckIn[];
  messages: ChatMessage[];
  cmsContent: CMSContent;
  intakeForms: IntakeFormData[];
  intakeSubmissions: IntakeFormData[]; // Compatibility alias
  clientIntake: IntakeFormData | null;
  coaches: CoachMember[];
  notifications: InAppNotification[];
  progressMetrics: ProgressMetricPoint[];
  progressPhotos: ProgressPhotoRecord[];
  
  // Actions
  addExercise: (exercise: Omit<Exercise, 'id'>) => void;
  deleteExercise: (id: string) => void;
  addWorkoutTemplate: (template: Omit<WorkoutTemplate, 'id'>) => void;
  duplicateTemplate: (templateId: string) => void;
  assignTemplateToClient: (templateId: string, clientId: string) => void;
  assignWorkoutToClient: (clientId: string, workout: AssignedWorkout) => void;
  draftWorkouts: Record<string, AssignedWorkout>;
  saveDraftWorkout: (clientId: string, workout: AssignedWorkout) => Promise<void>;
  getDraftWorkout: (clientId: string) => AssignedWorkout | null;
  clearDraftWorkout: (clientId: string) => Promise<void>;
  logWorkoutSet: (exerciseIndex: number, setIndex: number, weightKg: number, reps: number, rpe: number, completed: boolean) => void;
  updateExerciseClientNotes: (exerciseIndex: number, notes: string) => void;
  completeWorkout: (rating: number, feedback: string, durationMinutes: number) => void;
  submitWeeklyCheckIn: (checkIn: Omit<WeeklyCheckIn, 'id' | 'submissionDate' | 'reviewedByCoach'>) => void;
  submitIntakeForm: (data: Omit<IntakeFormData, 'id' | 'submittedAt' | 'status'>) => void;
  updateIntakeStatus: (
    intakeId: string,
    clientId?: string,
    newStatus?: 'pending_review' | 'program_created' | 'reviewed' | 'active'
  ) => Promise<void>;
  sendChatMessage: (text: string, recipientId: string) => void;
  updateNutritionPlan: (updates: Partial<NutritionPlan>) => void;
  provideCoachFeedback: (checkInId: string, feedback: string) => void;
  respondToCheckIn: (checkInId: string, feedback: string) => void; // Compatibility alias
  updateCMS: (updates: Partial<CMSContent>) => void;
  updateCMSContent: (updates: Partial<CMSContent>) => void; // Compatibility alias
  resetCMSToDefaults: () => void;
  updatePlanPrice: (planId: string, newPrice: number) => void;
  updatePlan: (planId: string, updates: Partial<CoachingPlan>) => void;
  addPlan: (plan: CoachingPlan) => void;
  deletePlan: (planId: string) => void;

  // Subscription & Package Lifecycle Actions
  requestPlanRenewal: (clientId: string, planId: string) => Promise<void>;
  changeClientPlan: (clientId: string, newPlan: CoachingPlan, paymentDetails?: { cardLast4?: string; amount?: number }) => Promise<void>;
  approveAndInitializeClientPlan: (clientId: string, planId?: string, customDurationDays?: number) => Promise<void>;
  setClientPlanExpired: (clientId: string) => Promise<void>;

  // Multi-Coach / Multi-tenant Actions
  addCoach: (coach: Omit<CoachMember, 'id' | 'joinedDate'> & { password?: string }) => Promise<CoachMember>;
  updateCoach: (id: string, updates: Partial<CoachMember>) => void;
  deleteCoach: (id: string) => void;
  assignCoachToClient: (clientId: string, coachId: string) => void;

  // In-App Notification Actions
  addNotification: (notif: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Progress & Analytics Actions
  logProgressMetric: (metric: Omit<ProgressMetricPoint, 'id'>) => void;
  addProgressPhoto: (photo: Omit<ProgressPhotoRecord, 'id'>) => void;
}

const FitnessDataContext = createContext<FitnessDataContextType | undefined>(undefined);

export const FitnessDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile: updateAuthProfile } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'coach';
  const isRealClient = user?.role === 'client' && user?.uid && !user.uid.startsWith('admin_');

  const [coachingPlans, setCoachingPlans] = useState<CoachingPlan[]>(() => {
    const saved = localStorage.getItem('bfl_plans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasLegacy = parsed.some((p: any) => p.id === 'plan_lifestyle' || p.id === 'plan_elite' || p.id === 'plan_contest' || p.price === 199 || p.price === 349);
        if (!hasLegacy && Array.isArray(parsed) && parsed.length >= 6) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_COACHING_PLANS;
  });

  const sanitizeExerciseVideoUrl = (exerciseId?: string, currentUrl?: string): string => {
    if (!currentUrl || currentUrl.includes('images.unsplash.com') || currentUrl === 'https://youtube.com') {
      const matched = INITIAL_EXERCISES.find(e => e.id === exerciseId);
      return matched?.videoUrl || '/assets/founders/videos/mass-training-1.mp4';
    }
    return currentUrl;
  };

  const sanitizeWorkoutExercises = (workout: AssignedWorkout | null): AssignedWorkout | null => {
    if (!workout || !workout.exercises) return workout;
    return {
      ...workout,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        videoUrl: sanitizeExerciseVideoUrl(ex.exerciseId, ex.videoUrl)
      }))
    };
  };

  const [exercises, setExercises] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('bfl_exercises');
    if (saved) {
      try {
        const parsed: Exercise[] = JSON.parse(saved);
        return parsed.map(ex => ({
          ...ex,
          videoUrl: sanitizeExerciseVideoUrl(ex.id, ex.videoUrl)
        }));
      } catch (e) {}
    }
    return INITIAL_EXERCISES;
  });

  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => {
    const saved = localStorage.getItem('bfl_templates');
    if (saved) {
      try {
        const parsed: WorkoutTemplate[] = JSON.parse(saved);
        return parsed.map(t => ({
          ...t,
          workouts: (t.workouts || []).map(w => ({
            ...w,
            exercises: (w.exercises || []).map(ex => ({
              ...ex,
              videoUrl: sanitizeExerciseVideoUrl(ex.exerciseId, ex.videoUrl)
            }))
          }))
        }));
      } catch (e) {}
    }
    return INITIAL_TEMPLATES;
  });

  const [assignedWorkout, setAssignedWorkout] = useState<AssignedWorkout | null>(() => {
    // ── Exercise Prescription Rule (Strict Enforcement) ──
    // No default workouts are ever auto-populated for any user.
    // New clients see a blank state until the coach publishes a bespoke routine.
    if (isRealClient && user?.uid) {
      const saved = localStorage.getItem(`bfl_assigned_workout_${user.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.clientId === user.uid && !parsed.isDraft && parsed.status !== 'draft' && (parsed.exercises?.length || 0) > 0) {
            return sanitizeWorkoutExercises(parsed);
          }
        } catch (e) {}
      }
      return null;
    }
    // Coaches/admins in demo mode: only show a cached workout if one was
    // explicitly assigned (never the seed/demo template).
    const saved = localStorage.getItem('bfl_assigned_workout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.clientId && !parsed.clientId.startsWith('client_alex') && !parsed.isDraft && parsed.status !== 'draft' && (parsed.exercises?.length || 0) > 0) {
          return sanitizeWorkoutExercises(parsed);
        }
      } catch (e) {}
    }
    return null;
  });

  const [draftWorkouts, setDraftWorkouts] = useState<Record<string, AssignedWorkout>>(() => {
    try {
      const saved = localStorage.getItem('bfl_draft_workouts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  });

  const saveDraftWorkout = async (clientId: string, workout: AssignedWorkout) => {
    if (!clientId) return;
    const formattedDraft: AssignedWorkout = {
      ...workout,
      clientId,
      id: workout.id || `draft_${clientId}`,
      isDraft: true,
      status: 'draft',
      assignedDate: workout.assignedDate || new Date().toISOString().split('T')[0]
    };

    setDraftWorkouts(prev => {
      const next = { ...prev, [clientId]: formattedDraft };
      try {
        localStorage.setItem('bfl_draft_workouts', JSON.stringify(next));
        localStorage.setItem(`bfl_draft_workout_${clientId}`, JSON.stringify(formattedDraft));
      } catch (e) {}
      return next;
    });

    try {
      await saveDraftWorkoutToFirestore(formattedDraft, user?.uid);
    } catch (err) {
      console.warn('[FitnessData] saveDraftWorkoutToFirestore error:', err);
    }
  };

  const getDraftWorkout = (clientId: string): AssignedWorkout | null => {
    if (!clientId) return null;
    if (draftWorkouts[clientId]) return draftWorkouts[clientId];
    try {
      const saved = localStorage.getItem(`bfl_draft_workout_${clientId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  };

  const clearDraftWorkout = async (clientId: string) => {
    if (!clientId) return;
    setDraftWorkouts(prev => {
      const next = { ...prev };
      delete next[clientId];
      try {
        localStorage.setItem('bfl_draft_workouts', JSON.stringify(next));
        localStorage.removeItem(`bfl_draft_workout_${clientId}`);
      } catch (e) {}
      return next;
    });

    try {
      await deleteDraftWorkoutFromFirestore(clientId);
    } catch (err) {
      console.warn('[FitnessData] deleteDraftWorkoutFromFirestore error:', err);
    }
  };

  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(() => {
    if (isRealClient && user?.uid) {
      const saved = localStorage.getItem(`bfl_nutrition_plan_${user.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.clientId === user.uid && parsed.isPrescribed) return parsed;
        } catch (e) {}
      }
      return null;
    }
    const saved = localStorage.getItem('bfl_nutrition_plan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.clientId && !parsed.clientId.startsWith('client_alex') && parsed.isPrescribed) {
          if (isRealClient && parsed.clientId === user?.uid) return parsed;
          if (!isRealClient) return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [checkIns, setCheckIns] = useState<WeeklyCheckIn[]>(() => {
    const saved = localStorage.getItem('bfl_checkins');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (c: WeeklyCheckIn) =>
              c.clientId &&
              !c.clientId.startsWith('client_alex') &&
              !c.clientId.startsWith('client_jordan') &&
              !c.id.startsWith('chk_')
          );
          return isRealClient ? cleaned.filter((c: WeeklyCheckIn) => c.clientId === user?.uid) : cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('bfl_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (m: ChatMessage) =>
              !m.id.startsWith('msg_') &&
              m.recipientId !== 'client_alex' &&
              m.senderId !== 'client_alex'
          );
          return isRealClient
            ? cleaned.filter((m: ChatMessage) => m.senderId === user?.uid || m.recipientId === user?.uid || (m as any).clientId === user?.uid)
            : cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const [cmsContent, setCmsContent] = useState<CMSContent>(() => {
    const saved = localStorage.getItem('bfl_cms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_CMS_CONTENT,
          ...parsed,
          massFounder: { ...INITIAL_CMS_CONTENT.massFounder!, ...(parsed.massFounder || {}) },
          pouyaFounder: { ...INITIAL_CMS_CONTENT.pouyaFounder!, ...(parsed.pouyaFounder || {}) }
        };
      } catch (e) {
        console.error('Error parsing bfl_cms:', e);
      }
    }
    return INITIAL_CMS_CONTENT;
  });

  const isTestOrDummyRecord = (id?: string, email?: string, name?: string): boolean => {
    const normId = (id || '').toLowerCase().trim();
    const normEmail = (email || '').toLowerCase().trim();
    const normName = (name || '').toLowerCase().trim();
    return (
      normId.startsWith('client_demo') ||
      normId.startsWith('client_alex') ||
      normId.startsWith('client_jordan') ||
      normId.startsWith('client_david') ||
      normId.startsWith('client_sophia') ||
      normId.includes('demo_') ||
      normId.includes('test_') ||
      normEmail.includes('example.com') ||
      normEmail.includes('julian') ||
      normEmail.includes('mercer') ||
      normEmail.includes('dkm27092004') ||
      normEmail.includes('clientfiver6') ||
      normName.includes('julian') ||
      normName.includes('mercer') ||
      normName.includes('alex rivera') ||
      normName.includes('jordan lee') ||
      normName.includes('david chen') ||
      normName.includes('sophia lin')
    );
  };

  // Dynamic Clients from Firestore (no hardcoded mock clients or dummy demo data)
  const [clients, setClients] = useState<ClientRosterItem[]>(() => {
    const saved = localStorage.getItem('bfl_clients');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (c: ClientRosterItem) => !isTestOrDummyRecord(c.id, c.email, c.name)
          );
        }
      } catch (e) {}
    }
    return [];
  });

  // Dynamic Intakes from Firestore (no hardcoded mock intakes or dummy demo data)
  const [intakeForms, setIntakeForms] = useState<IntakeFormData[]>(() => {
    const saved = localStorage.getItem('bfl_intake_forms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((i: IntakeFormData) => !isTestOrDummyRecord(i.id || i.clientId, i.clientEmail, i.clientName));
        }
      } catch (e) {}
    }
    return [];
  });

  // Dynamic Coaches with founders seeded as baseline
  const [coaches, setCoaches] = useState<CoachMember[]>(() => {
    const legacyMockIds = ['coach_marcus', 'coach_marcus_vance', 'coach_sarah', 'coach_sarah_jenkins', 'coach_elena', 'coach_elena_rostova'];
    const saved = localStorage.getItem('bfl_coaches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((c: CoachMember) => !legacyMockIds.includes(c.id));
          if (cleaned.length > 0) return cleaned;
        }
      } catch {}
    }
    return DEFAULT_FOUNDERS_AND_COACHES;
  });

  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('bfl_notifications');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  const [progressMetrics, setProgressMetrics] = useState<ProgressMetricPoint[]>(() => {
    const saved = localStorage.getItem('bfl_progress_metrics');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((m: ProgressMetricPoint) => m.clientId && !m.clientId.startsWith('client_alex'));
          return isRealClient ? cleaned.filter((m: ProgressMetricPoint) => m.clientId === user?.uid) : cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoRecord[]>(() => {
    const saved = localStorage.getItem('bfl_progress_photos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((p: ProgressPhotoRecord) => p.clientId && !p.clientId.startsWith('client_alex'));
          return isRealClient ? cleaned.filter((p: ProgressPhotoRecord) => p.clientId === user?.uid) : cleaned;
        }
      } catch (e) {}
    }
    return [];
  });

  const [clientIntake, setClientIntake] = useState<IntakeFormData | null>(() => {
    const saved = localStorage.getItem('bfl_client_intake');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isTestOrDummyRecord(parsed.id || parsed.clientId, parsed.clientEmail, parsed.clientName)) {
          localStorage.removeItem('bfl_client_intake');
          return null;
        }
        if (isRealClient && user?.email && parsed.clientEmail) {
          if (parsed.clientEmail.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
            return null; // Isolate from different client's cached intake
          }
        }
        return parsed;
      } catch (e) {}
    }
    return null;
  });

  // Purge legacy mock and dummy data stored in localStorage from earlier seeds
  useEffect(() => {
    try {
      const keysToClean = [
        'bfl_clients',
        'bfl_intake_forms',
        'bfl_client_intake',
        'bfl_registered_clients_v2',
        'bfl_assigned_workout',
        'bfl_nutrition_plan',
        'bfl_checkins',
        'bfl_messages',
        'bfl_progress_metrics',
        'bfl_progress_photos',
        'bfl_notifications'
      ];
      keysToClean.forEach((key) => {
        const item = localStorage.getItem(key);
        if (item && (
          item.includes('client_demo') ||
          item.includes('julian') ||
          item.includes('example.com') ||
          item.includes('client_alex') ||
          item.includes('client_jordan') ||
          item.includes('client_david') ||
          item.includes('client_sophia') ||
          item.includes('chk_1') ||
          item.includes('msg_1') ||
          item.includes('dkm27092004') ||
          item.includes('clientfiver6')
        )) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((entry: any) =>
                !isTestOrDummyRecord(entry.id || entry.clientId || entry.uid, entry.email || entry.clientEmail, entry.name || entry.clientName)
              );
              localStorage.setItem(key, JSON.stringify(cleaned));
            } else {
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });

      // Synchronize in-memory state to remove any remaining dummy records
      setClients(prev => prev.filter(c => !isTestOrDummyRecord(c.id, c.email, c.name)));
      setIntakeForms(prev => prev.filter(i => !isTestOrDummyRecord(i.id || i.clientId, i.clientEmail, i.clientName)));
      setClientIntake(prev => (prev && isTestOrDummyRecord(prev.id || prev.clientId, prev.clientEmail, prev.clientName)) ? null : prev);

      // Also purge any synthetic 'Workout session' metrics injected previously
      const pmItem = localStorage.getItem('bfl_progress_metrics');
      if (pmItem && pmItem.includes('Workout session')) {
        try {
          const parsed = JSON.parse(pmItem);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((m: any) => !m.notes?.includes('Workout session'));
            localStorage.setItem('bfl_progress_metrics', JSON.stringify(filtered));
            setProgressMetrics(filtered);
          }
        } catch {}
      }
    } catch (e) {}
  }, []);

  // ─── Firestore Real-Time Subscriptions ───────────────────────────────
  // Subscribe to Firestore CLIENTS (coach / admin view, and client self-profile sync)
  useEffect(() => {
    if (!user) return;
    const coachFilter = isAdmin ? (user.role === 'admin' ? null : (user.uid || (user as any).id)) : null;
    const unsub = fsSubscribeToClients(coachFilter, (firestoreClients) => {
      if (isAdmin) {
        setClients(firestoreClients);
      } else {
        const userEmail = user.email?.toLowerCase().trim();
        const userName = (user.displayName || (user as any).name || '').toLowerCase().trim();
        const myClients = firestoreClients.filter(c => 
          c.id === user.uid || 
          c.id === (user as any).id ||
          (userEmail && c.email && c.email.toLowerCase().trim() === userEmail) ||
          (userName && c.name && c.name.toLowerCase().trim() === userName)
        );
        if (myClients.length > 0) {
          setClients(myClients);
        }
      }
    });
    return () => unsub();
  }, [isAdmin, user?.uid, (user as any)?.id, user?.role, user?.email, user?.displayName]);

  // Seed Founders & default coaches to Firestore, and subscribe to Firestore COACHES
  useEffect(() => {
    seedFoundersAndCoachesToFirestore().catch((err) =>
      console.debug('[FitnessData] seedFoundersAndCoaches note:', err)
    );

    const unsub = fsSubscribeToCoaches((firestoreCoaches) => {
      if (firestoreCoaches.length > 0) {
        setCoaches(firestoreCoaches);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore NOTIFICATIONS (real-time bidirectional sync)
  useEffect(() => {
    if (!user?.uid) return;
    const coachIdentifiers = [
      user.uid,
      (user as any).id,
      (user as any).coachId,
      user.email?.toLowerCase(),
      user.email?.toLowerCase() === 'mass@bflfitness.com' ? 'admin_mass_narimanian' : undefined,
      user.email?.toLowerCase() === 'pouya@bflfitness.com' ? 'admin_pouya_marghzari' : undefined
    ].filter(Boolean) as string[];

    const unsub = fsSubscribeToNotifications(user.uid, user.role, (firestoreNotifs) => {
      setNotifications(firestoreNotifs);
    }, coachIdentifiers);
    return () => unsub();
  }, [user?.uid, user?.role, user?.email]);

  // Subscribe to Firestore INTAKES (real-time sync for admin, coaches, and clients)
  useEffect(() => {
    if (!user) return;
    const unsub = fsSubscribeToIntakes(null, (firestoreIntakes) => {
      if (isAdmin) {
        setIntakeForms(firestoreIntakes);
      } else {
        const userEmail = user.email?.toLowerCase().trim();
        const userName = (user.displayName || (user as any).name || '').toLowerCase().trim();
        const myIntakes = firestoreIntakes.filter(i => 
          (i.clientId && (i.clientId === user.uid || i.clientId === (user as any).id)) ||
          (userEmail && i.clientEmail && i.clientEmail.toLowerCase().trim() === userEmail) ||
          (userName && i.clientName && i.clientName.toLowerCase().trim() === userName)
        );
        setIntakeForms(myIntakes);
        if (myIntakes.length > 0) {
          setClientIntake(myIntakes[0]);
          try {
            localStorage.setItem('bfl_client_intake', JSON.stringify(myIntakes[0]));
          } catch {}
        }
      }
    });
    return () => unsub();
  }, [isAdmin, user?.uid, (user as any)?.id, user?.email, user?.displayName]);

  // Sanitize cached clientIntake to guarantee no cross-account data leak (e.g. Madhan on Dhanush's account)
  useEffect(() => {
    if (!user || isAdmin) return;
    const userEmail = user.email?.toLowerCase().trim();
    const userName = (user.displayName || (user as any).name || '').toLowerCase().trim();
    if (clientIntake) {
      const emailMatches = userEmail && clientIntake.clientEmail && clientIntake.clientEmail.toLowerCase().trim() === userEmail;
      const idMatches = clientIntake.clientId && (clientIntake.clientId === user.uid || clientIntake.clientId === (user as any).id);
      const nameMatches = userName && clientIntake.clientName && clientIntake.clientName.toLowerCase().trim() === userName;
      const nameConflicts = userName && clientIntake.clientName && 
        clientIntake.clientName.toLowerCase().trim() !== userName &&
        userName !== 'valued athlete' && userName !== 'athlete';

      if (nameConflicts || (!emailMatches && !idMatches && !nameMatches)) {
        setClientIntake(null);
        try {
          localStorage.removeItem('bfl_client_intake');
        } catch {}
      }
    }
  }, [user, isAdmin, clientIntake]);

  // Real-time subscriptions for real client: WORKOUT, NUTRITION, CHECKINS, MESSAGES
  useEffect(() => {
    if (!isRealClient || !user?.uid) return;

    // Load client-specific cache if present (strictly isolated to this user)
    const cachedWorkout = localStorage.getItem(`bfl_assigned_workout_${user.uid}`);
    if (cachedWorkout) {
      try {
        const parsed = JSON.parse(cachedWorkout);
        if (parsed?.clientId === user.uid && !parsed.isDraft && parsed.status !== 'draft' && (parsed.exercises?.length || 0) > 0) {
          setAssignedWorkout(parsed);
        } else {
          setAssignedWorkout(null);
        }
      } catch {
        setAssignedWorkout(null);
      }
    } else {
      setAssignedWorkout(null);
    }

    const cachedNutrition = localStorage.getItem(`bfl_nutrition_plan_${user.uid}`);
    if (cachedNutrition) {
      try {
        const parsed = JSON.parse(cachedNutrition);
        if (parsed?.clientId === user.uid) {
          setNutritionPlan(parsed);
        } else {
          setNutritionPlan(null);
        }
      } catch {
        setNutritionPlan(null);
      }
    } else {
      setNutritionPlan(null);
    }

    setCheckIns(prev => prev.filter(c => c.clientId === user.uid));
    setMessages(prev => prev.filter(m => m.senderId === user.uid || m.recipientId === user.uid || (m as any).clientId === user.uid));

    const unsubWorkout = subscribeToAthleteWorkouts(user.uid, (firestoreWorkout) => {
      if (firestoreWorkout && !firestoreWorkout.isDraft && firestoreWorkout.status !== 'draft' && (firestoreWorkout.exercises?.length || 0) > 0) {
        setAssignedWorkout(firestoreWorkout);
        try {
          localStorage.setItem(`bfl_assigned_workout_${user.uid}`, JSON.stringify(firestoreWorkout));
        } catch {}
      } else {
        setAssignedWorkout(null);
        try {
          localStorage.removeItem(`bfl_assigned_workout_${user.uid}`);
        } catch {}
      }
    });

    const unsubNutrition = subscribeToClientNutrition(user.uid, (plan) => {
      if (plan) {
        setNutritionPlan(plan);
        try {
          localStorage.setItem(`bfl_nutrition_plan_${user.uid}`, JSON.stringify(plan));
        } catch {}
      }
    });

    const unsubCheckIns = subscribeToClientCheckIns(user.uid, (list) => {
      setCheckIns(list);
    });

    const unsubMessages = subscribeToMessages(user.uid, (list) => {
      setMessages(list);
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `bfl_assigned_workout_${user.uid}` && e.newValue) {
        try { setAssignedWorkout(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === `bfl_nutrition_plan_${user.uid}` && e.newValue) {
        try { setNutritionPlan(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubWorkout();
      unsubNutrition();
      unsubCheckIns();
      unsubMessages();
      window.removeEventListener('storage', handleStorage);
    };
  }, [isRealClient, user?.uid]);

  // For Admin / Coach: Subscribe to check-ins from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToClientCheckIns(null, (list) => {
      setCheckIns(list);
    });
    return () => unsub();
  }, [isAdmin]);

  // Subscribe to Firestore PROGRESS METRICS (coaches see all, clients see their own)
  useEffect(() => {
    if (!user?.uid) return;
    const filterId = isAdmin ? null : user.uid;
    const unsub = fsSubscribeToProgressMetrics(filterId, (firestoreMetrics) => {
      if (firestoreMetrics.length > 0) {
        setProgressMetrics(firestoreMetrics);
      }
    });
    return () => unsub();
  }, [isAdmin, user?.uid]);

  // Subscribe to Firestore PROGRESS PHOTOS (coaches see all, clients see their own)
  useEffect(() => {
    if (!user?.uid) return;
    const filterId = isAdmin ? null : user.uid;
    const unsub = fsSubscribeToProgressPhotos(filterId, (firestorePhotos) => {
      if (firestorePhotos.length > 0) {
        setProgressPhotos(firestorePhotos);
      }
    });
    return () => unsub();
  }, [isAdmin, user?.uid]);

  // Persist state updates
  useEffect(() => {
    if (clientIntake) {
      localStorage.setItem('bfl_client_intake', JSON.stringify(clientIntake));
    }
  }, [clientIntake]);
  useEffect(() => {
    localStorage.setItem('bfl_plans', JSON.stringify(coachingPlans));
  }, [coachingPlans]);

  useEffect(() => {
    localStorage.setItem('bfl_exercises', JSON.stringify(exercises));
  }, [exercises]);

  useEffect(() => {
    localStorage.setItem('bfl_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('bfl_assigned_workout', JSON.stringify(assignedWorkout));
  }, [assignedWorkout]);

  useEffect(() => {
    localStorage.setItem('bfl_nutrition_plan', JSON.stringify(nutritionPlan));
  }, [nutritionPlan]);

  useEffect(() => {
    localStorage.setItem('bfl_checkins', JSON.stringify(checkIns));
  }, [checkIns]);

  useEffect(() => {
    localStorage.setItem('bfl_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('bfl_cms', JSON.stringify(cmsContent));
  }, [cmsContent]);

  useEffect(() => {
    localStorage.setItem('bfl_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('bfl_intake_forms', JSON.stringify(intakeForms));
  }, [intakeForms]);

  useEffect(() => {
    localStorage.setItem('bfl_coaches', JSON.stringify(coaches));
  }, [coaches]);

  useEffect(() => {
    localStorage.setItem('bfl_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('bfl_progress_metrics', JSON.stringify(progressMetrics));
  }, [progressMetrics]);

  useEffect(() => {
    localStorage.setItem('bfl_progress_photos', JSON.stringify(progressPhotos));
  }, [progressPhotos]);

  const addExercise = (exercise: Omit<Exercise, 'id'>) => {
    const newEx: Exercise = {
      ...exercise,
      id: 'ex_' + Date.now()
    };
    setExercises(prev => [newEx, ...prev]);
  };

  const deleteExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const addWorkoutTemplate = (template: Omit<WorkoutTemplate, 'id'>) => {
    const newTpl: WorkoutTemplate = {
      ...template,
      id: 'tpl_' + Date.now()
    };
    setTemplates(prev => [...prev, newTpl]);
  };

  const duplicateTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    const duplicated: WorkoutTemplate = {
      ...tpl,
      id: 'tpl_' + Date.now(),
      name: `${tpl.name} (Copy)`
    };
    setTemplates(prev => [...prev, duplicated]);
  };

  const assignTemplateToClient = (templateId: string, _clientId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl || tpl.workouts.length === 0) return;
    const firstWorkout = tpl.workouts[0];
    const newAssigned: AssignedWorkout = {
      id: 'workout_' + Date.now(),
      clientId: _clientId,
      title: firstWorkout.title,
      description: `Assigned from template: ${tpl.name}`,
      dayOfWeek: firstWorkout.dayName || 'Day 1',
      assignedDate: new Date().toISOString().split('T')[0],
      isCompleted: false,
      exercises: firstWorkout.exercises.map((ex, idx) => ({
        ...ex,
        id: 'we_' + Date.now() + '_' + idx,
        sets: ex.sets.map(s => ({ ...s, completed: false }))
      }))
    };
    setAssignedWorkout(newAssigned);
  };

  const assignWorkoutToClient = (clientId: string, workout: AssignedWorkout, skipSubscriptionCheck: boolean = false) => {
    // Subscription guard: prevent coaching mutations for expired clients
    if (!skipSubscriptionCheck) {
      const targetClient = clients.find(c => c.id === clientId);
      if (targetClient && !canReceiveCoaching(targetClient)) {
        console.warn('[FitnessData] Cannot assign workout to expired client:', clientId);
        throw new SubscriptionExpiredError(clientId, getSubscriptionStatus(targetClient));
      }
    }

    const formatted: AssignedWorkout = {
      ...workout,
      clientId,
      id: workout.id && !workout.id.startsWith('draft_') ? workout.id : 'workout_' + Date.now(),
      isDraft: false,
      status: 'published',
      publishedAt: new Date().toISOString(),
      assignedDate: workout.assignedDate || new Date().toISOString().split('T')[0]
    };

    // Optimistic local update if current user is this client
    if (user?.uid === clientId) {
      setAssignedWorkout(formatted);
    }
    try {
      localStorage.setItem(`bfl_assigned_workout_${clientId}`, JSON.stringify(formatted));
      localStorage.setItem('bfl_assigned_workout', JSON.stringify(formatted));
    } catch {
      // ignore
    }

    // Clean up draft locally and in Firestore
    clearDraftWorkout(clientId);

    // Persist to Firestore (skip subscription check if already checked above or during init)
    publishWorkoutToFirestore(formatted, user?.uid, skipSubscriptionCheck).catch((err) => {
      if (err instanceof SubscriptionExpiredError) {
        console.warn('[FitnessData] Subscription expired, reverting workout assignment');
        if (user?.uid === clientId) {
          setAssignedWorkout(null);
        }
        return;
      }
      console.warn('[FitnessData] publishWorkoutToFirestore error:', err);
    });

    // Trigger enriched in-app notification for the client
    addNotification({
      userId: clientId,
      recipientRole: 'client',
      title: 'New Program Block Assigned',
      message: `${user?.displayName || 'Your coach'} assigned a new program block: "${workout.title}". View your updated training program.`,
      type: 'workout_assigned',
      actionTab: 'workout',
      actorName: user?.displayName || 'Coach',
      actorRole: user?.role || 'coach',
      changeDetail: `Program: ${workout.title} · ${workout.exercises?.length || 0} exercises · Day: ${workout.dayOfWeek || 'Scheduled'}`
    });
  };

  const logWorkoutSet = (
    exerciseIndex: number,
    setIndex: number,
    weightKg: number,
    reps: number,
    rpe: number,
    completed: boolean
  ) => {
    setAssignedWorkout(prev => {
      const updatedExercises = [...prev.exercises];
      const targetExercise = { ...updatedExercises[exerciseIndex] };
      const updatedSets = [...targetExercise.sets];
      
      updatedSets[setIndex] = {
        ...updatedSets[setIndex],
        actualWeightKg: weightKg,
        actualReps: reps,
        actualRpe: rpe,
        completed
      };
      
      targetExercise.sets = updatedSets;
      updatedExercises[exerciseIndex] = targetExercise;

      const updated = {
        ...prev,
        exercises: updatedExercises
      };

      // Sync to Firestore if this is a real Firestore-tracked workout
      if (prev.id && prev.id.length > 10) {
        fsUpdateWorkoutLog(prev.id, { exercises: updatedExercises }).catch((err) =>
          console.warn('[FitnessData] logWorkoutSet Firestore sync error:', err)
        );
      }

      return updated;
    });
  };

  const updateExerciseClientNotes = (exerciseIndex: number, notes: string) => {
    setAssignedWorkout(prev => {
      const updated = [...prev.exercises];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        clientNotes: notes
      };
      return { ...prev, exercises: updated };
    });
  };

  const completeWorkout = (rating: number, feedback: string, durationMinutes: number) => {
    setAssignedWorkout(prev => {
      // Calculate total volume load
      let totalVolume = 0;
      prev.exercises.forEach(ex => {
        ex.sets.forEach(s => {
          if (s.completed && s.actualWeightKg && s.actualReps) {
            totalVolume += s.actualWeightKg * s.actualReps;
          }
        });
      });

      // Workout volume is preserved on the workout log itself, without injecting artificial body weight measurements

      const completionData = {
        isCompleted: true,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rating,
        feedback,
        clientGeneralFeedback: feedback,
        durationMinutes
      };

      // Sync completion to Firestore
      if (prev.id && prev.id.trim() !== '') {
        fsUpdateWorkoutLog(prev.id, {
          ...completionData,
          completedDate: new Date().toISOString().split('T')[0]
        }).catch((err) =>
          console.warn('[FitnessData] completeWorkout Firestore sync error:', err)
        );
      }

      return {
        ...prev,
        ...completionData
      };
    });

    const targetClient = clients.find(c => c.id === user?.uid || (user?.email && c.email?.toLowerCase() === user.email.toLowerCase()));
    const assignedCoachId = targetClient?.assignedCoachId || targetClient?.coachId || (clientIntake as any)?.assignedCoachId || (user as any)?.assignedCoachId || 'admin_mass_narimanian';
    const clientName = user?.displayName || targetClient?.name || 'Athlete';

    addNotification({
      userId: assignedCoachId,
      recipientRole: 'coach',
      title: 'Daily Workout Completed',
      message: `${clientName} completed "${assignedWorkout?.title || 'Daily Workout'}" (${durationMinutes} min, Rating: ${rating}/5). ${feedback ? `Notes: "${feedback.slice(0, 80)}${feedback.length > 80 ? '...' : ''}"` : ''} View client progress.`,
      type: 'workout_completed',
      actionTab: 'clients',
      actorName: clientName,
      actorRole: 'client',
      changeDetail: `Session: ${assignedWorkout?.title || 'Workout'} · ${durationMinutes} min · Rating: ${rating}/5`
    });
  };

  const submitWeeklyCheckIn = (checkInData: Omit<WeeklyCheckIn, 'id' | 'submissionDate' | 'reviewedByCoach'>) => {
    const newCheckIn: WeeklyCheckIn = {
      ...checkInData,
      id: 'chk_' + Date.now(),
      submissionDate: new Date().toISOString().split('T')[0],
      reviewedByCoach: false
    };
    setCheckIns(prev => [newCheckIn, ...prev.filter(c => c.id !== newCheckIn.id)]);

    // Persist check-in to Firestore
    submitCheckInToFirestore(newCheckIn).catch((err) =>
      console.warn('[FitnessData] submitCheckInToFirestore error:', err)
    );

    const targetClient = clients.find(c => c.id === checkInData.clientId || (c.email && checkInData.clientEmail && c.email.toLowerCase() === checkInData.clientEmail.toLowerCase()));
    const assignedCoachId = targetClient?.assignedCoachId || targetClient?.coachId || (clientIntake as any)?.assignedCoachId || (user as any)?.assignedCoachId || 'admin_mass_narimanian';
    const adherenceVal = (checkInData as any).adherencePercent ?? (checkInData.adherenceRating ? checkInData.adherenceRating * 10 : undefined) ?? '—';
    
    addNotification({
      userId: assignedCoachId,
      recipientRole: 'coach',
      title: 'Weekly Check-In Submitted',
      message: `${checkInData.clientName} submitted Week ${checkInData.weekNumber} Check-in: ${checkInData.weightKg}kg, Adherence: ${adherenceVal}%, Hunger: ${checkInData.hungerRating ?? '—'}/10${checkInData.waistMeasurementCm ? `, Waist: ${checkInData.waistMeasurementCm}cm` : ''}. Review now.`,
      type: 'checkin_submitted',
      actionTab: 'checkins',
      actorName: checkInData.clientName,
      actorRole: 'client',
      changeDetail: `Week ${checkInData.weekNumber} · ${checkInData.weightKg}kg · Adherence ${adherenceVal}% · Hunger ${checkInData.hungerRating ?? '—'}/10${checkInData.waistMeasurementCm ? ` · Waist ${checkInData.waistMeasurementCm}cm` : ''}`
    });
  };

  const submitIntakeForm = (data: Omit<IntakeFormData, 'id' | 'submittedAt' | 'status'>) => {
    const newForm: IntakeFormData = {
      ...data,
      id: 'intake_' + Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'pending_review'
    };
    // Optimistic local update
    setIntakeForms(prev => [newForm, ...prev]);
    setClientIntake(newForm);

    // Persist to Firestore
    submitIntakeToFirestore(newForm).catch((err) =>
      console.warn('[FitnessData] submitIntakeToFirestore error:', err)
    );

    const assignedCoachId = (data as any).assignedCoachId || (data as any).coachId || 'admin_mass_narimanian';
    addNotification({
      userId: assignedCoachId,
      recipientRole: 'coach',
      title: 'New Client Intake Form',
      message: `${data.clientName} submitted complete medical and training onboarding intake. Goal: ${data.primaryGoal || 'Not specified'}. Review intake data.`,
      type: 'intake_submitted',
      actionTab: 'intakes',
      actorName: data.clientName,
      actorRole: 'client',
      changeDetail: `Goal: ${data.primaryGoal || '—'} · Weight: ${data.currentWeightKg || '—'}kg · Training ${data.trainingDaysPerWeek || '—'}x/week`
    });
  };

  const updateIntakeStatus = async (
    intakeId: string,
    clientId?: string,
    newStatus: 'pending_review' | 'program_created' | 'reviewed' | 'active' = 'reviewed'
  ): Promise<void> => {
    // Find target intake to resolve both clientId and email
    const targetIntake = effectiveIntakes.find(i => i.id === intakeId || (clientId && i.clientId === clientId));
    const effectiveClientId = clientId || targetIntake?.clientId;
    const targetEmail = targetIntake?.clientEmail?.trim().toLowerCase();

    // 1. Optimistically update local intakeForms state
    setIntakeForms(prev => {
      let matched = false;
      const updated = prev.map(item => {
        if (
          item.id === intakeId ||
          (effectiveClientId && item.clientId === effectiveClientId) ||
          (targetEmail && item.clientEmail?.trim().toLowerCase() === targetEmail)
        ) {
          matched = true;
          return { 
            ...item, 
            status: newStatus,
            approvalStatus: newStatus === 'active' ? 'approved' : (item as any).approvalStatus 
          };
        }
        return item;
      });
      if (!matched && (intakeId || effectiveClientId || targetEmail)) {
        const targetClient = clients.find(c => 
          (effectiveClientId && c.id === effectiveClientId) || 
          (targetEmail && c.email?.trim().toLowerCase() === targetEmail)
        );
        return [
          ...updated,
          {
            id: intakeId,
            clientId: effectiveClientId || '',
            clientName: targetClient?.name || targetIntake?.clientName || 'Athlete',
            clientEmail: targetEmail || targetClient?.email || '',
            age: targetIntake?.age || 28,
            gender: targetIntake?.gender || 'Not specified',
            heightCm: targetIntake?.heightCm || 178,
            currentWeightKg: targetClient?.currentWeightKg || targetIntake?.currentWeightKg || 80,
            targetWeightKg: targetClient?.targetWeightKg || targetIntake?.targetWeightKg || 75,
            primaryGoal: (targetClient?.primaryGoal as any) || targetIntake?.primaryGoal || 'hypertrophy',
            baselineMeasurements: targetIntake?.baselineMeasurements || {
              waistCm: (targetClient as any)?.waistCm || 82,
              chestCm: (targetClient as any)?.chestCm || 102
            },
            injuryHistory: targetClient?.injuryNotes || targetIntake?.injuryHistory || 'None reported',
            medicalNotes: targetIntake?.medicalNotes || '',
            hasMedicalClearance: true,
            trainingDaysPerWeek: targetClient?.daysPerWeek || targetIntake?.trainingDaysPerWeek || 4,
            trainingLocation: targetIntake?.trainingLocation || 'commercial_gym',
            availableEquipment: targetClient?.availableEquipment || targetIntake?.availableEquipment || [],
            workoutDurationMinutes: targetIntake?.workoutDurationMinutes || 60,
            dietaryPreference: targetIntake?.dietaryPreference || 'flexible_dieting',
            foodAllergies: targetIntake?.foodAllergies || '',
            excludedFoods: targetIntake?.excludedFoods || '',
            mealsPerDay: 4,
            supplementHistory: targetIntake?.supplementHistory || '',
            status: newStatus,
            submittedAt: targetIntake?.submittedAt || new Date().toISOString()
          }
        ];
      }
      return updated;
    });

    // 2. Optimistically update clients state (match by id OR email)
    setClients(prev =>
      prev.map(c => {
        const isMatch = 
          (effectiveClientId && c.id === effectiveClientId) ||
          (targetEmail && c.email?.trim().toLowerCase() === targetEmail);

        if (isMatch) {
          const isNowActive = newStatus === 'active';
          return {
            ...c,
            status: isNowActive ? 'active' : c.status,
            approvalStatus: isNowActive ? 'approved' : (c as any).approvalStatus,
            subscriptionStatus: isNowActive ? 'active' : c.subscriptionStatus,
            intakeStatus: newStatus
          } as ClientRosterItem;
        }
        return c;
      })
    );

    // 3. Update clientIntake state and localStorage
    setClientIntake(prev => {
      const isMatch = 
        !prev ||
        prev.id === intakeId ||
        (effectiveClientId && prev.clientId === effectiveClientId) ||
        (targetEmail && prev.clientEmail?.trim().toLowerCase() === targetEmail);

      if (isMatch && prev) {
        const updated = { 
          ...prev, 
          status: newStatus,
          approvalStatus: newStatus === 'active' ? 'approved' : (prev as any).approvalStatus 
        };
        try {
          localStorage.setItem('bfl_client_intake', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    // 4. Update auth user in localStorage if active
    if (newStatus === 'active') {
      try {
        const savedAuth = localStorage.getItem('bfl_auth_user');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          if (
            (effectiveClientId && (parsed.uid === effectiveClientId || parsed.id === effectiveClientId)) ||
            (targetEmail && parsed.email?.trim().toLowerCase() === targetEmail)
          ) {
            localStorage.setItem('bfl_auth_user', JSON.stringify({
              ...parsed,
              status: 'active',
              approvalStatus: 'approved',
              subscriptionStatus: 'active',
              intakeStatus: 'active'
            }));
          }
        }
      } catch {}
    }

    // 5. Persist mutation to Firestore
    try {
      await updateIntakeStatusInFirestore(intakeId, effectiveClientId, newStatus);
    } catch (err) {
      console.warn('[FitnessData] updateIntakeStatusInFirestore error:', err);
    }
  };

  const sendChatMessage = (text: string, recipientId: string) => {
    const isClientSender = user?.role === 'client';
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: user?.uid || (isClientSender ? 'client_athlete' : 'coach'),
      senderName: user?.displayName || (isClientSender ? 'Athlete' : 'Coach'),
      senderRole: user?.role || (isClientSender ? 'client' : 'coach'),
      recipientId,
      text,
      timestamp: 'Just now',
      read: false
    };
    setMessages(prev => [...prev, newMsg]);

    // Persist real message to Firestore
    const clientId = isClientSender ? (user?.uid || 'client_athlete') : recipientId;
    sendMessageToFirestore({
      ...newMsg,
      clientId
    }).catch(err => console.warn('[FitnessData] sendMessageToFirestore error:', err));

    // Fire in-app notification trigger for the recipient
    addNotification({
      userId: recipientId,
      recipientRole: isClientSender ? 'coach' : 'client',
      title: isClientSender ? 'New Message from Athlete' : 'New Message from Coach',
      message: `${user?.displayName || (isClientSender ? 'Athlete' : 'Coach')}: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
      type: 'message_received',
      actionTab: 'chat',
      actorName: user?.displayName || (isClientSender ? 'Athlete' : 'Coach'),
      actorRole: user?.role || (isClientSender ? 'client' : 'coach'),
      changeDetail: text.slice(0, 100)
    });
  };

  const updateNutritionPlan = (updates: Partial<NutritionPlan>, skipSubscriptionCheck: boolean = false) => {
    // Subscription guard: prevent nutrition mutations for expired clients (coach role)
    if (!skipSubscriptionCheck && (user?.role === 'coach' || user?.role === 'admin') && updates.clientId) {
      const targetClient = clients.find(c => c.id === updates.clientId);
      if (targetClient && !canReceiveCoaching(targetClient)) {
        console.warn('[FitnessData] Cannot prescribe nutrition to expired client:', updates.clientId);
        throw new SubscriptionExpiredError(updates.clientId, getSubscriptionStatus(targetClient));
      }
    }

    setNutritionPlan(prev => {
      const updated: NutritionPlan = {
        clientId: updates.clientId || prev?.clientId || (user?.role === 'client' ? user.uid : 'client_alex'),
        calories: updates.calories ?? prev?.calories ?? 2400,
        proteinGrams: updates.proteinGrams ?? prev?.proteinGrams ?? 180,
        carbsGrams: updates.carbsGrams ?? prev?.carbsGrams ?? 220,
        fatGrams: updates.fatGrams ?? prev?.fatGrams ?? 60,
        waterLiters: updates.waterLiters ?? prev?.waterLiters ?? 3.0,
        dailyNotes: updates.dailyNotes ?? prev?.dailyNotes ?? '',
        supplementGuide: updates.supplementGuide ?? prev?.supplementGuide ?? [],
        updatedAt: new Date().toISOString().split('T')[0],
        ...updates
      };

      try {
        if (updated.clientId) {
          localStorage.setItem(`bfl_nutrition_plan_${updated.clientId}`, JSON.stringify(updated));
        }
        localStorage.setItem('bfl_nutrition_plan', JSON.stringify(updated));
      } catch {
        // ignore
      }

      if (updated.clientId) {
        savePrescribedNutrition(updated.clientId, updated, skipSubscriptionCheck).catch(err => {
          if (err instanceof SubscriptionExpiredError) {
            console.warn('[FitnessData] Subscription expired, nutrition prescription rejected');
            return;
          }
          console.warn('[FitnessData] savePrescribedNutrition error:', err);
        });
      }
      return updated;
    });

    if (user?.role === 'coach' || user?.role === 'admin') {
      const cal = updates.calories ?? nutritionPlan?.calories ?? '—';
      const prot = updates.proteinGrams ?? nutritionPlan?.proteinGrams ?? '—';
      const carb = updates.carbsGrams ?? nutritionPlan?.carbsGrams ?? '—';
      const fat = updates.fatGrams ?? nutritionPlan?.fatGrams ?? '—';
      const water = updates.waterLiters ?? nutritionPlan?.waterLiters ?? '—';
      addNotification({
        userId: updates.clientId || 'client_athlete',
        recipientRole: 'client',
        title: 'Macro Targets Updated',
        message: `${user?.displayName || 'Your coach'} updated your macro targets: ${cal} kcal · ${prot}P · ${carb}C · ${fat}F · ${water}L water. View your nutrition plan.`,
        type: 'nutrition_updated',
        actionTab: 'nutrition',
        actorName: user?.displayName || 'Coach',
        actorRole: user?.role || 'coach',
        changeDetail: `${cal} kcal · ${prot}P · ${carb}C · ${fat}F · ${water}L water`
      });
    }
  };

  const provideCoachFeedback = (checkInId: string, feedback: string) => {
    const targetCheckin = checkIns.find(c => c.id === checkInId);
    setCheckIns(prev => prev.map(c => {
      if (c.id === checkInId) {
        return {
          ...c,
          coachFeedback: feedback,
          reviewedByCoach: true,
          reviewedAt: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    }));

    // Persist coach feedback to Firestore
    saveCoachCheckInFeedback(checkInId, feedback).catch(err =>
      console.warn('[FitnessData] saveCoachCheckInFeedback error:', err)
    );

    if (targetCheckin) {
      const feedbackPreview = feedback.length > 100 ? feedback.slice(0, 100) + '...' : feedback;
      addNotification({
        userId: targetCheckin.clientId,
        recipientRole: 'client',
        title: 'Coach Feedback on Check-In',
        message: `${user?.displayName || 'Your coach'} reviewed your Week ${targetCheckin.weekNumber} check-in: "${feedbackPreview}" View feedback.`,
        type: 'checkin_feedback',
        actionTab: 'checkin',
        actorName: user?.displayName || 'Coach',
        actorRole: user?.role || 'coach',
        changeDetail: `Week ${targetCheckin.weekNumber} check-in reviewed`
      });
    }
  };

  const updateCMS = (updates: Partial<CMSContent>) => {
    setCmsContent(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetCMSToDefaults = () => {
    setCmsContent(INITIAL_CMS_CONTENT);
    setCoachingPlans(INITIAL_COACHING_PLANS);
    localStorage.removeItem('bfl_cms');
    localStorage.removeItem('bfl_plans');
  };

  const updatePlanPrice = (planId: string, newPrice: number) => {
    setCoachingPlans(prev => prev.map(p => p.id === planId ? { ...p, price: newPrice } : p));
  };

  const updatePlan = (planId: string, updates: Partial<CoachingPlan>) => {
    setCoachingPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));
  };

  const addPlan = (newPlan: CoachingPlan) => {
    setCoachingPlans(prev => [...prev, newPlan]);
  };

  const deletePlan = (planId: string) => {
    setCoachingPlans(prev => prev.filter(p => p.id !== planId));
  };

  // Multi-Coach / Multi-Tenant Scaling Handlers
  const addCoach = async (coachData: Omit<CoachMember, 'id' | 'joinedDate'> & { password?: string }): Promise<CoachMember> => {
    let newCoach: CoachMember;
    if (coachData.password) {
      newCoach = await createCoachAccountInAuthAndFirestore({
        name: coachData.name,
        email: coachData.email,
        password: coachData.password,
        role: coachData.role as any,
        specialty: coachData.specialty,
        maxClients: coachData.maxClients,
        avatarUrl: coachData.avatarUrl,
        bio: coachData.bio
      });
    } else {
      newCoach = {
        ...coachData,
        id: 'coach_' + Date.now(),
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      };
      await saveCoachToFirestore(newCoach);
    }
    setCoaches(prev => {
      const exists = prev.some(c => c.id === newCoach.id || c.email.toLowerCase() === newCoach.email.toLowerCase());
      if (exists) {
        return prev.map(c => (c.id === newCoach.id || c.email.toLowerCase() === newCoach.email.toLowerCase() ? newCoach : c));
      }
      return [...prev, newCoach];
    });
    addNotification({
      recipientRole: 'coach',
      title: 'New Coach Added',
      message: `${coachData.name} has joined the staff as ${coachData.role === 'nutritionist' ? 'Nutrition Specialist' : 'Coach'}.`,
      type: 'system',
      actionTab: 'clients'
    });
    return newCoach;
  };

  const updateCoach = (id: string, updates: Partial<CoachMember>) => {
    setCoaches(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      const target = updated.find(c => c.id === id);
      if (target) {
        saveCoachToFirestore(target).catch(err =>
          console.warn('[FitnessData] updateCoach in Firestore error:', err)
        );
      }
      return updated;
    });
  };

  const deleteCoach = (id: string) => {
    // Protect Founders & Admins from deletion
    if (id === 'admin_mass_narimanian' || id === 'admin_pouya_marghzari') {
      return;
    }
    setCoaches(prev => prev.filter(c => c.id !== id));
    deleteCoachFromFirestore(id).catch(err =>
      console.warn('[FitnessData] deleteCoachFromFirestore error:', err)
    );
  };

  const assignCoachToClient = (clientId: string, coachId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, assignedCoachId: coachId, coachId: coachId } : c));
    const targetCoach = coaches.find(co => co.id === coachId);
    
    // Persist coach assignment to Firestore (users/{clientId} and intakes)
    assignCoachToClientInFirestore(clientId, coachId, targetCoach?.name).catch(err =>
      console.warn('[FitnessData] assignCoachToClientInFirestore error:', err)
    );

    if (targetCoach) {
      addNotification({
        userId: clientId,
        recipientRole: 'client',
        title: 'Assigned Coach Updated',
        message: `Your lead coach is now ${targetCoach.name} (${targetCoach.specialty}).`,
        type: 'system',
        actionTab: 'profile'
      });
    }
  };

  // In-App Notification Handlers
  const addNotification = (notif: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => {
    // Prevent duplicate unread notifications with identical actor, title, and message
    const isDuplicate = notifications.some(
      n => n.userId === notif.userId && 
           n.title === notif.title && 
           n.actorName === notif.actorName &&
           n.message === notif.message &&
           !n.read
    );
    if (isDuplicate) {
      console.debug('[FitnessData] addNotification skipped duplicate unread notification:', notif.title);
      return;
    }

    const docId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newNotif: InAppNotification = {
      ...notif,
      id: docId,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Persist to Firestore for cross-session and cross-tab delivery
    saveNotificationToFirestore(newNotif).catch((err) =>
      console.debug('[FitnessData] saveNotificationToFirestore note:', err)
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markNotificationReadInFirestore(id);
  };

  const markAllNotificationsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      localStorage.setItem('bfl_notifications', JSON.stringify(notifications.map(n => ({ ...n, read: true }))));
    } catch {}
    if (unreadIds.length > 0) {
      markAllNotificationsReadInFirestore(unreadIds);
    }
  };

  // Progress & Analytics Handlers
  const logProgressMetric = (metric: Omit<ProgressMetricPoint, 'id'>) => {
    const newPoint: ProgressMetricPoint = {
      ...metric,
      id: 'pm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
    };
    setProgressMetrics(prev => [...prev, newPoint]);
    setClients(prev => prev.map(c => c.id === metric.clientId ? { ...c, currentWeightKg: metric.weightKg } : c));

    // Persist to Firestore
    saveProgressMetricToFirestore(newPoint).catch(err =>
      console.warn('[FitnessData] saveProgressMetricToFirestore error:', err)
    );

    // Notify coach when client logs biometrics (skip auto-logged volume entries from workout completion)
    if (user?.role === 'client' && metric.weightKg && !metric.notes?.startsWith('Workout session:')) {
      addNotification({
        recipientRole: 'coach',
        title: 'New Biometrics Logged',
        message: `${user?.displayName || 'Client'} logged new biometrics: ${metric.weightKg}kg body weight${metric.waistCm ? `, ${metric.waistCm}cm waist` : ''}. View progress graphs.`,
        type: 'progress_logged',
        actionTab: 'clients',
        actorName: user?.displayName || 'Client',
        actorRole: 'client',
        changeDetail: `Weight: ${metric.weightKg}kg${metric.waistCm ? ` · Waist: ${metric.waistCm}cm` : ''}${metric.notes ? ` · ${metric.notes}` : ''}`
      });
    }
  };

  const addProgressPhoto = (photo: Omit<ProgressPhotoRecord, 'id'>) => {
    const newPhoto: ProgressPhotoRecord = {
      ...photo,
      id: 'photo_' + Date.now()
    };
    setProgressPhotos(prev => [newPhoto, ...prev]);

    // Persist to Firestore
    saveProgressPhotoToFirestore(newPhoto).catch(err =>
      console.warn('[FitnessData] saveProgressPhotoToFirestore error:', err)
    );

    addNotification({
      recipientRole: 'coach',
      title: 'Progress Photos Uploaded',
      message: `${user?.displayName || 'Client'} uploaded progress photos at ${photo.weightKg}kg. View photos.`,
      type: 'progress_logged',
      actionTab: 'clients',
      actorName: user?.displayName || 'Client',
      actorRole: 'client',
      changeDetail: `Weight: ${photo.weightKg}kg · ${(photo as any).category || 'Physique'} photos`
    });
  };

  // ─── Subscription & Package Lifecycle Handlers ───────────────────────
  const requestPlanRenewal = async (clientId: string, planId: string) => {
    const plan = coachingPlans.find(p => p.id === planId) ||
      INITIAL_COACHING_PLANS.find(p => p.id === planId) ||
      coachingPlans[0];
    const requestedAt = new Date().toISOString();

    // 1. Immediately reset active dashboard state: clear old assigned workout and nutrition
    setAssignedWorkout(null);
    setNutritionPlan(null);
    try {
      localStorage.removeItem(`bfl_assigned_workout_${clientId}`);
      localStorage.removeItem('bfl_assigned_workout');
      localStorage.removeItem(`bfl_nutrition_plan_${clientId}`);
      localStorage.removeItem('bfl_nutrition_plan');
    } catch {}

    // 2. Permanently purge old workout & nutrition records in Firestore
    clearAthleteWorkoutsAndNutrition(clientId).catch(err =>
      console.warn('[FitnessData] clearAthleteWorkoutsAndNutrition error:', err)
    );

    const fullPlanLabel = `${plan.name} ($${plan.price}${plan.period})`;

    // 3. Optimistically update local clients roster
    setClients(prev =>
      prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            subscriptionStatus: 'pending_approval',
            status: 'pending',
            approvalStatus: 'pending',
            renewalRequestedPlanId: plan.id,
            renewalRequestedPlanName: fullPlanLabel,
            renewalRequestedPlanPrice: plan.price,
            renewalRequestedAt: requestedAt,
            planExpiresAt: undefined,
            packageStartedAt: undefined
          } as ClientRosterItem;
        }
        return c;
      })
    );

    // 4. If current logged-in user is renewing, update AuthContext profile immediately
    if (user?.uid === clientId || user?.email === clients.find(c => c.id === clientId)?.email) {
      updateAuthProfile({
        subscriptionStatus: 'pending_approval',
        approvalStatus: 'pending',
        status: 'pending',
        renewalRequestedPlanId: plan.id,
        renewalRequestedPlanName: fullPlanLabel,
        renewalRequestedPlanPrice: plan.price,
        renewalRequestedAt: requestedAt,
        planExpiresAt: undefined,
        packageStartedAt: undefined
      } as any);
    }

    // 5. Write-through to Firestore user profile
    try {
      await updateUserProfile(clientId, {
        subscriptionStatus: 'pending_approval',
        approvalStatus: 'pending',
        status: 'pending',
        renewalRequestedPlanId: plan.id,
        renewalRequestedPlanName: fullPlanLabel,
        renewalRequestedPlanPrice: plan.price,
        renewalRequestedAt: requestedAt,
        planExpiresAt: '',
        packageStartedAt: ''
      });
    } catch (err) {
      console.warn('[FitnessData] requestPlanRenewal Firestore error:', err);
    }

    const clientObj = clients.find(c => c.id === clientId);
    const assignedCoachId = clientObj?.assignedCoachId || clientObj?.coachId || 'admin_mass_narimanian';
    const clientName = clientObj?.name || user?.displayName || 'Athlete';

    // 6. Notify Admin / Coach
    addNotification({
      userId: assignedCoachId,
      recipientRole: 'coach',
      title: 'Package Renewal Requested',
      message: `${clientName} has requested renewal for ${plan.name} ($${plan.price}${plan.period}). Review client in roster to approve and initialize routine.`,
      type: 'system',
      actionTab: 'clients',
      actorName: clientName,
      actorRole: 'client',
      changeDetail: `Plan: ${plan.name} · $${plan.price}${plan.period}`
    });
  };

  const changeClientPlan = async (
    clientId: string,
    newPlan: CoachingPlan,
    paymentDetails: { cardLast4?: string; amount?: number } = {}
  ) => {
    const requestedAt = new Date().toISOString();
    const targetClient = clients.find(c => c.id === clientId);
    const assignedCoachId = targetClient?.assignedCoachId || targetClient?.coachId || 'admin_mass_narimanian';
    const clientName = targetClient?.name || user?.displayName || 'Athlete';
    const clientEmail = targetClient?.email || user?.email || 'athlete@bflfitness.com';
    const currentPlanId = targetClient?.activePlanId || (user as any)?.activePlanId;
    const currentPlanName = targetClient?.activePlanName || (user as any)?.activePlanName;

    // 1. Log transaction & create subscription in Firestore with pending_coach_approval status
    //    IMPORTANT: We DO NOT delete or overwrite the client's current assigned workout or nutrition!
    try {
      await submitPlanUpgradeAndTransaction({
        clientId,
        clientName,
        clientEmail,
        assignedCoachId,
        currentPlanId,
        currentPlanName,
        newPlan,
        paymentDetails
      });
    } catch (err) {
      console.warn('[FitnessData] submitPlanUpgradeAndTransaction error:', err);
    }

    const fullPlanLabel = `${newPlan.name} ($${newPlan.price}${newPlan.period})`;

    // 2. Optimistically update local clients roster with pending_coach_approval status
    setClients(prev =>
      prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            subscriptionStatus: 'pending_coach_approval',
            status: 'pending',
            pendingPlanId: newPlan.id,
            pendingPlanName: newPlan.name,
            pendingPlanPrice: newPlan.price,
            renewalRequestedPlanId: newPlan.id,
            renewalRequestedPlanName: fullPlanLabel,
            renewalRequestedPlanPrice: newPlan.price,
            renewalRequestedAt: requestedAt,
          } as ClientRosterItem;
        }
        return c;
      })
    );

    // 3. Update AuthContext profile if current logged-in user is upgrading
    if (user?.uid === clientId || user?.email?.toLowerCase() === clientEmail.toLowerCase()) {
      updateAuthProfile({
        subscriptionStatus: 'pending_coach_approval',
        status: 'pending',
        pendingPlanId: newPlan.id,
        pendingPlanName: newPlan.name,
        pendingPlanPrice: newPlan.price,
        renewalRequestedPlanId: newPlan.id,
        renewalRequestedPlanName: fullPlanLabel,
        renewalRequestedPlanPrice: newPlan.price,
        renewalRequestedAt: requestedAt,
      } as any);
    }

    // 4. Send real-time notification to assigned coach
    addNotification({
      userId: assignedCoachId,
      recipientRole: 'coach',
      title: 'Plan Upgrade - Coach Approval Required',
      message: `${clientName} has subscribed to ${newPlan.name} ($${newPlan.price}${newPlan.period}). Please review their profile, customize workout split, and initialize routine.`,
      type: 'system',
      actionTab: 'clients',
      actorName: clientName,
      actorRole: 'client',
      changeDetail: `Upgrade: ${newPlan.name} · $${newPlan.price}${newPlan.period} · Status: pending_coach_approval`
    });
  };

  const approveAndInitializeClientPlan = async (clientId: string, planId?: string, customDurationDays?: number) => {
    const targetClient = clients.find(c => c.id === clientId);
    const resolvedPlanId = planId ||
      targetClient?.pendingPlanId ||
      (targetClient as any)?.pendingPlanId ||
      targetClient?.renewalRequestedPlanId ||
      (targetClient as any)?.activePlanId ||
      targetClient?.planName ||
      (user?.uid === clientId ? (user?.pendingPlanId || user?.activePlanId) : undefined);
    
    // Resolve matching CoachingPlan
    const plan = coachingPlans.find(p => p.id === resolvedPlanId || p.name?.toLowerCase() === resolvedPlanId?.toLowerCase()) ||
      INITIAL_COACHING_PLANS.find(p => p.id === resolvedPlanId || p.name?.toLowerCase() === resolvedPlanId?.toLowerCase()) ||
      coachingPlans[0];

    const durationDays = customDurationDays || getPlanDurationDays(plan);
    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const fullPlanLabel = `${plan.name} ($${plan.price}${plan.period})`;

    // Preserve previous subscription in subscriptionHistory array
    const prevHistory = targetClient?.subscriptionHistory || [];
    const updatedHistory = [...prevHistory];
    if (targetClient?.activePlanId && targetClient?.packageStartedAt) {
      updatedHistory.push({
        planId: targetClient.activePlanId,
        planName: targetClient.activePlanName || targetClient.activePlanId,
        planPrice: targetClient.activePlanPrice || 0,
        startedAt: targetClient.packageStartedAt,
        endedAt: targetClient.planExpiresAt || startedAt,
        status: 'expired',
        renewedAt: startedAt,
      });
    }

    // 1. Update client profile in Firestore (explicitly wipe pendingPlanId and renewal fields)
    try {
      await updateUserProfile(clientId, {
        activePlanId: plan.id,
        activePlanName: fullPlanLabel,
        activePlanPrice: plan.price,
        status: 'active',
        subscriptionStatus: 'active',
        approvalStatus: 'approved',
        intakeStatus: 'active',
        hasCompletedIntake: true,
        packageStartedAt: startedAt,
        planExpiresAt: expiresAt,
        packageDurationDays: durationDays,
        pendingPlanId: '',
        pendingPlanName: '',
        pendingPlanPrice: 0,
        renewalRequestedPlanId: '',
        renewalRequestedPlanName: '',
        renewalRequestedPlanPrice: 0,
        renewalRequestedAt: '',
        cancellationRequestedAt: '',
        subscriptionHistory: updatedHistory,
      });
    } catch (err) {
      console.warn('[FitnessData] approveAndInitializeClientPlan Firestore error:', err);
    }

    // 1b. Update associated intake form status to active & approved
    const matchingIntake = intakeForms.find(i => 
      i.clientId === clientId || 
      (targetClient?.email && i.clientEmail?.trim().toLowerCase() === targetClient.email.trim().toLowerCase())
    );
    try {
      await updateIntakeStatus(matchingIntake?.id || '', clientId, 'active');
    } catch (intakeErr) {
      console.warn('[FitnessData] approveAndInitializeClientPlan updateIntakeStatus note:', intakeErr);
    }

    // 2. Update local clients state (clear pendingPlan and set active status)
    setClients(prev =>
      prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            status: 'active',
            subscriptionStatus: 'active',
            approvalStatus: 'approved',
            intakeStatus: 'active',
            planName: fullPlanLabel,
            activePlanId: plan.id,
            activePlanName: fullPlanLabel,
            activePlanPrice: plan.price,
            packageStartedAt: startedAt,
            planExpiresAt: expiresAt,
            packageDurationDays: durationDays,
            pendingPlanId: undefined,
            pendingPlanName: undefined,
            pendingPlanPrice: undefined,
            renewalRequestedPlanId: undefined,
            renewalRequestedPlanName: undefined,
            renewalRequestedPlanPrice: undefined,
            renewalRequestedAt: undefined,
            cancellationRequestedAt: undefined,
            subscriptionHistory: updatedHistory,
          } as ClientRosterItem;
        }
        return c;
      })
    );

    // 2b. Sync local intake forms
    setIntakeForms(prev =>
      prev.map(item => {
        if (item.clientId === clientId || (targetClient?.email && item.clientEmail?.trim().toLowerCase() === targetClient.email.trim().toLowerCase())) {
          return { ...item, status: 'active', approvalStatus: 'approved' };
        }
        return item;
      })
    );

    // 2c. Sync clientIntake state if applicable
    setClientIntake(prev => {
      if (prev && (prev.clientId === clientId || (targetClient?.email && prev.clientEmail?.trim().toLowerCase() === targetClient.email.trim().toLowerCase()))) {
        const updated = { ...prev, status: 'active' as const, approvalStatus: 'approved' as const };
        try {
          localStorage.setItem('bfl_client_intake', JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });

    // 2d. If the approved client IS the currently logged-in user (same-session),
    //     immediately update AuthContext so the portal unlocks without waiting for Firestore.
    if (user?.uid === clientId || user?.email === clients.find(c => c.id === clientId)?.email) {
      updateAuthProfile({
        status: 'active',
        subscriptionStatus: 'active',
        approvalStatus: 'approved',
        intakeStatus: 'active',
        activePlanId: plan.id,
        activePlanName: fullPlanLabel,
        activePlanPrice: plan.price,
        packageStartedAt: startedAt,
        planExpiresAt: expiresAt,
        packageDurationDays: durationDays,
        pendingPlanId: undefined,
        pendingPlanName: undefined,
        pendingPlanPrice: undefined,
        renewalRequestedPlanId: undefined,
        renewalRequestedPlanName: undefined,
        renewalRequestedPlanPrice: undefined,
        renewalRequestedAt: undefined,
        cancellationRequestedAt: undefined,
        subscriptionHistory: updatedHistory,
      } as any);
    }

    // 3. Initialize custom discipline workout routine & nutrition
    const planCategory = plan.category || (
      plan.name.toLowerCase().includes('boxing') ? 'boxing' :
      plan.name.toLowerCase().includes('powerlifting') ? 'powerlifting' :
      plan.name.toLowerCase().includes('face') ? 'face_to_face' : 'online'
    );
    
    let initializedRoutine: AssignedWorkout;
    let initializedNutrition: Partial<NutritionPlan>;

    if (planCategory === 'boxing') {
      initializedRoutine = {
        id: 'workout_box_' + Date.now(),
        clientId,
        title: 'Championship Boxing Conditioning & Technique Protocol',
        description: `Custom boxing periodization assigned for ${plan.name}. Focus on hand speed, kinetic chain rotation, and aerobic recovery.`,
        assignedDate: new Date().toISOString().split('T')[0],
        dayOfWeek: 'Day 1 - Fight Preparation',
        isCompleted: false,
        exercises: [
          {
            id: 'we_box_1',
            exerciseName: 'Shadowboxing & Footwork Prep (Slip Rope & Pivot Angles)',
            targetMuscle: 'Cardiorespiratory / Calves / Shoulders',
            equipment: 'Bodyweight / Jump Rope',
            coachNotes: 'Work head movement off the centerline while maintaining defensive guard. 3-minute rounds.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training.mp4',
            restSeconds: 60,
            sets: [
              { setNumber: 1, targetReps: '3 min round', actualWeightKg: 0, actualReps: 1, actualRpe: 7, completed: false },
              { setNumber: 2, targetReps: '3 min round', actualWeightKg: 0, actualReps: 1, actualRpe: 7.5, completed: false },
              { setNumber: 3, targetReps: '3 min round', actualWeightKg: 0, actualReps: 1, actualRpe: 8, completed: false }
            ]
          },
          {
            id: 'we_box_2',
            exerciseName: 'Heavy Bag Power Combinations (Jab-Cross-Lead Hook-Rear Uppercut)',
            targetMuscle: 'Full Body Kinetic Chain',
            equipment: 'Heavy Bag & Gloves',
            coachNotes: 'Turn hip over completely on the hook. Exhale sharply on impact. 10 punch flurries to finish each set.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '12 combos', actualWeightKg: 0, actualReps: 12, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '12 combos', actualWeightKg: 0, actualReps: 12, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '12 combos', actualWeightKg: 0, actualReps: 12, actualRpe: 9, completed: false },
              { setNumber: 4, targetReps: '12 combos', actualWeightKg: 0, actualReps: 12, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_box_3',
            exerciseName: 'Slip & Counter Defense Drill (Slip Bag / Focus Mitts)',
            targetMuscle: 'Core Rotators / Neck / Reaction',
            equipment: 'Slip Bag or Coach Mitts',
            coachNotes: 'Keep eyes level on your target. Counter immediately following head movement.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training.mp4',
            restSeconds: 60,
            sets: [
              { setNumber: 1, targetReps: '15 reps', actualWeightKg: 0, actualReps: 15, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '15 reps', actualWeightKg: 0, actualReps: 15, actualRpe: 8, completed: false },
              { setNumber: 3, targetReps: '15 reps', actualWeightKg: 0, actualReps: 15, actualRpe: 8.5, completed: false }
            ]
          },
          {
            id: 'we_box_4',
            exerciseName: 'High-Intensity Boxing Conditioning Finisher (Burpees + Jump Rope + Core)',
            targetMuscle: 'Conditioning / Metabolic',
            equipment: 'Jump Rope / Mat',
            coachNotes: 'Maximum sustained effort. Empty the tank on final round.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
            restSeconds: 45,
            sets: [
              { setNumber: 1, targetReps: '60 sec', actualWeightKg: 0, actualReps: 1, actualRpe: 9, completed: false },
              { setNumber: 2, targetReps: '60 sec', actualWeightKg: 0, actualReps: 1, actualRpe: 9.5, completed: false },
              { setNumber: 3, targetReps: '60 sec', actualWeightKg: 0, actualReps: 1, actualRpe: 10, completed: false }
            ]
          }
        ]
      };
      initializedNutrition = {
        clientId,
        calories: 2650,
        proteinGrams: 195,
        carbsGrams: 310,
        fatGrams: 65,
        waterLiters: 3.5,
        dailyNotes: 'High-glycemic recovery fuel around boxing sessions. Hydrate thoroughly.'
      };
    } else if (planCategory === 'powerlifting') {
      initializedRoutine = {
        id: 'workout_pl_' + Date.now(),
        clientId,
        title: 'Competitive Powerlifting Periodization Split (SBD Focus)',
        description: `Maximal strength peaking protocol assigned for ${plan.name}. Strict competition commands and pause integrity.`,
        assignedDate: new Date().toISOString().split('T')[0],
        dayOfWeek: 'Day 1 - Squat & Bench Primacy',
        isCompleted: false,
        exercises: [
          {
            id: 'we_pl_1',
            exerciseName: 'Competition Barbell Back Squat (Low-Bar Pause)',
            targetMuscle: 'Quadriceps / Glutes / Adductors',
            equipment: 'Barbell & Squat Rack',
            coachNotes: 'Descend to competition depth below parallel. Solid 1-second pause at the bottom without losing spinal brace.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-2.mp4',
            restSeconds: 180,
            sets: [
              { setNumber: 1, targetReps: '5', actualWeightKg: 100, actualReps: 5, actualRpe: 7.5, completed: false },
              { setNumber: 2, targetReps: '5', actualWeightKg: 110, actualReps: 5, actualRpe: 8, completed: false },
              { setNumber: 3, targetReps: '5', actualWeightKg: 115, actualReps: 5, actualRpe: 8.5, completed: false },
              { setNumber: 4, targetReps: '3', actualWeightKg: 120, actualReps: 3, actualRpe: 9, completed: false },
              { setNumber: 5, targetReps: '3', actualWeightKg: 125, actualReps: 3, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_pl_2',
            exerciseName: 'Paused Competition Bench Press (Touch & Press Command)',
            targetMuscle: 'Pectorals / Anterior Delts / Triceps',
            equipment: 'Barbell & Competition Bench',
            coachNotes: 'Drive through lats and legs. Pause motionless on chest before initiating lockout.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-1.mp4',
            restSeconds: 150,
            sets: [
              { setNumber: 1, targetReps: '5', actualWeightKg: 80, actualReps: 5, actualRpe: 7.5, completed: false },
              { setNumber: 2, targetReps: '5', actualWeightKg: 85, actualReps: 5, actualRpe: 8, completed: false },
              { setNumber: 3, targetReps: '5', actualWeightKg: 90, actualReps: 5, actualRpe: 8.5, completed: false },
              { setNumber: 4, targetReps: '3', actualWeightKg: 95, actualReps: 3, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_pl_3',
            exerciseName: 'Deficit Conventional Deadlift (2-inch Platform)',
            targetMuscle: 'Posterior Chain / Erectors / Hamstrings',
            equipment: 'Barbell & Platform',
            coachNotes: 'Reinforce leg drive off the floor. Do not round upper thoracic spine.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
            restSeconds: 180,
            sets: [
              { setNumber: 1, targetReps: '4', actualWeightKg: 120, actualReps: 4, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '4', actualWeightKg: 130, actualReps: 4, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '4', actualWeightKg: 140, actualReps: 4, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_pl_4',
            exerciseName: 'Heavy Ab Wheel Rollouts & Core Bracing',
            targetMuscle: 'Core / Transverse Abdominis',
            equipment: 'Ab Wheel',
            coachNotes: 'Keep pelvis tucked in posterior pelvic tilt. Squeeze glutes at top.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '12', actualWeightKg: 0, actualReps: 12, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '12', actualWeightKg: 0, actualReps: 12, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '12', actualWeightKg: 0, actualReps: 12, actualRpe: 8.5, completed: false }
            ]
          }
        ]
      };
      initializedNutrition = {
        clientId,
        calories: 2850,
        proteinGrams: 215,
        carbsGrams: 330,
        fatGrams: 75,
        waterLiters: 4.0,
        dailyNotes: 'Powerlifting recovery targets: 5g creatine monohydrate daily, emphasize complex carbohydrates.'
      };
    } else if (planCategory === 'face_to_face') {
      initializedRoutine = {
        id: 'workout_f2f_' + Date.now(),
        clientId,
        title: 'Face-to-Face Elite Biomechanics & Hypertrophy Split',
        description: `Direct 1-on-1 coaching protocol initialized for ${plan.name}. Supervised tempo and tension control.`,
        assignedDate: new Date().toISOString().split('T')[0],
        dayOfWeek: 'Day 1 - Lower & Posterior Chain',
        isCompleted: false,
        exercises: [
          {
            id: 'we_f2f_1',
            exerciseName: 'Barbell Back Squat (Controlled 3-sec Eccentric)',
            targetMuscle: 'Quadriceps / Glutes',
            equipment: 'Barbell & Squat Rack',
            coachNotes: 'Coach will supervise knee tracking and pelvis position. Controlled descent.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-2.mp4',
            restSeconds: 120,
            sets: [
              { setNumber: 1, targetReps: '8-10', actualWeightKg: 70, actualReps: 10, actualRpe: 7.5, completed: false },
              { setNumber: 2, targetReps: '8-10', actualWeightKg: 80, actualReps: 8, actualRpe: 8, completed: false },
              { setNumber: 3, targetReps: '8-10', actualWeightKg: 85, actualReps: 8, actualRpe: 8.5, completed: false },
              { setNumber: 4, targetReps: '8-10', actualWeightKg: 90, actualReps: 8, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_f2f_2',
            exerciseName: 'Incline Dumbbell Chest Press (30-Degree Angle)',
            targetMuscle: 'Upper Pectorals / Triceps',
            equipment: 'Dumbbells & Incline Bench',
            coachNotes: 'Tuck elbows 45 degrees. Squeeze upper chest at top peak contraction.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-1.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '10-12', actualWeightKg: 24, actualReps: 12, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '10-12', actualWeightKg: 26, actualReps: 10, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '10-12', actualWeightKg: 28, actualReps: 10, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_f2f_3',
            exerciseName: 'Romanian Deadlift (Glute & Hamstring Loaded Stretch)',
            targetMuscle: 'Hamstrings / Glutes',
            equipment: 'Barbell',
            coachNotes: 'Soft bend in knees, push hips backward until deep hamstring stretch.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '10', actualWeightKg: 70, actualReps: 10, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '10', actualWeightKg: 80, actualReps: 10, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '10', actualWeightKg: 85, actualReps: 10, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_f2f_4',
            exerciseName: 'Weighted Neutral-Grip Pull-Up / Lat Pulldown',
            targetMuscle: 'Latissimus Dorsi / Biceps',
            equipment: 'Pull-Up Bar / Cable Pulldown',
            coachNotes: 'Initiate with scapular depression. Drive elbows straight down.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-2.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '8-10', actualWeightKg: 0, actualReps: 10, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '8-10', actualWeightKg: 5, actualReps: 8, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '8-10', actualWeightKg: 10, actualReps: 8, actualRpe: 9, completed: false }
            ]
          }
        ]
      };
      initializedNutrition = {
        clientId,
        calories: 2500,
        proteinGrams: 190,
        carbsGrams: 270,
        fatGrams: 65,
        waterLiters: 3.5,
        dailyNotes: 'Prescribed for Face-to-Face protocol. 1.8g protein per kg bodyweight.'
      };
    } else {
      // Online Full Diet & Full Exercise
      initializedRoutine = {
        id: 'workout_onl_' + Date.now(),
        clientId,
        title: 'Complete Online Coaching Periodization Split',
        description: `Full diet & exercise program customized for ${plan.name}. Track every set and log weekly check-ins.`,
        assignedDate: new Date().toISOString().split('T')[0],
        dayOfWeek: 'Day 1 - Push Hypertrophy',
        isCompleted: false,
        exercises: [
          {
            id: 'we_onl_1',
            exerciseName: 'Barbell Flat Bench Press',
            targetMuscle: 'Chest / Triceps',
            equipment: 'Barbell & Bench',
            coachNotes: 'Solid arch, plant feet firmly into floor. 2-second eccentric phase.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-1.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '8-10', actualWeightKg: 60, actualReps: 10, actualRpe: 7.5, completed: false },
              { setNumber: 2, targetReps: '8-10', actualWeightKg: 70, actualReps: 8, actualRpe: 8, completed: false },
              { setNumber: 3, targetReps: '8-10', actualWeightKg: 75, actualReps: 8, actualRpe: 8.5, completed: false }
            ]
          },
          {
            id: 'we_onl_2',
            exerciseName: 'Incline Dumbbell Overhead Shoulder Press',
            targetMuscle: 'Deltoids / Triceps',
            equipment: 'Dumbbells & Bench',
            coachNotes: 'Full range of motion, press smoothly to lockout.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-1.mp4',
            restSeconds: 75,
            sets: [
              { setNumber: 1, targetReps: '10-12', actualWeightKg: 20, actualReps: 12, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '10-12', actualWeightKg: 22, actualReps: 10, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '10-12', actualWeightKg: 24, actualReps: 10, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_onl_3',
            exerciseName: 'Seated Cable Row (Neutral Grip)',
            targetMuscle: 'Upper Back / Latissimus',
            equipment: 'Cable Machine',
            coachNotes: 'Do not swing hips. Pull handle right below sternum and hold 1-sec squeeze.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/mass-training-2.mp4',
            restSeconds: 75,
            sets: [
              { setNumber: 1, targetReps: '10-12', actualWeightKg: 50, actualReps: 12, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '10-12', actualWeightKg: 55, actualReps: 10, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '10-12', actualWeightKg: 60, actualReps: 10, actualRpe: 9, completed: false }
            ]
          },
          {
            id: 'we_onl_4',
            exerciseName: 'Walking Dumbbell Lunges',
            targetMuscle: 'Quadriceps / Glutes',
            equipment: 'Dumbbells',
            coachNotes: 'Maintain upright posture, knee gently kisses the ground.',
            clientNotes: '',
            videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
            restSeconds: 90,
            sets: [
              { setNumber: 1, targetReps: '12 per leg', actualWeightKg: 14, actualReps: 12, actualRpe: 8, completed: false },
              { setNumber: 2, targetReps: '12 per leg', actualWeightKg: 16, actualReps: 12, actualRpe: 8.5, completed: false },
              { setNumber: 3, targetReps: '12 per leg', actualWeightKg: 18, actualReps: 12, actualRpe: 9, completed: false }
            ]
          }
        ]
      };
    }

    // 3. Mark routine as Draft / Unpublished — DO NOT auto-push to client during initialization
    const draftRoutine: AssignedWorkout = {
      ...initializedRoutine,
      id: `draft_${clientId}`,
      isDraft: true,
      status: 'draft',
      assignedDate: new Date().toISOString().split('T')[0]
    };

    // Execute atomic batch write: updates user to active, updates subscription doc to active,
    // archives old program in archived_programs, and writes fresh draft workout & nutrition skeleton
    try {
      await executeApproveAndInitializeProgramBatch({
        clientId,
        coachId: user?.uid || 'admin_mass_narimanian',
        coachName: user?.displayName || 'Coach Mass Narimanian',
        plan,
        customDurationDays: durationDays,
        previousWorkout: assignedWorkout,
        previousNutrition: nutritionPlan,
        freshDraftWorkout: draftRoutine,
        freshNutritionSkeleton: initializedNutrition,
      });
    } catch (batchErr) {
      console.warn('[FitnessData] executeApproveAndInitializeProgramBatch note:', batchErr);
    }

    // Save as draft locally and in Firestore draft storage (builder defaults to draft state)
    await saveDraftWorkout(clientId, draftRoutine);

    // Notify client in real-time about package approval WITHOUT assigning workout yet
    addNotification({
      userId: clientId,
      recipientRole: 'client',
      title: 'Package Approved!',
      message: `Your coach approved your ${plan.name} package! Your coaching period is active until ${new Date(expiresAt).toLocaleDateString()}. Your coach is currently designing your custom workout program.`,
      type: 'system',
      actionTab: 'profile',
      actorName: user?.displayName || 'Coach Mass Narimanian',
      actorRole: user?.role || 'admin',
      changeDetail: `Package: ${plan.name} · Active for ${durationDays} days · Expires: ${new Date(expiresAt).toLocaleDateString()}`
    });

    // Notify assigned coach about renewal (for multi-coach visibility)
    const assignedCoachId = targetClient?.assignedCoachId || targetClient?.coachId;
    if (assignedCoachId && assignedCoachId !== user?.uid) {
      addNotification({
        userId: assignedCoachId,
        recipientRole: 'coach',
        title: 'Client renewed their coaching plan',
        message: `Client: ${targetClient?.name || 'Athlete'}\nPlan: ${plan.name}\nStart: ${new Date(startedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\nEnd: ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\nThe client is active again and ready for coaching.`,
        type: 'system',
        actionTab: 'clients',
        actorName: targetClient?.name || 'Athlete',
        actorRole: 'client',
        changeDetail: `Plan: ${plan.name} · ${durationDays} days · Active until ${new Date(expiresAt).toLocaleDateString()}`
      });
    }
  };

  const setClientPlanExpired = async (clientId: string) => {
    const expiredAt = new Date(Date.now() - 1000).toISOString();
    const targetClient = clients.find(c => c.id === clientId);
    
    // Optimistic update
    setClients(prev =>
      prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            status: 'expired',
            subscriptionStatus: 'expired',
            planExpiresAt: expiredAt
          } as ClientRosterItem;
        }
        return c;
      })
    );

    if (user?.uid === clientId || user?.email === clients.find(c => c.id === clientId)?.email) {
      updateAuthProfile({
        status: 'expired',
        subscriptionStatus: 'expired',
        planExpiresAt: expiredAt
      } as any);
    }

    try {
      await updateUserProfile(clientId, {
        status: 'expired',
        subscriptionStatus: 'expired',
        planExpiresAt: expiredAt
      });
    } catch (err) {
      console.warn('[FitnessData] setClientPlanExpired Firestore error:', err);
    }

    // Notify the assigned coach about expiration
    if (targetClient) {
      const coachId = targetClient.assignedCoachId || targetClient.coachId;
      addNotification({
        userId: coachId,
        recipientRole: 'coach',
        title: "Client's coaching plan has expired",
        message: `Client: ${targetClient.name}\nPlan: ${targetClient.activePlanName || targetClient.planName}\nEnded: ${new Date(expiredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        type: 'system',
        actionTab: 'clients',
        actorName: targetClient.name,
        actorRole: 'client',
        changeDetail: `Plan: ${targetClient.activePlanName || targetClient.planName} · Status: EXPIRED`
      });
    }
  };

  // ─── Automatic Expiration Detection ───────────────────────────────────
  // Periodically checks all clients' planExpiresAt and auto-transitions
  // expired plans. Runs every 60 seconds when the app is open.
  // This does NOT depend on the client visiting the site — it runs from
  // the coach/admin session and updates Firestore directly.
  useEffect(() => {
    if (!isAdmin) return; // Only coaches/admins run the sweep

    const checkExpirations = () => {
      const now = Date.now();
      clients.forEach(client => {
        // Only check clients that are currently active with an expiration date
        if (
          client.planExpiresAt &&
          (client.status === 'active' || client.subscriptionStatus === 'active') &&
          client.subscriptionStatus !== 'pending_approval' &&
          client.status !== 'pending'
        ) {
          const expiresMs = new Date(client.planExpiresAt).getTime();
          if (!isNaN(expiresMs) && expiresMs <= now) {
            console.log(`[FitnessData] Auto-expiring client ${client.name} (${client.id})`);
            setClientPlanExpired(client.id);
          }
        }
      });
    };

    // Run immediately on mount
    checkExpirations();

    // Run every 60 seconds
    const interval = setInterval(checkExpirations, 60_000);
    return () => clearInterval(interval);
  }, [isAdmin, clients]);

  const effectiveIntakes = useMemo(() => {
    const intakeMap = new Map<string, IntakeFormData>();

    // 1. Add forms from Firestore / state (excluding dummy records)
    (intakeForms || []).forEach(form => {
      if (isTestOrDummyRecord(form.clientId || form.id, form.clientEmail, form.clientName)) return;
      const key = form.clientId || form.id;
      if (key) intakeMap.set(key, form);
    });

    // 1b. If clientIntake is available in state, ensure it is represented
    if (clientIntake && !isTestOrDummyRecord(clientIntake.clientId || clientIntake.id, clientIntake.clientEmail, clientIntake.clientName)) {
      const key = clientIntake.clientId || clientIntake.id || (user?.uid ? user.uid : 'client_intake');
      if (key) intakeMap.set(key, clientIntake);
    }

    // 2. Synthesize intake submission for any clients in clients roster who have completed intake or have metric data
    (clients || []).forEach(c => {
      if (isTestOrDummyRecord(c.id, c.email, c.name)) return;
      let found = false;
      for (const intake of intakeMap.values()) {
        if (intake.clientId === c.id || (c.email && intake.clientEmail && intake.clientEmail.toLowerCase() === c.email.toLowerCase())) {
          found = true;
          break;
        }
      }

      if (!found && (c.startingWeightKg > 0 || c.currentWeightKg > 0 || c.primaryGoal || (c as any).hasCompletedIntake || c.status === 'active')) {
        const synthId = `intake_${c.id}`;
        intakeMap.set(c.id, {
          id: synthId,
          clientId: c.id,
          clientName: c.name || 'New Client',
          clientEmail: c.email || '',
          selectedPlanId: (c as any).activePlanId || (c as any).planId,
          selectedPlanName: c.planName || (c as any).activePlanName,
          selectedPlanPrice: (c as any).activePlanPrice,
          approvalStatus: (c as any).approvalStatus || 'approved',
          age: (c as any).age || 28,
          gender: (c as any).gender || 'Not specified',
          heightCm: (c as any).heightCm || 178,
          currentWeightKg: c.currentWeightKg || c.startingWeightKg || 80,
          targetWeightKg: c.targetWeightKg || (c.currentWeightKg ? c.currentWeightKg - 5 : 75),
          primaryGoal: (c.primaryGoal as any) || 'hypertrophy',
          baselineMeasurements: (c as any).baselineMeasurements || {
            waistCm: (c as any).waistCm || 82,
            chestCm: (c as any).chestCm || 102,
          },
          injuryHistory: c.injuryNotes || 'None reported',
          medicalNotes: (c as any).medicalNotes || 'Cleared for compound resistance loading.',
          hasMedicalClearance: true,
          trainingDaysPerWeek: c.daysPerWeek || 4,
          trainingLocation: 'commercial_gym',
          availableEquipment: c.availableEquipment && c.availableEquipment.length > 0 ? c.availableEquipment : ['Barbells', 'Dumbbells', 'Cables', 'Machines'],
          workoutDurationMinutes: 60,
          dietaryPreference: (c as any).dietaryPreference || 'flexible_dieting',
          foodAllergies: (c as any).foodAllergies || '',
          excludedFoods: (c as any).excludedFoods || '',
          mealsPerDay: 4,
          supplementHistory: (c as any).supplementHistory || '',
          status: (c as any).intakeStatus || (c.status === 'active' && (c as any).hasCompletedIntake ? 'reviewed' : 'pending_review'),
          submittedAt: c.joinedDate || new Date().toISOString()
        });
      }
    });

    const result = Array.from(intakeMap.values());
    result.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeB - timeA;
    });
    return result;
  }, [intakeForms, clientIntake, user?.uid, clients]);

  // Intake submissions specifically waiting for coach review (pipeline / queue)
  const pendingIntakeSubmissions = useMemo(() => {
    return effectiveIntakes.filter(i => !i.status || i.status === 'pending_review');
  }, [effectiveIntakes]);

  const mergedClients = useMemo(() => {
    const rosterMap = new Map<string, ClientRosterItem>();
    
    // 1. Add clients from state (excluding dummy records)
    clients.forEach(c => {
      if (!isTestOrDummyRecord(c.id, c.email, c.name)) {
        rosterMap.set(c.id, c);
      }
    });
    
    // 2. Add or enrich from effectiveIntakes (excluding dummy records)
    effectiveIntakes.forEach(intake => {
      if (isTestOrDummyRecord(intake.clientId || intake.id, intake.clientEmail, intake.clientName)) return;

      let existingKey = intake.clientId;
      let existing = rosterMap.get(intake.clientId);
      if (!existing && intake.clientEmail) {
        for (const [k, v] of rosterMap.entries()) {
          if (v.email && v.email.toLowerCase() === intake.clientEmail.toLowerCase()) {
            existingKey = k;
            existing = v;
            break;
          }
        }
      }

      // Authoritative plan resolution:
      // 1. If existing client already has an active or assigned planName (that is NOT 'No Plan'), PRESERVE it!
      // 2. If existing client has activePlanId or activePlanName, match that against coachingPlans.
      // 3. Otherwise, check intake's selectedPlanId/selectedPlanName.
      const existingPlan = (existing?.planName && existing.planName !== 'No Plan')
        ? existing.planName
        : (existing?.activePlanName && existing.activePlanName !== 'No Plan')
        ? existing.activePlanName
        : null;

      const matchingPlan = coachingPlans.find(p => 
        p.id === (existing as any)?.activePlanId || 
        p.name?.toLowerCase() === (existing as any)?.activePlanName?.toLowerCase() ||
        p.id === (existing as any)?.planId ||
        p.id === (intake as any).selectedPlanId ||
        p.name?.toLowerCase() === (intake as any).selectedPlanName?.toLowerCase()
      );

      const resolvedPlanName = existingPlan || 
        (matchingPlan ? `${matchingPlan.name} ($${matchingPlan.price}${matchingPlan.period})` : ((intake as any).selectedPlanName || 'Online Coaching ($350/mo)'));

      // Check whether this client is approved & activated by a coach
      const isIntakeApproved = Boolean(intake?.status === 'active' || (intake as any)?.approvalStatus === 'approved');
      const isClientApproved = isIntakeApproved || Boolean(
        existing &&
        (existing.status === 'active' || (existing as any).approvalStatus === 'approved') &&
        existing.subscriptionStatus !== 'pending_approval'
      );

      if (existing) {
        rosterMap.set(existingKey!, {
          ...existing,
          planName: resolvedPlanName,
          activePlanId: existing.activePlanId || (matchingPlan ? matchingPlan.id : (intake as any).selectedPlanId),
          activePlanName: existing.activePlanName || resolvedPlanName,
          activePlanPrice: existing.activePlanPrice || (matchingPlan ? matchingPlan.price : (intake as any).selectedPlanPrice),
          assignedCoachId: existing.assignedCoachId || existing.coachId || (intake as any).assignedCoachId || (intake as any).coachId || 'admin_mass_narimanian',
          coachId: existing.coachId || existing.assignedCoachId || (intake as any).coachId || (intake as any).assignedCoachId || 'admin_mass_narimanian',
          primaryGoal: existing.primaryGoal || intake.primaryGoal,
          startingWeightKg: (intake.currentWeightKg && Number(intake.currentWeightKg) > 0) ? Number(intake.currentWeightKg) : (existing.startingWeightKg || 0),
          currentWeightKg: (intake.currentWeightKg && Number(intake.currentWeightKg) > 0) ? Number(intake.currentWeightKg) : (existing.currentWeightKg || 0),
          targetWeightKg: (intake.targetWeightKg && Number(intake.targetWeightKg) > 0) ? Number(intake.targetWeightKg) : (existing.targetWeightKg || 0),
          baselineMeasurements: intake.baselineMeasurements || (existing as any)?.baselineMeasurements,
          waistCm: intake.baselineMeasurements?.waistCm ?? (existing as any)?.waistCm,
          chestCm: intake.baselineMeasurements?.chestCm ?? (existing as any)?.chestCm,
          bicepsCm: intake.baselineMeasurements?.bicepsCm ?? (existing as any)?.bicepsCm,
          injuryNotes: (existing.injuryNotes && existing.injuryNotes !== 'None reported') ? existing.injuryNotes : (intake.injuryHistory || intake.medicalNotes || 'None reported'),
          daysPerWeek: existing.daysPerWeek > 0 ? existing.daysPerWeek : (intake.trainingDaysPerWeek || 4),
          availableEquipment: (existing.availableEquipment && existing.availableEquipment.length > 0) ? existing.availableEquipment : (intake.availableEquipment || []),
          intakeStatus: isClientApproved ? 'active' : (existing.intakeStatus || intake.status),
          status: isClientApproved ? 'active' : (existing.status === 'expired' ? 'expired' : 'pending'),
          subscriptionStatus: isClientApproved ? (existing.subscriptionStatus === 'expired' ? 'expired' : 'active') : 'pending_approval',
          approvalStatus: isClientApproved ? 'approved' : 'pending'
        } as any);
      } else if (intake.clientId) {
        const assignedCoachId = (intake as any).assignedCoachId || (intake as any).coachId || 'admin_mass_narimanian';
        rosterMap.set(intake.clientId, {
          id: intake.clientId,
          name: intake.clientName,
          email: intake.clientEmail,
          avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
          status: isClientApproved ? 'active' : 'pending',
          subscriptionStatus: isClientApproved ? 'active' : 'pending_approval',
          approvalStatus: isClientApproved ? 'approved' : 'pending',
          planName: resolvedPlanName,
          activePlanId: (matchingPlan ? matchingPlan.id : (intake as any).selectedPlanId),
          activePlanName: resolvedPlanName,
          activePlanPrice: (matchingPlan ? matchingPlan.price : (intake as any).selectedPlanPrice),
          adherenceRate: 100,
          joinedDate: intake.submittedAt ? intake.submittedAt.split('T')[0] : 'Recent',
          primaryGoal: intake.primaryGoal,
          startingWeightKg: intake.currentWeightKg,
          currentWeightKg: intake.currentWeightKg,
          targetWeightKg: intake.targetWeightKg,
          baselineMeasurements: intake.baselineMeasurements,
          waistCm: intake.baselineMeasurements?.waistCm,
          chestCm: intake.baselineMeasurements?.chestCm,
          bicepsCm: intake.baselineMeasurements?.bicepsCm,
          injuryNotes: intake.injuryHistory || 'None reported',
          daysPerWeek: intake.trainingDaysPerWeek || 4,
          availableEquipment: intake.availableEquipment || ['Barbells', 'Dumbbells'],
          assignedCoachId: assignedCoachId,
          coachId: assignedCoachId
        } as any);
      }
    });

    return Array.from(rosterMap.values());
  }, [clients, effectiveIntakes, coachingPlans]);

  return (
    <FitnessDataContext.Provider
      value={{
        clients: mergedClients,
        coachingPlans,
        exercises,
        templates,
        assignedWorkout,
        nutritionPlan,
        checkIns,
        messages,
        cmsContent,
        intakeForms: effectiveIntakes,
        intakeSubmissions: pendingIntakeSubmissions,
        clientIntake,
        coaches,
        notifications,
        progressMetrics,
        progressPhotos,
        addExercise,
        deleteExercise,
        addWorkoutTemplate,
        duplicateTemplate,
        assignTemplateToClient,
        assignWorkoutToClient,
        draftWorkouts,
        saveDraftWorkout,
        getDraftWorkout,
        clearDraftWorkout,
        logWorkoutSet,
        updateExerciseClientNotes,
        completeWorkout,
        submitWeeklyCheckIn,
        submitIntakeForm,
        updateIntakeStatus,
        sendChatMessage,
        updateNutritionPlan,
        provideCoachFeedback,
        respondToCheckIn: provideCoachFeedback,
        updateCMS,
        updateCMSContent: updateCMS,
        resetCMSToDefaults,
        updatePlanPrice,
        updatePlan,
        addPlan,
        deletePlan,
        requestPlanRenewal,
        changeClientPlan,
        approveAndInitializeClientPlan,
        setClientPlanExpired,
        addCoach,
        updateCoach,
        deleteCoach,
        assignCoachToClient,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        logProgressMetric,
        addProgressPhoto
      }}
    >
      {children}
    </FitnessDataContext.Provider>
  );
};

export const useFitnessData = () => {
  const context = useContext(FitnessDataContext);
  if (!context) {
    throw new Error('useFitnessData must be used within a FitnessDataProvider');
  }
  return context;
};
