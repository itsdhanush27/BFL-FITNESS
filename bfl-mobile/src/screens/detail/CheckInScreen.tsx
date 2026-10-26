import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { submitWeeklyCheckIn } from '../../services/firestoreService';
import { uploadCheckInPhoto } from '../../services/storageService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<HomeStackParamList, 'CheckIn'>;

export const CheckInScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [weekNumber, setWeekNumber] = useState('1');
  const [weightKg, setWeightKg] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [adherence, setAdherence] = useState(9);
  const [energy, setEnergy] = useState(4);
  const [sleepHours, setSleepHours] = useState('7.5');
  const [stress, setStress] = useState(2);
  const [hunger, setHunger] = useState(3);
  const [notes, setNotes] = useState('');

  // Photos: local URIs before upload
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [sideUri, setSideUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const pickImage = async (angle: 'front' | 'side' | 'back') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Access to your media library is required to select check-in photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (angle === 'front') setFrontUri(uri);
        else if (angle === 'side') setSideUri(uri);
        else if (angle === 'back') setBackUri(uri);
      }
    } catch (err) {
      console.error('[CheckInScreen] pickImage error:', err);
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;

    const parsedWeight = parseFloat(weightKg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Validation Error', 'Please enter your current bodyweight.');
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls: { front?: string; side?: string; back?: string } = {};

      // 1. Upload photos if selected
      if (frontUri) {
        setUploadStatus('Uploading Front photo...');
        photoUrls.front = await uploadCheckInPhoto(user.uid, frontUri, 'front');
      }
      if (sideUri) {
        setUploadStatus('Uploading Side photo...');
        photoUrls.side = await uploadCheckInPhoto(user.uid, sideUri, 'side');
      }
      if (backUri) {
        setUploadStatus('Uploading Back photo...');
        photoUrls.back = await uploadCheckInPhoto(user.uid, backUri, 'back');
      }

      // 2. Submit check-in doc to Firestore
      setUploadStatus('Saving check-in report...');
      await submitWeeklyCheckIn({
        clientId: user.uid,
        clientName: user.displayName || 'Athlete',
        clientEmail: user.email,
        weekNumber: parseInt(weekNumber) || 1,
        submissionDate: new Date().toISOString().split('T')[0],
        weightKg: parsedWeight,
        adherenceRating: adherence,
        energyRating: energy,
        sleepHours: parseFloat(sleepHours) || 7,
        stressRating: stress,
        hungerRating: hunger,
        waistMeasurementCm: waistCm ? parseFloat(waistCm) : undefined,
        progressPhotos: photoUrls,
        winsAndStruggles: notes,
        reviewedByCoach: false,
      });

      Alert.alert('Check-In Submitted!', 'Your weekly check-in has been sent to your coach for review.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[CheckInScreen] submit error:', err);
      Alert.alert('Submission Error', 'Failed to submit check-in. Please check your network connection.');
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  const renderRatingRow = (
    label: string,
    val: number,
    setVal: (n: number) => void,
    max = 5
  ) => {
    return (
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.ratingButtons}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.ratingBtn, val === n && styles.ratingBtnActive]}
              onPress={() => setVal(n)}
            >
              <Text style={[styles.ratingBtnText, val === n && styles.ratingBtnTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="WEEKLY CHECK-IN" subtitle="Progress review & accountability" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Core Measurements */}
        <Card style={styles.formCard}>
          <Text style={styles.cardTitle}>WEEK & BODY STATS</Text>

          <View style={styles.inputsRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Input
                label="Check-In Week #"
                value={weekNumber}
                onChangeText={setWeekNumber}
                keyboardType="number-pad"
                icon="calendar-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Weight (kg) *"
                placeholder="e.g. 76.8"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                icon="scale-outline"
              />
            </View>
          </View>

          <View style={styles.inputsRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Input
                label="Waist (cm)"
                placeholder="optional"
                value={waistCm}
                onChangeText={setWaistCm}
                keyboardType="decimal-pad"
                icon="resize-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Sleep (Hours/Night)"
                value={sleepHours}
                onChangeText={setSleepHours}
                keyboardType="decimal-pad"
                icon="bed-outline"
              />
            </View>
          </View>
        </Card>

        {/* Adherence & Wellness Ratings */}
        <Card style={styles.formCard}>
          <Text style={styles.cardTitle}>SUBJECTIVE RATINGS (1 - 5)</Text>
          {renderRatingRow('Energy Levels', energy, setEnergy)}
          {renderRatingRow('Stress Level', stress, setStress)}
          {renderRatingRow('Hunger / Appetite', hunger, setHunger)}

          <View style={{ marginTop: Spacing.sm }}>
            <Text style={styles.ratingLabel}>Diet & Training Adherence (1 - 10)</Text>
            <View style={[styles.ratingButtons, { marginTop: 4 }]}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.smallRatingBtn, adherence === n && styles.ratingBtnActive]}
                  onPress={() => setAdherence(n)}
                >
                  <Text style={[styles.smallRatingBtnText, adherence === n && styles.ratingBtnTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Check-In Transformation Photos */}
        <Card style={styles.formCard}>
          <Text style={styles.cardTitle}>UPLOAD YOUR CHECK-IN PHOTOS</Text>
          <Text style={styles.photoTipText}>
            Select or capture front, side, and back physique photos. These will be optimized and uploaded to your secure client storage.
          </Text>

          <View style={styles.photoPickersRow}>
            {/* Front Photo */}
            <View style={styles.photoPickerCol}>
              <Text style={styles.photoAngleLabel}>FRONT</Text>
              {frontUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: frontUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setFrontUri(null)}
                  >
                    <Ionicons name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerBox}
                  onPress={() => pickImage('front')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                  <Text style={styles.pickerBoxText}>Select</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Side Photo */}
            <View style={styles.photoPickerCol}>
              <Text style={styles.photoAngleLabel}>SIDE</Text>
              {sideUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: sideUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setSideUri(null)}
                  >
                    <Ionicons name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerBox}
                  onPress={() => pickImage('side')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                  <Text style={styles.pickerBoxText}>Select</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Back Photo */}
            <View style={styles.photoPickerCol}>
              <Text style={styles.photoAngleLabel}>BACK</Text>
              {backUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: backUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setBackUri(null)}
                  >
                    <Ionicons name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickerBox}
                  onPress={() => pickImage('back')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                  <Text style={styles.pickerBoxText}>Select</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>

        {/* Coach Reflection Notes */}
        <Card style={styles.formCard}>
          <Text style={styles.cardTitle}>WINS & STRUGGLES</Text>
          <Input
            placeholder="Share this week's progress, cravings, energy highs, or any difficulty staying on plan..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
        </Card>

        {/* Submission Button */}
        {uploadStatus && (
          <View style={styles.uploadingStatusBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadingStatusText}>{uploadStatus}</Text>
          </View>
        )}

        <Button
          title="Submit Weekly Check-In"
          onPress={handleSubmit}
          loading={submitting}
          size="lg"
          fullWidth
          icon="send"
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
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
  formCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  inputsRow: {
    flexDirection: 'row',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs + 2,
  },
  ratingLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
  },
  ratingButtons: {
    flexDirection: 'row',
  },
  ratingBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  ratingBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingBtnText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  ratingBtnTextActive: {
    color: Colors.white,
  },
  smallRatingBtn: {
    flex: 1,
    height: 30,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    borderRadius: 4,
  },
  smallRatingBtnText: {
    fontSize: FontSizes.xs - 1,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  photoTipText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  photoPickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoPickerCol: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  photoAngleLabel: {
    fontSize: FontSizes.xs - 2,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  pickerBox: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  pickerBoxText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
    marginTop: 4,
  },
  previewContainer: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  uploadingStatusText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.sm,
  },
});
