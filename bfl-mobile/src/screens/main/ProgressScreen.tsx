import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToProgressMetrics,
  subscribeToProgressPhotos,
  subscribeToClientCheckIns,
  subscribeToClientIntake,
  addProgressMetric,
  addProgressPhoto,
  updateUserProfile,
} from '../../services/firestoreService';
import { uploadProgressPhoto } from '../../services/storageService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { StatCard } from '../../components/StatCard';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ProgressMetricPoint, ProgressPhotoRecord, WeeklyCheckIn, IntakeFormData } from '../../types';

export const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const [directMetrics, setDirectMetrics] = useState<ProgressMetricPoint[]>([]);
  const [checkIns, setCheckIns] = useState<WeeklyCheckIn[]>([]);
  const [directPhotos, setDirectPhotos] = useState<ProgressPhotoRecord[]>([]);
  const [intake, setIntake] = useState<IntakeFormData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Log metric modal state
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputWaist, setInputWaist] = useState('');
  const [inputChest, setInputChest] = useState('');
  const [submittingMetric, setSubmittingMetric] = useState(false);

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Real-time synchronization across all progress streams: intakes, checkins, metrics, and photos
  useEffect(() => {
    if (!user?.uid) return;

    const unsubMetrics = subscribeToProgressMetrics(user.uid, (data) => {
      setDirectMetrics(data);
    });

    const unsubCheckIns = subscribeToClientCheckIns(user.uid, (data) => {
      setCheckIns(data);
    });

    const unsubPhotos = subscribeToProgressPhotos(user.uid, (data) => {
      setDirectPhotos(data);
    });

    const unsubIntake = subscribeToClientIntake(user.uid, (data) => {
      setIntake(data);
    });

    return () => {
      unsubMetrics();
      unsubCheckIns();
      unsubPhotos();
      unsubIntake();
    };
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /**
   * Synthesize client metrics 1:1 with Web's ProgressAnalyticsView:
   * 1. Onboarding intake baseline (Week 0)
   * 2. Weekly check-in submissions (Week 1, Week 2...)
   * 3. Direct metric logs
   */
  const metrics = useMemo(() => {
    const list: (ProgressMetricPoint & { label?: string; isBaseline?: boolean })[] = [];

    // 1. Add baseline from onboarding intake or user profile
    const baselineWeight = Number(intake?.currentWeightKg || (user as any)?.startingWeightKg || 0);
    const baselineWaist = intake?.baselineMeasurements?.waistCm || (user as any)?.baselineMeasurements?.waistCm;
    const baselineChest = intake?.baselineMeasurements?.chestCm || (user as any)?.baselineMeasurements?.chestCm;
    if (baselineWeight > 0) {
      list.push({
        id: 'metric_baseline',
        clientId: user?.uid || '',
        date: intake?.submittedAt ? String(intake.submittedAt).split('T')[0] : ((user as any)?.createdAt ? String((user as any).createdAt).split('T')[0] : 'Baseline'),
        weightKg: baselineWeight,
        waistCm: baselineWaist ? Number(baselineWaist) : undefined,
        chestCm: baselineChest ? Number(baselineChest) : undefined,
        notes: 'Baseline Onboarding Intake',
        label: 'Onboarding Baseline',
        isBaseline: true,
      });
    }

    // 2. Add points from weekly check-ins
    const sortedCheckIns = [...checkIns].sort((a, b) => {
      if (a.weekNumber && b.weekNumber && a.weekNumber !== b.weekNumber) {
        return a.weekNumber - b.weekNumber;
      }
      return new Date(a.submissionDate || '').getTime() - new Date(b.submissionDate || '').getTime();
    });

    sortedCheckIns.forEach((c) => {
      const d = c.submissionDate || new Date().toISOString().split('T')[0];
      list.push({
        id: c.id || `chk_${c.weekNumber}`,
        clientId: user?.uid || '',
        date: d,
        weightKg: Number(c.weightKg),
        waistCm: c.waistMeasurementCm ? Number(c.waistMeasurementCm) : undefined,
        notes: `Week ${c.weekNumber} Check-In${c.winsAndStruggles ? `: ${c.winsAndStruggles}` : ''}`,
        label: `Week ${c.weekNumber} Check-In`,
        isBaseline: false,
      });
    });

    // 3. Add direct logged metrics
    directMetrics.forEach((m) => {
      if (!list.some((existing) => existing.date === m.date)) {
        list.push({
          ...m,
          label: 'Daily Log',
          isBaseline: false,
        });
      }
    });

    // Chronological sort
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [intake, user, checkIns, directMetrics]);

  /**
   * Synthesize photos from Intake Starting Photos + Check-In Photos + Direct Gallery
   */
  const photos = useMemo(() => {
    const photoMap = new Map<string, ProgressPhotoRecord & { title?: string }>();

    // 1. Intake starting photos
    if (intake?.startingPhotos?.front) {
      photoMap.set('intake_photo', {
        id: 'photo_intake',
        clientId: user?.uid || '',
        date: intake.submittedAt ? String(intake.submittedAt).split('T')[0] : 'Baseline',
        frontUrl: intake.startingPhotos.front,
        sideUrl: intake.startingPhotos.side,
        backUrl: intake.startingPhotos.back,
        weightKg: Number(intake.currentWeightKg) || 0,
        title: 'Intake Baseline',
      });
    }

    // 2. Check-in photos
    checkIns.forEach((c) => {
      if (c.progressPhotos?.front) {
        photoMap.set(`checkin_${c.id}`, {
          id: `checkin_${c.id}`,
          clientId: user?.uid || '',
          date: c.submissionDate || '',
          frontUrl: c.progressPhotos.front,
          sideUrl: c.progressPhotos.side,
          backUrl: c.progressPhotos.back,
          weightKg: Number(c.weightKg),
          title: `Week ${c.weekNumber} Check-In`,
        });
      }
    });

    // 3. Direct progress photos
    directPhotos.forEach((p) => {
      photoMap.set(p.id, {
        ...p,
        title: 'Physique Photo',
      });
    });

    const result = Array.from(photoMap.values());
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [intake, user, checkIns, directPhotos]);

  const handleLogMetric = async () => {
    if (!user?.uid) return;
    const weightNum = parseFloat(inputWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid weight in kg.');
      return;
    }

    setSubmittingMetric(true);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      await addProgressMetric({
        clientId: user.uid,
        date: todayIso,
        weightKg: weightNum,
        waistCm: inputWaist ? parseFloat(inputWaist) : undefined,
        chestCm: inputChest ? parseFloat(inputChest) : undefined,
        notes: 'Mobile Daily Check',
      });

      // Update client profile's current weight
      updateUserProfile(user.uid, {
        currentWeightKg: weightNum,
      } as any).catch(() => {});

      setInputWeight('');
      setInputWaist('');
      setInputChest('');
      setLogModalVisible(false);
      Alert.alert('Success', 'Metric recorded & synchronized with web and coach!');
    } catch (err) {
      console.error('[ProgressScreen] addProgressMetric error:', err);
      Alert.alert('Error', 'Failed to save metric. Please try again.');
    } finally {
      setSubmittingMetric(false);
    }
  };

  const handlePickAndUploadPhoto = async () => {
    if (!user?.uid) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please enable media library access to upload transformation photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const pickedAsset = result.assets[0];
      setUploadingPhoto(true);

      const downloadUrl = await uploadProgressPhoto(
        user.uid,
        pickedAsset.uri,
        'front',
        (prog) => setUploadProgress(prog)
      );

      const latestWeight = metrics.length > 0 ? metrics[metrics.length - 1]?.weightKg : (user as any)?.currentWeightKg || 0;

      // Save record in Firestore
      await addProgressPhoto({
        clientId: user.uid,
        date: new Date().toISOString().split('T')[0],
        frontUrl: downloadUrl,
        weightKg: latestWeight,
      });

      Alert.alert('Success', 'Progress photo uploaded and synced with coach!');
    } catch (err) {
      console.error('[ProgressScreen] upload photo error:', err);
      Alert.alert('Upload Error', 'Could not upload photo. Please check your connection.');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  const currentWeight = metrics.length > 0 ? metrics[metrics.length - 1].weightKg : (user as any)?.currentWeightKg;
  const startWeight = metrics.length > 0 ? metrics[0].weightKg : (user as any)?.startingWeightKg;
  const diffKg = currentWeight && startWeight ? +(currentWeight - startWeight).toFixed(1) : undefined;
  const latestWaist = metrics.filter(m => m.waistCm).slice(-1)[0]?.waistCm;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="PROGRESS"
        subtitle="Body stats & visual evolution"
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setLogModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Summary Cards */}
        <View style={styles.metricsRow}>
          <StatCard
            label="Current Weight"
            value={currentWeight || '--'}
            unit="kg"
            icon="scale"
            iconColor={Colors.primary}
            trend={diffKg !== undefined ? `${diffKg > 0 ? '+' : ''}${diffKg} kg` : undefined}
            isPositive={diffKg !== undefined ? diffKg <= 0 : undefined}
            style={styles.metricCol}
          />
          <StatCard
            label="Start Weight"
            value={startWeight || '--'}
            unit="kg"
            icon="flag"
            iconColor={Colors.info}
            style={styles.metricCol}
          />
        </View>

        {latestWaist ? (
          <View style={[styles.metricsRow, { marginTop: Spacing.sm }]}>
            <StatCard
              label="Waist Measurement"
              value={latestWaist}
              unit="cm"
              icon="body"
              iconColor="#10B981"
              style={{ flex: 1 }}
            />
            <StatCard
              label="Check-In Logs"
              value={checkIns.length}
              unit="weeks"
              icon="calendar"
              iconColor="#8B5CF6"
              style={{ flex: 1 }}
            />
          </View>
        ) : null}

        {/* Action Banner to Log Today's Weight */}
        <Card style={styles.logPromptCard}>
          <View style={styles.logPromptLeft}>
            <Text style={styles.logPromptTitle}>Daily Weight Check</Text>
            <Text style={styles.logPromptSub}>Sync measurements with coach & web graphs</Text>
          </View>
          <Button
            title="Log Stats"
            onPress={() => setLogModalVisible(true)}
            size="sm"
            variant="primary"
          />
        </Card>

        {/* Photo Gallery Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRANSFORMATION GALLERY</Text>
          <TouchableOpacity
            onPress={handlePickAndUploadPhoto}
            disabled={uploadingPhoto}
            style={styles.uploadLink}
          >
            <Ionicons name="camera-outline" size={16} color={Colors.primary} />
            <Text style={styles.uploadLinkText}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {uploadingPhoto && (
          <Card style={styles.uploadProgressCard}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadProgressText}>
              Uploading photo... {uploadProgress}%
            </Text>
          </Card>
        )}

        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoScroll}
          >
            {photos.map((item) => (
              <View key={item.id} style={styles.photoCard}>
                <Image source={{ uri: item.frontUrl }} style={styles.photoImg} />
                <View style={styles.photoMeta}>
                  <Text style={styles.photoDate}>
                    {item.date ? new Date(item.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    }) : 'Recent'}
                  </Text>
                  {item.weightKg ? (
                    <Text style={styles.photoWeight}>{item.weightKg} kg</Text>
                  ) : null}
                </View>
                {(item as any).title ? (
                  <Text style={styles.photoBadge} numberOfLines={1}>
                    {(item as any).title}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : (
          <Card style={styles.emptyPhotoCard}>
            <Ionicons name="images-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyPhotoHeading}>No photos logged yet</Text>
            <Text style={styles.emptyPhotoSub}>
              Snap check-in photos weekly to visually document your physique progress.
            </Text>
            <Button
              title="Upload First Photo"
              onPress={handlePickAndUploadPhoto}
              variant="outline"
              size="sm"
              icon="camera-outline"
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}

        {/* Recent Weight Log History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WEIGHT & CHECK-IN LOG HISTORY</Text>
        </View>

        {metrics.length > 0 ? (
          <Card style={styles.historyCard}>
            {[...metrics].reverse().slice(0, 15).map((m, idx) => (
              <View
                key={m.id || idx}
                style={[
                  styles.historyItem,
                  idx !== 0 && styles.historyItemBorder,
                ]}
              >
                <View style={{ flex: 1, paddingRight: Spacing.md }}>
                  <Text style={styles.historyDate}>
                    {m.date ? new Date(m.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    }) : 'Entry'}
                  </Text>
                  <Text style={styles.historyLabel}>
                    {(m as any).label || (m.notes ? m.notes.slice(0, 40) : 'Progress Metric')}
                  </Text>
                  {m.waistCm ? (
                    <Text style={styles.historyWaist}>Waist: {m.waistCm} cm</Text>
                  ) : null}
                </View>
                <Text style={styles.historyWeight}>{m.weightKg} kg</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No metric logs yet. Tap 'Log Stats' above or complete your weekly check-in.</Text>
          </Card>
        )}
      </ScrollView>

      {/* Log Metric Modal */}
      <Modal
        visible={logModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Measurements</Text>
              <TouchableOpacity onPress={() => setLogModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Weight (kg) *"
              placeholder="e.g. 78.5"
              value={inputWeight}
              onChangeText={setInputWeight}
              keyboardType="decimal-pad"
              icon="scale-outline"
            />

            <Input
              label="Waist Circumference (cm)"
              placeholder="e.g. 82.0 (optional)"
              value={inputWaist}
              onChangeText={setInputWaist}
              keyboardType="decimal-pad"
              icon="resize-outline"
            />

            <Input
              label="Chest Circumference (cm)"
              placeholder="e.g. 102.0 (optional)"
              value={inputChest}
              onChangeText={setInputChest}
              keyboardType="decimal-pad"
              icon="body-outline"
            />

            <Button
              title="Save & Sync Measurements"
              onPress={handleLogMetric}
              loading={submittingMetric}
              size="lg"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricCol: {
    flex: 1,
  },
  logPromptCard: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  logPromptLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  logPromptTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  logPromptSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.extrabold,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  uploadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadLinkText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  uploadProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  uploadProgressText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  photoScroll: {
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  photoCard: {
    width: 140,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  photoImg: {
    width: 140,
    height: 180,
    backgroundColor: Colors.borderLight,
  },
  photoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  photoDate: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  photoWeight: {
    fontSize: FontSizes.xs - 1,
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  photoBadge: {
    fontSize: 9,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  emptyPhotoCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
  },
  emptyPhotoHeading: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyPhotoSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  historyItemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  historyDate: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeights.bold,
  },
  historyLabel: {
    fontSize: FontSizes.xs - 1,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginTop: 1,
  },
  historyWaist: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
    marginTop: 1,
  },
  historyWeight: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
});
