import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToClientWorkouts,
  subscribeToNutrition,
  subscribeToProgressMetrics,
} from '../../services/firestoreService';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { StatCard } from '../../components/StatCard';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { canReceiveCoaching, getSubscriptionStatus } from '../../types';
import type { AssignedWorkout, NutritionPlan, ProgressMetricPoint } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/RootNavigator';

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<AssignedWorkout[]>([]);
  const [nutrition, setNutrition] = useState<NutritionPlan | null>(null);
  const [latestMetric, setLatestMetric] = useState<ProgressMetricPoint | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Workouts listener
    const unsubWorkouts = subscribeToClientWorkouts(user.uid, (data) => {
      setWorkouts(data);
    });

    // Nutrition plan listener
    const unsubNutrition = subscribeToNutrition(user.uid, (data) => {
      setNutrition(data);
    });

    // Metrics listener
    const unsubMetrics = subscribeToProgressMetrics(user.uid, (data) => {
      if (data.length > 0) {
        setLatestMetric(data[data.length - 1]);
      }
    });

    return () => {
      unsubWorkouts();
      unsubNutrition();
      unsubMetrics();
    };
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const nextWorkout = workouts.find((w) => !w.isCompleted) || workouts[0];
  const completedCount = workouts.filter((w) => w.isCompleted).length;
  const isCoachingActive = canReceiveCoaching(user);
  const subStatus = getSubscriptionStatus(user);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Greeting Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingSub}>ATHLETE PORTAL</Text>
            <Text style={styles.greetingName}>{user?.displayName || 'Champion'}</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarInitial}>
              {(user?.displayName?.[0] || 'A').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Subscription Status Banner */}
        <SubscriptionBanner
          user={user}
          onRenew={() => {
            // Can deep link or show renew prompt
          }}
        />

        {/* Today's Workout Focus Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TODAY'S FOCUS</Text>
          {nextWorkout && (
            <Badge
              label={nextWorkout.isCompleted ? 'COMPLETED' : 'ASSIGNED'}
              variant={nextWorkout.isCompleted ? 'success' : 'primary'}
            />
          )}
        </View>

        {nextWorkout ? (
          <Card style={styles.focusCard}>
            <View style={styles.focusHeader}>
              <View style={styles.focusIconWrap}>
                <Ionicons name="barbell" size={24} color={Colors.white} />
              </View>
              <View style={styles.focusDetails}>
                <Text style={styles.focusTitle}>{nextWorkout.title}</Text>
                <Text style={styles.focusSubtitle}>
                  {nextWorkout.exercises?.length || 0} exercises • {nextWorkout.durationMinutes || 45} mins
                </Text>
              </View>
            </View>

            {nextWorkout.description ? (
              <Text style={styles.focusDesc} numberOfLines={2}>
                {nextWorkout.description}
              </Text>
            ) : null}

            <Button
              title={nextWorkout.isCompleted ? 'Review Session' : 'Start Workout'}
              onPress={() => navigation.navigate('WorkoutDetail', { workoutId: nextWorkout.id })}
              variant={nextWorkout.isCompleted ? 'secondary' : 'primary'}
              icon={nextWorkout.isCompleted ? 'checkmark-circle-outline' : 'play'}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No workouts assigned yet</Text>
            <Text style={styles.emptyText}>
              Your coach is finalizing your program. Check back shortly!
            </Text>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CheckIn')}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="clipboard-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Weekly Check-In</Text>
            <Text style={styles.actionSubtitle}>Log photos & stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => {
              const coachId = user?.assignedCoachId || user?.coachId || 'coach-main';
              navigation.navigate('Chat', { coachId, coachName: 'Your Coach' });
            }}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.infoLight }]}>
              <Ionicons name="chatbubbles-outline" size={24} color={Colors.info} />
            </View>
            <Text style={styles.actionTitle}>Coach Chat</Text>
            <Text style={styles.actionSubtitle}>Ask questions anytime</Text>
          </TouchableOpacity>
        </View>

        {/* Nutrition Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DAILY TARGETS</Text>
          <Badge label={nutrition ? 'ACTIVE TARGETS' : 'STANDARD'} variant="neutral" />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Calories"
            value={nutrition?.calories || 2200}
            unit="kcal"
            icon="flame"
            iconColor={Colors.primary}
            style={styles.statCol}
          />
          <StatCard
            label="Protein"
            value={nutrition?.proteinGrams || 160}
            unit="g"
            icon="fitness"
            iconColor={Colors.info}
            style={styles.statCol}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Carbs"
            value={nutrition?.carbsGrams || 220}
            unit="g"
            icon="nutrition"
            iconColor={Colors.warning}
            style={styles.statCol}
          />
          <StatCard
            label="Fats"
            value={nutrition?.fatGrams || 65}
            unit="g"
            icon="water"
            iconColor={Colors.success}
            style={styles.statCol}
          />
        </View>

        {/* Progress Snapshot */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PROGRESS SNAPSHOT</Text>
        </View>

        <Card style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressLabel}>Latest Weight</Text>
              <Text style={styles.progressVal}>
                {latestMetric?.weightKg || user?.waistCm ? `${latestMetric?.weightKg || '--'} kg` : 'Not recorded'}
              </Text>
            </View>
            <View style={styles.progressDivider} />
            <View>
              <Text style={styles.progressLabel}>Workouts Completed</Text>
              <Text style={styles.progressVal}>{completedCount}</Text>
            </View>
            <View style={styles.progressDivider} />
            <View>
              <Text style={styles.progressLabel}>Tier Plan</Text>
              <Text style={styles.progressVal}>{user?.activePlanName || 'Standard'}</Text>
            </View>
          </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  greetingSub: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  greetingName: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitial: {
    color: Colors.white,
    fontWeight: FontWeights.extrabold,
    fontSize: FontSizes.lg,
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
  focusCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  focusDetails: {
    flex: 1,
  },
  focusTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  focusSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  focusDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  actionItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  progressCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
    fontWeight: FontWeights.medium,
    marginBottom: 4,
  },
  progressVal: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
  },
  progressDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
});
