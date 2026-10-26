import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNutrition } from '../../services/firestoreService';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StatCard } from '../../components/StatCard';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { NutritionPlan } from '../../types';

export const NutritionScreen: React.FC = () => {
  const { user } = useAuth();
  const [nutrition, setNutrition] = useState<NutritionPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [waterDrank, setWaterDrank] = useState(1.5); // Local daily water intake tracker

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNutrition(user.uid, (data) => {
      setNutrition(data);
    });
    return () => unsub();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const calories = nutrition?.calories || 2200;
  const protein = nutrition?.proteinGrams || 160;
  const carbs = nutrition?.carbsGrams || 220;
  const fat = nutrition?.fatGrams || 65;
  const targetWater = nutrition?.waterLiters || 3.0;

  // Macro calculation percentages
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals || calories;

  const proteinPct = Math.round((proteinCals / totalCals) * 100);
  const carbsPct = Math.round((carbsCals / totalCals) * 100);
  const fatPct = Math.round((fatCals / totalCals) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="NUTRITION" subtitle="Fueling and macro strategy" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Main Calorie Card */}
        <Card style={styles.calorieCard}>
          <View style={styles.calorieHeader}>
            <View>
              <Text style={styles.cardSectionLabel}>DAILY ENERGY TARGET</Text>
              <Text style={styles.calorieValue}>{calories}</Text>
              <Text style={styles.calorieUnit}>KILOCALORIES / DAY</Text>
            </View>
            <View style={styles.flameIconWrap}>
              <Ionicons name="flame" size={32} color={Colors.primary} />
            </View>
          </View>

          {/* Macro Distribution Bar */}
          <View style={styles.macroBarContainer}>
            <View style={[styles.macroSegment, { flex: proteinPct, backgroundColor: '#3B82F6' }]} />
            <View style={[styles.macroSegment, { flex: carbsPct, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.macroSegment, { flex: fatPct, backgroundColor: '#10B981' }]} />
          </View>

          {/* Macro Breakdown Legend */}
          <View style={styles.macroLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendLabel}>Protein: {protein}g ({proteinPct}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendLabel}>Carbs: {carbs}g ({carbsPct}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendLabel}>Fats: {fat}g ({fatPct}%)</Text>
            </View>
          </View>
        </Card>

        {/* Macro Details Grid */}
        <View style={styles.gridRow}>
          <StatCard
            label="Protein"
            value={protein}
            unit="g"
            icon="fitness"
            iconColor="#3B82F6"
            style={styles.gridCol}
          />
          <StatCard
            label="Carbs"
            value={carbs}
            unit="g"
            icon="nutrition"
            iconColor="#F59E0B"
            style={styles.gridCol}
          />
          <StatCard
            label="Fats"
            value={fat}
            unit="g"
            icon="restaurant"
            iconColor="#10B981"
            style={styles.gridCol}
          />
        </View>

        {/* Hydration Tracker */}
        <Card style={styles.waterCard}>
          <View style={styles.waterTopRow}>
            <View style={styles.waterIconWrap}>
              <Ionicons name="water" size={24} color="#0EA5E9" />
            </View>
            <View style={styles.waterInfo}>
              <Text style={styles.waterTitle}>Hydration Tracker</Text>
              <Text style={styles.waterSub}>
                Goal: {targetWater} Liters • Logged: {waterDrank.toFixed(1)} L
              </Text>
            </View>
          </View>

          {/* Quick Increment Buttons */}
          <View style={styles.waterButtonsRow}>
            <TouchableOpacity
              style={styles.waterBtn}
              onPress={() => setWaterDrank((prev) => Math.max(0, +(prev - 0.25).toFixed(2)))}
            >
              <Text style={styles.waterBtnText}>- 250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.waterBtn, styles.waterBtnAdd]}
              onPress={() => setWaterDrank((prev) => +(prev + 0.25).toFixed(2))}
            >
              <Ionicons name="add" size={16} color={Colors.white} />
              <Text style={[styles.waterBtnText, { color: Colors.white, marginLeft: 2 }]}>+ 250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.waterBtn, styles.waterBtnAdd]}
              onPress={() => setWaterDrank((prev) => +(prev + 0.5).toFixed(2))}
            >
              <Ionicons name="add" size={16} color={Colors.white} />
              <Text style={[styles.waterBtnText, { color: Colors.white, marginLeft: 2 }]}>+ 500ml</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Coach Nutrition Notes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>COACH PROTOCOL NOTES</Text>
        </View>

        <Card style={styles.notesCard}>
          <View style={styles.coachNoteRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.coachNoteHeading}>Daily Guidelines</Text>
          </View>
          <Text style={styles.coachNoteText}>
            {nutrition?.dailyNotes ||
              'Distribute protein evenly across 3-4 meals. Aim for 20-30g pre-workout and post-workout. Focus on whole, unprocessed food sources for 85% of total calorie allotment.'}
          </Text>
        </Card>

        {/* Supplement Protocol */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECOMMENDED SUPPLEMENTATION</Text>
        </View>

        <Card style={styles.supplementsCard}>
          {(nutrition?.supplementGuide && nutrition.supplementGuide.length > 0
            ? nutrition.supplementGuide
            : [
                'Whey Isolate — 1 scoop post-workout',
                'Creatine Monohydrate — 5g daily with water',
                'Omega-3 Fish Oil — 2 capsules with breakfast',
                'Vitamin D3 + K2 — 2000 IU morning',
              ]
          ).map((item, index) => (
            <View key={index} style={styles.supplementItem}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.supplementText}>{item}</Text>
            </View>
          ))}
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  calorieCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  calorieValue: {
    fontSize: 38,
    fontWeight: FontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  calorieUnit: {
    fontSize: FontSizes.xs - 1,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  flameIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    backgroundColor: Colors.borderLight,
  },
  macroSegment: {
    height: '100%',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  gridCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  waterCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    marginTop: Spacing.xs,
  },
  waterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  waterIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  waterInfo: {
    flex: 1,
  },
  waterTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  waterSub: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  waterBtn: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterBtnAdd: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  waterBtnText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
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
  notesCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  coachNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  coachNoteHeading: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  coachNoteText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  supplementsCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
  },
  supplementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  supplementText: {
    fontSize: FontSizes.xs,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    fontWeight: FontWeights.medium,
  },
});
