import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Upload, 
  Activity, 
  HeartPulse, 
  Dumbbell, 
  Utensils, 
  Camera,
  Sparkles 
} from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';
import { useAuth } from '../../context/AuthContext';
import { IntakeFormData } from '../../types';

interface IntakeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  clientInfo?: {
    name: string;
    email: string;
    planId?: string;
    planName?: string;
    planPrice?: number;
    billingPeriod?: string;
  } | null;
}

export const IntakeFormModal: React.FC<IntakeFormModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  clientInfo
}) => {
  const { user, completeIntake } = useAuth();
  const { submitIntakeForm } = useFitnessData();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Metrics
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('Male');
  const [heightCm, setHeightCm] = useState<string>('');
  const [currentWeightKg, setCurrentWeightKg] = useState<string>('');
  const [targetWeightKg, setTargetWeightKg] = useState<string>('');
  const [primaryGoal, setPrimaryGoal] = useState<IntakeFormData['primaryGoal']>('hypertrophy');
  const [chestCm, setChestCm] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipsCm, setHipsCm] = useState<string>('');
  const [bicepsCm, setBicepsCm] = useState<string>('');
  const [photoFront, setPhotoFront] = useState<string>('');

  // Step 2: Medical
  const [injuryHistory, setInjuryHistory] = useState<string>('');
  const [medicalNotes, setMedicalNotes] = useState<string>('');
  const [hasMedicalClearance, setHasMedicalClearance] = useState<boolean>(true);

  // Step 3: Logistics
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(4);
  const [trainingLocation, setTrainingLocation] = useState<'commercial_gym' | 'home_gym' | 'hybrid'>('commercial_gym');
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [durationMins, setDurationMins] = useState<number>(60);

  // Step 4: Nutrition
  const [dietaryPreference, setDietaryPreference] = useState<IntakeFormData['dietaryPreference']>('flexible_dieting');
  const [foodAllergies, setFoodAllergies] = useState<string>('');
  const [excludedFoods, setExcludedFoods] = useState<string>('');
  const [mealsPerDay, setMealsPerDay] = useState<number>(4);
  const [supplementHistory, setSupplementHistory] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleEquipment = (eq: string) => {
    setEquipmentList(prev => 
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    const newIntake: Omit<IntakeFormData, 'id' | 'submittedAt' | 'status'> = {
      clientId: user?.uid || (clientInfo?.email ? 'client_' + clientInfo.email.replace(/[^a-zA-Z0-9]/g, '_') : 'client_' + Date.now()),
      clientName: user?.displayName || clientInfo?.name || 'New Client',
      clientEmail: user?.email || clientInfo?.email || 'client@example.com',
      selectedPlanId: clientInfo?.planId || user?.activePlanId || 'plan_online_monthly',
      selectedPlanName: clientInfo?.planName || user?.activePlanName || 'Online Coaching (Monthly)',
      selectedPlanPrice: clientInfo?.planPrice || user?.activePlanPrice || 350,
      approvalStatus: 'pending',
      age: age ? Number(age) : 0,
      gender,
      heightCm: heightCm ? Number(heightCm) : 0,
      currentWeightKg: currentWeightKg ? Number(currentWeightKg) : 0,
      targetWeightKg: targetWeightKg ? Number(targetWeightKg) : 0,
      primaryGoal,
      baselineMeasurements: {
        chestCm: chestCm ? Number(chestCm) : undefined,
        waistCm: waistCm ? Number(waistCm) : undefined,
        hipsCm: hipsCm ? Number(hipsCm) : undefined,
        bicepsCm: bicepsCm ? Number(bicepsCm) : undefined
      },
      startingPhotos: {
        front: photoFront || undefined
      },
      injuryHistory,
      medicalNotes,
      hasMedicalClearance,
      trainingDaysPerWeek,
      trainingLocation,
      availableEquipment: equipmentList,
      workoutDurationMinutes: durationMins,
      dietaryPreference,
      foodAllergies,
      excludedFoods,
      mealsPerDay,
      supplementHistory
    };

    if (submitIntakeForm) {
      submitIntakeForm(newIntake);
    }
    if (completeIntake) {
      completeIntake();
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        onCompleted();
      }, 1400);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-900/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-neutral-200 shadow-2xl max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-8 flex-1">
          {isSuccess ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 text-white flex items-center justify-center mx-auto animate-bounce shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-neutral-900 uppercase font-display">
              Intake Data Transmitted!
            </h3>
            <p className="text-sm text-neutral-600 max-w-md mx-auto">
              Your comprehensive intake metrics, injury notes, logistics, and dietary preferences have been routed directly to Founders Mass & Pouya for bespoke programming.
            </p>
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-red-600 font-semibold inline-block">
              Redirecting to your personalized client dashboard...
            </div>
          </div>
        ) : (
          <div>
            {/* Step 3 of 3 Indicator & Plan Confirmation Banner */}
            <div className="mb-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-bold text-red-700 shadow-xs">
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-mono font-black">3</span>
                <span>Step 3 of 3: Athlete Onboarding Intake</span>
              </div>

              {(clientInfo || user?.activePlanId) && (
                <div className="p-3.5 rounded-2xl bg-neutral-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Enrolled Coaching Tier</span>
                    <p className="text-xs font-bold text-white">
                      {clientInfo?.planName || user?.activePlanName || 'Online Coaching'}
                      {' '}&bull;{' '}
                      <span className="text-red-400 font-mono">
                        ${clientInfo?.planPrice || user?.activePlanPrice || 350} {clientInfo?.billingPeriod || '/ month'}
                      </span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider text-center">
                    Pending Coach Mass &amp; Pouya Review
                  </span>
                </div>
              )}
            </div>

            {/* Authenticated Client Welcome Banner */}
            {(user?.displayName || clientInfo?.name) && (
              <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-red-50 via-neutral-50 to-red-50 border border-red-200/70 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full object-cover border border-red-300 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {(user?.displayName || clientInfo?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      Athlete: <span className="text-red-600 font-extrabold">{user?.displayName || clientInfo?.name}</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">{user?.email || clientInfo?.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-700 shrink-0 shadow-xs">
                  Intake Steps 1-4
                </span>
              </div>
            )}

            {/* Header & Step progress */}
            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> BFL Client Onboarding Form
              </span>
              <h2 className="text-2xl font-black text-neutral-900 uppercase font-display">
                Comprehensive Coaching Intake
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Step {step} of 4 &bull; This data directly determines your periodized workout split and macronutrient targets.
              </p>

              {/* Progress bar */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { num: 1, label: 'Metrics & Goals', icon: Activity },
                  { num: 2, label: 'Medical History', icon: HeartPulse },
                  { num: 3, label: 'Logistics', icon: Dumbbell },
                  { num: 4, label: 'Nutrition', icon: Utensils }
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.num}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        step >= s.num
                          ? 'bg-red-50 border-red-300 text-neutral-900 shadow-xs'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${step >= s.num ? 'text-red-600' : 'text-neutral-400'}`} />
                      <p className="text-[10px] font-bold uppercase truncate">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 1: METRICS & GOALS */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 29"
                      className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="e.g. 180"
                      className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Current Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentWeightKg}
                      onChange={(e) => setCurrentWeightKg(e.target.value)}
                      placeholder="e.g. 84.5"
                      className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Target Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={targetWeightKg}
                      onChange={(e) => setTargetWeightKg(e.target.value)}
                      placeholder="e.g. 79.0"
                      className="w-full px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Primary Physique & Athletic Goal
                  </label>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                  >
                    <option value="hypertrophy">Maximum Muscle Hypertrophy</option>
                    <option value="fat_loss">Aggressive Fat Loss & Shredding</option>
                    <option value="recomp">Body Recomposition (Simultaneous Muscle & Fat Loss)</option>
                    <option value="strength">Raw Strength & Powerlifting Specialization</option>
                    <option value="athletic_performance">Functional Athletic Conditioning</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Baseline Body Measurements (cm)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-neutral-500 block font-semibold">Chest</span>
                      <input
                        type="number"
                        value={chestCm}
                        onChange={(e) => setChestCm(e.target.value)}
                        placeholder="102"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs font-mono placeholder:text-neutral-400"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block font-semibold">Waist</span>
                      <input
                        type="number"
                        value={waistCm}
                        onChange={(e) => setWaistCm(e.target.value)}
                        placeholder="85"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs font-mono placeholder:text-neutral-400"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block font-semibold">Hips</span>
                      <input
                        type="number"
                        value={hipsCm}
                        onChange={(e) => setHipsCm(e.target.value)}
                        placeholder="98"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs font-mono placeholder:text-neutral-400"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block font-semibold">Arm / Bicep</span>
                      <input
                        type="number"
                        value={bicepsCm}
                        onChange={(e) => setBicepsCm(e.target.value)}
                        placeholder="37"
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 text-xs font-mono placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Starting Front Physique Photo (Confidential to Coach)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border border-neutral-300 bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {photoFront ? (
                        <img src={photoFront} alt="Starting Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={photoFront}
                        onChange={(e) => setPhotoFront(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/... or paste image URL"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MEDICAL */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Injury History & Chronic Joint Issues *
                  </label>
                  <textarea
                    rows={4}
                    value={injuryHistory}
                    onChange={(e) => setInjuryHistory(e.target.value)}
                    placeholder="e.g. Previous minor right shoulder strain during heavy overhead pressing. Currently asymptomatic. List any past surgeries, disc issues, rotator cuff or knee pain..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none resize-none placeholder:text-neutral-400"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Our coaching team will configure exercise biomechanics to completely bypass aggravating ranges of motion.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Medical Conditions & Prescriptions
                  </label>
                  <textarea
                    rows={3}
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="e.g. No prescription medications. Blood pressure normal. Any cardiovascular, metabolic, or endocrine considerations..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none resize-none placeholder:text-neutral-400"
                  />
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="medClearance"
                    checked={hasMedicalClearance}
                    onChange={(e) => setHasMedicalClearance(e.target.checked)}
                    className="mt-1 accent-red-600 rounded cursor-pointer"
                  />
                  <label htmlFor="medClearance" className="text-xs text-neutral-700 leading-snug cursor-pointer">
                    <span className="font-bold text-neutral-900 block">Medical Activity Clearance</span>
                    I certify that I am physically capable of undertaking progressive resistance exercise or have obtained clearance from my healthcare practitioner.
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: LOGISTICS */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Training Days Per Week
                    </label>
                    <select
                      value={trainingDaysPerWeek}
                      onChange={(e) => setTrainingDaysPerWeek(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value={3}>3 Days / Week (Full Body Split)</option>
                      <option value={4}>4 Days / Week (Upper / Lower)</option>
                      <option value={5}>5 Days / Week (Push / Pull / Legs / Upper / Lower)</option>
                      <option value={6}>6 Days / Week (PPL 2x Frequency)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Session Duration Limit
                    </label>
                    <select
                      value={durationMins}
                      onChange={(e) => setDurationMins(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value={45}>45 Minutes (High Density)</option>
                      <option value={60}>60 Minutes (Standard)</option>
                      <option value={75}>75 Minutes (Hypertrophy Volume)</option>
                      <option value={90}>90 Minutes (Competitive Prep)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Primary Training Location
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'commercial_gym', label: 'Commercial Gym' },
                      { id: 'home_gym', label: 'Home Garage' },
                      { id: 'hybrid', label: 'Hybrid / Travel' }
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setTrainingLocation(loc.id as any)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center border cursor-pointer transition-colors ${
                          trainingLocation === loc.id
                            ? 'bg-red-50 border-red-500 text-neutral-900 shadow-xs'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Available Equipment (Check all that apply)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      'Barbells & Plates',
                      'Dumbbells (Heavy)',
                      'Cable Machines',
                      'Squat Rack',
                      'Leg Press / Hack Squat',
                      'Hamstring Curl Machine',
                      'Adjustable Benches',
                      'Pull-Up & Dip Station',
                      'Resistance Bands'
                    ].map((eq) => (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`p-2 rounded-xl text-xs font-semibold text-left border cursor-pointer transition-colors ${
                          equipmentList.includes(eq)
                            ? 'bg-red-50 border-red-500 text-neutral-900'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {equipmentList.includes(eq) ? '✓ ' : '+ '}
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: NUTRITION */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Dietary Preference
                    </label>
                    <select
                      value={dietaryPreference}
                      onChange={(e) => setDietaryPreference(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value="flexible_dieting">Flexible Dieting / IIFYM (Recommended)</option>
                      <option value="high_protein_standard">High Protein Balanced Whole Foods</option>
                      <option value="plant_based">Plant-Based / Vegan / Vegetarian</option>
                      <option value="intermittent_fasting">Intermittent Fasting (16/8)</option>
                      <option value="keto">Ketogenic / Low Carb</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Preferred Meals Per Day
                    </label>
                    <select
                      value={mealsPerDay}
                      onChange={(e) => setMealsPerDay(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none cursor-pointer"
                    >
                      <option value={3}>3 Meals / Day</option>
                      <option value={4}>4 Meals / Day (Optimal Protein Spacing)</option>
                      <option value={5}>5 Meals / Day</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Food Allergies & Intolerances
                  </label>
                  <input
                    type="text"
                    value={foodAllergies}
                    onChange={(e) => setFoodAllergies(e.target.value)}
                    placeholder="e.g. None, or Peanuts, Lactose, Gluten, Shellfish"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Foods You Refuse to Eat / Exclusions
                  </label>
                  <input
                    type="text"
                    value={excludedFoods}
                    onChange={(e) => setExcludedFoods(e.target.value)}
                    placeholder="e.g. Cilantro, Shellfish, Mushrooms, Cottage Cheese"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Current Supplements Taken
                  </label>
                  <input
                    type="text"
                    value={supplementHistory}
                    onChange={(e) => setSupplementHistory(e.target.value)}
                    placeholder="e.g. Creatine monohydrate 5g, Whey Isolate, Pre-workout, Fish Oil"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-sm focus:border-red-500 focus:outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-neutral-200 mt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-neutral-200"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((step + 1) as any)}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-200 border border-red-500/40"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-200 disabled:opacity-50 border border-red-500/40"
                >
                  {isSubmitting ? (
                    <span>Transmitting to Coaching Team...</span>
                  ) : (
                    <>
                      <span>Complete Intake & Route to Coach</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
