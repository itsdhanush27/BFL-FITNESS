import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Dumbbell, 
  CheckSquare, 
  MessageSquare, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Sparkles, 
  Award, 
  Send, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Edit, 
  Save, 
  Flame, 
  ShieldAlert,
  ArrowRight,
  FileText,
  UserCheck,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Loader2,
  Lock,
  AlertTriangle,
  RefreshCw,
  FileEdit,
  Camera,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFitnessData, getDaysRemaining } from '../../context/FitnessDataContext';
import { 
  getSubscriptionStatus, 
  canReceiveCoaching, 
  checkSubscriptionAccess, 
  SubscriptionStatus 
} from '../../types/subscription';
import { WorkoutSession, WorkoutExercise, IntakeFormData, NutritionPlan, ClientRosterItem, ChatMessage, WeeklyCheckIn, SubscriptionDocument, TransactionRecord } from '../../types';
import { ProgressAnalyticsView } from '../client/ProgressAnalyticsView';
import { CoachTeamManagement } from './CoachTeamManagement';
import { downloadReceiptPdf } from '../../services/receiptPdfService';
import { CMSEditor } from '../admin/CMSEditor';
import { AthleteSessionHistory } from './AthleteSessionHistory';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { 
  subscribeToClientNutrition, 
  subscribeToMessages, 
  subscribeToClientCheckIns,
  subscribeToAthleteWorkouts,
  subscribeToAthleteDraftWorkout,
  subscribeToPendingSubscriptions
} from '../../services/firestoreService';

interface CoachDashboardProps {
  onNavigateToManageCoaches?: () => void;
  initialAdminMode?: 'admin' | 'coach';
  initialTab?: 'clients' | 'builder' | 'checkins' | 'intakes' | 'chat' | 'cms' | 'team' | 'progress';
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ 
  onNavigateToManageCoaches,
  initialAdminMode = 'admin',
  initialTab = 'clients'
}) => {
  const { user, currentUser } = useAuth();
  const fitnessData = useFitnessData();

  const clients = fitnessData?.clients || [];
  const coaches = fitnessData?.coaches || [];
  const intakeForms = fitnessData?.intakeForms || [];
  const intakeSubmissions = fitnessData?.intakeSubmissions ?? [];
  const updateIntakeStatus = fitnessData?.updateIntakeStatus;
  const checkIns = fitnessData?.checkIns || [];
  const messages = fitnessData?.messages || [];
  const nutritionPlan = fitnessData?.nutritionPlan;
  const cmsContent = fitnessData?.cmsContent;
  const sendChatMessage = fitnessData?.sendChatMessage;
  const respondToCheckIn = fitnessData?.respondToCheckIn || fitnessData?.provideCoachFeedback;
  const updateNutritionPlan = fitnessData?.updateNutritionPlan;
  const updateCMSContent = fitnessData?.updateCMSContent || fitnessData?.updateCMS;
  const assignWorkoutToClient = fitnessData?.assignWorkoutToClient;
  const draftWorkouts = fitnessData?.draftWorkouts;
  const saveDraftWorkout = fitnessData?.saveDraftWorkout;
  const getDraftWorkout = fitnessData?.getDraftWorkout;
  const clearDraftWorkout = fitnessData?.clearDraftWorkout;
  const assignCoachToClient = fitnessData?.assignCoachToClient;
  const submitIntakeForm = fitnessData?.submitIntakeForm;
  const approveAndInitializeClientPlan = fitnessData?.approveAndInitializeClientPlan;
  const setClientPlanExpired = fitnessData?.setClientPlanExpired;

  const [activeTab, setActiveTab] = useState<'clients' | 'builder' | 'checkins' | 'intakes' | 'chat' | 'cms' | 'team' | 'progress'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Real-time Firestore listener for pending plan subscriptions
  const [pendingSubscriptions, setPendingSubscriptions] = useState<SubscriptionDocument[]>([]);
  useEffect(() => {
    const coachFilter = user?.role === 'admin' ? 'admin' : user?.uid;
    const unsub = subscribeToPendingSubscriptions((subs) => {
      setPendingSubscriptions(subs);
    }, coachFilter);

    return () => unsub();
  }, [user?.uid, user?.role]);

  // Selected Client for detail viewing
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [clientSearch, setClientSearch] = useState('');
  const [clientExpiryFilter, setClientExpiryFilter] = useState<'all' | 'expiring_soon' | 'expired'>('all');
  const [isApproving, setIsApproving] = useState<string | null>(null);

  // Program Builder State
  const [builderWorkoutTitle, setBuilderWorkoutTitle] = useState('');
  const [builderWorkoutDesc, setBuilderWorkoutDesc] = useState('');
  const [builderExercises, setBuilderExercises] = useState<WorkoutExercise[]>([]);
  const [builderStatus, setBuilderStatus] = useState<'draft' | 'published'>('draft');
  const [programAssignedSuccess, setProgramAssignedSuccess] = useState(false);
  const [draftSavedSuccess, setDraftSavedSuccess] = useState(false);

  // Nutrition Builder Form State
  const [nutriCalories, setNutriCalories] = useState<number | ''>('');
  const [nutriProtein, setNutriProtein] = useState<number | ''>('');
  const [nutriCarbs, setNutriCarbs] = useState<number | ''>('');
  const [nutriFat, setNutriFat] = useState<number | ''>('');
  const [nutriWater, setNutriWater] = useState<number | ''>('');
  const [nutriNotes, setNutriNotes] = useState('');
  const [nutritionSaved, setNutritionSaved] = useState(false);

  // Check-In Response State
  const [activeCheckInId, setActiveCheckInId] = useState<string>(checkIns[0]?.id || '');
  const [coachFeedbackText, setCoachFeedbackText] = useState('');
  const [feedbackSentAlert, setFeedbackSentAlert] = useState(false);

  // Chat message state
  const [coachChatInput, setCoachChatInput] = useState('');

  // CMS Editor State
  const [cmsHeroHeadline, setCmsHeroHeadline] = useState(cmsContent?.heroHeadline ?? '');
  const [cmsHeroSubheadline, setCmsHeroSubheadline] = useState(cmsContent?.heroSubheadline ?? '');
  const [cmsBannerNotice, setCmsBannerNotice] = useState(cmsContent?.bannerNotice ?? '');
  const [cmsSaved, setCmsSaved] = useState(false);

  // Nutrition & Messenger real-time state per selected client
  const [clientNutritionPlan, setClientNutritionPlan] = useState<NutritionPlan | null>(null);
  const [coachClientMessages, setCoachClientMessages] = useState<ChatMessage[]>([]);
  const [firestoreCheckIns, setFirestoreCheckIns] = useState<WeeklyCheckIn[]>([]);
  const [isCheckInsLoaded, setIsCheckInsLoaded] = useState(false);
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'selected'>('all');

  const fallbackClient: ClientRosterItem = {
    id: '',
    name: 'Awaiting Athletes',
    email: 'clients@bflfitness.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'pending',
    planName: '1-on-1 Elite Coaching',
    adherenceRate: 100,
    joinedDate: 'Today',
    primaryGoal: 'Pending Intake',
    startingWeightKg: 0,
    currentWeightKg: 0,
    targetWeightKg: 0,
    injuryNotes: 'No clients assigned yet.',
    daysPerWeek: 0,
    availableEquipment: []
  };

  const formatGoal = (goal?: string) => {
    if (!goal) return 'Custom Protocol';
    return goal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const authUser = user || currentUser;
  const userRole = authUser?.role || 'coach';

  // Resolve the logged-in coach record from the coaches roster / founders
  const loggedInCoach = React.useMemo(() => {
    const userEmail = (authUser?.email || '').toLowerCase().trim();
    const userName = (authUser?.displayName || '').toLowerCase().trim();
    const uid = authUser?.uid || authUser?.id;
    const coachId = (authUser as any)?.coachId;

    return coaches.find(c => 
      (coachId && c.id === coachId) ||
      (uid && (c.id === uid || (c as any).uid === uid)) ||
      (userEmail && c.email && c.email.toLowerCase().trim() === userEmail) ||
      (userName && c.name && (userName.includes(c.name.toLowerCase().trim()) || c.name.toLowerCase().trim().includes(userName)))
    );
  }, [coaches, authUser]);

  // Set of all identifier strings that identify the currently logged-in coach / admin
  const coachIdentifiers = React.useMemo(() => {
    const ids = new Set<string>();
    if (authUser?.uid) ids.add(authUser.uid);
    if (authUser?.id) ids.add(authUser.id);
    if ((authUser as any)?.coachId) ids.add((authUser as any).coachId);
    if (loggedInCoach?.id) ids.add(loggedInCoach.id);
    if ((loggedInCoach as any)?.uid) ids.add((loggedInCoach as any).uid);

    const userEmail = (authUser?.email || '').toLowerCase().trim();
    const userName = (authUser?.displayName || '').toLowerCase().trim();

    // Map known founder credentials to their canonical IDs
    if (userEmail === 'mass@bflfitness.com' || userName.includes('mass narimanian')) {
      ids.add('admin_mass_narimanian');
      ids.add('mass@bflfitness.com');
      ids.add('mass narimanian');
      ids.add('Mass Narimanian');
    }
    if (userEmail === 'pouya@bflfitness.com' || userName.includes('pouya marghzari')) {
      ids.add('admin_pouya_marghzari');
      ids.add('pouya@bflfitness.com');
      ids.add('pouya marghzari');
      ids.add('Pouya Marghzari');
    }

    if (loggedInCoach?.email) ids.add(loggedInCoach.email.toLowerCase().trim());
    if (loggedInCoach?.name) ids.add(loggedInCoach.name.toLowerCase().trim());

    return ids;
  }, [authUser, loggedInCoach]);

  const activeCoachDisplayName = loggedInCoach?.name || authUser?.displayName || 'Mass Narimanian (Founder & Admin)';

  const isClientAssignedToActiveCoach = React.useCallback((c: ClientRosterItem) => {
    const clientCoachId = c.coachId || c.assignedCoachId;
    if (!clientCoachId) return false;

    // Direct match against coach identifiers
    if (coachIdentifiers.has(clientCoachId)) return true;
    if (coachIdentifiers.has(clientCoachId.toLowerCase().trim())) return true;

    // Match by email if present on client
    const clientCoachEmail = ((c as any).coachEmail || (c as any).assignedCoachEmail || '').toLowerCase().trim();
    if (clientCoachEmail && coachIdentifiers.has(clientCoachEmail)) return true;

    // Match by name if present on client
    const clientCoachName = ((c as any).coachName || (c as any).assignedCoachName || '').toLowerCase().trim();
    if (clientCoachName && coachIdentifiers.has(clientCoachName)) return true;

    // Check against loggedInCoach
    if (loggedInCoach && (clientCoachId === loggedInCoach.id || clientCoachId === loggedInCoach.email)) return true;

    return false;
  }, [coachIdentifiers, loggedInCoach]);

  // Toggle state for Admins: switch between 'Admin Dashboard' (managing all staff/clients)
  // and personal 'Coach Dashboard' (managing only their assigned clients).
  const [adminDashboardMode, setAdminDashboardMode] = useState<'admin' | 'coach'>(() => {
    if (userRole === 'coach') return 'coach';
    return initialAdminMode;
  });

  // Synchronize state if initialAdminMode prop changes or role changes
  React.useEffect(() => {
    if (userRole === 'coach') {
      setAdminDashboardMode('coach');
    } else if (initialAdminMode) {
      setAdminDashboardMode(initialAdminMode);
    }
  }, [initialAdminMode, userRole]);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fallback Handling: if activeTab is 'team' (Coaches & Staff) and mode is 'coach',
  // reset activeTab to 'clients' (Client Management Table / My Athletes)
  React.useEffect(() => {
    if (adminDashboardMode === 'coach' && activeTab === 'team') {
      setActiveTab('clients');
    }
  }, [adminDashboardMode, activeTab]);

  // Determine if active view is personal coach view (either coach role OR admin in coach view mode)
  const isPersonalCoachView = userRole === 'coach' || (userRole === 'admin' && adminDashboardMode === 'coach');

  // Role & Mode-based client filtering:
  // If in personal coach view (either coach role or admin switched to personal coach view),
  // only display clients assigned directly to that coach / admin.
  // If in admin dashboard mode, display all clients in the system.
  const visibleClients = React.useMemo(() => {
    return clients.filter((c) => {
      if (isPersonalCoachView) {
        return isClientAssignedToActiveCoach(c);
      }
      return true; // admin sees all
    });
  }, [clients, isPersonalCoachView, isClientAssignedToActiveCoach]);

  const myAssignedClientsCount = React.useMemo(() => {
    return clients.filter(isClientAssignedToActiveCoach).length;
  }, [clients, isClientAssignedToActiveCoach]);

  const filteredClients = React.useMemo(() => {
    const q = clientSearch.toLowerCase();
    return visibleClients.filter((c) => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.planName || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (clientExpiryFilter === 'expiring_soon') {
        const days = getDaysRemaining(c.planExpiresAt);
        return days <= 3 && days >= 0 && canReceiveCoaching(c);
      }
      if (clientExpiryFilter === 'expired') {
        const isClientPending = c.subscriptionStatus === 'pending_coach_approval' || c.subscriptionStatus === 'pending_approval' || Boolean(c.pendingPlanId) || Boolean((c as any).renewalRequestedPlanId) || c.status === 'pending';
        return !isClientPending && !canReceiveCoaching(c);
      }
      return true;
    });
  }, [visibleClients, clientSearch, clientExpiryFilter]);

  const visibleClientIds = React.useMemo(() => visibleClients.map((c) => c.id).join(','), [visibleClients]);

  React.useEffect(() => {
    if (visibleClients.length > 0) {
      if (!selectedClientId || !visibleClients.some((c) => c.id === selectedClientId)) {
        setSelectedClientId(visibleClients[0].id);
      }
    } else if (selectedClientId) {
      setSelectedClientId('');
    }
  }, [visibleClientIds]);

  const selectedClient = visibleClients.find((c) => c.id === selectedClientId) || visibleClients[0] || fallbackClient;

  // Dynamically resolve actual onboarding intake submission for selected client
  const clientIntake = React.useMemo(() => {
    if (!selectedClient?.id && !selectedClient?.email) return null;
    const all = intakeForms.length > 0 ? intakeForms : intakeSubmissions;
    return (
      all.find((i) => {
        if (selectedClient.id && i.clientId === selectedClient.id) return true;
        if (selectedClient.email && i.clientEmail && i.clientEmail.toLowerCase() === selectedClient.email.toLowerCase()) return true;
        return false;
      }) || null
    );
  }, [selectedClient, intakeForms, intakeSubmissions]);

  // Real-time Firestore Nutrition subscription for the selected client
  React.useEffect(() => {
    if (!selectedClient?.id) {
      setClientNutritionPlan(null);
      setNutriCalories('');
      setNutriProtein('');
      setNutriCarbs('');
      setNutriFat('');
      setNutriWater('');
      setNutriNotes('');
      return;
    }
    const unsub = subscribeToClientNutrition(selectedClient.id, (plan) => {
      setClientNutritionPlan(plan);
      if (plan) {
        setNutriCalories(plan.calories || '');
        setNutriProtein(plan.proteinGrams || '');
        setNutriCarbs(plan.carbsGrams || '');
        setNutriFat(plan.fatGrams || '');
        setNutriWater(plan.waterLiters || '');
        setNutriNotes(plan.dailyNotes || '');
      } else {
        setNutriCalories('');
        setNutriProtein('');
        setNutriCarbs('');
        setNutriFat('');
        setNutriWater('');
        setNutriNotes('');
      }
    });
    return () => unsub();
  }, [selectedClient?.id]);

  // Real-time Firestore Workout subscription for the selected client
  React.useEffect(() => {
    if (!selectedClient?.id) {
      setBuilderWorkoutTitle('');
      setBuilderWorkoutDesc('');
      setBuilderExercises([]);
      setBuilderStatus('draft');
      return;
    }

    let hasPublishedWorkout = false;

    // Listen to published workout in Firestore
    const unsubPublished = subscribeToAthleteWorkouts(selectedClient.id, (publishedWorkout) => {
      if (publishedWorkout && !publishedWorkout.isDraft && publishedWorkout.status !== 'draft') {
        hasPublishedWorkout = true;
        setBuilderWorkoutTitle(publishedWorkout.title || '');
        setBuilderWorkoutDesc(publishedWorkout.description || '');
        setBuilderExercises(publishedWorkout.exercises || []);
        setBuilderStatus('published');
      } else {
        hasPublishedWorkout = false;
        // Fallback to draft routine from context or localStorage
        const draft = getDraftWorkout ? getDraftWorkout(selectedClient.id) : (draftWorkouts ? draftWorkouts[selectedClient.id] : null);
        if (draft) {
          setBuilderWorkoutTitle(draft.title || '');
          setBuilderWorkoutDesc(draft.description || '');
          setBuilderExercises(draft.exercises || []);
          setBuilderStatus('draft');
        } else {
          setBuilderWorkoutTitle('');
          setBuilderWorkoutDesc('');
          setBuilderExercises([]);
          setBuilderStatus('draft');
        }
      }
    });

    // Also listen to draft workout document in Firestore
    const unsubDraft = subscribeToAthleteDraftWorkout(selectedClient.id, (draft) => {
      if (!hasPublishedWorkout && draft) {
        setBuilderWorkoutTitle(draft.title || '');
        setBuilderWorkoutDesc(draft.description || '');
        setBuilderExercises(draft.exercises || []);
        setBuilderStatus('draft');
      }
    });

    return () => {
      unsubPublished();
      unsubDraft();
    };
  }, [selectedClient?.id, draftWorkouts]);

  const handleAutoCalculateMacros = () => {
    if (!selectedClient?.id) return;
    const weight = Number(clientIntake?.currentWeightKg || selectedClient.currentWeightKg || 0);
    if (!weight || weight <= 0) {
      alert('No body weight recorded for this athlete yet. Please enter target macros manually or await client onboarding intake.');
      return;
    }
    const isCut = (selectedClient.primaryGoal || clientIntake?.primaryGoal || '').toLowerCase().includes('fat') || 
                  (selectedClient.primaryGoal || clientIntake?.primaryGoal || '').toLowerCase().includes('cut') || 
                  (selectedClient.primaryGoal || clientIntake?.primaryGoal || '').toLowerCase().includes('loss');
    const cal = isCut ? Math.round(weight * 26) : Math.round(weight * 32);
    const prot = Math.round(weight * 2.2);
    const fat = Math.round(weight * 0.8);
    const carb = Math.max(100, Math.round((cal - (prot * 4 + fat * 9)) / 4));
    setNutriCalories(cal);
    setNutriProtein(prot);
    setNutriCarbs(carb);
    setNutriFat(fat);
    setNutriWater(3.5);
    setNutriNotes(`Prescribed targets for ${selectedClient.name}. Prioritize lean protein with each feeding.`);
  };

  // Real-time Firestore Messages subscription for the selected client
  React.useEffect(() => {
    if (!selectedClient?.id) return;
    const unsub = subscribeToMessages(selectedClient.id, (list) => {
      setCoachClientMessages(list);
    });
    return () => unsub();
  }, [selectedClient?.id]);

  // Real-time Firestore Check-Ins subscription for Coach
  React.useEffect(() => {
    const unsub = subscribeToClientCheckIns(null, (list) => {
      setFirestoreCheckIns(list);
      setIsCheckInsLoaded(true);
    });
    return () => unsub();
  }, []);

  const allCheckIns = isCheckInsLoaded ? firestoreCheckIns : checkIns;
  const pendingCheckInsCount = React.useMemo(() => {
    return allCheckIns.filter((c) => !c.reviewedByCoach && !c.coachFeedback).length;
  }, [allCheckIns]);

  // Dynamically resolve latest weekly check-in for selected client
  const latestClientCheckIn = React.useMemo(() => {
    if (!selectedClient?.id) return null;
    const clientCheckIns = allCheckIns.filter((c) => c.clientId === selectedClient.id);
    return clientCheckIns[0] || null;
  }, [selectedClient?.id, allCheckIns]);

  const baselineStartingWeight = Number(clientIntake?.currentWeightKg || selectedClient.startingWeightKg || selectedClient.currentWeightKg || 0);
  const currentWeightDisplay = Number(latestClientCheckIn?.weightKg || selectedClient.currentWeightKg || clientIntake?.currentWeightKg || selectedClient.startingWeightKg || 0);
  const targetGoalWeightDisplay = Number(clientIntake?.targetWeightKg || selectedClient.targetWeightKg || (clientIntake?.currentWeightKg ? clientIntake.currentWeightKg - 5 : (selectedClient.currentWeightKg ? selectedClient.currentWeightKg - 5 : 0)));
  const availabilityDaysDisplay = clientIntake?.trainingDaysPerWeek || (selectedClient?.daysPerWeek && selectedClient.daysPerWeek > 0 ? selectedClient.daysPerWeek : null);
  const equipmentDisplay = (clientIntake?.availableEquipment && clientIntake.availableEquipment.length > 0)
    ? clientIntake.availableEquipment
    : (selectedClient?.availableEquipment && selectedClient.availableEquipment.length > 0 ? selectedClient.availableEquipment : []);
  const injuryNotesDisplay = clientIntake?.injuryHistory || clientIntake?.medicalNotes || (selectedClient.injuryNotes && selectedClient.injuryNotes !== 'None reported' && selectedClient.injuryNotes !== 'No clients assigned yet.' ? selectedClient.injuryNotes : (selectedClient?.id ? 'None reported. Cleared for all compound loads.' : 'No clients assigned yet.'));

  const visibleCheckIns = React.useMemo(() => {
    let list = allCheckIns;
    if (isPersonalCoachView) {
      list = list.filter(ci => 
        visibleClients.some(vc => vc.id === ci.clientId || (ci.clientEmail && vc.email && ci.clientEmail.toLowerCase() === vc.email.toLowerCase()))
      );
    }
    if (checkInFilter === 'selected' && selectedClient?.id) {
      list = list.filter(c => c.clientId === selectedClient.id);
    }
    return list;
  }, [allCheckIns, isPersonalCoachView, visibleClients, checkInFilter, selectedClient?.id]);
  const selectedCheckIn = visibleCheckIns.find(c => c.id === activeCheckInId) || visibleCheckIns[0];

  React.useEffect(() => {
    if (!activeCheckInId && visibleCheckIns.length > 0) {
      setActiveCheckInId(visibleCheckIns[0].id);
    }
  }, [visibleCheckIns, activeCheckInId]);

  const handleAddExerciseToBuilder = () => {
    const newEx: WorkoutExercise = {
      id: 'ex_builder_' + Date.now(),
      exerciseName: 'New Programmed Lift (e.g. Romanian Deadlift)',
      targetMuscle: 'Posterior Chain',
      equipment: 'Barbell',
      coachNotes: 'Hinge at hips, keep bar path tight against shins.',
      restSeconds: 90,
      sets: [
        { setNumber: 1, targetReps: '8-10', actualWeightKg: 80, actualReps: 8, completed: false },
        { setNumber: 2, targetReps: '8-10', actualWeightKg: 80, actualReps: 8, completed: false }
      ]
    };
    setBuilderExercises([...builderExercises, newEx]);
  };

  const handlePublishWorkout = () => {
    const targetId = selectedClientId || selectedClient.id;
    if (!targetId || visibleClients.length === 0) return;
    const newSession: WorkoutSession = {
      id: 'workout_' + Date.now(),
      clientId: targetId,
      assignedDate: 'Today',
      title: builderWorkoutTitle || 'Daily Workout Protocol',
      description: builderWorkoutDesc,
      exercises: builderExercises,
      isCompleted: false,
      isDraft: false,
      status: 'published',
      publishedAt: new Date().toISOString()
    };
    if (assignWorkoutToClient) {
      assignWorkoutToClient(targetId, newSession);
    }
    setBuilderStatus('published');
    setProgramAssignedSuccess(true);
    setTimeout(() => setProgramAssignedSuccess(false), 3000);
  };

  const handleSaveDraftWorkout = async () => {
    const targetId = selectedClientId || selectedClient.id;
    if (!targetId || visibleClients.length === 0) return;
    const draftSession: WorkoutSession = {
      id: `draft_${targetId}`,
      clientId: targetId,
      assignedDate: 'Today',
      title: builderWorkoutTitle || 'Draft Workout Protocol',
      description: builderWorkoutDesc,
      exercises: builderExercises,
      isCompleted: false,
      isDraft: true,
      status: 'draft'
    };
    if (saveDraftWorkout) {
      await saveDraftWorkout(targetId, draftSession);
    }
    setBuilderStatus('draft');
    setDraftSavedSuccess(true);
    setTimeout(() => setDraftSavedSuccess(false), 3000);
  };

  const handleSaveNutrition = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedClientId || selectedClient.id;
    if (!targetId || visibleClients.length === 0) return;
    if (updateNutritionPlan) {
      updateNutritionPlan({
        ...(clientNutritionPlan || {}),
        clientId: targetId,
        calories: Number(nutriCalories) || 0,
        proteinGrams: Number(nutriProtein) || 0,
        carbsGrams: Number(nutriCarbs) || 0,
        fatGrams: Number(nutriFat) || 0,
        waterLiters: Number(nutriWater) || 0,
        dailyNotes: nutriNotes,
        isPrescribed: true,
        updatedAt: new Date().toISOString().split('T')[0]
      });
      setNutritionSaved(true);
      setTimeout(() => setNutritionSaved(false), 2000);
    }
  };

  const handleSendCheckInFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachFeedbackText.trim() || !activeCheckInId) return;
    if (respondToCheckIn) {
      respondToCheckIn(activeCheckInId, coachFeedbackText.trim());
    }
    setFeedbackSentAlert(true);
    setCoachFeedbackText('');
    setTimeout(() => setFeedbackSentAlert(false), 2000);
  };

  const handleSendCoachMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachChatInput.trim()) return;
    const targetId = selectedClientId || selectedClient.id;
    if (sendChatMessage && targetId) {
      sendChatMessage(coachChatInput.trim(), targetId);
    }
    setCoachChatInput('');
  };

  const handleSaveCMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateCMSContent) {
      updateCMSContent({
        heroHeadline: cmsHeroHeadline,
        heroSubheadline: cmsHeroSubheadline,
        bannerNotice: cmsBannerNotice
      });
    }
    setCmsSaved(true);
    setTimeout(() => setCmsSaved(false), 2000);
  };

  const formatIntakeDate = (dateVal: any) => {
    if (!dateVal) return 'Recently';
    if (typeof dateVal === 'string') {
      return dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
    }
    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    }
    return 'Recently';
  };

  const [initializingIntakeId, setInitializingIntakeId] = useState<string | null>(null);

  const handleInitializeProgram = async (intake: IntakeFormData) => {
    setInitializingIntakeId(intake.id);

    // 1. Select client for program builder & prefill block title/description
    if (intake.clientId) {
      setSelectedClientId(intake.clientId);
    }
    if (intake.primaryGoal) {
      setBuilderWorkoutTitle(`${intake.clientName.split(' ')[0]}'s Initial ${formatGoal(intake.primaryGoal)} Block`);
      setBuilderWorkoutDesc(`Custom routine tailored to ${intake.trainingDaysPerWeek || 4} days/week split using available ${intake.availableEquipment?.slice(0, 3).join(', ') || 'gym equipment'}.`);
    }

    // 2. Trigger database mutation: updates status from PENDING_REVIEW to REVIEWED
    try {
      if (updateIntakeStatus) {
        await updateIntakeStatus(intake.id, intake.clientId, 'reviewed');
      }
    } catch (err) {
      console.error('[CoachDashboard] Error updating intake status:', err);
    } finally {
      setInitializingIntakeId(null);
    }

    // 3. Route to Program & Macro Builder tab
    setActiveTab('builder');
  };


  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-24">
      {/* Coach Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 p-0.5 shadow-md shadow-red-500/20">
              <img
                src={currentUser?.photoURL || user?.photoURL || '/assets/founders/mass-gym.jpg'}
                alt="Profile Avatar"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-neutral-900 uppercase font-display tracking-tight">
                  {currentUser?.displayName || user?.displayName || 'Lead Coach'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                  userRole === 'admin'
                    ? adminDashboardMode === 'admin'
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                }`}>
                  {userRole === 'admin' 
                    ? adminDashboardMode === 'admin'
                      ? 'Admin Dashboard (Staff & All Clients)' 
                      : 'Personal Coach Dashboard'
                    : 'Coach Dashboard'
                  }
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {userRole === 'admin' 
                  ? adminDashboardMode === 'admin'
                    ? `Full Administrative Access • Overseeing all staff & all ${clients.length} registered clients`
                    : `Personal Roster • Managing ${visibleClients.length} athlete(s) directly assigned to ${currentUser?.displayName}`
                  : `Dedicated Coaching Workspace • ${visibleClients.length} Assigned Athletes`
                }
              </p>
            </div>
          </div>

          {/* Quick Controls & Roster Status Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            {/* ADMIN DASHBOARD TOGGLE (Accessible when user is an admin) */}
            {userRole === 'admin' && (
              <div className="flex items-center p-1 bg-neutral-100 rounded-2xl border border-neutral-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAdminDashboardMode('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    adminDashboardMode === 'admin'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                  title="Switch to Admin Dashboard (Managing all staff and all clients)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                  <span>Admin Dashboard</span>
                  <span className="text-[10px] opacity-80 font-mono">({clients.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminDashboardMode('coach');
                    if (activeTab === 'team') {
                      setActiveTab('clients');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    adminDashboardMode === 'coach'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                  title="Switch to Personal Coach Dashboard (Managing only my assigned clients)"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-white" />
                  <span>Personal Coach Dashboard</span>
                  <span className="text-[10px] opacity-90 font-mono">
                    ({myAssignedClientsCount})
                  </span>
                </button>
              </div>
            )}

            {userRole === 'admin' && onNavigateToManageCoaches && (
              <button
                type="button"
                onClick={onNavigateToManageCoaches}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Open Dedicated Admin Dashboard (Recruit coaches and manage quotas)"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Manage Coaches</span>
              </button>
            )}

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-center shadow-sm">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                {isPersonalCoachView ? 'My Athletes' : 'Total Athletes'}
              </span>
              <span className="text-base font-black text-neutral-900 font-mono">
                {visibleClients.length} {isPersonalCoachView ? 'Assigned' : 'Total'}
              </span>
            </div>
            
            {!isPersonalCoachView && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-center shadow-sm">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">Intake Queue</span>
                <span className="text-base font-black text-amber-600 font-mono">{intakeSubmissions.length} Review</span>
              </div>
            )}

            {/* Coach Direct Notification Hub */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-1 shadow-sm flex items-center">
              <NotificationDropdown 
                onNavigate={(tab) => {
                  const validTabs = ['clients', 'builder', 'checkins', 'intakes', 'chat', 'cms', 'team', 'progress'];
                  if (validTabs.includes(tab)) {
                    setActiveTab(tab as any);
                  }
                }} 
              />
            </div>
          </div>
        </div>

        {/* Coach Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-6 overflow-x-auto">
          {[
            { id: 'clients', label: 'Client Management Table', icon: Users },
            { id: 'progress', label: 'Client Progress & Graphs', icon: TrendingUp },
            { id: 'builder', label: 'Program & Macro Builder', icon: Dumbbell },
            { id: 'checkins', label: 'Check-In Review Queue', icon: CheckSquare, badge: pendingCheckInsCount > 0 ? `${pendingCheckInsCount} Review${pendingCheckInsCount > 1 ? 's' : ''}` : undefined },
            { id: 'intakes', label: 'Intake Submissions', icon: FileText, badge: `${intakeSubmissions.length}` },
            ...(adminDashboardMode === 'admin'
              ? [{ id: 'team', label: 'Coaches & Staff', icon: ShieldCheck, badge: `${coaches.length}` }]
              : []),
            { id: 'chat', label: 'Client Messages', icon: MessageSquare },
            { id: 'cms', label: 'Website CMS & Copy', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200 shadow-sm'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Coach Tab Views */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Real-time Alert Banner for Pending Plan Upgrades */}
        {(() => {
          const clientsPendingApproval = visibleClients.filter(c => 
            c.subscriptionStatus === 'pending_coach_approval' ||
            c.subscriptionStatus === 'pending_approval' ||
            Boolean((c as any).pendingPlanId) ||
            Boolean(c.renewalRequestedPlanId) ||
            pendingSubscriptions.some(ps => ps.clientId === c.id)
          );

          if (clientsPendingApproval.length === 0) return null;

          return (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-red-500/10 border-2 border-amber-400 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                        {clientsPendingApproval.length} Action Required
                      </span>
                      <span className="text-xs text-amber-950 font-bold">
                        Plan Upgrades Awaiting Program Initialization
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 mt-1 leading-relaxed">
                      Athletes have submitted payment for new coaching disciplines. Approve to atomically activate their subscription, archive old routines, and generate workout split skeletons.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {clientsPendingApproval.map(cp => {
                    const pendingPlanName = (cp as any).pendingPlanName || cp.renewalRequestedPlanName || 'New Plan';
                    return (
                      <button
                        key={cp.id}
                        disabled={isApproving === cp.id}
                        onClick={async () => {
                          setSelectedClientId(cp.id);
                          setActiveTab('clients');
                          if (approveAndInitializeClientPlan && isApproving !== cp.id) {
                            setIsApproving(cp.id);
                            try {
                              await approveAndInitializeClientPlan(cp.id);
                            } finally {
                              setIsApproving(null);
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title={`Approve ${cp.name}'s upgrade to ${pendingPlanName}`}
                      >
                        {isApproving === cp.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>Approve {cp.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 1. CLIENT CRM & ROSTER */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Personal Coach View Banner for Admins */}
            {userRole === 'admin' && adminDashboardMode === 'coach' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-neutral-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                      <span>Personal Coach View Active</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-600 text-white font-mono uppercase">
                        {activeCoachDisplayName}
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      Displaying only athletes assigned directly to you ({visibleClients.length} assigned). Reassigning controls are hidden. Switch to Admin Dashboard to manage all staff and clients.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminDashboardMode('admin')}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span>Switch to Admin Dashboard</span>
                </button>
              </div>
            )}

            {/* Top Table Card: Client Management Table */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-neutral-900 uppercase font-display">
                      Client Management Table
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      !isPersonalCoachView
                        ? 'bg-neutral-900 text-white border border-neutral-800'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {!isPersonalCoachView ? 'Admin Mode • Full Roster' : 'Personal Assigned Roster'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {!isPersonalCoachView 
                      ? 'Link clients directly to founders or staff coaches using the Assigned Coach dropdown.'
                      : `Displaying ${visibleClients.length} athlete(s) assigned to ${activeCoachDisplayName}.`
                    }
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  {/* Status / Expiry Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setClientExpiryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        clientExpiryFilter === 'all'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      All ({visibleClients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientExpiryFilter('expiring_soon')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        clientExpiryFilter === 'expiring_soon'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-amber-700 hover:text-amber-900'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Expiring Soon</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientExpiryFilter('expired')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        clientExpiryFilter === 'expired'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Expired</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="w-full sm:w-64 relative">
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Filter clients..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Table rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-black uppercase tracking-wider text-neutral-500">
                      <th className="py-3.5 px-6">Client Name</th>
                      <th className="py-3.5 px-6">Email / Contact</th>
                      <th className="py-3.5 px-6">Program & Goal</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Adherence</th>
                      <th className="py-3.5 px-6">Assigned Coach</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-500">
                          <div className="max-w-sm mx-auto space-y-2">
                            <Users className="w-8 h-8 text-neutral-400 mx-auto" />
                            <p className="font-bold text-neutral-800">No clients found</p>
                            <p className="text-xs text-neutral-500">
                              {isPersonalCoachView 
                                ? userRole === 'admin'
                                  ? `No athletes are currently assigned directly to ${activeCoachDisplayName}. Switch to the Admin Dashboard to assign clients to yourself.`
                                  : 'No athletes are currently assigned to your coach profile. Contact your administrator.'
                                : 'No clients match your search filter.'
                              }
                            </p>
                            {userRole === 'admin' && isPersonalCoachView && (
                              <button
                                type="button"
                                onClick={() => setAdminDashboardMode('admin')}
                                className="mt-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Switch to Admin Dashboard
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((c) => {
                        const isSelected = selectedClientId === c.id;
                        const assignedCoach = coaches.find(co => co.id === (c.coachId || c.assignedCoachId));

                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelectedClientId(c.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-red-50/40' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={c.avatarUrl}
                                  alt={c.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-neutral-200"
                                />
                                <div>
                                  <div className="font-bold text-neutral-900">{c.name}</div>
                                  <span className="text-[10px] text-neutral-500 font-mono">Joined {c.joinedDate}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 font-mono text-neutral-600">
                              {c.email}
                            </td>

                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-900">{c.activePlanName || c.planName}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  {c.billingCycle ? c.billingCycle.toUpperCase() : 'MONTHLY'}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-500 block">{c.primaryGoal}</span>

                              {/* Hourly session credits pill */}
                              {(c.billingCycle === 'hourly' || c.sessionCredits !== undefined) && (
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">
                                  <Dumbbell className="w-2.5 h-2.5 text-blue-600" />
                                  <span>Credits: {c.remainingSessionCredits !== undefined ? c.remainingSessionCredits : (c.sessionCredits || 1) - (c.usedSessionCredits || 0)} / {c.sessionCredits || 1}</span>
                                </div>
                              )}

                              {/* Pending Downgrade pill */}
                              {c.pendingDowngradePlanName && (
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-300 text-blue-900 text-[10px] font-bold">
                                  <Clock className="w-2.5 h-2.5 text-blue-700" />
                                  <span>Downgrading to: {c.pendingDowngradePlanName} ({c.downgradeEffectiveAt ? new Date(c.downgradeEffectiveAt).toLocaleDateString() : 'Next Cycle'})</span>
                                </div>
                              )}

                              {c.pendingPlanName ? (
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold">
                                  <Clock className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Upgrade to: {c.pendingPlanName} (${c.pendingPlanPrice})</span>
                                </div>
                              ) : c.renewalRequestedPlanName ? (
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Renew: {c.renewalRequestedPlanName} (${c.renewalRequestedPlanPrice})</span>
                                </div>
                              ) : null}
                              {c.planExpiresAt && !c.renewalRequestedPlanName && !c.pendingPlanName && (
                                <div className="text-[10px] font-mono mt-0.5">
                                  {(() => {
                                    const isClientPending = c.subscriptionStatus === 'pending_coach_approval' || c.subscriptionStatus === 'pending_approval' || Boolean(c.pendingPlanId) || Boolean((c as any).renewalRequestedPlanId) || c.status === 'pending';
                                    const isClientExpired = !isClientPending && !canReceiveCoaching(c);
                                    if (isClientExpired) {
                                      return <span className="text-red-600 font-bold">Ended: {new Date(c.planExpiresAt).toLocaleDateString()}</span>;
                                    }
                                    return (
                                      <span className="text-neutral-500">
                                        {c.packageStartedAt ? `Start: ${new Date(c.packageStartedAt).toLocaleDateString()} • ` : ''}
                                        {isClientPending ? 'Expires: ' : 'End: '}
                                        {new Date(c.planExpiresAt).toLocaleDateString()} ({getDaysRemaining(c.planExpiresAt)}d left)
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-6">
                              {(() => {
                                const status = getSubscriptionStatus(c);
                                const isCoachApproval = c.subscriptionStatus === 'pending_coach_approval' || Boolean(c.pendingPlanId);
                                const isPending = isCoachApproval || c.subscriptionStatus === 'pending_approval' || (c as any).renewalRequestedPlanId || c.status === 'pending';
                                if (isCoachApproval) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>Upgrade Pending Approval</span>
                                    </span>
                                  );
                                }
                                if (isPending) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>{c.renewalRequestedPlanName ? 'Renewal Pending' : 'Awaiting Plan'}</span>
                                    </span>
                                  );
                                }
                                if (status === 'active') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>Active</span>
                                    </span>
                                  );
                                }
                                if (status === 'past_due') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      <span>Past Due</span>
                                    </span>
                                  );
                                }
                                if (status === 'cancelled') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800 border border-neutral-300">
                                      <Lock className="w-3 h-3 text-neutral-500" />
                                      <span>Cancelled</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-300 shadow-2xs">
                                    <AlertTriangle className="w-3 h-3 text-red-600" />
                                    <span>Expired</span>
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="py-4 px-6">
                              <div className="w-28">
                                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                                  <span className="font-bold text-red-600">{c.adherenceRate}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-red-600 rounded-full"
                                    style={{ width: `${c.adherenceRate}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* ASSIGNED COACH COLUMN */}
                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                              {!isPersonalCoachView ? (
                                /* Admin View: Render Select Dropdown to link client to coach or founder */
                                <div className="space-y-1">
                                  <select
                                    value={c.coachId || c.assignedCoachId || ''}
                                    onChange={(e) => {
                                      if (assignCoachToClient) {
                                        assignCoachToClient(c.id, e.target.value);
                                      }
                                    }}
                                    className="w-full max-w-[210px] px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs font-semibold focus:border-red-600 focus:outline-none shadow-xs cursor-pointer"
                                  >
                                    <option value="" disabled>Select Coach</option>
                                    {coaches.map((coach) => (
                                      <option key={coach.id} value={coach.id}>
                                        {coach.name} ({coach.role === 'admin' ? 'Founder & Admin' : coach.role === 'nutritionist' ? 'Nutritionist' : 'Coach'})
                                      </option>
                                    ))}
                                  </select>
                                  {assignedCoach && (
                                    <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                                      <span>Current:</span>
                                      <span className="font-semibold text-neutral-800">{assignedCoach.name}</span>
                                      {assignedCoach.role === 'admin' && (
                                        <span className="text-[9px] font-bold text-red-600 uppercase bg-red-50 px-1 rounded">Founder</span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                /* Personal Coach View: Dropdown is completely hidden */
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>{assignedCoach?.name || 'Assigned to You'}</span>
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {(() => {
                                  const isEligible = canReceiveCoaching(c);
                                  const isCoachApproval = c.subscriptionStatus === 'pending_coach_approval' || Boolean(c.pendingPlanId);
                                  const isPending = isCoachApproval || c.subscriptionStatus === 'pending_approval' || (c as any).renewalRequestedPlanId || c.status === 'pending';

                                  if (isPending) {
                                    return (
                                      <button
                                        disabled={isApproving === c.id}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (approveAndInitializeClientPlan && isApproving !== c.id) {
                                            setIsApproving(c.id);
                                            try {
                                              await approveAndInitializeClientPlan(c.id);
                                              setSelectedClientId(c.id);
                                            } finally {
                                              setIsApproving(null);
                                            }
                                          }
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                        title={isCoachApproval ? "Approve plan upgrade and initialize new program skeleton" : "Approve re-enrollment and initialize routine for this package"}
                                      >
                                        {isApproving === c.id ? (
                                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Sparkles className="w-3.5 h-3.5 text-white" />
                                        )}
                                        <span>{isApproving === c.id ? 'Activating...' : isCoachApproval ? 'Approve Upgrade' : 'Approve & Initialize'}</span>
                                      </button>
                                    );
                                  }

                                  if (isEligible) {
                                    return (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedClientId(c.id);
                                            setActiveTab('builder');
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase bg-neutral-900 hover:bg-red-600 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                          title="Assign workout to client"
                                        >
                                          <Dumbbell className="w-3.5 h-3.5" />
                                          <span>Assign Workout</span>
                                        </button>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedClientId(c.id);
                                            setActiveTab('builder');
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                                          title="Assign nutrition / macros"
                                        >
                                          <Flame className="w-3.5 h-3.5 text-red-600" />
                                          <span>Assign Nutrition</span>
                                        </button>

                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (setClientPlanExpired) {
                                              await setClientPlanExpired(c.id);
                                            }
                                          }}
                                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-neutral-200 transition-colors cursor-pointer"
                                          title="Simulate package timeline expiration for testing"
                                        >
                                          Simulate Expire
                                        </button>
                                      </>
                                    );
                                  }

                                  // Expired client actions
                                  return (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedClientId(c.id);
                                          setActiveTab('progress');
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                                        title="View historical training progress"
                                      >
                                        <TrendingUp className="w-3.5 h-3.5 text-neutral-600" />
                                        <span>View History</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedClientId(c.id);
                                          setActiveTab('chat');
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                                        title="Message client"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                                        <span>Message</span>
                                      </button>

                                      {approveAndInitializeClientPlan && (
                                        <button
                                          disabled={isApproving === c.id}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isApproving !== c.id) {
                                              setIsApproving(c.id);
                                              try {
                                                await approveAndInitializeClientPlan(c.id);
                                              } finally {
                                                setIsApproving(null);
                                              }
                                            }
                                          }}
                                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                                          title="Re-activate package and initialize routine"
                                        >
                                          {isApproving === c.id ? (
                                            <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <Sparkles className="w-3 h-3 text-emerald-600" />
                                          )}
                                          <span>{isApproving === c.id ? 'Activating...' : 'Re-Activate'}</span>
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}

                                <button
                                  onClick={() => setSelectedClientId(c.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : 'View Client'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom: Detailed Selected Client Profile & Biofeedback Snapshot */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              {visibleClients.length > 0 && selectedClient?.id ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedClient.avatarUrl}
                        alt={selectedClient.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-red-600/50"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                            Client Profile &bull; Joined {selectedClient.joinedDate}
                          </span>
                          {clientIntake ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Intake Form Linked ({clientIntake.submittedAt ? clientIntake.submittedAt.split('T')[0] : 'Completed'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Onboarding Intake
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-black text-neutral-900 uppercase font-display">
                          {selectedClient.name}
                        </h2>
                        <p className="text-xs text-neutral-500">{selectedClient.email} &bull; Goal: <strong className="text-neutral-900">{formatGoal(clientIntake?.primaryGoal || selectedClient.primaryGoal)}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveTab('builder');
                        }}
                        disabled={!canReceiveCoaching(selectedClient)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm"
                        title={!canReceiveCoaching(selectedClient) ? 'Client subscription expired — cannot assign workouts' : 'Build workout routine'}
                      >
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span>Build Program</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 cursor-pointer"
                        title="Direct Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subscription Timeline & Renewal Review Banner */}
                  {(() => {
                    const status = getSubscriptionStatus(selectedClient);
                    const isCoachApproval = selectedClient.subscriptionStatus === 'pending_coach_approval' || Boolean(selectedClient.pendingPlanId);
                    const isPending = isCoachApproval || selectedClient.subscriptionStatus === 'pending_approval' || (selectedClient as any).renewalRequestedPlanId || selectedClient.status === 'pending';
                    const isExpired = !isPending && !canReceiveCoaching(selectedClient);

                    return (
                      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCoachApproval
                          ? 'bg-amber-50/90 border-amber-300 shadow-xs'
                          : isPending
                          ? 'bg-amber-50/80 border-amber-300'
                          : isExpired
                          ? 'bg-red-50/80 border-red-300'
                          : 'bg-neutral-50 border-neutral-200'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                              Package Subscription:
                            </span>
                            <strong className="text-xs font-extrabold text-red-600 uppercase">
                              {selectedClient.activePlanName || selectedClient.planName}
                            </strong>
                            {isCoachApproval ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                Upgrade Pending Approval
                              </span>
                            ) : isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                Renewal Pending Review
                              </span>
                            ) : status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            ) : status === 'past_due' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                Past Due
                              </span>
                            ) : status === 'cancelled' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800 border border-neutral-300">
                                Cancelled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-300">
                                Expired
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-neutral-600 flex flex-wrap items-center gap-3">
                            {selectedClient.pendingPlanName ? (
                              <span className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded">
                                Upgrading To: {selectedClient.pendingPlanName} (${selectedClient.pendingPlanPrice}) • Payment Complete
                              </span>
                            ) : selectedClient.renewalRequestedPlanName ? (
                              <span className="font-bold text-amber-800">
                                Requested Renewal: {selectedClient.renewalRequestedPlanName} (${selectedClient.renewalRequestedPlanPrice})
                              </span>
                            ) : null}
                            {selectedClient.packageStartedAt && (
                              <span>Started: <strong className="text-neutral-800">{new Date(selectedClient.packageStartedAt).toLocaleDateString()}</strong></span>
                            )}
                            {selectedClient.planExpiresAt && (
                              <span>
                                {isExpired ? 'Ended: ' : 'Current Plan Expiry: '}
                                <strong className={isExpired ? 'text-red-600 font-bold' : 'text-neutral-800'}>
                                  {new Date(selectedClient.planExpiresAt).toLocaleDateString()}
                                </strong>
                                {!isExpired && ` (${getDaysRemaining(selectedClient.planExpiresAt)}d remaining)`}
                              </span>
                            )}
                          </div>

                          {isCoachApproval ? (
                            <p className="text-[11px] text-amber-900 font-medium">
                              Client completed checkout for <strong>{selectedClient.pendingPlanName || 'new tier'}</strong>. Active routines are currently intact. Click &ldquo;Approve &amp; Initialize Program&rdquo; to archive prior plan and generate draft workout &amp; nutrition protocols.
                            </p>
                          ) : isPending ? (
                            <p className="text-[11px] text-amber-800 font-medium">
                              New package subscription awaiting coach approval. Click &ldquo;Approve &amp; Initialize Plan&rdquo; to activate coaching services and assign initial protocol.
                            </p>
                          ) : isExpired ? (
                            <p className="text-[11px] text-red-600 font-bold">
                              Client coaching plan has expired. Historical data is preserved. Renew or activate plan before assigning new workouts or nutrition.
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {(isPending || isExpired) && (
                            <button
                              disabled={isApproving === selectedClient.id}
                              onClick={async () => {
                                if (approveAndInitializeClientPlan && isApproving !== selectedClient.id) {
                                  setIsApproving(selectedClient.id);
                                  try {
                                    await approveAndInitializeClientPlan(selectedClient.id);
                                  } finally {
                                    setIsApproving(null);
                                  }
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                            >
                              {isApproving === selectedClient.id ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Activating...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 text-white" />
                                  <span>{isCoachApproval ? 'Approve & Initialize Program' : isPending ? 'Approve & Initialize Plan' : 'Re-Activate & Initialize'}</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const tx: TransactionRecord = {
                                id: `tx_${selectedClient.id}`,
                                clientId: selectedClient.id,
                                clientName: selectedClient.name,
                                clientEmail: selectedClient.email,
                                planId: selectedClient.activePlanId || 'plan_online_monthly',
                                planName: selectedClient.activePlanName || selectedClient.planName,
                                amount: selectedClient.activePlanPrice || 350,
                                currency: 'AUD',
                                status: 'succeeded',
                                paymentMethod: 'Credit / Debit Card',
                                createdAt: selectedClient.packageStartedAt || new Date().toISOString(),
                                cardLast4: '4242',
                                cardBrand: 'Visa',
                                invoiceNumber: `BFL-INV-2026-${selectedClient.id.slice(-4).toUpperCase()}`,
                                billingPeriodStart: selectedClient.packageStartedAt || new Date().toISOString(),
                                billingPeriodEnd: selectedClient.planExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                durationDays: 30,
                              };
                              downloadReceiptPdf(tx, selectedClient.name, selectedClient.email, selectedClient.planExpiresAt || tx.billingPeriodEnd);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Download Official BFL Fitness Receipt PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-red-600" />
                            <span>Receipt (PDF)</span>
                          </button>
                          {!isExpired && (
                            <button
                              onClick={async () => {
                                if (setClientPlanExpired) {
                                  await setClientPlanExpired(selectedClient.id);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-red-300 hover:bg-red-50 text-neutral-600 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
                              title="Simulate package expiration to test client portal lockdown"
                            >
                              Simulate Expire
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Body Composition Tracking */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                        Weight & Metric Trajectory
                      </h3>
                      {clientIntake && (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          ✓ Sourced from athlete intake submission
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-center">
                        <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Baseline Starting</span>
                        <span className="text-lg font-black text-neutral-900 font-mono">{baselineStartingWeight} kg</span>
                      </div>
                      <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-center">
                        <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Current Weight</span>
                        <span className="text-lg font-black text-red-600 font-mono">{currentWeightDisplay} kg</span>
                      </div>
                      <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-center">
                        <span className="text-[10px] text-neutral-500 font-semibold uppercase block">Target Goal</span>
                        <span className="text-lg font-black text-emerald-600 font-mono">{targetGoalWeightDisplay} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Medical History & Equipment Notes from Intake */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase mb-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Injury Constraints</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        {injuryNotesDisplay}
                      </p>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 uppercase mb-1">
                        <Clock className="w-3.5 h-3.5 text-red-600" />
                        <span>Logistics & Availability</span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed">
                        {availabilityDaysDisplay
                          ? `${availabilityDaysDisplay} days/week${equipmentDisplay.length > 0 ? ` • Equipment: ${equipmentDisplay.join(', ')}` : ''}`
                          : (equipmentDisplay.length > 0
                              ? `Equipment: ${equipmentDisplay.join(', ')}`
                              : 'Pending client onboarding intake submission')}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab('progress')}
                      className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                      <span>View Biometrics & Photos &rarr;</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('checkins')}
                      className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 uppercase tracking-wider cursor-pointer"
                    >
                      Audit Latest Check-In &rarr;
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 uppercase tracking-wider cursor-pointer"
                    >
                      Send Motivational Check &rarr;
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-neutral-800 uppercase font-display">No Athlete Selected</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    When athletes register or are assigned to you, select a client from the roster above to inspect their profile and training program.
                  </p>
                </div>
              )}
            </div>

            {/* Real-time Completed Training Sessions & Subjective Biofeedback */}
            {selectedClient?.id && (
              <AthleteSessionHistory
                clientId={selectedClient.id}
                clientName={selectedClient.name}
                onOpenChat={() => setActiveTab('chat')}
              />
            )}
          </div>
        )}

        {/* 2. PROGRAM & MACRO BUILDER */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            {/* Active Athlete Programming Target Selector */}
            <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                  Active Athlete Programming Target:
                </span>
                <span className="text-xs text-neutral-500">
                  Target client for exercise protocol push and prescribed macronutrient targets.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-600 font-medium">Programming For:</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={visibleClients.length === 0}
                  className="bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1.5 text-xs text-neutral-900 focus:border-red-600 focus:outline-none font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {visibleClients.length === 0 ? (
                    <option value="" disabled>No athletes registered yet</option>
                  ) : (
                    visibleClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.planName || 'Elite Athlete'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {visibleClients.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-800">
                  <span className="font-bold">No active athletes found in roster.</span> All client records were cleared from Firestore. Once an athlete registers or completes onboarding intake, select them here to compile custom workout sessions and metabolic targets.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Routine & Exercise Sequence Builder */}
              <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Exercise Program Designer</span>
                      {builderStatus === 'draft' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                          <span>Draft / Unpublished</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>Published & Active</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 uppercase font-display">
                      Custom Workout Session Builder
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Assigning to client: <strong className="text-neutral-900">{visibleClients.length > 0 && selectedClient.id ? selectedClient.name : 'No athlete selected'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDraftWorkout}
                      disabled={!selectedClient?.id || visibleClients.length === 0}
                      className="px-4 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-neutral-300 transition-all cursor-pointer"
                      title="Save your modifications as an unpublished draft"
                    >
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Save Draft</span>
                    </button>

                    <button
                      onClick={handlePublishWorkout}
                      disabled={!selectedClient?.id || visibleClients.length === 0 || !canReceiveCoaching(selectedClient)}
                      className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-500/20 cursor-pointer transition-all"
                      title="Publish and immediately push this workout to the athlete's daily schedule"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish & Push to Client</span>
                    </button>
                  </div>
                </div>

                {builderStatus === 'draft' && selectedClient?.id && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-bold">Draft Protocol (Unpublished):</span> This workout routine is currently in draft state. It has <strong>NOT</strong> been sent to {selectedClient.name} and will not be visible on their dashboard or workout tracker. Customize the sequence below, then click <strong className="text-red-700">"Publish & Push to Client"</strong> to activate it for the athlete.
                    </div>
                  </div>
                )}

                {draftSavedSuccess && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Draft saved successfully. Workout remains unpublished and hidden from client.</span>
                  </div>
                )}

                {!canReceiveCoaching(selectedClient) && selectedClient?.id && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-300 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <div className="text-xs text-red-800">
                      <span className="font-bold">Subscription Expired:</span> Client coaching plan has expired. Renew or activate a plan before assigning new coaching content.
                    </div>
                  </div>
                )}

                {programAssignedSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Workout successfully compiled and pushed to {selectedClient.name}'s daily schedule!</span>
                  </div>
                )}

                {/* Workout Title & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Session Name / Split Focus
                    </label>
                    <input
                      type="text"
                      value={builderWorkoutTitle}
                      onChange={(e) => setBuilderWorkoutTitle(e.target.value)}
                      placeholder="e.g. Day 1: Push Hypertrophy & Chest/Delt Specialization"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm focus:border-red-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Session Coaching Goal
                    </label>
                    <input
                      type="text"
                      value={builderWorkoutDesc}
                      onChange={(e) => setBuilderWorkoutDesc(e.target.value)}
                      placeholder="e.g. Progressive overload focus, 3-sec eccentrics, clavicular recruitment"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm focus:border-red-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Exercises list in builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase font-display">
                      Prescribed Exercises ({builderExercises.length})
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddExerciseToBuilder}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Lift</span>
                    </button>
                  </div>

                  {builderExercises.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-300">
                      <Dumbbell className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">No Exercises Programmed Yet</h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                        Click "+ Add Lift" to begin configuring exercises, set volumes, and biomechanical cues for this session.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddExerciseToBuilder}
                        className="mt-3 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Lift</span>
                      </button>
                    </div>
                  ) : (
                    builderExercises.map((ex, exIdx) => (
                    <div key={ex.id} className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold font-mono">
                            {exIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={ex.exerciseName}
                            onChange={(e) => {
                              const updated = [...builderExercises];
                              updated[exIdx].exerciseName = e.target.value;
                              setBuilderExercises(updated);
                            }}
                            className="bg-transparent text-sm font-bold text-neutral-900 border-b border-transparent hover:border-neutral-300 focus:border-red-600 focus:outline-none px-1"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-500">Rest:</span>
                          <input
                            type="number"
                            value={ex.restSeconds || 90}
                            onChange={(e) => {
                              const updated = [...builderExercises];
                              updated[exIdx].restSeconds = Number(e.target.value);
                              setBuilderExercises(updated);
                            }}
                            className="w-16 px-2 py-1 rounded bg-white border border-neutral-300 text-neutral-900 font-mono text-xs"
                          />
                          <span className="text-[11px] text-neutral-500">sec</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Target Muscle Group</label>
                          <input
                            type="text"
                            value={ex.targetMuscle}
                            onChange={(e) => {
                              const updated = [...builderExercises];
                              updated[exIdx].targetMuscle = e.target.value;
                              setBuilderExercises(updated);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-500 uppercase font-bold mb-1">Cues & Biomechanical Focus</label>
                          <input
                            type="text"
                            value={ex.coachNotes || ''}
                            onChange={(e) => {
                              const updated = [...builderExercises];
                              updated[exIdx].coachNotes = e.target.value;
                              setBuilderExercises(updated);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs text-neutral-900"
                          />
                        </div>
                      </div>

                      {/* Sets configuration */}
                      <div className="border-t border-neutral-200 pt-3">
                        <div className="flex items-center justify-between text-[11px] text-neutral-600 uppercase font-bold mb-2">
                          <span>Sets & Rep Ranges</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...builderExercises];
                              const nextSetNum = updated[exIdx].sets.length + 1;
                              updated[exIdx].sets.push({
                                setNumber: nextSetNum,
                                targetReps: '8-10',
                                actualWeightKg: updated[exIdx].sets[0]?.actualWeightKg || 20,
                                actualReps: 8,
                                completed: false
                              });
                              setBuilderExercises(updated);
                            }}
                            className="text-red-600 hover:underline cursor-pointer"
                          >
                            + Add Set
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {ex.sets.map((set, setIdx) => (
                            <div key={setIdx} className="bg-white p-2 rounded-xl border border-neutral-200 flex items-center justify-between text-xs shadow-sm">
                              <span className="font-bold text-neutral-600 font-mono">Set {set.setNumber}</span>
                              <input
                                type="text"
                                value={set.targetReps}
                                onChange={(e) => {
                                  const updated = [...builderExercises];
                                  updated[exIdx].sets[setIdx].targetReps = e.target.value;
                                  setBuilderExercises(updated);
                                }}
                                className="w-16 px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-300 text-neutral-900 font-mono text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>

              {/* Right Column: Nutrition & Macro Targets Preset */}
              <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div>
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Metabolic Prescription</span>
                  <h3 className="text-xl font-black text-neutral-900 uppercase font-display">
                    Macronutrient Targets
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Configured for {visibleClients.length > 0 && selectedClient.id ? selectedClient.name : 'No athlete selected'}
                  </p>
                </div>

                {visibleClients.length > 0 && selectedClient.id && (
                  <button
                    type="button"
                    onClick={handleAutoCalculateMacros}
                    className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    <span>Auto-Calculate From Intake & Weight</span>
                  </button>
                )}

                {nutritionSaved && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Macronutrient targets updated successfully!</span>
                  </div>
                )}

                <form onSubmit={handleSaveNutrition} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Total Calories (kcal/day)
                    </label>
                    <input
                      type="number"
                      value={nutriCalories}
                      onChange={(e) => setNutriCalories(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 2400"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 font-mono text-base focus:border-red-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Protein (g)</label>
                      <input
                        type="number"
                        value={nutriProtein}
                        onChange={(e) => setNutriProtein(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 180"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 font-mono text-xs focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        value={nutriCarbs}
                        onChange={(e) => setNutriCarbs(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 220"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 font-mono text-xs focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Fat (g)</label>
                      <input
                        type="number"
                        value={nutriFat}
                        onChange={(e) => setNutriFat(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 60"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 font-mono text-xs focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Water Hydration (Liters / Day)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={nutriWater}
                      onChange={(e) => setNutriWater(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 3.5"
                      className="w-full px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-red-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Coach Nutrition Directives
                    </label>
                    <textarea
                      rows={3}
                      value={nutriNotes}
                      onChange={(e) => setNutriNotes(e.target.value)}
                      placeholder="Prescribe daily nutritional directives, meal timing, hydration protocols..."
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:border-red-600 focus:bg-white focus:outline-none resize-none"
                    />
                  </div>

                  {!canReceiveCoaching(selectedClient) && selectedClient?.id && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-800 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Subscription Expired: Macro updates locked until client plan is renewed.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedClient?.id || visibleClients.length === 0 || !canReceiveCoaching(selectedClient)}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Macros</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 3. CHECK-IN REVIEW QUEUE */}
        {activeTab === 'checkins' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* List of check-ins */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-neutral-900 uppercase font-display">
                  Weekly Biofeedback ({visibleCheckIns.length})
                </h2>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-[10px] font-bold">
                  <button
                    onClick={() => setCheckInFilter('all')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      checkInFilter === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    All Athletes
                  </button>
                  <button
                    onClick={() => setCheckInFilter('selected')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      checkInFilter === 'selected' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {selectedClient.name.split(' ')[0]}
                  </button>
                </div>
              </div>

              {visibleCheckIns.length > 0 ? (
                visibleCheckIns.map((ci) => {
                  const isSelected = activeCheckInId === ci.id;
                  const isPending = !ci.coachFeedback;
                  return (
                    <div
                      key={ci.id}
                      onClick={() => setActiveCheckInId(ci.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white border-red-600 shadow-md ring-1 ring-red-600/20'
                          : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900">{ci.clientName}</span>
                          <span className="text-xs text-neutral-500">&bull; Week #{ci.weekNumber}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isPending ? 'Needs Audit' : 'Audited'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono">
                        <span>Weight: <strong className="text-neutral-900">{ci.weightKg} kg</strong></span>
                        <span>Adherence: <strong className="text-red-600">{ci.adherenceRating}/10</strong></span>
                        <span>Sleep: {ci.sleepHours}h</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl">
                  <CheckSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-neutral-800 uppercase font-display">No Check-Ins Found</h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    {checkInFilter === 'selected'
                      ? `No weekly check-in forms submitted yet by ${selectedClient.name}.`
                      : 'When athletes submit their weekly biofeedback, submissions will populate here for review.'}
                  </p>
                </div>
              )}
            </div>

            {/* Audit & Coach Response Form */}
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              {selectedCheckIn ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                        Biofeedback Audit &bull; {selectedCheckIn.submissionDate}
                      </span>
                      <h3 className="text-2xl font-black text-neutral-900 uppercase font-display">
                        {selectedCheckIn.clientName} &bull; Week {selectedCheckIn.weekNumber}
                      </h3>
                    </div>
                  </div>

                  {/* Submitted Metrics Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold">Weight</span>
                      <span className="text-base font-black text-neutral-900 font-mono">{selectedCheckIn.weightKg} kg</span>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold">Adherence</span>
                      <span className="text-base font-black text-red-600 font-mono">{selectedCheckIn.adherenceRating}/10</span>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold">Sleep Avg</span>
                      <span className="text-base font-black text-neutral-900 font-mono">{selectedCheckIn.sleepHours} hrs</span>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold">Gym Energy</span>
                      <span className="text-base font-black text-amber-600 font-mono">{selectedCheckIn.energyRating}/10</span>
                    </div>
                  </div>

                  {/* Client Submitted Notes */}
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                    <span className="text-xs font-bold text-neutral-600 uppercase block mb-1">
                      Client Reported Experience:
                    </span>
                    <p className="text-sm text-neutral-800 italic leading-relaxed">
                      &ldquo;{selectedCheckIn.winsAndStruggles}&rdquo;
                    </p>
                  </div>

                  {/* Submitted Check-In Photos if any */}
                  {selectedCheckIn.progressPhotos && (selectedCheckIn.progressPhotos.front || selectedCheckIn.progressPhotos.side || selectedCheckIn.progressPhotos.back) && (
                    <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                      <span className="text-xs font-bold text-neutral-800 uppercase flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-red-600" />
                        <span>Submitted Check-In Physique Photos:</span>
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        {selectedCheckIn.progressPhotos.front && (
                          <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 group relative aspect-[3/4]">
                            <img
                              src={selectedCheckIn.progressPhotos.front}
                              alt="Front pose"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-neutral-900/80 text-[10px] font-bold text-white uppercase">
                              Front Pose
                            </span>
                          </div>
                        )}
                        {selectedCheckIn.progressPhotos.side && (
                          <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 group relative aspect-[3/4]">
                            <img
                              src={selectedCheckIn.progressPhotos.side}
                              alt="Side pose"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-neutral-900/80 text-[10px] font-bold text-white uppercase">
                              Side Pose
                            </span>
                          </div>
                        )}
                        {selectedCheckIn.progressPhotos.back && (
                          <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 group relative aspect-[3/4]">
                            <img
                              src={selectedCheckIn.progressPhotos.back}
                              alt="Back pose"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-neutral-900/80 text-[10px] font-bold text-white uppercase">
                              Back Pose
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Existing Coach Feedback if any */}
                  {selectedCheckIn.coachFeedback && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs">
                      <span className="text-red-700 font-bold uppercase block mb-1">
                        Current Coach Feedback Given:
                      </span>
                      <p className="text-neutral-800">{selectedCheckIn.coachFeedback}</p>
                    </div>
                  )}

                  {feedbackSentAlert && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Check-in feedback transmitted to client portal!</span>
                    </div>
                  )}

                  {/* Coach Response Box */}
                  <form onSubmit={handleSendCheckInFeedback} className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Write Coach Audit, Video Notes & Macro Adjustments
                    </label>
                    <textarea
                      rows={4}
                      value={coachFeedbackText}
                      onChange={(e) => setCoachFeedbackText(e.target.value)}
                      placeholder="e.g. Tremendous adherence Alex! Bench press form looked crisp. Let's hold calories at 2,450 for one more week..."
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:border-red-600 focus:bg-white focus:outline-none resize-none"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-red-500/20 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Publish Feedback to Client</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  Select a check-in from the queue to start review.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. INTAKE SUBMISSIONS QUEUE */}
        {activeTab === 'intakes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 uppercase font-display">
                  Client Intake Form Pipeline
                </h2>
                <p className="text-xs text-neutral-500">
                  Data submitted through client onboarding routed for initial split programming and baseline biometrics review.
                </p>
              </div>
            </div>

            {intakeSubmissions.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-neutral-900">No Pending Client Intake Submissions</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    When new clients complete onboarding, their complete health history, baseline body metrics, and training availability will appear here in this queue.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('clients')}
                    className="px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider border border-neutral-300 cursor-pointer"
                  >
                    Inspect Client Roster
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {intakeSubmissions.map((intake) => (
                  <div key={intake.id} className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-lg">
                          {intake.clientName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-neutral-900 uppercase font-display">{intake.clientName}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              {intake.status}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>{intake.clientEmail} &bull; Submitted {formatIntakeDate(intake.submittedAt)}</span>
                            {intake.selectedPlanName && (
                              <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 text-[11px]">
                                Plan: {intake.selectedPlanName} (${intake.selectedPlanPrice})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-left sm:text-right">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                            Lead Coach
                          </label>
                          <select
                            value={(intake as any).coachId || (intake as any).assignedCoachId || 'admin_mass_narimanian'}
                            onChange={(e) => {
                              if (assignCoachToClient && intake.clientId) {
                                assignCoachToClient(intake.clientId, e.target.value);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-semibold focus:border-red-600 focus:outline-none shadow-xs cursor-pointer"
                          >
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.id}>
                                {coach.name} ({coach.role === 'admin' ? 'Founder' : coach.role === 'nutritionist' ? 'Nutritionist' : 'Coach'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {intake.status !== 'active' && (
                          <button
                            onClick={async () => {
                              if (updateIntakeStatus) {
                                await updateIntakeStatus(intake.id, intake.clientId, 'active');
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-200 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Activate</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleInitializeProgram(intake)}
                          disabled={initializingIntakeId === intake.id}
                          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-red-500/20 transition-all"
                        >
                          {initializingIntakeId === intake.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Dumbbell className="w-4 h-4" />
                          )}
                          <span>{initializingIntakeId === intake.id ? 'Initializing...' : 'Initialize Program'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Goal</span>
                        <span className="text-xs font-bold text-neutral-900 uppercase">{formatGoal(intake.primaryGoal)}</span>
                      </div>
                      <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Age / Height</span>
                        <span className="text-xs font-bold text-neutral-900 font-mono">{intake.age} yrs &bull; {intake.heightCm} cm</span>
                      </div>
                      <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Weight (Cur &rarr; Target)</span>
                        <span className="text-xs font-bold text-red-600 font-mono">{intake.currentWeightKg}kg &rarr; {intake.targetWeightKg}kg</span>
                      </div>
                      <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Availability</span>
                        <span className="text-xs font-bold text-neutral-900 font-mono">{intake.trainingDaysPerWeek} Days / {intake.workoutDurationMinutes || 60} min</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="font-bold text-red-600 uppercase block mb-1">Injury History & Medical Clearance</span>
                        <p className="text-neutral-700">{intake.injuryHistory || 'None noted.'}</p>
                        <p className="text-[11px] text-neutral-500 mt-1">{intake.medicalNotes}</p>
                        {intake.baselineMeasurements && (
                          <div className="mt-2 pt-2 border-t border-neutral-200 text-[11px] text-neutral-600 flex gap-3">
                            <span>Waist: <strong className="text-neutral-900">{intake.baselineMeasurements.waistCm || '—'}cm</strong></span>
                            <span>Chest: <strong className="text-neutral-900">{intake.baselineMeasurements.chestCm || '—'}cm</strong></span>
                            <span>Biceps: <strong className="text-neutral-900">{intake.baselineMeasurements.bicepsCm || '—'}cm</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="font-bold text-red-600 uppercase block mb-1">Nutrition & Exclusions</span>
                        <p className="text-neutral-700">Pref: {intake.dietaryPreference ? intake.dietaryPreference.replace(/_/g, ' ') : 'Flexible'} &bull; Excluded: {intake.excludedFoods || 'None'}</p>
                        <p className="text-[11px] text-neutral-500 mt-1">Supplements: {intake.supplementHistory || 'None'}</p>
                        {intake.availableEquipment && intake.availableEquipment.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-neutral-200 text-[11px] text-neutral-600">
                            <span>Equipment: <strong className="text-neutral-900">{intake.availableEquipment.join(', ')}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. MESSAGES PORTAL */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[640px]">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedClient.avatarUrl}
                  alt={selectedClient.name}
                  className="w-10 h-10 rounded-xl object-cover border border-neutral-200"
                />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 uppercase font-display">{selectedClient.name}</h3>
                  <p className="text-[11px] text-neutral-500">{selectedClient.activePlanName || selectedClient.planName}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase">
                Coach Roster Channel
              </span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {coachClientMessages.length > 0 ? (
                coachClientMessages.map((msg) => {
                  const isMe = msg.senderRole === 'coach' || msg.senderRole === 'admin';
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
                  <h4 className="text-sm font-bold text-neutral-800 uppercase font-display">
                    1-on-1 Chat with {selectedClient.name}
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    No messages exchanged yet with this athlete. Type a greeting or form cues below to initiate direct communication.
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSendCoachMessage} className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center gap-3">
              <input
                type="text"
                value={coachChatInput}
                onChange={(e) => setCoachChatInput(e.target.value)}
                placeholder={`Reply to ${selectedClient.name}...`}
                className="flex-1 px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs sm:text-sm focus:border-red-600 focus:outline-none shadow-sm"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-500/20"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* 6. CMS CONTENT & PRICING MANAGER */}
        {activeTab === 'cms' && (
          <CMSEditor />
        )}

        {/* 7. PROGRESS & BIOMETRIC ANALYTICS */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {/* Client Picker for Coach */}
            <div className="bg-white border border-neutral-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <span className="text-xs font-bold text-neutral-800 uppercase">
                Active Athlete Biometrics Inspector:
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-600 font-medium">Select Athlete:</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={visibleClients.length === 0}
                  className="bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:border-red-600 focus:outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {visibleClients.length === 0 ? (
                    <option value="" disabled>No athletes assigned yet</option>
                  ) : (
                    visibleClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.activePlanName || c.planName})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <ProgressAnalyticsView clientId={selectedClientId} isCoachView={true} checkIns={allCheckIns} />
          </div>
        )}

        {/* 8. MULTI-COACH TEAM MANAGEMENT */}
        {activeTab === 'team' && adminDashboardMode === 'admin' && (
          <CoachTeamManagement />
        )}
      </main>
    </div>
  );
};
