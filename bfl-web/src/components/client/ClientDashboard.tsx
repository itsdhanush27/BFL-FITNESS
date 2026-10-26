import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Dumbbell, 
  Flame, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  Activity, 
  Play, 
  Check, 
  ChevronRight, 
  FileText, 
  Camera, 
  Send, 
  Award,
  Sparkles,
  Info,
  Timer,
  Droplet,
  ExternalLink,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
  Target,
  AlertTriangle,
  Lock,
  RefreshCw,
  Zap,
  ShieldAlert,
  ArrowRight,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFitnessData, getDaysRemaining } from '../../context/FitnessDataContext';
import { 
  getSubscriptionStatus, 
  canReceiveCoaching, 
  checkSubscriptionAccess 
} from '../../types/subscription';
import { RestTimer } from '../common/RestTimer';
import { WorkoutExercise } from '../../types';
import { ProgressAnalyticsView } from './ProgressAnalyticsView';
import { ClientProfileModal } from './ClientProfileModal';
import { RenewalPaymentModal } from './RenewalPaymentModal';
import { PlanSelectionModal } from './PlanSelectionModal';
import { CoachingPlan } from '../../types';
import { useClientSubscription } from '../../hooks/useClientSubscription';
import { PhotoUploadPreview } from '../common/PhotoUploadPreview';
import { uploadAndSaveCheckInPhotos } from '../../services/storageService';

interface ClientDashboardProps {
  onLogout?: () => void;
  initialTab?: 'schedule' | 'workout' | 'nutrition' | 'checkin' | 'chat' | 'progress';
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onLogout, initialTab = 'schedule' }) => {
  const { user, signOut } = useAuth();
  const { 
    assignedWorkout, 
    nutritionPlan, 
    checkIns, 
    messages, 
    clientIntake,
    coaches,
    coachingPlans,
    clients,
    logWorkoutSet, 
    updateExerciseClientNotes, 
    completeWorkout, 
    submitWeeklyCheckIn, 
    addProgressPhoto,
    sendChatMessage,
    requestPlanRenewal,
    changeClientPlan
  } = useFitnessData();

  const [activeTab, setActiveTab] = useState<'schedule' | 'workout' | 'nutrition' | 'checkin' | 'chat' | 'progress'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [planSelectionModalOpen, setPlanSelectionModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<CoachingPlan | null>(null);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [isUpgradeFlow, setIsUpgradeFlow] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    targetMuscle?: string;
    equipment?: string;
    videoUrl: string;
    coachNotes?: string;
    founderAttribution: string;
  } | null>(null);

  // Real-time onSnapshot subscription & user doc listener
  const {
    subscription: liveSubscription,
    isPendingCoachApproval: livePendingApproval,
    isActive: liveIsActive,
    activePlanName: liveActivePlanName,
    pendingPlanName: livePendingPlanName,
    pendingPlanPrice: livePendingPlanPrice,
    planExpiresAt: livePlanExpiresAt
  } = useClientSubscription(user?.uid);

  // Cross-check the live clients roster (updated synchronously by coach approval)
  // to override any stale AuthContext user values from localStorage.
  const clientRosterEntry = clients.find(
    c => c.id === user?.uid || (user?.email && c.email && c.email.toLowerCase() === user.email.toLowerCase())
  );

  // Merge: clients roster takes priority when it shows 'active' or 'pending'
  const effectiveStatus: string =
    liveIsActive ? 'active' : ((clientRosterEntry?.status as string) || (user as any)?.status || '');
  const effectiveSubStatus: string =
    liveIsActive ? 'active' : ((clientRosterEntry?.subscriptionStatus as string) || user?.subscriptionStatus || '');
  const effectiveApprovalStatus: string =
    liveIsActive ? 'approved' : ((clientRosterEntry as any)?.approvalStatus || (user as any)?.approvalStatus || '');

  // Coach activation is authoritative:
  // If either the onSnapshot listener, live roster, or user shows active/approved,
  // then the coach has explicitly approved & activated this athlete!
  const isCoachApproved = liveIsActive || Boolean(
    (clientRosterEntry && 
      (clientRosterEntry.status === 'active' || (clientRosterEntry as any).approvalStatus === 'approved') && 
      clientRosterEntry.subscriptionStatus !== 'pending_approval' &&
      clientRosterEntry.subscriptionStatus !== 'pending_coach_approval') ||
    (clientIntake && (clientIntake.status === 'active' || (clientIntake as any).approvalStatus === 'approved')) ||
    (user && ((user as any).status === 'active' || (user as any).approvalStatus === 'approved' || (user as any).subscriptionStatus === 'active') && (user as any).subscriptionStatus !== 'pending_approval' && (user as any).subscriptionStatus !== 'pending_coach_approval') ||
    (!clientRosterEntry && (user as any)?.status === 'active' && (user as any)?.approvalStatus === 'approved')
  );

  const isIntakePendingReview = Boolean(
    !isCoachApproved &&
    clientIntake &&
    (clientIntake.status === 'pending_review' || (clientIntake as any).approvalStatus === 'pending')
  );

  const isRosterPending = Boolean(
    !isCoachApproved &&
    clientRosterEntry && (
      clientRosterEntry.status === 'pending' ||
      clientRosterEntry.subscriptionStatus === 'pending_approval' ||
      (clientRosterEntry as any).approvalStatus === 'pending'
    )
  );

  // isRenewalPending: TRUE ONLY when NOT approved by coach and awaiting review
  // Once the coach approves and activates, isRenewalPending is strictly FALSE!
  const isRenewalPending = !isCoachApproved && Boolean(
    isIntakePendingReview ||
    isRosterPending ||
    effectiveSubStatus === 'pending_approval' ||
    effectiveApprovalStatus === 'pending' ||
    effectiveStatus === 'pending' ||
    Boolean(user?.renewalRequestedPlanId || clientRosterEntry?.renewalRequestedPlanId) ||
    (!clientRosterEntry && Boolean(clientIntake))
  );

  // Automatically sync local clientIntake if coach has approved the roster entry
  useEffect(() => {
    if (isCoachApproved && clientIntake && clientIntake.status !== 'active') {
      clientIntake.status = 'active';
      (clientIntake as any).approvalStatus = 'approved';
      try {
        localStorage.setItem('bfl_client_intake', JSON.stringify(clientIntake));
      } catch {}
    }
  }, [isCoachApproved, clientIntake]);
  const clientSubAccess = checkSubscriptionAccess({ 
    planExpiresAt: clientRosterEntry?.planExpiresAt ?? user?.planExpiresAt, 
    subscriptionStatus: effectiveSubStatus, 
    status: effectiveStatus,
    packageStartedAt: clientRosterEntry?.packageStartedAt ?? user?.packageStartedAt,
    cancellationRequestedAt: (clientRosterEntry as any)?.cancellationRequestedAt ?? (user as any)?.cancellationRequestedAt,
  });
  const isExpired = !isRenewalPending && !clientSubAccess.canReceiveCoaching;
  const daysRemaining = getDaysRemaining(user?.planExpiresAt);
  const expiryFormatted = user?.planExpiresAt 
    ? new Date(user.planExpiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const [selectedRenewalPlanId, setSelectedRenewalPlanId] = useState<string>(user?.activePlanId || coachingPlans[0]?.id || 'plan_online_monthly');
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);
  const [renewalSuccessMsg, setRenewalSuccessMsg] = useState(false);
  const [showRenewalPayment, setShowRenewalPayment] = useState(false);

  const handleRequestRenewal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.uid) return;
    setIsSubmittingRenewal(true);
    try {
      await requestPlanRenewal(user.uid, selectedRenewalPlanId);
      setRenewalSuccessMsg(true);
      setTimeout(() => setRenewalSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Renewal request failed:', err);
    } finally {
      setIsSubmittingRenewal(false);
    }
  };

  // Dynamic Coach and Client Data Resolution
  const clientCoachId = user?.assignedCoachId || user?.coachId || (clientIntake as any)?.assignedCoachId || (clientIntake as any)?.coachId;

  // Accurately resolve client plan name and price from roster or intake
  const activePlan = coachingPlans.find(p => p.id === user?.activePlanId) || coachingPlans[0];

  const displayPlanName = 
    clientRosterEntry?.planName ||
    clientRosterEntry?.activePlanName ||
    (clientIntake as any)?.selectedPlanName ||
    user?.activePlanName ||
    (user as any)?.renewalRequestedPlanName ||
    activePlan?.name ||
    'Coaching Program';

  const displayPlanPrice = 
    clientRosterEntry?.activePlanPrice ||
    (clientIntake as any)?.selectedPlanPrice ||
    user?.activePlanPrice ||
    (user as any)?.renewalRequestedPlanPrice ||
    activePlan?.price ||
    '80';
  const assignedCoach = coaches.find(c => c.id === clientCoachId) || coaches.find(c => c.id === 'admin_mass_narimanian') || coaches[0] || {
    id: 'admin_mass_narimanian',
    name: 'Mass Narimanian',
    role: 'admin',
    specialty: 'Co-Founder • Executive Physique & Hypertrophy Engineering',
    email: 'mass@bflfitness.com',
    avatarUrl: '/assets/founders/mass-gym.jpg'
  };
  const clientDisplayName = user?.displayName || clientIntake?.clientName || 'Valued Athlete';
  const isWorkoutAssignedToMe = Boolean(
    assignedWorkout &&
    !assignedWorkout.isDraft &&
    assignedWorkout.status !== 'draft' &&
    (assignedWorkout.exercises?.length || 0) > 0 && (
      assignedWorkout.clientId === user?.uid ||
      assignedWorkout.clientId === user?.id ||
      (user?.email && assignedWorkout.clientId?.toLowerCase() === user.email.toLowerCase()) ||
      (clientIntake?.clientId && assignedWorkout.clientId === clientIntake.clientId)
    )
  );

  const formatGoal = (goal?: string) => {
    if (!goal) return 'Custom Protocol';
    return goal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };
  
  // Workout completion celebration state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [workoutRating, setWorkoutRating] = useState(5);
  const [workoutFeedback, setWorkoutFeedback] = useState('');
  
  // Weekly Check-in Form State (Pre-filled from onboarding intake if available)
  const [checkInWeight, setCheckInWeight] = useState<number>(clientIntake?.currentWeightKg || 81.0);
  const [checkInAdherence, setCheckInAdherence] = useState<number>(9);
  const [checkInEnergy, setCheckInEnergy] = useState<number>(8);
  const [checkInSleep, setCheckInSleep] = useState<number>(7.5);
  const [checkInStress, setCheckInStress] = useState<number>(4);
  const [checkInHunger, setCheckInHunger] = useState<number>(5);
  const [checkInWaist, setCheckInWaist] = useState<number>(clientIntake?.baselineMeasurements?.waistCm || 83.0);
  const [checkInWins, setCheckInWins] = useState<string>('');
  const [checkInSubmitted, setCheckInSubmitted] = useState(false);
  const [checkInFrontFile, setCheckInFrontFile] = useState<File | null>(null);
  const [checkInSideFile, setCheckInSideFile] = useState<File | null>(null);
  const [isUploadingCheckInPhotos, setIsUploadingCheckInPhotos] = useState(false);
  const [checkInPhotoUploadProgress, setCheckInPhotoUploadProgress] = useState<number | null>(null);
  const [checkInPhotoError, setCheckInPhotoError] = useState<string | null>(null);

  // Sync check-in initial fields when clientIntake is fetched
  useEffect(() => {
    if (clientIntake) {
      if (clientIntake.currentWeightKg) {
        setCheckInWeight(clientIntake.currentWeightKg);
      }
      if (clientIntake.baselineMeasurements?.waistCm) {
        setCheckInWaist(clientIntake.baselineMeasurements.waistCm);
      }
    }
  }, [clientIntake]);

  // Chat message state
  const [chatInput, setChatInput] = useState('');

  // Floating or active rest timer state
  const [showRestTimer, setShowRestTimer] = useState(true);

  const fallbackExercise: WorkoutExercise = {
    id: 'ex_fallback',
    exerciseName: 'Warm-up & Movement Prep',
    targetMuscle: 'Full Body',
    equipment: 'Bodyweight',
    coachNotes: 'Complete general movement prep before loading compound lifts.',
    clientNotes: '',
    videoUrl: 'https://youtube.com',
    restSeconds: 60,
    sets: [
      { setNumber: 1, targetReps: '10-12', actualWeightKg: 0, actualReps: 10, completed: false }
    ]
  };

  const displayWorkoutTitle = isWorkoutAssignedToMe && assignedWorkout?.title
    ? assignedWorkout.title
    : 'Custom Program In Development';
  const displayWorkoutDescription = isWorkoutAssignedToMe && assignedWorkout?.description
    ? assignedWorkout.description
    : `Coach ${assignedCoach.name} is structuring your periodized split based on your onboarding intake.`;

  const workoutExercises = isWorkoutAssignedToMe && assignedWorkout?.exercises?.length
    ? assignedWorkout.exercises
    : [];
  const currentExercise = workoutExercises[activeExerciseIndex] || workoutExercises[0] || fallbackExercise;

  const totalSets = workoutExercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = workoutExercises.reduce((acc, ex) => acc + (ex.sets?.filter(s => s.completed).length || 0), 0);
  const workoutProgressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const handleToggleSetComplete = (exIdx: number, setIdx: number) => {
    const targetExercise = workoutExercises[exIdx];
    if (!targetExercise) return;
    const targetSet = targetExercise.sets?.[setIdx];
    if (!targetSet) return;
    logWorkoutSet(
      exIdx,
      setIdx,
      targetSet.actualWeightKg,
      targetSet.actualReps,
      targetSet.actualRpe || 8,
      !targetSet.completed
    );
  };

  const handleFinishWorkout = () => {
    completeWorkout(workoutRating, workoutFeedback, 55);
    setShowCompletionModal(false);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInPhotoError(null);

    let uploadedPhotos: { front?: string; side?: string } | undefined = undefined;
    const activeUserId = user?.uid || clientIntake?.clientId || 'client_athlete';
    const targetWeekNumber = checkIns.length + 1;

    // Handle photo uploads to Firebase Storage if files are attached
    if (checkInFrontFile || checkInSideFile) {
      setIsUploadingCheckInPhotos(true);
      setCheckInPhotoUploadProgress(20);

      try {
        const uploadRes = await uploadAndSaveCheckInPhotos({
          userId: activeUserId,
          clientName: clientDisplayName,
          clientEmail: user?.email || clientIntake?.clientEmail || undefined,
          weekNumber: targetWeekNumber,
          weightKg: checkInWeight,
          waistCm: checkInWaist,
          notes: checkInWins || `Week ${targetWeekNumber} Check-In`,
          frontFile: checkInFrontFile,
          sideFile: checkInSideFile,
          onProgress: (p) => {
            setCheckInPhotoUploadProgress(Math.min(95, p.overall));
          }
        });

        uploadedPhotos = {
          front: uploadRes.frontUrl || undefined,
          side: uploadRes.sideUrl || undefined
        };

        if (uploadRes.frontUrl && addProgressPhoto) {
          addProgressPhoto({
            clientId: activeUserId,
            date: new Date().toISOString().split('T')[0],
            frontUrl: uploadRes.frontUrl,
            sideUrl: uploadRes.sideUrl || undefined,
            weightKg: checkInWeight,
            notes: `Week ${targetWeekNumber} Check-In Photo`
          });
        }
      } catch (err: any) {
        console.error('[ClientDashboard] Check-in photo upload error:', err);
        setCheckInPhotoError('Could not upload photos to Firebase Storage. Submitting metrics without photos.');
      } finally {
        setIsUploadingCheckInPhotos(false);
        setCheckInPhotoUploadProgress(null);
      }
    }

    submitWeeklyCheckIn({
      clientId: activeUserId,
      clientName: clientDisplayName,
      clientEmail: user?.email || clientIntake?.clientEmail || undefined,
      weekNumber: targetWeekNumber,
      weightKg: checkInWeight,
      adherenceRating: checkInAdherence,
      energyRating: checkInEnergy,
      sleepHours: checkInSleep,
      stressRating: checkInStress,
      hungerRating: checkInHunger,
      waistMeasurementCm: checkInWaist,
      progressPhotos: uploadedPhotos,
      winsAndStruggles: checkInWins || 'Hit all training targets, felt recovery was solid.'
    });

    setCheckInSubmitted(true);
    setCheckInFrontFile(null);
    setCheckInSideFile(null);
    setTimeout(() => {
      setCheckInSubmitted(false);
      setActiveTab('schedule');
    }, 1500);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim(), assignedCoach.id);
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-20">
      {/* Top Client Header */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-0.5 shadow-md shadow-red-200">
              <img
                src={user?.photoURL || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80'}
                alt={user?.displayName || 'Client'}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-neutral-900 uppercase font-display tracking-tight">
                  {clientDisplayName}
                </h1>
                {isExpired ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>Subscription Expired</span>
                  </span>
                ) : isRenewalPending ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Awaiting Coach Activation</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Active Athlete</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>Coach: <strong className="text-neutral-800">{assignedCoach.name}</strong></span>
                <span>&bull;</span>
                <span>Plan: <strong className="text-red-600 font-semibold">{displayPlanName}</strong></span>
                {isExpired ? (
                  <>
                    <span>&bull;</span>
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold border border-red-200">
                      Package Finished {expiryFormatted ? `(${expiryFormatted})` : ''}
                    </span>
                  </>
                ) : isRenewalPending ? (
                  <>
                    <span>&bull;</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                      Awaiting Coach Review & Activation...
                    </span>
                  </>
                ) : user?.planExpiresAt ? (
                  <>
                    <span>&bull;</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left (Expires {expiryFormatted})
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 hover:text-neutral-900 border border-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="View Account Profile & Subscription"
            >
              <UserIcon className="w-3.5 h-3.5 text-red-600" />
              <span>My Account</span>
            </button>
            <button
              id="dashboard-logout-button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  signOut();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-xs font-bold text-neutral-700 hover:text-red-600 border border-neutral-200 hover:border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>Log Out</span>
            </button>
            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-center min-w-[100px] shadow-xs">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Weekly Target</span>
                <span className="text-base font-black text-neutral-900 font-mono">{clientIntake?.trainingDaysPerWeek || 4} Days</span>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-center min-w-[110px] shadow-xs">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Primary Goal</span>
                <span className="text-xs font-black text-red-600 uppercase font-display truncate block mt-0.5">
                  {formatGoal(clientIntake?.primaryGoal)}
                </span>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-center min-w-[95px] shadow-xs">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Weight</span>
                <span className="text-base font-black text-neutral-900 font-mono">
                  {clientIntake?.currentWeightKg || checkInWeight} kg
                </span>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-center min-w-[95px] shadow-xs">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Calories</span>
                <span className="text-base font-black text-neutral-900 font-mono">
                  {nutritionPlan && (nutritionPlan.isPrescribed || (nutritionPlan as any).prescribedByCoach) && nutritionPlan.calories > 0
                    ? `${nutritionPlan.calories} kcal` 
                    : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-6 overflow-x-auto">
          {[
            { id: 'schedule', label: 'Daily Schedule', icon: Calendar, locked: isExpired || isRenewalPending },
            { id: 'workout', label: 'Workout Tracker', icon: Dumbbell, badge: isWorkoutAssignedToMe && assignedWorkout ? (assignedWorkout.isCompleted ? 'Done' : `${completedSets}/${totalSets}`) : undefined, locked: isExpired || isRenewalPending },
            { id: 'progress', label: 'Progress & Graphs', icon: TrendingUp, locked: isExpired || isRenewalPending },
            { id: 'nutrition', label: 'Macros & Nutrition', icon: Flame, locked: isExpired || isRenewalPending },
            { id: 'checkin', label: 'Weekly Check-in', icon: Activity, locked: isExpired || isRenewalPending },
            { id: 'chat', label: 'Coach Messenger', icon: MessageSquare, badge: 'Direct', locked: false }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-200'
                    : 'bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 border border-neutral-200 shadow-xs'
                }`}
              >
                {tab.locked ? (
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span>{tab.label}</span>
                {tab.locked ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-100 text-red-700 font-bold uppercase">
                    Locked
                  </span>
                ) : tab.badge ? (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-red-600 font-bold'}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Pending Plan Upgrade Alert Banner */}
        {(!liveIsActive && (
          livePendingApproval || 
          user?.subscriptionStatus === 'pending_coach_approval' || 
          (clientRosterEntry as any)?.subscriptionStatus === 'pending_coach_approval' || 
          Boolean(livePendingPlanName || (user as any)?.pendingPlanId)
        )) && (
          <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-2 border-amber-300 flex items-start gap-4 shadow-sm animate-in fade-in">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                  Payment Confirmed • Awaiting Coach Initialization
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-amber-800 font-semibold font-mono">
                  ${livePendingPlanPrice || (user as any)?.pendingPlanPrice || (clientRosterEntry as any)?.pendingPlanPrice || 'Paid'}
                </span>
              </div>
              <h4 className="text-base font-black text-neutral-900 mt-1 uppercase font-display tracking-tight">
                Upgrade to {livePendingPlanName || (user as any)?.pendingPlanName || (clientRosterEntry as any)?.pendingPlanName || 'New Coaching Tier'} in Progress
              </h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Your payment has been successfully recorded in Firestore. Coach {assignedCoach.name} has received your upgrade alert and is customizing your training split & nutritional protocol. Your existing workout logs remain intact.
              </p>
            </div>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              View Plan Details
            </button>
          </div>
        )}

        {/* 0. PACKAGE EXPIRED LOCKDOWN VIEW */}
        {isExpired && activeTab !== 'chat' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Urgency / Expiry Alert Card */}
            <div className="bg-gradient-to-br from-red-950 via-neutral-900 to-neutral-950 border-2 border-red-600/60 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 text-xs font-black uppercase tracking-wider shadow-inner">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  <span>Coaching Plan Expired • Portal Locked</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black uppercase font-display tracking-tight text-white leading-tight">
                  Your Coaching Plan Has Ended
                </h2>

                <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                  Your previous workouts, nutrition plans and progress are saved. Renew your plan to continue receiving personalized coaching.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedRenewalPlanId(user?.activePlanId || coachingPlans[0]?.id || 'plan_online_monthly');
                      setShowRenewalPayment(true);
                    }}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Renew Current Plan</span>
                  </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('plan-selection-grid');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider border border-neutral-700 cursor-pointer transition-all flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4 text-red-400" />
                    <span>Choose Another Plan</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-red-400" />
                    <span>Message Coach</span>
                  </button>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-700/80 text-neutral-300 flex items-center gap-2 font-mono">
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    <span>Workout Tracker Locked</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-700/80 text-neutral-300 flex items-center gap-2 font-mono">
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    <span>Macros & Nutrition Locked</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-700/80 text-neutral-300 flex items-center gap-2 font-mono">
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    <span>Weekly Check-in Locked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Selection & Re-Enrollment Selector */}
            <div id="plan-selection-grid" className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-5">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 uppercase font-display">
                    Re-Enroll In Your Coaching Package
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Select either the same package or choose a different discipline. Upon submission, Coach Mass & Coach Pouya will review and initialize your next routine block.
                  </p>
                </div>

                {renewalSuccessMsg && (
                  <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Renewal Request Sent to Admin!</span>
                  </div>
                )}
              </div>

              {/* 7 Official BFL Packages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coachingPlans.map((plan) => {
                  const isSelected = selectedRenewalPlanId === plan.id;
                  const isCurrent = user?.activePlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedRenewalPlanId(plan.id)}
                      className={`rounded-2xl p-5 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50/20 shadow-md shadow-red-100 ring-2 ring-red-500/20'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50 shadow-2xs'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          plan.category === 'boxing' ? 'bg-amber-100 text-amber-800' :
                          plan.category === 'powerlifting' ? 'bg-purple-100 text-purple-800' :
                          plan.category === 'face_to_face' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {plan.category ? plan.category.replace(/_/g, ' ') : 'Coaching'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px] font-semibold">
                              Previous
                            </span>
                          )}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-red-600 bg-red-600' : 'border-neutral-300'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>

                      {/* Title & Price */}
                      <div className="space-y-1 mb-4">
                        <h4 className="font-black text-base text-neutral-900 font-display uppercase tracking-tight">
                          {plan.name}
                        </h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-neutral-900 font-mono">${plan.price}</span>
                          <span className="text-xs text-neutral-500 font-semibold">{plan.period}</span>
                        </div>
                        <p className="text-xs text-neutral-600 line-clamp-2 mt-1">
                          {plan.tagline}
                        </p>
                      </div>

                      {/* Features List */}
                      <div className="space-y-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                        {plan.features.slice(0, 3).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Re-Enrollment CTA Bar */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                    Selected Re-Enrollment Plan
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-neutral-900 uppercase font-display">
                      {coachingPlans.find(p => p.id === selectedRenewalPlanId)?.name || 'Selected Package'}
                    </span>
                    <span className="text-base font-black text-red-600 font-mono">
                      ${coachingPlans.find(p => p.id === selectedRenewalPlanId)?.price}
                    </span>
                    <span className="text-xs text-neutral-500 font-semibold">
                      {coachingPlans.find(p => p.id === selectedRenewalPlanId)?.period}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Administrator Coach Mass or Coach Pouya will receive an instant notification to approve and initialize your new routine.
                  </p>
                </div>

                <button
                  onClick={() => setShowRenewalPayment(true)}
                  disabled={isSubmittingRenewal}
                  className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  {isSubmittingRenewal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting To Coach...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Proceed to Payment & Re-Enroll</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : isRenewalPending && activeTab !== 'chat' ? (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── MAIN WAITING HERO CARD ── */}
            <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-amber-950/60 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6 max-w-3xl">
                {/* Status pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-widest shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  <span>Payment Confirmed · Awaiting Coach Program Initialization</span>
                </div>

                {/* Main Heading */}
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-5xl font-black uppercase font-display tracking-tight text-white leading-tight">
                    Wait Till Coach
                    <br />
                    <span className="text-amber-400">Initializes Your</span>
                    <br />
                    Program
                  </h2>
                  <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-xl">
                    Your payment for{' '}
                    <strong className="text-white font-bold">{user?.renewalRequestedPlanName || displayPlanName}</strong>
                    <span className="text-amber-400 font-black font-mono"> (${displayPlanPrice})</span>{' '}
                    has been received. Coach{' '}
                    <strong className="text-amber-400">Mass Narimanian</strong> &{' '}
                    <strong className="text-amber-400">Coach Pouya Marghzari</strong>{' '}
                    are reviewing your onboarding metrics and initializing your custom program split.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-900/40 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message Coach Directly</span>
                  </button>
                  <button
                    onClick={() => setProfileModalOpen(true)}
                    className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>View Subscription</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── INITIALIZATION PROGRESS STEPS ── */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 uppercase font-display tracking-tight">
                    Program Initialization Pipeline
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your portal unlocks automatically once the coach completes step 4.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                  <span>In Progress</span>
                </div>
              </div>

              <div className="space-y-0">
                {[
                  {
                    step: 1,
                    label: 'Payment Processed',
                    detail: `$${displayPlanPrice} collected · Receipt sent to ${user?.email || 'your email'}`,
                    status: 'done'
                  },
                  {
                    step: 2,
                    label: clientIntake ? 'Intake Form & Biometrics Submitted' : 'Renewal Request Submitted to Admin',
                    detail: 'Coach Mass & Coach Pouya have received your split goals, medical notes and biometrics.',
                    status: 'done'
                  },
                  {
                    step: 3,
                    label: 'Coach Reviewing Your Biometrics & History',
                    detail: 'Your check-in logs, progress photos and onboarding data are being analyzed to tailor your next block.',
                    status: 'active'
                  },
                  {
                    step: 4,
                    label: 'Custom Program & Macros Being Built',
                    detail: 'Personalized periodized split, RPE targets and macro prescription are being written for your new cycle.',
                    status: 'pending'
                  },
                  {
                    step: 5,
                    label: 'Portal Unlocks — You\'re Back in the Game',
                    detail: 'All dashboard features re-activate: Workout Tracker, Nutrition Plan, Check-ins & Progress Charts.',
                    status: 'pending'
                  }
                ].map((item, idx, arr) => (
                  <div key={item.step} className="flex gap-4">
                    {/* Step indicator + connector line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 font-black text-sm transition-all ${
                        item.status === 'done'
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                          : item.status === 'active'
                          ? 'bg-amber-500 border-amber-400 text-neutral-950 shadow-md shadow-amber-200 animate-pulse'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                      }`}>
                        {item.status === 'done' ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : item.status === 'active' ? (
                          <Clock className="w-4 h-4 text-neutral-900" />
                        ) : (
                          <span className="text-xs font-black">{item.step}</span>
                        )}
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={`w-0.5 h-8 mt-1 mb-1 rounded-full ${
                          item.status === 'done' ? 'bg-emerald-300' : 'bg-neutral-200'
                        }`} />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`pb-6 flex-1 ${idx === arr.length - 1 ? 'pb-0' : ''}`}>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className={`text-sm font-black uppercase font-display tracking-tight ${
                          item.status === 'done'
                            ? 'text-emerald-700'
                            : item.status === 'active'
                            ? 'text-amber-700'
                            : 'text-neutral-400'
                        }`}>
                          {item.label}
                        </p>
                        {item.status === 'done' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase">
                            Complete
                          </span>
                        )}
                        {item.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 text-[9px] font-bold uppercase animate-pulse">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── LOCKED FEATURES STRIP ── */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider shrink-0">Locked Until Coach Initializes:</span>
              {[
                { icon: Dumbbell, label: 'Workout Tracker' },
                { icon: Flame, label: 'Macros & Nutrition' },
                { icon: Activity, label: 'Weekly Check-in' },
                { icon: TrendingUp, label: 'Progress & Graphs' }
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-neutral-500 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                  <Lock className="w-3 h-3 text-red-400" />
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </div>
              ))}
              <button
                onClick={() => setActiveTab('chat')}
                className="ml-auto px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Chat With Coach</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. DAILY SCHEDULE */}
            {activeTab === 'schedule' && (
          <div className="space-y-8">
            {/* Today's Hero Agenda Card */}
            {!isWorkoutAssignedToMe ? (
              <div className="bg-gradient-to-br from-white via-neutral-50 to-red-50/40 border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Intake Form Received & Verified
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-neutral-900 uppercase font-display tracking-tight">
                      Custom Program In Development
                    </h2>
                    <p className="text-sm text-neutral-600 max-w-2xl">
                      Welcome, <strong className="text-neutral-900">{clientDisplayName}</strong>! Lead Coach <strong className="text-neutral-900">{assignedCoach.name}</strong> has received your onboarding submission and is tailoring your periodized split targeting <span className="text-red-600 font-bold uppercase">{formatGoal(clientIntake?.primaryGoal)}</span>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab('workout')}
                      className="px-5 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>View Program Status</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-200 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message Coach</span>
                    </button>
                  </div>
                </div>

                {/* Intake Baseline Snapshot */}
                <div className="mt-6 pt-6 border-t border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold">Weekly Frequency</p>
                    <p className="text-base font-black text-neutral-900 font-mono">
                      {clientIntake?.trainingDaysPerWeek || 4} Days / Week
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold">Training Facility</p>
                    <p className="text-base font-black text-neutral-900 capitalize font-mono truncate">
                      {clientIntake?.trainingLocation?.replace(/_/g, ' ') || 'Commercial Gym'}
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold">Weight Target</p>
                    <p className="text-base font-black text-red-600 font-mono">
                      {clientIntake?.currentWeightKg || '--'}kg &rarr; {clientIntake?.targetWeightKg || '--'}kg
                    </p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold">Nutrition Strategy</p>
                    <p className="text-base font-black text-neutral-900 capitalize font-mono truncate">
                      {clientIntake?.dietaryPreference?.replace(/_/g, ' ') || 'Flexible'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white via-neutral-50 to-red-50/40 border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" /> Assigned for Today
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-neutral-900 uppercase font-display tracking-tight">
                      {displayWorkoutTitle}
                    </h2>
                    <p className="text-sm text-neutral-600 max-w-2xl">
                      {displayWorkoutDescription}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {assignedWorkout?.isCompleted ? (
                      <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2 text-sm font-bold shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Workout Completed at {assignedWorkout?.completedAt || 'Today'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveTab('workout')}
                        className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-200 cursor-pointer transition-transform hover:scale-102"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Workout ({completedSets}/{totalSets} Sets)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress meter */}
                <div className="mt-6 pt-6 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Exercise Count</p>
                    <p className="text-lg font-black text-neutral-900 font-mono">{workoutExercises.length} Exercises</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Volume Target</p>
                    <p className="text-lg font-black text-neutral-900 font-mono">{totalSets} Total Working Sets</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Estimated Duration</p>
                    <p className="text-lg font-black text-red-600 font-mono">55 - 65 Minutes</p>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Schedule Checklist (Workout, Nutrition, Check-in) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Today's Training */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      assignedWorkout?.isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                    }`}>
                      {assignedWorkout?.isCompleted ? 'Done' : isWorkoutAssignedToMe ? 'Pending' : 'Building'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 uppercase font-display">
                    {isWorkoutAssignedToMe && assignedWorkout ? assignedWorkout.title : 'Program Development'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isWorkoutAssignedToMe && assignedWorkout
                      ? (assignedWorkout.description || 'Log each set in real time with RPE.')
                      : `Coach ${assignedCoach.name} is structuring your exercises based on your ${clientIntake?.trainingDaysPerWeek || 4}-day split.`}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('workout')}
                  className="mt-6 w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isWorkoutAssignedToMe ? 'Open Workout' : 'View Program Status'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 2: Today's Nutrition */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                      <Flame className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-bold uppercase">
                      {nutritionPlan ? `Target: ${nutritionPlan.calories} kcal` : 'Prescription Pending'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 uppercase font-display">
                    {nutritionPlan ? 'Macro Adherence' : 'Nutrition Protocol'}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {nutritionPlan ? (
                      <>
                        Protein: <strong className="text-neutral-800">{nutritionPlan.proteinGrams}g</strong> &bull; Carbs: <strong className="text-neutral-800">{nutritionPlan.carbsGrams}g</strong> &bull; Fats: <strong className="text-neutral-800">{nutritionPlan.fatGrams}g</strong>
                      </>
                    ) : (
                      <>
                        Coach {assignedCoach.name} is finalizing your caloric & macro targets for your {clientIntake?.dietaryPreference?.replace(/_/g, ' ') || 'dietary strategy'}.
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('nutrition')}
                  className="mt-6 w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{nutritionPlan ? 'View Nutrition Plan' : 'View Dietary Submission'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Card 3: Weekly Check-In Alert */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase">
                      Weekly Biofeedback
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 uppercase font-display">Sunday Check-in</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Submit morning weight, tape measurements, and fatigue scores for coach video audit.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('checkin')}
                  className="mt-6 w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Submit Check-in</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. WORKOUT INTERFACE & TRACKING */}
        {activeTab === 'workout' && (
          <div className="space-y-6">
            {!isWorkoutAssignedToMe ? (
              <div className="bg-white border border-neutral-200 rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-xs space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                  <Dumbbell className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" /> Program Assignment In Progress
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 uppercase font-display">
                    Your Coach Is Finalizing Your Routine
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                    Lead Coach <strong className="text-neutral-900">{assignedCoach.name}</strong> is reviewing your equipment list ({clientIntake?.availableEquipment?.slice(0, 3).join(', ') || 'Gym facilities'}) and tailoring exercises to your goal (<span className="text-red-600 font-bold uppercase">{formatGoal(clientIntake?.primaryGoal)}</span>).
                  </p>
                </div>
                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-200 cursor-pointer transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Ask Coach a Question</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header & completion trigger */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Active Session</span>
                <h2 className="text-2xl font-black text-neutral-900 uppercase font-display">
                  {displayWorkoutTitle}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                  <span>Sets Completed: <strong className="text-neutral-900">{completedSets} / {totalSets}</strong></span>
                  <div className="w-32 bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${workoutProgressPercent}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompletionModal(true)}
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-200 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Mark Workout Complete</span>
                </button>
              </div>
            </div>

            {/* Inline Rest Timer */}
            <RestTimer inline initialSeconds={currentExercise.restSeconds || 90} />

            {/* Exercise Selector Horizontal Track */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {workoutExercises.map((ex, idx) => {
                const isSelected = activeExerciseIndex === idx;
                const completedInThisEx = (ex.sets || []).filter(s => s.completed).length;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setActiveExerciseIndex(idx)}
                    className={`px-4 py-3 rounded-2xl text-left border shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-red-500 text-neutral-900 shadow-md ring-1 ring-red-500'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-red-600">
                        Ex {idx + 1}
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-500">
                        {completedInThisEx}/{ex.sets?.length || 0}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 mt-1 max-w-[180px] truncate">
                      {ex.exerciseName}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Current Active Exercise Card */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 mb-1">
                    <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono">
                      Exercise {activeExerciseIndex + 1} of {workoutExercises.length}
                    </span>
                    <span>&bull;</span>
                    <span className="text-red-600 uppercase font-bold">{currentExercise.targetMuscle}</span>
                    <span>&bull;</span>
                    <span>Equipment: {currentExercise.equipment}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 uppercase font-display">
                    {currentExercise.exerciseName}
                  </h3>
                </div>

                {/* Video Demo Link / Modal Trigger */}
                {currentExercise.videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const isPouya = currentExercise.videoUrl.toLowerCase().includes('pouya');
                      const isMass = currentExercise.videoUrl.toLowerCase().includes('mass');
                      setActiveVideoModal({
                        isOpen: true,
                        exerciseName: currentExercise.exerciseName,
                        targetMuscle: currentExercise.targetMuscle,
                        equipment: currentExercise.equipment,
                        videoUrl: currentExercise.videoUrl,
                        coachNotes: currentExercise.coachNotes,
                        founderAttribution: isPouya 
                          ? 'Founder & Coach Pouya Marghzari (Powerlifting & Boxing Specialist)'
                          : isMass
                          ? 'Founder & Head Coach Mass Narimanian (IFBB Competitor & Biomechanics)'
                          : 'BFL Head Coach'
                      });
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100 hover:border-red-300 transition-all shrink-0 shadow-xs cursor-pointer group"
                  >
                    <Play className="w-3.5 h-3.5 text-red-600 fill-red-600 group-hover:scale-110 transition-transform" />
                    <span>Watch Founder Technique Video</span>
                  </button>
                )}
              </div>

              {/* Coach's specific biomechanical notes */}
              {currentExercise.coachNotes && (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start gap-3 text-xs sm:text-sm text-neutral-700">
                  <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block mb-0.5">Coach's Technique Focus:</span>
                    {currentExercise.coachNotes}
                  </div>
                </div>
              )}

              {/* Set Logging Table with Historical Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px] font-bold tracking-wider">
                      <th className="py-3 px-3">Set</th>
                      <th className="py-3 px-3 text-neutral-400">Previous Session</th>
                      <th className="py-3 px-3">Target Reps</th>
                      <th className="py-3 px-3">Weight (kg)</th>
                      <th className="py-3 px-3">Reps Completed</th>
                      <th className="py-3 px-3">RPE</th>
                      <th className="py-3 px-3 text-center">Complete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {currentExercise.sets.map((set, setIdx) => (
                      <tr 
                        key={setIdx}
                        className={`transition-colors ${set.completed ? 'bg-red-50/60' : 'hover:bg-neutral-50'}`}
                      >
                        <td className="py-3.5 px-3 font-bold text-neutral-900 font-mono">
                          #{set.setNumber}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-500 font-mono text-xs">
                          {set.previousSession 
                            ? `${set.previousSession.weightKg}kg × ${set.previousSession.reps} @ RPE ${set.previousSession.rpe || 8}`
                            : 'First block'}
                        </td>
                        <td className="py-3.5 px-3 text-neutral-700 font-mono">
                          {set.targetReps}
                        </td>
                        <td className="py-3.5 px-3">
                          <input
                            type="number"
                            step="0.5"
                            value={set.actualWeightKg}
                            onChange={(e) => logWorkoutSet(
                              activeExerciseIndex,
                              setIdx,
                              Number(e.target.value),
                              set.actualReps,
                              set.actualRpe || 8,
                              set.completed
                            )}
                            className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-mono text-sm focus:border-red-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <input
                            type="number"
                            value={set.actualReps}
                            onChange={(e) => logWorkoutSet(
                              activeExerciseIndex,
                              setIdx,
                              set.actualWeightKg,
                              Number(e.target.value),
                              set.actualRpe || 8,
                              set.completed
                            )}
                            className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-mono text-sm focus:border-red-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <select
                            value={set.actualRpe || 8}
                            onChange={(e) => logWorkoutSet(
                              activeExerciseIndex,
                              setIdx,
                              set.actualWeightKg,
                              set.actualReps,
                              Number(e.target.value),
                              set.completed
                            )}
                            className="px-2 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-red-600 focus:outline-none cursor-pointer"
                          >
                            <option value={7}>7 (3 reps left)</option>
                            <option value={7.5}>7.5</option>
                            <option value={8}>8 (2 reps left)</option>
                            <option value={8.5}>8.5</option>
                            <option value={9}>9 (1 rep left)</option>
                            <option value={9.5}>9.5</option>
                            <option value={10}>10 (Failure)</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSetComplete(activeExerciseIndex, setIdx)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              set.completed
                                ? 'bg-red-600 text-white shadow-md shadow-red-200'
                                : 'bg-neutral-100 text-neutral-400 hover:text-neutral-700 border border-neutral-300'
                            }`}
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Client Notes Box for feedback */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Exercise Feedback & Joint Sensations (for Coach Review)
                </label>
                <textarea
                  rows={2}
                  value={currentExercise.clientNotes || ''}
                  onChange={(e) => updateExerciseClientNotes(activeExerciseIndex, e.target.value)}
                  placeholder="e.g. Right shoulder felt completely smooth at 34kg. Rest pause was 90 seconds."
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:outline-none resize-none placeholder:text-neutral-400"
                />
              </div>

              {/* Exercise Navigation footer */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                <button
                  disabled={activeExerciseIndex === 0}
                  onClick={() => setActiveExerciseIndex(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Previous Exercise
                </button>

                <button
                  disabled={activeExerciseIndex === workoutExercises.length - 1}
                  onClick={() => setActiveExerciseIndex(prev => Math.min(workoutExercises.length - 1, prev + 1))}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-30 cursor-pointer shadow-md shadow-red-200 transition-colors"
                >
                  Next Exercise &rarr;
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* 3. MACROS & NUTRITION VIEW */}
        {activeTab === 'nutrition' && (
          <div className="space-y-8">
            {nutritionPlan && (nutritionPlan.isPrescribed || (nutritionPlan as any).prescribedByCoach) && nutritionPlan.calories > 0 ? (
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Metabolic Targets</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 uppercase font-display">
                      Daily Nutrition & Macronutrient Prescription
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Prescribed by Coach {assignedCoach.name} &bull; Last updated {nutritionPlan.updatedAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-neutral-900 font-mono">{nutritionPlan.calories}</span>
                    <span className="text-xs text-neutral-500 block font-semibold">Total Caloric Ceiling</span>
                  </div>
                </div>

                {/* Macro Bars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Protein (4 kcal/g)</span>
                      <span className="text-xl font-black text-neutral-900 font-mono">{nutritionPlan.proteinGrams}g</span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-600 h-full w-[85%]" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-2">
                      Targets 2.4g/kg of lean body mass for maximal muscle protein synthesis.
                    </p>
                  </div>

                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Carbohydrates</span>
                      <span className="text-xl font-black text-neutral-900 font-mono">{nutritionPlan.carbsGrams}g</span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[70%]" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-2">
                      Focus ~60g before training and ~60g post-workout for glycogen replenishment.
                    </p>
                  </div>

                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Fats (9 kcal/g)</span>
                      <span className="text-xl font-black text-neutral-900 font-mono">{nutritionPlan.fatGrams}g</span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-[60%]" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-2">
                      Essential fatty acids for endocrine health, testosterone, and joint mobility.
                    </p>
                  </div>
                </div>

                {/* Water & Hydration Card */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between mb-8 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Droplet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 uppercase">Daily Hydration Baseline</h4>
                      <p className="text-xs text-neutral-500">Essential for intramuscular hydration and creatine absorption.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-neutral-900 font-mono">{nutritionPlan.waterLiters} Liters</span>
                  </div>
                </div>

                {/* Coach Guidelines & Supplement Protocols */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">
                      Meal Timing & Satiety Notes
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                      {nutritionPlan.dailyNotes}
                    </p>
                  </div>

                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">
                      Supplement Protocol
                    </h4>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-neutral-700">
                      {nutritionPlan.supplementGuide.map((sup, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-red-600" />
                          <span>{sup}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-3xl p-8 text-center max-w-2xl mx-auto shadow-xs space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <Flame className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Protocol In Progress</span>
                  <h2 className="text-2xl font-black text-neutral-900 uppercase font-display mt-1">
                    Macro Targets in Development
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto mt-2 leading-relaxed">
                    Coach {assignedCoach.name} is calculating your personalized caloric ceiling, protein targets, and nutrient timing based on your submitted onboarding metrics.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Current Weight</span>
                    <span className="text-sm font-black text-neutral-900 font-mono">
                      {clientIntake?.currentWeightKg || checkInWeight} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Target Split</span>
                    <span className="text-sm font-black text-neutral-900 font-mono">
                      {clientIntake?.trainingDaysPerWeek || 4} Days/wk
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Diet Strategy</span>
                    <span className="text-xs font-bold text-red-600 uppercase font-display truncate block mt-0.5">
                      {clientIntake?.dietaryPreference?.replace(/_/g, ' ') || 'Flexible'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Real Onboarding Nutrition Submissions */}
            {clientIntake && (
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    Onboarding Dietary Submission
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                    Verified from Form
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Diet Strategy</span>
                    <span className="text-sm font-bold text-neutral-900 capitalize block mt-0.5">
                      {clientIntake.dietaryPreference?.replace(/_/g, ' ') || 'Flexible Dieting'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Meals Per Day</span>
                    <span className="text-sm font-bold text-neutral-900 block mt-0.5">
                      {clientIntake.mealsPerDay || 4} Meals / Day
                    </span>
                  </div>
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Allergies & Excluded</span>
                    <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">
                      {clientIntake.foodAllergies && clientIntake.foodAllergies !== 'None' 
                        ? clientIntake.foodAllergies 
                        : (clientIntake.excludedFoods || 'None reported')}
                    </span>
                  </div>
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block">Supplement History</span>
                    <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">
                      {clientIntake.supplementHistory || 'Creatine, Whey'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. WEEKLY CHECK-IN FORM & HISTORY */}
        {activeTab === 'checkin' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Submission */}
              <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="mb-6">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Weekly Accountability</span>
                  <h2 className="text-2xl font-black text-neutral-900 uppercase font-display">
                    Submit Week {checkIns.length + 1} Check-In
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Coach {assignedCoach.name} uses this data to adjust your calories and training volume for the upcoming microcycle.
                  </p>
                </div>

                {checkInSubmitted ? (
                  <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-red-600 mx-auto animate-pulse" />
                    <h3 className="text-xl font-bold text-neutral-900 uppercase">Check-in Transmitted!</h3>
                    <p className="text-xs text-neutral-600">
                      Your metrics and notes have been logged for review. Coach {assignedCoach.name} will publish feedback within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleCheckInSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Morning Body Weight (kg) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={checkInWeight}
                          onChange={(e) => setCheckInWeight(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-sm focus:border-red-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Waist Measurement (cm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={checkInWaist}
                          onChange={(e) => setCheckInWaist(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-sm focus:border-red-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Nutrition Adherence (1-10)
                        </label>
                        <select
                          value={checkInAdherence}
                          onChange={(e) => setCheckInAdherence(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:outline-none cursor-pointer"
                        >
                          {[10, 9, 8, 7, 6, 5, 4, 3].map(n => (
                            <option key={n} value={n}>{n} / 10 {n >= 9 ? '(100% On Track)' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Average Sleep (Hours / Night)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={checkInSleep}
                          onChange={(e) => setCheckInSleep(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-red-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Gym Energy & Drive (1-10)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={checkInEnergy}
                          onChange={(e) => setCheckInEnergy(Number(e.target.value))}
                          className="w-full accent-red-600"
                        />
                        <span className="text-xs text-neutral-500 block text-right font-mono">{checkInEnergy} / 10</span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Life Stress Level (1-10)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={checkInStress}
                          onChange={(e) => setCheckInStress(Number(e.target.value))}
                          className="w-full accent-red-600"
                        />
                        <span className="text-xs text-neutral-500 block text-right font-mono">{checkInStress} / 10</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Weekly Wins, Lift Progressions & Roadblocks
                      </label>
                      <textarea
                        rows={3}
                        value={checkInWins}
                        onChange={(e) => setCheckInWins(e.target.value)}
                        placeholder="Describe how strength felt on squats, any social dining events navigated, digestion notes, etc..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:outline-none resize-none placeholder:text-neutral-400"
                      />
                    </div>

                    {/* Check-In Photos Direct Upload Section */}
                    <div className="pt-3 border-t border-neutral-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-red-600" />
                          <span>Attach Check-In Photos (Optional)</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          Stored in Firebase Storage
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <PhotoUploadPreview
                          id="checkin-weekly-front"
                          label="Front Pose Photo"
                          subLabel="Morning relaxed front pose"
                          selectedFile={checkInFrontFile}
                          onFileSelect={(f) => {
                            setCheckInFrontFile(f);
                            setCheckInPhotoError(null);
                          }}
                          isUploading={isUploadingCheckInPhotos}
                          uploadProgress={checkInPhotoUploadProgress}
                        />

                        <PhotoUploadPreview
                          id="checkin-weekly-side"
                          label="Side or Back Pose"
                          subLabel="Profile or lat spread"
                          selectedFile={checkInSideFile}
                          onFileSelect={(f) => setCheckInSideFile(f)}
                          isUploading={isUploadingCheckInPhotos}
                          uploadProgress={checkInPhotoUploadProgress}
                        />
                      </div>
                      {checkInPhotoError && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          {checkInPhotoError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isUploadingCheckInPhotos}
                      className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-red-200 cursor-pointer transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isUploadingCheckInPhotos ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Compressing & Uploading Photos ({checkInPhotoUploadProgress || 20}%)...</span>
                        </>
                      ) : (
                        <span>Submit Weekly Check-In Form</span>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* History & Coach Responses */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-lg font-black text-neutral-900 uppercase font-display">
                  Check-In History & Feedback
                </h3>

                {checkIns.length > 0 ? (
                  checkIns.map((ci) => (
                    <div key={ci.id} className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-xs font-bold font-mono">
                          Week #{ci.weekNumber}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">{ci.submissionDate}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                          <span className="text-[10px] text-neutral-500 block">Weight</span>
                          <strong className="text-neutral-900 font-mono">{ci.weightKg} kg</strong>
                        </div>
                        <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                          <span className="text-[10px] text-neutral-500 block">Adherence</span>
                          <strong className="text-red-600 font-mono">{ci.adherenceRating}/10</strong>
                        </div>
                        <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                          <span className="text-[10px] text-neutral-500 block">Waist</span>
                          <strong className="text-neutral-900 font-mono">{ci.waistMeasurementCm || '--'} cm</strong>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-600 italic">
                        &ldquo;{ci.winsAndStruggles}&rdquo;
                      </p>

                      {/* Display attached check-in photos if present */}
                      {ci.progressPhotos && (ci.progressPhotos.front || ci.progressPhotos.side) && (
                        <div className="pt-2 border-t border-neutral-100">
                          <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-1.5 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-red-600" />
                            <span>Attached Check-In Photos:</span>
                          </span>
                          <div className="flex gap-2">
                            {ci.progressPhotos.front && (
                              <img
                                src={ci.progressPhotos.front}
                                alt={`Week ${ci.weekNumber} Front`}
                                className="w-14 h-18 object-cover rounded-lg border border-neutral-200 cursor-pointer hover:border-red-500 transition-colors shadow-2xs"
                                onClick={() => setActiveTab('progress')}
                                title="Click to view in Progress Comparison"
                              />
                            )}
                            {ci.progressPhotos.side && (
                              <img
                                src={ci.progressPhotos.side}
                                alt={`Week ${ci.weekNumber} Side`}
                                className="w-14 h-18 object-cover rounded-lg border border-neutral-200 cursor-pointer hover:border-red-500 transition-colors shadow-2xs"
                                onClick={() => setActiveTab('progress')}
                                title="Click to view in Progress Comparison"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {ci.coachFeedback ? (
                        <div className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-red-600 uppercase tracking-wider text-[10px]">
                            <Award className="w-3.5 h-3.5" /> Coach {assignedCoach.name} Response:
                          </div>
                          <p className="text-neutral-800 leading-relaxed">{ci.coachFeedback}</p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-neutral-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Coach Review
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center shadow-xs">
                    <Activity className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-neutral-900 uppercase font-display">No Check-In History Yet</h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                      Submit your first weekly check-in using the form on the left. Your coach will review your progress and deliver feedback here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. DIRECT COACH MESSENGER */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[640px]">
            {/* Messenger Header */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-neutral-200">
                  <img
                    src={assignedCoach.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                    alt={assignedCoach.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase font-display">Coach {assignedCoach.name}</h3>
                  <p className="text-[11px] text-neutral-500">{assignedCoach.specialty || 'Lead Coach'} &bull; Online</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[10px] font-bold text-red-600 uppercase tracking-wider">
                Direct 1-on-1 Channel
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-white">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.senderRole === 'client';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-neutral-500">{msg.senderName}</span>
                        <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-md px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-red-600 text-white rounded-br-none shadow-sm'
                            : 'bg-neutral-100 text-neutral-800 rounded-bl-none border border-neutral-200'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
                    <MessageSquare className="w-7 h-7 text-neutral-400" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800 uppercase font-display">Direct Coach Channel</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Send a direct message to Coach {assignedCoach.name}. You can ask about technique adjustments, meal swaps, or schedule changes anytime.
                  </p>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendChat} className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask coach regarding exercise form, swap requests, or nutrition tweaks..."
                className="flex-1 px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-200 cursor-pointer transition-all"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* 2. PROGRESS & ANALYTICS VIEW */}
        {activeTab === 'progress' && (
          <ProgressAnalyticsView clientId={clientRosterEntry?.id || user?.uid} />
        )}
          </>
        )}
      </main>

      {/* Floating Rest Timer for quick access while working out */}
      {showRestTimer && activeTab === 'workout' && (
        <RestTimer initialSeconds={currentExercise.restSeconds || 90} />
      )}

      {/* Client Profile & Subscription Modal */}
      <ClientProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenPlanSelection={() => {
          setProfileModalOpen(false);
          setPlanSelectionModalOpen(true);
        }}
        onOpenRenewal={() => {
          setProfileModalOpen(false);
          setSelectedPlanForUpgrade(activePlan || coachingPlans[0]);
          setIsUpgradeFlow(false);
          setRenewalModalOpen(true);
        }}
      />

      {/* Dynamic Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={planSelectionModalOpen}
        onClose={() => setPlanSelectionModalOpen(false)}
        currentPlanId={user?.activePlanId || clientRosterEntry?.activePlanId}
        currentPlanName={user?.activePlanName || clientRosterEntry?.activePlanName}
        onSelectPlanForCheckout={(plan) => {
          setSelectedPlanForUpgrade(plan);
          setIsUpgradeFlow(true);
          setPlanSelectionModalOpen(false);
          setRenewalModalOpen(true);
        }}
      />

      {/* Plan Checkout & Payment Modal */}
      <RenewalPaymentModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        plan={selectedPlanForUpgrade || activePlan || coachingPlans[0]}
        clientName={clientDisplayName}
        clientEmail={user?.email || ''}
        clientId={user?.uid}
        isUpgrade={isUpgradeFlow}
        onPaymentSuccess={async (paymentDetails) => {
          const targetPlan = selectedPlanForUpgrade || activePlan || coachingPlans[0];
          if (user?.uid && targetPlan) {
            await changeClientPlan(user.uid, targetPlan, paymentDetails);
          }
        }}
      />

      {/* Workout Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white border border-neutral-200 p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 text-red-600 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-neutral-900 uppercase font-display">
              Session Concluded!
            </h3>
            <p className="text-xs text-neutral-500">
              Great job {clientDisplayName.split(' ')[0]}! You completed {completedSets} working sets on {assignedWorkout.title}.
            </p>

            <div className="text-left space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  How did today's session feel? (Rating)
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setWorkoutRating(star)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold border cursor-pointer transition-colors ${
                        workoutRating >= star
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-400 hover:bg-neutral-200'
                      }`}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  General Session Feedback
                </label>
                <textarea
                  rows={2}
                  value={workoutFeedback}
                  onChange={(e) => setWorkoutFeedback(e.target.value)}
                  placeholder="e.g. Pump was great on incline DB bench, hit all prescribed reps."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:outline-none resize-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishWorkout}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-red-200 transition-all"
            >
              Log to Training History
            </button>
          </div>
        </div>
      )}

      {/* Renewal Payment Gate Modal */}
      <RenewalPaymentModal
        isOpen={showRenewalPayment}
        onClose={() => setShowRenewalPayment(false)}
        plan={coachingPlans.find(p => p.id === selectedRenewalPlanId) || coachingPlans[0] || {
          id: selectedRenewalPlanId,
          name: 'Coaching Package',
          price: 350,
          period: '/ month',
          tagline: 'Full coaching program',
          features: [],
          category: 'online',
          idealFor: 'All athletes'
        }}
        clientName={clientDisplayName}
        clientEmail={user?.email || ''}
        clientId={user?.uid}
        onPaymentSuccess={async () => {
          await handleRequestRenewal();
          setShowRenewalPayment(false);
        }}
      />

      {/* In-App Founder Video Technique Modal */}
      {activeVideoModal && activeVideoModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                  <Play className="w-4 h-4 text-red-500 fill-red-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
                    {activeVideoModal.exerciseName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    {activeVideoModal.targetMuscle && (
                      <span className="text-red-400 font-bold uppercase">{activeVideoModal.targetMuscle}</span>
                    )}
                    {activeVideoModal.equipment && (
                      <>
                        <span>&bull;</span>
                        <span>{activeVideoModal.equipment}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="p-4 sm:p-6 bg-black flex flex-col items-center">
              <video
                src={activeVideoModal.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full max-h-[460px] bg-neutral-950 rounded-2xl border border-neutral-800 object-contain shadow-lg"
              />
            </div>

            {/* Modal Details / Attribution */}
            <div className="px-6 py-4 bg-neutral-900 border-t border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <Award className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-semibold text-neutral-400">Execution Standard:</span>
                <span className="text-red-400 font-bold">{activeVideoModal.founderAttribution}</span>
              </div>

              {activeVideoModal.coachNotes && (
                <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 flex items-start gap-2.5 text-xs text-neutral-300">
                  <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Biomechanical Cue:</span>
                    {activeVideoModal.coachNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-neutral-950/60 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-neutral-700"
              >
                Close Video Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
