/**
 * BFL Fitness Mobile — Shared TypeScript Types
 * Mirrors the web app's types exactly (no browser-specific dependencies).
 * Source of truth: bfl-web/src/types/index.ts
 */

import type { SubscriptionStatus, HistoricalSubscription } from './subscription';

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
  billingCycle?: 'hourly' | 'weekly' | 'monthly' | 'custom';
  sessionCredits?: number;
  usedSessionCredits?: number;
  remainingSessionCredits?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  pendingDowngradePlanId?: string;
  pendingDowngradePlanName?: string;
  pendingDowngradePlanPrice?: number;
  downgradeEffectiveAt?: string;
  remindersSent?: string[];
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

// ─── Transaction Record ───────────────────────────────────────────────────

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
  stripeSubscriptionId?: string;
  billingCycle?: 'hourly' | 'weekly' | 'monthly' | 'custom';
  sessionCredits?: number;
  subtotal?: number;
  taxAmount?: number;
}

// ─── Re-export centralized subscription types ──────────────────────────────
export * from './subscription';

