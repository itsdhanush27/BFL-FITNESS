/**
 * BFL Fitness Mobile — Shared TypeScript Types
 * Mirrors the web app's types exactly (no browser-specific dependencies).
 * Source of truth: bfl-web/src/types/index.ts
 */

export type UserRole = 'coach' | 'client' | 'admin';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
  assignedCoachId?: string;
  coachId?: string;
  activePlanId?: string;
  activePlanName?: string;
  activePlanPrice?: number;
  approvalStatus?: 'pending' | 'approved';
  status?: 'active' | 'pending' | 'paused' | 'expired' | 'past_due' | 'cancelled';
  hasCompletedIntake?: boolean;
  intakeStatus?: 'pending_review' | 'program_created' | 'reviewed' | 'active';
  planExpiresAt?: string;
  packageStartedAt?: string;
  packageDurationDays?: number;
  subscriptionStatus?: SubscriptionStatus;
  pendingPlanId?: string;
  pendingPlanName?: string;
  pendingPlanPrice?: number;
  renewalRequestedPlanId?: string;
  renewalRequestedPlanName?: string;
  renewalRequestedPlanPrice?: number;
  renewalRequestedAt?: string;
  cancellationRequestedAt?: string;
  subscriptionHistory?: HistoricalSubscription[];
  processedEventIds?: string[];
  waistCm?: number;
  chestCm?: number;
  bicepsCm?: number;
  baselineMeasurements?: {
    chestCm?: number;
    waistCm?: number;
    bicepsCm?: number;
  };
}

export interface ClientRosterItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: 'active' | 'pending' | 'paused' | 'expired' | 'past_due' | 'cancelled';
  planName: string;
  adherenceRate: number;
  joinedDate: string;
  primaryGoal: string;
  startingWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  injuryNotes?: string;
  daysPerWeek: number;
  availableEquipment?: string[];
  assignedCoachId?: string;
  coachId?: string;
  intakeStatus?: 'pending_review' | 'program_created' | 'reviewed' | 'active';
  planExpiresAt?: string;
  packageStartedAt?: string;
  packageDurationDays?: number;
  subscriptionStatus?: SubscriptionStatus;
}

export interface CoachingPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  period: string;
  category?: 'online' | 'face_to_face' | 'boxing' | 'powerlifting';
  billingCycle?: 'hourly' | 'weekly' | 'monthly';
  popular?: boolean;
  features: string[];
  idealFor: string;
  spotsLeft?: number;
}

export interface ExerciseSetLog {
  setNumber: number;
  targetReps: string;
  actualReps: number;
  targetWeightKg?: number;
  actualWeightKg: number;
  targetRpe?: number;
  actualRpe?: number;
  completed: boolean;
  previousSession?: {
    weightKg: number;
    reps: number;
    rpe?: number;
  };
}

export interface WorkoutExercise {
  id: string;
  exerciseId?: string;
  exerciseName: string;
  targetMuscle: string;
  equipment: string;
  videoUrl?: string;
  sets: ExerciseSetLog[];
  supersetWithId?: string;
  isCircuit?: boolean;
  restSeconds: number;
  coachNotes?: string;
  clientNotes?: string;
}

export interface AssignedWorkout {
  id: string;
  clientId: string;
  title: string;
  description: string;
  dayOfWeek?: string;
  assignedDate?: string;
  exercises: WorkoutExercise[];
  isCompleted: boolean;
  completedAt?: string;
  completedDate?: string;
  durationMinutes?: number;
  rating?: number;
  feedback?: string;
  clientGeneralFeedback?: string;
  isDraft?: boolean;
  status?: 'draft' | 'published' | 'completed';
  publishedAt?: string;
  updatedAt?: any;
}

export interface NutritionPlan {
  clientId: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  waterLiters: number;
  dailyNotes: string;
  supplementGuide: string[];
  updatedAt: string;
  isPrescribed?: boolean;
}

export interface WeeklyCheckIn {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  weekNumber: number;
  submissionDate: string;
  weightKg: number;
  adherenceRating: number;
  energyRating: number;
  sleepHours: number;
  stressRating: number;
  hungerRating: number;
  waistMeasurementCm?: number;
  progressPhotos?: {
    front?: string;
    side?: string;
    back?: string;
  };
  winsAndStruggles: string;
  coachFeedback?: string;
  reviewedByCoach: boolean;
  reviewedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface ProgressMetricPoint {
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  bicepsCm?: number;
  volumeLoadKg?: number;
  notes?: string;
}

export interface ProgressPhotoRecord {
  id: string;
  clientId: string;
  date: string;
  frontUrl: string;
  sideUrl?: string;
  backUrl?: string;
  weightKg: number;
  notes?: string;
}

export interface InAppNotification {
  id: string;
  userId?: string;
  recipientRole?: UserRole;
  title: string;
  message: string;
  type:
    | 'workout_completed'
    | 'workout_assigned'
    | 'checkin_submitted'
    | 'checkin_feedback'
    | 'intake_submitted'
    | 'nutrition_updated'
    | 'message_received'
    | 'system'
    | 'progress_logged';
  timestamp: string;
  read: boolean;
  actionTab?: string;
  actorName?: string;
  actorRole?: string;
  changeDetail?: string;
}

export interface IntakeFormData {
  id?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  submittedAt: string;
  age: number;
  gender: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  primaryGoal: 'fat_loss' | 'hypertrophy' | 'strength' | 'recomp' | 'athletic_performance';
  baselineMeasurements: {
    chestCm?: number;
    waistCm?: number;
    hipsCm?: number;
    bicepsCm?: number;
    thighsCm?: number;
  };
  startingPhotos?: {
    front?: string;
    side?: string;
    back?: string;
  };
  injuryHistory: string;
  medicalNotes: string;
  hasMedicalClearance: boolean;
  trainingDaysPerWeek: number;
  trainingLocation: 'commercial_gym' | 'home_gym' | 'hybrid';
  availableEquipment: string[];
  workoutDurationMinutes: number;
  dietaryPreference: 'flexible_dieting' | 'high_protein_standard' | 'plant_based' | 'keto' | 'intermittent_fasting';
  foodAllergies: string;
  excludedFoods: string;
  mealsPerDay: number;
  supplementHistory: string;
  selectedPlanId?: string;
  selectedPlanName?: string;
  selectedPlanPrice?: number;
  approvalStatus?: 'pending' | 'approved';
  status: 'pending_review' | 'program_created' | 'reviewed' | 'active';
}

// ─── Subscription Types ────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'expired', 'cancelled', 'pending_approval', 'pending_coach_approval'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface HistoricalSubscription {
  planId: string;
  planName: string;
  planPrice: number;
  startedAt: string;
  endedAt: string;
  status: SubscriptionStatus;
  renewedAt?: string;
}

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

export interface SubscriptionAccessResult {
  status: SubscriptionStatus;
  canReceiveCoaching: boolean;
  reason: string;
}

/**
 * Derives the canonical SubscriptionStatus from a client's profile fields.
 * Exact port of bfl-web/src/types/subscription.ts logic.
 */
export function getSubscriptionStatus(client?: SubscriptionFields | null): SubscriptionStatus {
  if (!client) return 'expired';

  const subStatus = (client.subscriptionStatus || '').toLowerCase();
  const status = (client.status || '').toLowerCase();

  if (subStatus === 'past_due' || status === 'past_due') return 'past_due';

  if (client.cancellationRequestedAt) {
    if (client.planExpiresAt && new Date(client.planExpiresAt).getTime() > Date.now()) {
      return 'cancelled';
    }
    return 'expired';
  }

  if (subStatus === 'expired' || status === 'expired') return 'expired';

  if (client.planExpiresAt) {
    const expiresMs = new Date(client.planExpiresAt).getTime();
    if (!isNaN(expiresMs) && expiresMs <= Date.now()) return 'expired';
  }

  if (subStatus === 'active' || status === 'active') return 'active';

  if (
    subStatus === 'pending_coach_approval' ||
    status === 'pending_coach_approval' ||
    subStatus === 'pending_approval' ||
    status === 'pending'
  ) {
    return 'pending_coach_approval';
  }

  return 'expired';
}

export function canReceiveCoaching(client?: SubscriptionFields | null): boolean {
  const status = getSubscriptionStatus(client);
  return status === 'active' || status === 'cancelled' || status === 'past_due';
}

export function checkSubscriptionAccess(client?: SubscriptionFields | null): SubscriptionAccessResult {
  const status = getSubscriptionStatus(client);
  switch (status) {
    case 'active':
      return { status, canReceiveCoaching: true, reason: 'Active coaching subscription.' };
    case 'past_due':
      return { status, canReceiveCoaching: true, reason: 'Payment past due. Grace period active.' };
    case 'cancelled':
      return { status, canReceiveCoaching: true, reason: 'Cancelled but active until end of paid period.' };
    case 'pending_coach_approval':
      return { status, canReceiveCoaching: false, reason: 'Awaiting coach approval and program setup.' };
    case 'expired':
    default:
      return { status, canReceiveCoaching: false, reason: 'Plan expired. Renew to access coaching.' };
  }
}

export interface TransactionRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  paymentMethod: string;
  createdAt: string;
  cardLast4?: string;
  cardBrand?: string;
  invoiceNumber?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  durationDays?: number;
  receiptUrl?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeCustomerId?: string;
  subtotal?: number;
  taxAmount?: number;
}

