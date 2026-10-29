export type UserRole = 'coach' | 'client' | 'admin';

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
  subscriptionStatus?: import('./subscription').SubscriptionStatus;
  pendingPlanId?: string;
  pendingPlanName?: string;
  pendingPlanPrice?: number;
  renewalRequestedPlanId?: string;
  renewalRequestedPlanName?: string;
  renewalRequestedPlanPrice?: number;
  renewalRequestedAt?: string;
  cancellationRequestedAt?: string;
  subscriptionHistory?: import('./subscription').HistoricalSubscription[];
  processedEventIds?: string[];
  activePlanId?: string;
  activePlanName?: string;
  activePlanPrice?: number;
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
  waistCm?: number;
  chestCm?: number;
  bicepsCm?: number;
  baselineMeasurements?: {
    chestCm?: number;
    waistCm?: number;
    bicepsCm?: number;
  };
}

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
  subscriptionStatus?: import('./subscription').SubscriptionStatus;
  pendingPlanId?: string;
  pendingPlanName?: string;
  pendingPlanPrice?: number;
  renewalRequestedPlanId?: string;
  renewalRequestedPlanName?: string;
  renewalRequestedPlanPrice?: number;
  renewalRequestedAt?: string;
  cancellationRequestedAt?: string;
  subscriptionHistory?: import('./subscription').HistoricalSubscription[];
  processedEventIds?: string[];
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
  waistCm?: number;
  chestCm?: number;
  bicepsCm?: number;
  baselineMeasurements?: {
    chestCm?: number;
    waistCm?: number;
    bicepsCm?: number;
  };
}

export interface CoachingPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  period: string; // e.g. "/ hour", "/ week", "/ month"
  category?: 'online' | 'face_to_face' | 'boxing' | 'powerlifting';
  billingCycle?: 'hourly' | 'weekly' | 'monthly';
  popular?: boolean;
  features: string[];
  idealFor: string;
  spotsLeft?: number;
}

export interface IntakeFormData {
  id?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  submittedAt: string;
  // Metrics
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
  // Medical
  injuryHistory: string;
  medicalNotes: string;
  hasMedicalClearance: boolean;
  // Logistics
  trainingDaysPerWeek: number;
  trainingLocation: 'commercial_gym' | 'home_gym' | 'hybrid';
  availableEquipment: string[];
  workoutDurationMinutes: number;
  // Nutrition
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

export interface Exercise {
  id: string;
  name: string;
  category: 'gym' | 'home' | 'cardio' | 'mobility';
  targetMuscleGroup: 'Chest' | 'Back' | 'Quadriceps' | 'Hamstrings' | 'Glutes' | 'Shoulders' | 'Arms' | 'Core' | 'Full Body';
  secondaryMuscles?: string[];
  equipment: 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight' | 'Resistance Bands' | 'Kettlebell';
  cues: string[];
  videoUrl: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
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
  supersetWithId?: string; // ID of linked exercise if superset/circuit
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
  dayOfWeek?: string; // 'Monday', 'Tuesday', etc.
  assignedDate?: string; // YYYY-MM-DD
  exercises: WorkoutExercise[];
  isCompleted: boolean;
  completedAt?: string;
  completedDate?: string;
  durationMinutes?: number;
  rating?: number; // 1-5
  feedback?: string;
  clientGeneralFeedback?: string;
  isDraft?: boolean;
  status?: 'draft' | 'published' | 'completed';
  publishedAt?: string;
  updatedAt?: any;
}

export * from './session';
export * from './subscription';

export type WorkoutSession = AssignedWorkout;

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  daysPerWeek: number;
  weeksDuration: number;
  workouts: {
    dayName: string;
    title: string;
    exercises: Omit<WorkoutExercise, 'id'>[];
  }[];
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
  adherenceRating: number; // 1 - 10
  energyRating: number; // 1 - 10
  sleepHours: number;
  stressRating: number; // 1 - 10
  hungerRating: number; // 1 - 10
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

export interface FounderCMSData {
  title: string;
  subtitle: string;
  badge: string;
  quote: string;
  pillars: {
    title: string;
    desc: string;
  }[];
}

export interface CMSContent {
  // Urgent Alerts / Banners
  topAnnouncementBar?: string;
  bannerNotice: string;
  founderApplicationsNotice?: string;

  // Hero Section
  heroHeadline: string;
  heroSubheadline: string;
  heroTrustPoints?: string[];
  heroStats?: { count: string; label: string }[];

  // About Founders Section
  foundersHeadline?: string;
  foundersSubheadline?: string;
  massFounder?: FounderCMSData;
  pouyaFounder?: FounderCMSData;

  // Methodologies & Qualifications
  coachOriginStory: string;
  coachQualifications: string[];
  trainingMethodologies: {
    title: string;
    description: string;
  }[];

  // Coaching Plans Section Copy
  plansHeadline?: string;
  plansSubheadline?: string;

  // Testimonials & FAQs
  testimonials: {
    id: string;
    clientName: string;
    achievement: string;
    duration: string;
    quote: string;
    stats: string;
    beforeImg: string;
    afterImg: string;
  }[];
  faqs: {
    category: string;
    question: string;
    answer: string;
  }[];

  // Contact & Footer Details
  contactEmail?: string;
  supportPhone?: string;
  supportHours?: string;
  locationAddress?: string;
  instagramHandle?: string;
  youtubeChannel?: string;
  certificationTitle?: string;
  certificationDescription?: string;
  footerDescription?: string;
}

export interface InAppNotification {
  id: string;
  userId?: string; // Target client/coach, or undefined for global
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
  actionTab?: 'workout' | 'nutrition' | 'checkin' | 'checkins' | 'chat' | 'progress' | 'profile' | 'clients' | 'intakes' | 'builder';
  /** Name of the person who triggered this notification */
  actorName?: string;
  /** Role of the actor: 'coach', 'client', 'admin', 'system' */
  actorRole?: string;
  /** Detailed summary of what changed (e.g. "2400 kcal · 180P · 220C · 60F") */
  changeDetail?: string;
}

export interface CoachMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'nutritionist';
  avatarUrl: string;
  specialty: string;
  activeClientsCount: number;
  maxClients: number;
  status: 'active' | 'invited';
  joinedDate: string;
  bio: string;
  isAdmin?: boolean;
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
  volumeLoadKg?: number; // Total workout volume
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

// ─── Subscription Lifecycle & Transaction Documents ────────────────────────
export interface SubscriptionDocument {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  assignedCoachId: string;
  currentActivePlanId?: string;
  currentActivePlanName?: string;
  pendingPlanId?: string;
  pendingPlanName?: string;
  pendingPlanPrice?: number;
  status: 'active' | 'pending_coach_approval' | 'expired' | 'cancelled' | 'past_due';
  requestedAt: string;
  approvedAt?: string;
  approvedByCoachId?: string;
  paymentReference?: string;
  planDurationDays?: number;
  planExpiresAt?: string;
  packageStartedAt?: string;
  billingCycle?: 'hourly' | 'weekly' | 'monthly' | 'custom';
  sessionCredits?: number;
  usedSessionCredits?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  pendingDowngradePlanId?: string;
  pendingDowngradePlanName?: string;
  pendingDowngradePlanPrice?: number;
  downgradeEffectiveAt?: string;
  remindersSent?: string[];
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
  stripeSubscriptionId?: string;
  billingCycle?: 'hourly' | 'weekly' | 'monthly' | 'custom';
  sessionCredits?: number;
  subtotal?: number;
  taxAmount?: number;
}

export interface ArchivedProgram {
  id: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  archivedAt: string;
  archivedByCoachId?: string;
  archivedPlanId?: string;
  archivedPlanName?: string;
  archivedPlanPrice?: number;
  previousWorkout?: any;
  previousNutrition?: any;
  reason?: string;
}

// ─── Re-export centralized subscription types ──────────────────────────────
export * from './subscription';

