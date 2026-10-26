import React, { useState, useEffect } from 'react';
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
  addProgressMetric,
  addProgressPhoto,
} from '../../services/firestoreService';
import { uploadProgressPhoto } from '../../services/storageService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { StatCard } from '../../components/StatCard';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ProgressMetricPoint, ProgressPhotoRecord } from '../../types';

export const ProgressScreen: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ProgressMetricPoint[]>([]);
  const [photos, setPhotos] = useState<ProgressPhotoRecord[]>([]);
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

  useEffect(() => {
    if (!user?.uid) return;

    const unsubMetrics = subscribeToProgressMetrics(user.uid, (data) => {
      setMetrics(data);
    });

    const unsubPhotos = subscribeToProgressPhotos(user.uid, (data) => {
      setPhotos(data);
    });

    return () => {
      unsubMetrics();
      unsubPhotos();
    };
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleLogMetric = async () => {
    if (!user?.uid) return;
    const weightNum = parseFloat(inputWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid weight in kg.');
      return;
    }

    setSubmittingMetric(true);
    try {
      await addProgressMetric({
        clientId: user.uid,
        date: new Date().toISOString().split('T')[0],
        weightKg: weightNum,
        waistCm: inputWaist ? parseFloat(inputWaist) : undefined,
        chestCm: inputChest ? parseFloat(inputChest) : undefined,
      });

      setInputWeight('');
      setInputWaist('');
      setInputChest('');
      setLogModalVisible(false);
      Alert.alert('Success', 'Metric recorded successfully!');
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

      // Save record in Firestore
      await addProgressPhoto({
        clientId: user.uid,
        date: new Date().toISOString().split('T')[0],
        frontUrl: downloadUrl,
        weightKg: metrics[metrics.length - 1]?.weightKg || 0,
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

  const currentWeight = metrics.length > 0 ? metrics[metrics.length - 1].weightKg : undefined;
  const startWeight = metrics.length > 0 ? metrics[0].weightKg : undefined;
  const diffKg = currentWeight && startWeight ? +(currentWeight - startWeight).toFixed(1) : undefined;

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

        {/* Action Banner to Log Today's Weight */}
        <Card style={styles.logPromptCard}>
          <View style={styles.logPromptLeft}>
            <Text style={styles.logPromptTitle}>Daily Weight Check</Text>
            <Text style={styles.logPromptSub}>Keep your weekly average consistent</Text>
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
                    {new Date(item.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {item.weightKg ? (
                    <Text style={styles.photoWeight}>{item.weightKg} kg</Text>
                  ) : null}
                </View>
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
          <Text style={styles.sectionTitle}>WEIGHT LOG HISTORY</Text>
        </View>

        {metrics.length > 0 ? (
          <Card style={styles.historyCard}>
            {[...metrics].reverse().slice(0, 10).map((m, idx) => (
              <View
                key={m.id}
                style={[
                  styles.historyItem,
                  idx !== 0 && styles.historyItemBorder,
                ]}
              >
                <View>
                  <Text style={styles.historyDate}>
                    {new Date(m.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
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
            <Text style={styles.emptyText}>No metric logs yet. Tap 'Log Stats' above to record today's weight.</Text>
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
              icon="fitness-outline"
            />

            <Button
              title="Save Measurement"
              onPress={handleLogMetric}
              loading={submittingMetric}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.sm }}
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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  metricCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  logPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  logPromptLeft: {
    flex: 1,
    marginRight: Spacing.sm,
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
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  uploadLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadLinkText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: 4,
  },
  uploadProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
  },
  uploadProgressText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  photoScroll: {
    paddingVertical: Spacing.xs,
  },
  photoCard: {
    width: 140,
    marginRight: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoImg: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.borderLight,
  },
  photoMeta: {
    padding: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: FontWeights.medium,
  },
  historyWaist: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
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
