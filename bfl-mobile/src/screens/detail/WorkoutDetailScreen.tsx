import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, doc, getDoc } from '../../services/firebase';
import { completeWorkout } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../../constants/theme';
import type { AssignedWorkout, WorkoutExercise, ExerciseSetLog } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<HomeStackParamList, 'WorkoutDetail'>;

export const WorkoutDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { workoutId } = route.params;
  const { user } = useAuth();
  const [workout, setWorkout] = useState<AssignedWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [duration, setDuration] = useState('45');
  const [submitting, setSubmitting] = useState(false);

  // Active rest timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    async function loadWorkout() {
      try {
        const snap = await getDoc(doc(db, 'workouts', workoutId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as AssignedWorkout;
          setWorkout(data);
          setExercises(data.exercises || []);
          if (data.rating) setRating(data.rating);
          if (data.feedback) setFeedback(data.feedback);
          if (data.durationMinutes) setDuration(data.durationMinutes.toString());
        }
      } catch (err) {
        console.error('[WorkoutDetailScreen] load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkout();
  }, [workoutId]);

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const startRestTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerActive(true);
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSetLog,
    value: any
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      const targetExercise = { ...updated[exerciseIndex] };
      const targetSets = [...targetExercise.sets];
      targetSets[setIndex] = { ...targetSets[setIndex], [field]: value };
      targetExercise.sets = targetSets;
      updated[exerciseIndex] = targetExercise;
      return updated;
    });
  };

  const handleComplete = async () => {
    if (!workout || !user?.uid) return;

    setSubmitting(true);
    try {
      const durationNum = parseInt(duration) || 45;
      await completeWorkout(
        workout.id,
        user.uid,
        rating,
        feedback,
        durationNum,
        exercises
      );

      Alert.alert('Session Logged!', 'Great work! Your session has been submitted to your coach.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[WorkoutDetailScreen] complete error:', err);
      Alert.alert('Error', 'Failed to save workout completion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="WORKOUT" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="WORKOUT" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Workout not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={workout.title}
        subtitle={workout.assignedDate ? `Scheduled: ${workout.assignedDate}` : undefined}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <Badge
            label={workout.isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
            variant={workout.isCompleted ? 'success' : 'primary'}
          />
        }
      />

      {/* Floating Rest Timer Banner if active */}
      {timerActive && timerSeconds !== null && (
        <View style={styles.timerBanner}>
          <Ionicons name="stopwatch-outline" size={20} color={Colors.white} />
          <Text style={styles.timerText}>
            Rest Timer: {Math.floor(timerSeconds / 60)}:
            {(timerSeconds % 60).toString().padStart(2, '0')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setTimerActive(false);
              setTimerSeconds(null);
            }}
            style={styles.timerCloseBtn}
          >
            <Ionicons name="close" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {workout.description ? (
          <Card style={styles.descCard}>
            <Text style={styles.descText}>{workout.description}</Text>
          </Card>
        ) : null}

        {/* Exercises List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>EXERCISE PROTOCOL</Text>
        </View>

        {exercises.map((ex, exIdx) => (
          <Card key={ex.id || exIdx} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseNumberWrap}>
                <Text style={styles.exerciseNumber}>{exIdx + 1}</Text>
              </View>
              <View style={styles.exerciseTitleCol}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseMeta}>
                  {ex.targetMuscle} • {ex.equipment || 'Standard'}
                </Text>
              </View>

              {ex.restSeconds ? (
                <TouchableOpacity
                  style={styles.restTimerBtn}
                  onPress={() => startRestTimer(ex.restSeconds)}
                >
                  <Ionicons name="timer-outline" size={14} color={Colors.primary} />
                  <Text style={styles.restTimerText}>{ex.restSeconds}s Rest</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {ex.coachNotes ? (
              <View style={styles.coachTipBox}>
                <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                <Text style={styles.coachTipText}>{ex.coachNotes}</Text>
              </View>
            ) : null}

            {/* Sets Table */}
            <View style={styles.setsTableHeader}>
              <Text style={[styles.setTh, { width: 36 }]}>SET</Text>
              <Text style={[styles.setTh, { flex: 1 }]}>TARGET</Text>
              <Text style={[styles.setTh, { flex: 1.2 }]}>ACTUAL KG</Text>
              <Text style={[styles.setTh, { flex: 1 }]}>REPS</Text>
              <Text style={[styles.setTh, { width: 44, textAlign: 'center' }]}>DONE</Text>
            </View>

            {ex.sets?.map((set, setIdx) => (
              <View
                key={setIdx}
                style={[
                  styles.setRow,
                  set.completed && styles.setRowCompleted,
                ]}
              >
                <Text style={[styles.setColText, { width: 36 }]}>{set.setNumber || setIdx + 1}</Text>
                <Text style={[styles.setColText, { flex: 1, color: Colors.textMuted }]}>
                  {set.targetReps || '8-12'}
                </Text>

                <TextInput
                  style={[styles.setInput, { flex: 1.2 }]}
                  placeholder={set.targetWeightKg ? `${set.targetWeightKg}` : '0'}
                  placeholderTextColor={Colors.textTertiary}
                  value={set.actualWeightKg ? String(set.actualWeightKg) : ''}
                  onChangeText={(val) =>
                    handleUpdateSet(exIdx, setIdx, 'actualWeightKg', parseFloat(val) || 0)
                  }
                  keyboardType="decimal-pad"
                  editable={!workout.isCompleted}
                />

                <TextInput
                  style={[styles.setInput, { flex: 1 }]}
                  placeholder="reps"
                  placeholderTextColor={Colors.textTertiary}
                  value={set.actualReps ? String(set.actualReps) : ''}
                  onChangeText={(val) =>
                    handleUpdateSet(exIdx, setIdx, 'actualReps', parseInt(val) || 0)
                  }
                  keyboardType="number-pad"
                  editable={!workout.isCompleted}
                />

                <TouchableOpacity
                  style={[styles.checkbox, set.completed && styles.checkboxActive]}
                  onPress={() => {
                    if (workout.isCompleted) return;
                    handleUpdateSet(exIdx, setIdx, 'completed', !set.completed);
                  }}
                  disabled={workout.isCompleted}
                >
                  {set.completed && (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        ))}

        {/* Completion & Feedback Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LOG SESSION FEEDBACK</Text>
        </View>

        <Card style={styles.completionCard}>
          <Text style={styles.feedbackLabel}>Rate Workout Intensity / Effort</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => !workout.isCompleted && setRating(star)}
                disabled={workout.isCompleted}
                style={styles.starBtn}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.feedbackLabel, { marginTop: Spacing.md }]}>Duration (minutes)</Text>
          <TextInput
            style={styles.durationInput}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="45"
            editable={!workout.isCompleted}
          />

          <Text style={[styles.feedbackLabel, { marginTop: Spacing.md }]}>
            Client Notes & Feedback for Coach
          </Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="How did the weights feel? Any muscle tightness or form questions?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            editable={!workout.isCompleted}
          />

          {!workout.isCompleted ? (
            <Button
              title="Complete Workout Session"
              onPress={handleComplete}
              loading={submitting}
              icon="checkmark-circle-outline"
              size="lg"
              fullWidth
              style={{ marginTop: Spacing.lg }}
            />
          ) : (
            <View style={styles.completedNotice}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.completedNoticeText}>
                Workout logged & synced with coach!
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSizes.base,
    color: Colors.error,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  timerText: {
    color: Colors.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
  timerCloseBtn: {
    padding: Spacing.xs,
  },
  descCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  descText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  exerciseCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  exerciseNumber: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.extrabold,
    color: Colors.primary,
  },
  exerciseTitleCol: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  exerciseMeta: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  restTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  restTimerText: {
    fontSize: FontSizes.xs - 1,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: 3,
  },
  coachTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  coachTipText: {
    fontSize: FontSizes.xs,
    color: '#92400E',
    marginLeft: Spacing.xs,
    flex: 1,
    lineHeight: 16,
  },
  setsTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  setTh: {
    fontSize: FontSizes.xs - 2,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  setRowCompleted: {
    backgroundColor: '#F0FDF4',
  },
  setColText: {
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    fontWeight: FontWeights.semibold,
  },
  setInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    marginRight: 6,
    textAlign: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  checkboxActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  completionCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  feedbackLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  starBtn: {
    marginRight: Spacing.sm,
  },
  durationInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    width: 100,
  },
  feedbackInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
  },
  completedNoticeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#065F46',
    marginLeft: Spacing.sm,
  },
});
