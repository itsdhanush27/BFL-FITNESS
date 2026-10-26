import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToClientWorkouts } from '../../services/firestoreService';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Header } from '../../components/Header';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { canReceiveCoaching } from '../../types';
import type { AssignedWorkout } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { WorkoutsStackParamList } from '../../navigation/RootNavigator';

interface WorkoutsScreenProps {
  navigation: NativeStackNavigationProp<WorkoutsStackParamList, 'WorkoutsList'>;
}

export const WorkoutsScreen: React.FC<WorkoutsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<AssignedWorkout[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToClientWorkouts(user.uid, (data) => {
      setWorkouts(data);
    });
    return () => unsub();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filteredWorkouts = workouts.filter((w) => {
    if (filter === 'completed') return w.isCompleted;
    if (filter === 'pending') return !w.isCompleted;
    return true;
  });

  const isCoachingActive = canReceiveCoaching(user);

  const renderWorkoutItem = ({ item }: { item: AssignedWorkout }) => {
    return (
      <Card
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        style={styles.workoutCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.workoutTitle}>{item.title}</Text>
            {item.assignedDate && (
              <Text style={styles.workoutDate}>
                {new Date(item.assignedDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            )}
          </View>
          <Badge
            label={item.isCompleted ? 'COMPLETED' : 'ASSIGNED'}
            variant={item.isCompleted ? 'success' : 'primary'}
          />
        </View>

        {item.description ? (
          <Text style={styles.workoutDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="barbell-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.footerText}>
              {item.exercises?.length || 0} exercises
            </Text>
          </View>

          {item.durationMinutes ? (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.footerText}>{item.durationMinutes} min</Text>
            </View>
          ) : null}

          {item.isCompleted && item.rating ? (
            <View style={styles.footerItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.footerText}>{item.rating}/5</Text>
            </View>
          ) : null}

          <View style={styles.arrowRow}>
            <Text style={styles.viewText}>Details</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="WORKOUTS" subtitle="Your personalized training program" />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'completed'] as const).map((tab) => {
          const isActive = filter === tab;
          const count =
            tab === 'all'
              ? workouts.length
              : tab === 'pending'
              ? workouts.filter((w) => !w.isCompleted).length
              : workouts.filter((w) => w.isCompleted).length;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'pending' ? 'Upcoming' : 'Completed'} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={54} color={Colors.textTertiary} />
            <Text style={styles.emptyHeading}>No workouts in this view</Text>
            <Text style={styles.emptyText}>
              {filter === 'completed'
                ? 'Complete your first scheduled session to see history here.'
                : 'Your coach will assign sessions according to your weekly plan.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  filterTab: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
  },
  workoutCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  workoutTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  workoutDate: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  workoutDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs + 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  footerText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: FontWeights.medium,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  viewText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginRight: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyHeading: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
});
