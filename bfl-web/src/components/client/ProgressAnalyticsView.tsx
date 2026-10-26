import React, { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Camera, 
  Ruler, 
  Calendar, 
  Plus, 
  ArrowRight, 
  Check, 
  Flame, 
  Sparkles, 
  Maximize2,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';
import { useAuth } from '../../context/AuthContext';
import { ProgressMetricPoint, ProgressPhotoRecord, WeeklyCheckIn } from '../../types';
import { PhotoUploadPreview } from '../common/PhotoUploadPreview';
import { uploadAndSaveCheckInPhotos } from '../../services/storageService';

interface ProgressAnalyticsViewProps {
  clientId?: string;
  isCoachView?: boolean;
  checkIns?: WeeklyCheckIn[];
}

export const ProgressAnalyticsView: React.FC<ProgressAnalyticsViewProps> = ({ 
  clientId, 
  isCoachView = false,
  checkIns: propCheckIns
}) => {
  const { user } = useAuth();
  const { 
    progressMetrics, 
    progressPhotos, 
    logProgressMetric, 
    addProgressPhoto, 
    clients, 
    clientIntake, 
    intakeForms, 
    intakeSubmissions, 
    checkIns: ctxCheckIns,
    submitWeeklyCheckIn
  } = useFitnessData();
  const checkIns = propCheckIns || ctxCheckIns;

  const targetEmail = (user?.email || '').toLowerCase().trim();
  const userName = (user?.displayName || '').toLowerCase().trim();
  const clientInfo = clients.find(c => 
    (clientId && c.id === clientId) || 
    (targetEmail && c.email && c.email.toLowerCase().trim() === targetEmail) ||
    (userName && userName !== 'valued athlete' && userName !== 'athlete' && c.name && c.name.toLowerCase().trim() === userName)
  );
  const targetClientId = clientId || clientInfo?.id || (user?.role === 'client' ? user.uid : (clients[0]?.id || ''));
  const isRealUser = Boolean(targetClientId && targetClientId !== 'client_alex');
  const resolvedEmail = (clientInfo?.email || targetEmail || '').toLowerCase().trim();

  // Resolve active onboarding intake submission for this client (for coach inspecting or client self)
  const allIntakes = intakeForms || intakeSubmissions || [];
  const effectiveIntake = React.useMemo(() => {
    const athleteName = (clientInfo?.name || (user?.role === 'client' ? user.displayName : '') || '').toLowerCase().trim();

    // 1. Match in allIntakes by clientId
    if (targetClientId) {
      const byId = allIntakes.find(i => i.clientId === targetClientId);
      if (byId) return byId;
    }
    // 2. Match in allIntakes by resolved email
    if (resolvedEmail) {
      const byEmail = allIntakes.find(i => i.clientEmail && i.clientEmail.toLowerCase().trim() === resolvedEmail);
      if (byEmail) return byEmail;
    }
    // 3. Match in allIntakes by name
    if (athleteName && athleteName !== 'valued athlete' && athleteName !== 'athlete') {
      const byName = allIntakes.find(i => i.clientName && i.clientName.toLowerCase().trim() === athleteName);
      if (byName) return byName;
    }
    // 4. Fallback to clientIntake ONLY if it belongs to this client and does not conflict with athlete name
    if (clientIntake) {
      const idMatches = targetClientId && clientIntake.clientId === targetClientId;
      const emailMatches = resolvedEmail && clientIntake.clientEmail && clientIntake.clientEmail.toLowerCase().trim() === resolvedEmail;
      const nameMatches = athleteName && clientIntake.clientName && clientIntake.clientName.toLowerCase().trim() === athleteName;
      const nameConflicts = athleteName && clientIntake.clientName && 
        clientIntake.clientName.toLowerCase().trim() !== athleteName && 
        athleteName !== 'valued athlete' && athleteName !== 'athlete';
      if (!nameConflicts && (idMatches || emailMatches || nameMatches)) {
        return clientIntake;
      }
    }
    // Never fall back to another athlete's intake!
    return null;
  }, [targetClientId, allIntakes, resolvedEmail, clientInfo, clientIntake, user?.displayName]);

  const clientDisplayName = clientInfo?.name || 
    (user?.role === 'client' && user.displayName && user.displayName !== 'Valued Athlete' ? user.displayName : undefined) || 
    effectiveIntake?.clientName || 
    'Athlete';

  // Synthesize dynamic client metrics strictly from:
  // 1. Onboarding intake baseline (Point 0: Onboarding)
  // 2. Weekly check-in submissions (Point 1: Week 1, Point 2: Week 2...)
  // Strictly NO in-between points or synthetic workout weights!
  const clientMetrics = React.useMemo(() => {
    const list: (ProgressMetricPoint & { weekLabel?: string; isBaseline?: boolean; weekNumber?: number })[] = [];

    // 1. Add baseline from onboarding intake or clientInfo
    const baselineWeight = Number(effectiveIntake?.currentWeightKg || clientInfo?.startingWeightKg || clientInfo?.currentWeightKg || 0);
    const baselineWaistVal = effectiveIntake?.baselineMeasurements?.waistCm ?? (clientInfo as any)?.waistCm ?? (clientInfo as any)?.baselineMeasurements?.waistCm;
    const baselineChestVal = effectiveIntake?.baselineMeasurements?.chestCm ?? (clientInfo as any)?.chestCm ?? (clientInfo as any)?.baselineMeasurements?.chestCm;
    const baselineBicepsVal = effectiveIntake?.baselineMeasurements?.bicepsCm ?? (clientInfo as any)?.bicepsCm ?? (clientInfo as any)?.baselineMeasurements?.bicepsCm;

    if (baselineWeight > 0) {
      const intakeDate = effectiveIntake?.submittedAt 
        ? (typeof effectiveIntake.submittedAt === 'string' ? effectiveIntake.submittedAt.split('T')[0] : 'Baseline') 
        : (clientInfo?.joinedDate || 'Baseline');
      list.push({
        id: 'metric_intake_baseline',
        clientId: targetClientId,
        date: intakeDate,
        weightKg: baselineWeight,
        waistCm: baselineWaistVal ? Number(baselineWaistVal) : undefined,
        chestCm: baselineChestVal ? Number(baselineChestVal) : undefined,
        bicepsCm: baselineBicepsVal ? Number(baselineBicepsVal) : undefined,
        notes: 'Baseline recorded from Onboarding Intake',
        weekLabel: 'Onboarding',
        isBaseline: true,
        weekNumber: 0
      });
    }

    // 2. Add points exclusively from weekly check-ins submitted by the client
    const clientCheckIns = (checkIns || []).filter(c => 
      c.clientId === targetClientId || 
      (targetClientId && c.clientId && c.clientId.toLowerCase() === targetClientId.toLowerCase()) ||
      (clientInfo?.email && c.clientEmail && c.clientEmail.toLowerCase() === clientInfo.email.toLowerCase()) ||
      (clientInfo?.name && c.clientName && c.clientName.toLowerCase() === clientInfo.name.toLowerCase())
    );

    // Sort check-ins by week number or date
    const sortedCheckIns = [...clientCheckIns].sort((a, b) => {
      if (a.weekNumber && b.weekNumber && a.weekNumber !== b.weekNumber) {
        return a.weekNumber - b.weekNumber;
      }
      return new Date(a.submissionDate || '').getTime() - new Date(b.submissionDate || '').getTime();
    });

    // Ensure 1 point per weekNumber without duplicate in-between submissions
    const seenWeeks = new Set<number>();
    sortedCheckIns.forEach(c => {
      const weekNum = c.weekNumber || (seenWeeks.size + 1);
      if (seenWeeks.has(weekNum)) return;
      seenWeeks.add(weekNum);

      const d = c.submissionDate || new Date().toISOString().split('T')[0];
      list.push({
        id: `chk_metric_${c.id || weekNum}`,
        clientId: targetClientId,
        date: d,
        weightKg: Number(c.weightKg),
        waistCm: c.waistMeasurementCm ? Number(c.waistMeasurementCm) : undefined,
        volumeLoadKg: (c as any).volumeLoadKg,
        notes: `Week ${weekNum} Check-In Log${c.winsAndStruggles ? `: ${c.winsAndStruggles}` : ''}`,
        weekLabel: `Week ${weekNum}`,
        isBaseline: false,
        weekNumber: weekNum
      });
    });

    // 3. Fallback for demo mock user client_alex only if no intake or checkins exist
    if (list.length === 0 && targetClientId === 'client_alex') {
      const logged = (progressMetrics || []).filter(m => m.clientId === 'client_alex');
      logged.forEach(m => list.push(m));
    }

    return list;
  }, [effectiveIntake, targetClientId, checkIns, progressMetrics, clientInfo]);

  // Synthesize dynamic client photos from:
  // 1. Onboarding intake photos
  // 2. Weekly check-in photos
  // 3. Direct progress photo uploads
  const clientPhotos = React.useMemo(() => {
    const map = new Map<string, ProgressPhotoRecord>();

    if (effectiveIntake?.startingPhotos?.front) {
      const pDate = effectiveIntake.submittedAt ? effectiveIntake.submittedAt.split('T')[0] : 'Baseline';
      map.set('intake_photo', {
        id: 'photo_intake_baseline',
        clientId: targetClientId,
        date: pDate,
        frontUrl: effectiveIntake.startingPhotos.front,
        sideUrl: effectiveIntake.startingPhotos.side,
        backUrl: effectiveIntake.startingPhotos.back,
        weightKg: Number(effectiveIntake.currentWeightKg) || 0,
        notes: 'Initial Onboarding Intake Photo'
      });
    }

    const clientCheckIns = (checkIns || []).filter(c => c.clientId === targetClientId);
    clientCheckIns.forEach(c => {
      if (c.progressPhotos?.front) {
        map.set(`checkin_photo_${c.id}`, {
          id: `photo_chk_${c.id}`,
          clientId: targetClientId,
          date: c.submissionDate || 'Recent',
          frontUrl: c.progressPhotos.front,
          sideUrl: c.progressPhotos.side,
          backUrl: c.progressPhotos.back,
          weightKg: Number(c.weightKg),
          notes: `Week ${c.weekNumber} Physique Photo`
        });
      }
    });

    const directPhotos = (progressPhotos || []).filter(p => p.clientId === targetClientId);
    directPhotos.forEach(p => {
      map.set(p.id || p.frontUrl, p);
    });

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [effectiveIntake, targetClientId, checkIns, progressPhotos]);

  // Active chart metric toggle
  const [activeChartMetric, setActiveChartMetric] = useState<'weight' | 'waist' | 'volume'>('weight');

  // New Metric Modal / Form State
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWaist, setNewWaist] = useState('');
  const [newChest, setNewChest] = useState('');
  const [newBiceps, setNewBiceps] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // New Photo Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFrontFile, setPhotoFrontFile] = useState<File | null>(null);
  const [photoSideFile, setPhotoSideFile] = useState<File | null>(null);
  const [photoFrontUrl, setPhotoFrontUrl] = useState('');
  const [photoSideUrl, setPhotoSideUrl] = useState('');
  const [useManualUrlOption, setUseManualUrlOption] = useState(false);
  const [photoWeight, setPhotoWeight] = useState('');
  const [photoWeekNumber, setPhotoWeekNumber] = useState<number>(1);
  const [linkCheckInDoc, setLinkCheckInDoc] = useState(true);
  const [photoNotes, setPhotoNotes] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Before / After Comparison state
  const firstPhoto = clientPhotos[0];
  const latestPhoto = clientPhotos[clientPhotos.length - 1];
  const [selectedBeforePhoto, setSelectedBeforePhoto] = useState<ProgressPhotoRecord | undefined>(firstPhoto);
  const [selectedAfterPhoto, setSelectedAfterPhoto] = useState<ProgressPhotoRecord | undefined>(latestPhoto);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  // Synchronize before/after photos when photo list changes
  React.useEffect(() => {
    if (clientPhotos.length > 0) {
      setSelectedBeforePhoto(clientPhotos[0]);
      setSelectedAfterPhoto(clientPhotos[clientPhotos.length - 1]);
    } else {
      setSelectedBeforePhoto(undefined);
      setSelectedAfterPhoto(undefined);
    }
  }, [clientPhotos.length]);

  // Latest stats dynamically pulled from real client data (strictly onboarding baseline + weekly check-ins)
  const hasCheckIns = clientMetrics.some(m => !m.isBaseline);
  const baselineMetric = clientMetrics.find(m => m.isBaseline) || clientMetrics[0];
  const latestMetric = clientMetrics[clientMetrics.length - 1];

  const startingWeight = Number(effectiveIntake?.currentWeightKg || baselineMetric?.weightKg || clientInfo?.startingWeightKg || clientInfo?.currentWeightKg || 0);
  const currentWeight = Number(latestMetric?.weightKg || clientInfo?.currentWeightKg || startingWeight);
  const targetWeight = Number(effectiveIntake?.targetWeightKg || clientInfo?.targetWeightKg || 0);
  const weightChange = startingWeight > 0 ? Number((currentWeight - startingWeight).toFixed(1)) : 0;
  const weightRemaining = targetWeight > 0 ? Math.abs(currentWeight - targetWeight).toFixed(1) : '0.0';

  // Real waist metrics
  const metricsWithWaist = clientMetrics.filter(m => typeof m.waistCm === 'number' && (m.waistCm as number) > 0);
  const latestWaistMetric = metricsWithWaist[metricsWithWaist.length - 1];
  const initialWaistMetric = metricsWithWaist[0];
  const baselineWaist = Number(effectiveIntake?.baselineMeasurements?.waistCm || initialWaistMetric?.waistCm || (clientInfo as any)?.waistCm || (clientInfo as any)?.baselineMeasurements?.waistCm || 0);
  const currentWaist = Number(latestWaistMetric?.waistCm || (baselineWaist > 0 ? baselineWaist : 0));
  const startingWaist = Number(baselineWaist > 0 ? baselineWaist : (initialWaistMetric?.waistCm || 0));
  const waistDiff = startingWaist > 0 && currentWaist > 0 && startingWaist !== currentWaist
    ? Number((currentWaist - startingWaist).toFixed(1))
    : null;

  // Real session volume metrics
  const metricsWithVolume = clientMetrics.filter(m => typeof m.volumeLoadKg === 'number' && (m.volumeLoadKg as number) > 0);
  const latestVolumeMetric = metricsWithVolume[metricsWithVolume.length - 1];
  const currentVolume = Number(latestVolumeMetric?.volumeLoadKg || 0);
  const previousVolumeMetric = metricsWithVolume.length > 1 ? metricsWithVolume[metricsWithVolume.length - 2] : null;
  const previousVolume = Number(previousVolumeMetric?.volumeLoadKg || 0);
  const volumeOverloadPct = previousVolume > 0 && currentVolume > 0
    ? Number((((currentVolume - previousVolume) / previousVolume) * 100).toFixed(1))
    : null;

  // Submit new metric
  const handleLogMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    const w = parseFloat(newWeight);
    const wst = newWaist ? parseFloat(newWaist) : undefined;
    const ch = newChest ? parseFloat(newChest) : undefined;
    const bi = newBiceps ? parseFloat(newBiceps) : undefined;

    // Use submitWeeklyCheckIn to keep progress strictly tied to weekly check-in milestones
    if (submitWeeklyCheckIn) {
      submitWeeklyCheckIn({
        clientId: targetClientId,
        clientName: clientDisplayName,
        clientEmail: clientInfo?.email || undefined,
        weekNumber: (checkIns?.length || 0) + 1,
        weightKg: w,
        waistMeasurementCm: wst,
        adherenceRating: 9,
        energyRating: 8,
        sleepHours: 8,
        stressRating: 4,
        hungerRating: 5,
        winsAndStruggles: newNotes || 'Direct entry from Progress Dashboard'
      });
    } else {
      logProgressMetric({
        clientId: targetClientId,
        date: new Date().toISOString().split('T')[0],
        weightKg: w,
        waistCm: wst,
        chestCm: ch,
        bicepsCm: bi,
        notes: newNotes || 'Direct entry from Progress Dashboard'
      });
    }

    setNewWeight('');
    setNewWaist('');
    setNewChest('');
    setNewBiceps('');
    setNewNotes('');
    setShowLogModal(false);
  };

  // Submit new photo with compression & direct Firebase Storage upload
  const handleLogPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFrontFile && !photoFrontUrl) {
      setUploadError('Please select a front check-in photo to upload.');
      return;
    }

    setUploadError(null);
    setIsUploadingPhoto(true);
    setUploadProgress(15);

    try {
      const activeUserId = targetClientId || user?.uid || 'client_athlete';
      const weightNum = photoWeight ? parseFloat(photoWeight) : currentWeight;

      // Execute direct file upload to Firebase Storage and persistence to Firestore
      const res = await uploadAndSaveCheckInPhotos({
        userId: activeUserId,
        clientName: clientDisplayName,
        clientEmail: clientInfo?.email || user?.email || undefined,
        weekNumber: photoWeekNumber || ((checkIns?.length || 0) + 1),
        weightKg: weightNum,
        waistCm: currentWaist > 0 ? currentWaist : undefined,
        notes: photoNotes || `Week ${photoWeekNumber || ((checkIns?.length || 0) + 1)} Physique Photo`,
        frontFile: photoFrontFile,
        sideFile: photoSideFile,
        existingFrontUrl: photoFrontUrl || undefined,
        existingSideUrl: photoSideUrl || undefined,
        onProgress: (p) => {
          setUploadProgress(Math.min(95, p.overall));
        }
      });

      setUploadProgress(100);

      // Register into React context state so UI immediately updates in real time
      if (res.frontUrl) {
        addProgressPhoto({
          clientId: activeUserId,
          date: new Date().toISOString().split('T')[0],
          frontUrl: res.frontUrl,
          sideUrl: res.sideUrl || undefined,
          weightKg: weightNum,
          notes: photoNotes || `Week ${photoWeekNumber || ((checkIns?.length || 0) + 1)} Physique Photo`
        });

        if (linkCheckInDoc && submitWeeklyCheckIn) {
          submitWeeklyCheckIn({
            clientId: activeUserId,
            clientName: clientDisplayName,
            clientEmail: clientInfo?.email || user?.email || undefined,
            weekNumber: photoWeekNumber || ((checkIns?.length || 0) + 1),
            weightKg: weightNum,
            adherenceRating: 9,
            energyRating: 8,
            sleepHours: 8,
            stressRating: 4,
            hungerRating: 5,
            waistMeasurementCm: currentWaist > 0 ? currentWaist : undefined,
            progressPhotos: {
              front: res.frontUrl,
              side: res.sideUrl || undefined
            },
            winsAndStruggles: photoNotes || `Check-in photos uploaded for Week ${photoWeekNumber || ((checkIns?.length || 0) + 1)}`
          });
        }
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setPhotoFrontFile(null);
        setPhotoSideFile(null);
        setPhotoFrontUrl('');
        setPhotoSideUrl('');
        setPhotoNotes('');
        setPhotoWeight('');
        setShowPhotoModal(false);
        setUploadSuccess(false);
      }, 700);
    } catch (err: any) {
      console.error('[ProgressAnalyticsView] Photo upload failed:', err);
      setUploadError(err.message || 'Failed to upload photo to Firebase Storage. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(null);
    }
  };

  // Interactive SVG chart calculations - dynamic without dummy fallbacks
  const chartPoints = clientMetrics
    .map((m, idx) => {
      let val: number | undefined;
      if (activeChartMetric === 'weight') {
        val = m.weightKg;
      } else if (activeChartMetric === 'waist') {
        val = m.waistCm;
      } else if (activeChartMetric === 'volume') {
        val = m.volumeLoadKg;
      }
      return {
        index: idx,
        date: m.date,
        value: val,
        metric: m
      };
    })
    .filter((p): p is { index: number; date: string; value: number; metric: ProgressMetricPoint } => 
      p.value !== undefined && p.value !== null && !isNaN(p.value) && p.value > 0
    );

  const values = chartPoints.map(p => p.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const range = maxVal - minVal || 1;
  const padding = range * 0.2;
  const yMin = Math.max(0, minVal - padding);
  const yMax = maxVal + padding;

  // Chart SVG bounds
  const svgWidth = 700;
  const svgHeight = 220;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const getX = (idx: number) => {
    if (chartPoints.length <= 1) return margin.left + innerWidth / 2;
    return margin.left + (idx / (chartPoints.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - yMin) / (yMax - yMin);
    return margin.top + innerHeight - ratio * innerHeight;
  };

  // Line path
  const linePath = chartPoints.reduce((acc, p, idx) => {
    const x = getX(idx);
    const y = getY(p.value);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Area path for gradient fill
  const areaPath = chartPoints.length > 0 
    ? `${linePath} L ${getX(chartPoints.length - 1)} ${margin.top + innerHeight} L ${getX(0)} ${margin.top + innerHeight} Z`
    : '';

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50 border border-neutral-200 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              Progress & Physique Analytics
            </h2>
            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded-md tracking-wider">
              {clientDisplayName}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Biometric trends, progressive overload curves, and side-by-side physique transformations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="log-metric-btn"
            onClick={() => setShowLogModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-bold border border-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Scale className="w-4 h-4 text-red-600" />
            <span>Log Biometrics</span>
          </button>
          <button
            id="upload-photo-btn"
            onClick={() => setShowPhotoModal(true)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center gap-1.5 border border-red-500/40 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Weight */}
        <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold">Current Scale Weight</span>
            <Scale className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900">{currentWeight > 0 ? currentWeight : '—'}</span>
            {currentWeight > 0 && <span className="text-xs text-neutral-500 font-bold">kg</span>}
          </div>
          <div className="mt-2 text-xs">
            {hasCheckIns && currentWeight > 0 && startingWeight > 0 && currentWeight !== startingWeight ? (
              <div className={`flex items-center gap-1 font-bold ${weightChange < 0 ? 'text-emerald-600' : 'text-neutral-700'}`}>
                {weightChange < 0 ? <TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingUp className="w-3.5 h-3.5 text-neutral-600" />}
                <span>{weightChange < 0 ? `${Math.abs(weightChange)} kg reduction` : `+${weightChange} kg from start`}</span>
              </div>
            ) : currentWeight > 0 ? (
              <span className="text-neutral-500 font-medium">Baseline from Onboarding Intake</span>
            ) : (
              <span className="text-neutral-400 font-medium">No weight logged yet</span>
            )}
          </div>
        </div>

        {/* Goal Target */}
        <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold">Target Body Weight</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900">{targetWeight > 0 ? targetWeight : '—'}</span>
            {targetWeight > 0 && <span className="text-xs text-neutral-500 font-bold">kg</span>}
          </div>
          <div className="mt-2 text-xs font-medium text-neutral-500">
            {targetWeight > 0 && currentWeight > 0 ? (
              <span>{weightRemaining} kg remaining to goal</span>
            ) : targetWeight > 0 ? (
              <span>Goal set in intake</span>
            ) : (
              <span className="text-neutral-400">Pending goal setup</span>
            )}
          </div>
        </div>

        {/* Waist Measurement */}
        <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold">Waist Circumference</span>
            <Ruler className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900">{currentWaist > 0 ? currentWaist : '—'}</span>
            {currentWaist > 0 && <span className="text-xs text-neutral-500 font-bold">cm</span>}
          </div>
          <div className="mt-2 text-xs">
            {hasCheckIns && currentWaist > 0 && waistDiff !== null && waistDiff !== 0 ? (
              <div className={`flex items-center gap-1 font-bold ${waistDiff < 0 ? 'text-emerald-600' : 'text-neutral-700'}`}>
                {waistDiff < 0 ? <TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingUp className="w-3.5 h-3.5 text-neutral-600" />}
                <span>{waistDiff < 0 ? `${Math.abs(waistDiff)} cm fat loss reduction` : `+${waistDiff} cm from baseline`}</span>
              </div>
            ) : currentWaist > 0 ? (
              <span className="text-neutral-500 font-medium">Baseline from Onboarding Intake</span>
            ) : (
              <span className="text-neutral-400 font-medium">No waist logged yet</span>
            )}
          </div>
        </div>

        {/* Training Volume */}
        <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold">Total Session Volume</span>
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900">
              {currentVolume > 0
                ? (currentVolume >= 1000 ? `${(currentVolume / 1000).toFixed(1)}k` : currentVolume)
                : '—'}
            </span>
            {currentVolume > 0 && <span className="text-xs text-neutral-500 font-bold">kg lifted</span>}
          </div>
          <div className="mt-2 text-xs">
            {currentVolume > 0 && volumeOverloadPct !== null ? (
              <div className={`flex items-center gap-1 font-bold ${volumeOverloadPct >= 0 ? 'text-emerald-600' : 'text-neutral-600'}`}>
                {volumeOverloadPct >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-neutral-600" />}
                <span>{volumeOverloadPct >= 0 ? `+${volumeOverloadPct}% progressive overload` : `${volumeOverloadPct}% volume change`}</span>
              </div>
            ) : currentVolume > 0 ? (
              <span className="text-neutral-500 font-medium">Latest workout session</span>
            ) : (
              <span className="text-neutral-400 font-medium">No session volume logged yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Trend Chart */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Bio-Metric Progression Trend
            </h3>
            <p className="text-xs text-neutral-500">
              Visualizing consistency across weekly check-in measurements and training blocks
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartMetric('weight')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeChartMetric === 'weight'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Weight (kg)
            </button>
            <button
              onClick={() => setActiveChartMetric('waist')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeChartMetric === 'waist'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Waist (cm)
            </button>
            <button
              onClick={() => setActiveChartMetric('volume')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeChartMetric === 'volume'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Volume Load (kg)
            </button>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-56 min-w-[500px]"
          >
            <defs>
              <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const y = margin.top + innerHeight * r;
              const gridVal = (yMax - r * (yMax - yMin)).toFixed(1);
              return (
                <g key={i}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={svgWidth - margin.right}
                    y2={y}
                    stroke="#e5e5e5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={margin.left - 8}
                    y={y + 4}
                    fill="#737373"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="sans-serif"
                  >
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Goal line for Weight */}
            {activeChartMetric === 'weight' && (
              <g>
                <line
                  x1={margin.left}
                  y1={getY(targetWeight)}
                  x2={svgWidth - margin.right}
                  y2={getY(targetWeight)}
                  stroke="#059669"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
                <text
                  x={svgWidth - margin.right}
                  y={getY(targetWeight) - 6}
                  fill="#059669"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  Target Goal: {targetWeight} kg
                </text>
              </g>
            )}

            {/* Gradient Area */}
            {areaPath && (
              <path d={areaPath} fill="url(#metricGradient)" />
            )}

            {/* Main Trend Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Point Circles and Labels */}
            {chartPoints.map((p, idx) => {
              const cx = getX(idx);
              const cy = getY(p.value);
              const isBase = (p.metric as any).isBaseline;
              const weekLabel = (p.metric as any).weekLabel || (isBase ? 'Onboarding' : `Week ${idx}`);
              return (
                <g key={p.metric.id} className="group cursor-pointer">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isBase ? "6" : "5"}
                    fill="#ffffff"
                    stroke={isBase ? "#dc2626" : "#ef4444"}
                    strokeWidth="2.5"
                    className="group-hover:r-7 transition-all"
                  />
                  {/* Tooltip value */}
                  <text
                    x={cx}
                    y={cy - 12}
                    fill="#171717"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {p.value} {activeChartMetric === 'weight' ? 'kg' : activeChartMetric === 'waist' ? 'cm' : 'kg'}
                  </text>
                  {/* Milestone label at bottom */}
                  <text
                    x={cx}
                    y={svgHeight - 16}
                    fill="#171717"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {weekLabel}
                  </text>
                  <text
                    x={cx}
                    y={svgHeight - 4}
                    fill="#737373"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {p.date.length > 5 ? p.date.slice(5) : p.date}
                  </text>
                </g>
              );
            })}
            {chartPoints.length === 1 && (
              <text
                x={svgWidth / 2}
                y={margin.top + 20}
                fill="#dc2626"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                Baseline recorded from onboarding • Submit Week 1 check-in to chart your next progression milestone
              </text>
            )}
            {chartPoints.length === 0 && (
              <text
                x={svgWidth / 2}
                y={svgHeight / 2}
                fill="#737373"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                No tracking data logged yet. Complete athlete onboarding or submit a weekly check-in.
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* Physique Progress Photo Comparison */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-red-600" />
              <span>Physique Transformation Comparison</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Side-by-side visual accountability to evaluate muscle density and midsection definition
            </p>
          </div>

          <button
            onClick={() => setShowPhotoModal(true)}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Photos</span>
          </button>
        </div>

        {clientPhotos.length >= 2 ? (
          <div className="space-y-4">
            {/* Multi-Photo Comparison Selector Toolbar */}
            {clientPhotos.length > 2 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold uppercase text-neutral-500 text-[10px]">Before:</span>
                    <select
                      value={selectedBeforePhoto?.id || ''}
                      onChange={(e) => {
                        const found = clientPhotos.find(p => p.id === e.target.value);
                        if (found) setSelectedBeforePhoto(found);
                      }}
                      className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-800 focus:border-red-600 focus:outline-none cursor-pointer"
                    >
                      {clientPhotos.map((p, idx) => (
                        <option key={`before_${p.id || idx}`} value={p.id}>
                          {p.date} &bull; {p.weightKg}kg {idx === 0 ? '(Baseline)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold uppercase text-red-600 text-[10px]">After:</span>
                    <select
                      value={selectedAfterPhoto?.id || ''}
                      onChange={(e) => {
                        const found = clientPhotos.find(p => p.id === e.target.value);
                        if (found) setSelectedAfterPhoto(found);
                      }}
                      className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-800 focus:border-red-600 focus:outline-none cursor-pointer"
                    >
                      {clientPhotos.map((p, idx) => (
                        <option key={`after_${p.id || idx}`} value={p.id}>
                          {p.date} &bull; {p.weightKg}kg {idx === clientPhotos.length - 1 ? '(Latest)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBeforePhoto(clientPhotos[0]);
                    setSelectedAfterPhoto(clientPhotos[clientPhotos.length - 1]);
                  }}
                  className="text-[11px] font-bold text-neutral-500 hover:text-red-600 underline cursor-pointer"
                >
                  Reset to Baseline vs Latest
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Photo Card */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 bg-white px-2.5 py-1 rounded-md border border-neutral-200 shadow-xs">
                    Before &bull; {selectedBeforePhoto?.id === clientPhotos[0]?.id ? 'Baseline' : selectedBeforePhoto?.date}
                  </span>
                  <span className="text-xs font-bold text-neutral-700 font-mono">
                    {selectedBeforePhoto?.date} &bull; {selectedBeforePhoto?.weightKg} kg
                  </span>
                </div>
                <div 
                  onClick={() => selectedBeforePhoto && setEnlargedPhoto(selectedBeforePhoto.frontUrl)}
                  className="relative aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 group cursor-pointer"
                >
                  <img
                    src={selectedBeforePhoto?.frontUrl}
                    alt="Baseline physique"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-2.5 italic">
                  "{selectedBeforePhoto?.notes || 'Initial physique intake'}"
                </p>
              </div>

              {/* Current / Latest Photo Card */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 shadow-xs">
                    After &bull; {selectedAfterPhoto?.id === clientPhotos[clientPhotos.length - 1]?.id ? 'Latest Check-in' : selectedAfterPhoto?.date}
                  </span>
                  <span className="text-xs font-bold text-neutral-700 font-mono">
                    {selectedAfterPhoto?.date} &bull; {selectedAfterPhoto?.weightKg} kg
                  </span>
                </div>
                <div 
                  onClick={() => selectedAfterPhoto && setEnlargedPhoto(selectedAfterPhoto.frontUrl)}
                  className="relative aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 group cursor-pointer"
                >
                  <img
                    src={selectedAfterPhoto?.frontUrl}
                    alt="Current physique"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-2.5 italic">
                  "{selectedAfterPhoto?.notes || 'Latest check-in physique'}"
                </p>
              </div>
            </div>
          </div>
        ) : clientPhotos.length === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Baseline Single Photo Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 bg-white px-2.5 py-1 rounded-md border border-neutral-200 shadow-xs">
                  Baseline (Day 1)
                </span>
                <span className="text-xs font-bold text-neutral-700 font-mono">
                  {clientPhotos[0].date} &bull; {clientPhotos[0].weightKg} kg
                </span>
              </div>
              <div 
                onClick={() => setEnlargedPhoto(clientPhotos[0].frontUrl)}
                className="relative aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 group cursor-pointer"
              >
                <img
                  src={clientPhotos[0].frontUrl}
                  alt="Baseline physique"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2.5 italic">
                "{clientPhotos[0].notes || 'Initial baseline photo'}"
              </p>
            </div>

            {/* Prompt to upload next check-in */}
            <div className="p-8 text-center bg-gradient-to-br from-neutral-50 to-red-50/30 rounded-xl border border-dashed border-red-300 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900 uppercase font-display">
                Upload Your Check-In Photos
              </h4>
              <p className="text-xs text-neutral-600 max-w-sm mx-auto mt-1.5 mb-5 leading-relaxed">
                You've got your baseline locked! Upload your weekly check-in photo to unlock the side-by-side transformation slider and visual accountability audit.
              </p>
              <button
                onClick={() => {
                  setPhotoWeight(currentWeight > 0 ? currentWeight.toString() : '');
                  setPhotoWeekNumber((checkIns?.length || 0) + 1);
                  setUploadError(null);
                  setUploadSuccess(false);
                  setShowPhotoModal(true);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-red-200 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Check-In Photo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
            <Camera className="w-10 h-10 mx-auto mb-2 text-neutral-400" />
            <h4 className="text-sm font-bold text-neutral-900">Upload Your Check-In Photos</h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
              Regular photos ensure your coach can audit muscle retention and make precise macro adjustments.
            </p>
            <button
              onClick={() => {
                setPhotoWeight(currentWeight > 0 ? currentWeight.toString() : '');
                setPhotoWeekNumber((checkIns?.length || 0) + 1);
                setUploadError(null);
                setUploadSuccess(false);
                setShowPhotoModal(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
            >
              Upload First Photo
            </button>
          </div>
        )}

        {/* Photo Gallery Strip */}
        {clientPhotos.length > 0 && (
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <h4 className="text-xs font-bold text-neutral-500 uppercase mb-3 tracking-wider">
              All Photo Check-In Logs ({clientPhotos.length})
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {clientPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setEnlargedPhoto(photo.frontUrl)}
                  className="shrink-0 w-28 bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 cursor-pointer hover:border-red-500 transition-colors shadow-xs"
                >
                  <img
                    src={photo.frontUrl}
                    alt={`Photo ${photo.date}`}
                    className="w-full h-32 object-cover rounded"
                  />
                  <div className="text-[10px] text-center font-bold text-neutral-700 mt-1">
                    {photo.date}
                  </div>
                  <div className="text-[9px] text-center text-red-600 font-semibold">
                    {photo.weightKg} kg
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Log Biometrics */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-neutral-900">Log Biometric Entry</h3>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogMetric} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Body Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 81.2"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Waist Circumference (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 83.5"
                    value={newWaist}
                    onChange={(e) => setNewWaist(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Chest / Pecs (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 104.5"
                    value={newChest}
                    onChange={(e) => setNewChest(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Biceps / Arm Flexed (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 38.5"
                  value={newBiceps}
                  onChange={(e) => setNewBiceps(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Notes & Context (e.g. water retention, morning weigh-in)
                </label>
                <textarea
                  rows={2}
                  placeholder="Fasted weigh-in after morning hydration..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-200 transition-all cursor-pointer"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Check-In Photos with Direct File Upload & Preview */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between mb-5 border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 uppercase font-display">Upload Your Check-In Photos</h3>
                  <p className="text-[11px] text-neutral-500">Directly upload high-resolution images stored in Firebase Storage</p>
                </div>
              </div>
              <button 
                onClick={() => !isUploadingPhoto && setShowPhotoModal(false)} 
                disabled={isUploadingPhoto}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-neutral-900">Check-In Photos Saved!</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Your photos have been compressed, uploaded to Firebase Storage, and recorded in Firestore.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLogPhoto} className="space-y-4">
                {uploadError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Direct File Upload Previews */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Pose File Upload */}
                  <PhotoUploadPreview
                    id="checkin-front-file"
                    label="Front Pose Photo"
                    subLabel="Vertical angle with even lighting"
                    required={!photoFrontUrl}
                    selectedFile={photoFrontFile}
                    onFileSelect={(f) => {
                      setPhotoFrontFile(f);
                      setUploadError(null);
                    }}
                    initialPreviewUrl={photoFrontUrl}
                    isUploading={isUploadingPhoto}
                    uploadProgress={uploadProgress}
                  />

                  {/* Side or Back Pose File Upload */}
                  <PhotoUploadPreview
                    id="checkin-side-file"
                    label="Side / Back Pose (Optional)"
                    subLabel="Profile angle for spinal & waist check"
                    selectedFile={photoSideFile}
                    onFileSelect={(f) => setPhotoSideFile(f)}
                    initialPreviewUrl={photoSideUrl}
                    isUploading={isUploadingPhoto}
                    uploadProgress={uploadProgress}
                  />
                </div>

                {/* Optional manual URL toggle for edge-case flexibility */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setUseManualUrlOption(!useManualUrlOption)}
                    className="text-[11px] font-bold text-neutral-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{useManualUrlOption ? 'Hide manual URL fields' : 'Or paste image URL instead'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${useManualUrlOption ? 'rotate-180' : ''}`} />
                  </button>

                  {useManualUrlOption && (
                    <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                          Front Photo URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={photoFrontUrl}
                          onChange={(e) => setPhotoFrontUrl(e.target.value)}
                          className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:border-red-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                          Side Photo URL (Optional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={photoSideUrl}
                          onChange={(e) => setPhotoSideUrl(e.target.value)}
                          className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:border-red-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Weight & Week Number Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Weight at Photo (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder={currentWeight > 0 ? currentWeight.toString() : '80.0'}
                      value={photoWeight}
                      onChange={(e) => setPhotoWeight(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Check-In Week #
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={photoWeekNumber}
                      onChange={(e) => setPhotoWeekNumber(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400 font-mono"
                    />
                  </div>
                </div>

                {/* Notes on Lighting / Condition */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Physique Context / Coach Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Morning fasted, natural daylight, unpumped..."
                    value={photoNotes}
                    onChange={(e) => setPhotoNotes(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-red-600 focus:outline-none placeholder:text-neutral-400"
                  />
                </div>

                {/* Checkbox: Save to Weekly Check-Ins */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="link-checkin-checkbox"
                    type="checkbox"
                    checked={linkCheckInDoc}
                    onChange={(e) => setLinkCheckInDoc(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 border-neutral-300 focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="link-checkin-checkbox" className="text-xs text-neutral-600 font-medium cursor-pointer">
                    Link into Weekly Check-In timeline for Coach audit
                  </label>
                </div>

                {/* Client-Side Optimization Info */}
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    <span>Auto-optimized before Firebase Storage upload</span>
                  </span>
                  <span className="font-mono text-neutral-400">JPEG &bull; 1600px Max</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => setShowPhotoModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingPhoto || (!photoFrontFile && !photoFrontUrl)}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-red-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading ({uploadProgress || 15}%)...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Save & Upload Photos</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Enlarged Photo Lightbox */}
      {enlargedPhoto && (
        <div 
          onClick={() => setEnlargedPhoto(null)}
          className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img
              src={enlargedPhoto}
              alt="Enlarged physique"
              className="w-full h-full object-contain rounded-xl border border-neutral-200 shadow-2xl"
            />
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-neutral-900/70 text-white rounded-full hover:bg-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
