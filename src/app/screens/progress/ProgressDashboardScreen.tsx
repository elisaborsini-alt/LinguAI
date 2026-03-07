import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInUp} from 'react-native-reanimated';

import {useTheme} from '@state/hooks/useTheme';
import {Text, Button} from '@ui/components';
import {spacing, borderRadius} from '@ui/theme';
import {progressApi} from '@data/api/endpoints/progress';
import type {ProgressSummary, TimeMachineResult} from '@data/api/endpoints/progress';
import {storageHelpers} from '@data/storage/mmkv';
import type {MainTabScreenProps} from '@appTypes/navigation';

type NavigationProp = MainTabScreenProps<'ProgressTab'>['navigation'];

// ============================================
// ProgressDashboardScreen
// ============================================

export const ProgressDashboardScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [timeMachine, setTimeMachine] = useState<TimeMachineResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await progressApi.getSummary();
      setSummary(response.data);

      // Check time machine cooldown (30 days)
      const lastViewed = storageHelpers.getNumber('timeMachineLastViewed');
      const canShow = !lastViewed || Date.now() - lastViewed > THIRTY_DAYS_MS;
      if (canShow) {
        try {
          const tmResponse = await progressApi.getTimeMachine();
          setTimeMachine(tmResponse.data);
        } catch {
          // Non-fatal: time machine is optional
        }
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const navigateToConversation = () => {
    navigation.navigate('ConversationTab', {screen: 'ConversationHome'});
  };

  const navigateToTimeMachine = () => {
    if (!timeMachine) return;
    storageHelpers.setNumber('timeMachineLastViewed', Date.now());
    navigation.navigate('ProgressTab', {
      screen: 'TimeMachine',
      params: {data: timeMachine},
    } as any);
  };

  // ========== Loading ==========
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ========== Error ==========
  if (error) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>{' '}</Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Impossibile caricare i dati
          </Text>
          <TouchableOpacity onPress={fetchSummary} style={styles.retryLink}>
            <Text variant="labelLarge" color="link">
              Riprova
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ========== Not enough data ==========
  if (!summary?.hasEnoughData) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.centered}>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.emptyContent}>
            <Text style={styles.emptyEmoji}>{' '}</Text>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              I tuoi progressi
            </Text>
            <Text variant="bodyLarge" color="secondary" style={styles.emptySubtitle}>
              Completa almeno 2 sessioni per vedere{'\n'}il percorso che stiamo costruendo
            </Text>
            <Button
              title="Inizia una conversazione"
              onPress={navigateToConversation}
              size="large"
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ========== Progress available ==========
  const {trend, delta, topStrength, topWeakness, suggestedFocus, sessionsCompleted} = summary;

  const trendConfig = {
    improving: {
      arrow: '',
      color: colors.semantic.success,
      label: 'La precisione sta cambiando',
    },
    stable: {
      arrow: '',
      color: colors.text.secondary,
      label: 'La precisione è costante',
    },
    declining: {
      arrow: '',
      color: colors.text.secondary,
      label: 'La precisione sta variando',
    },
  };

  const tc = trendConfig[trend || 'stable'];
  const deltaText =
    (delta || 0) > 0 ? `+${delta}` : (delta || 0) < 0 ? `${delta}` : '\u00B10';

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium">I tuoi progressi</Text>
          <Text variant="bodyMedium" color="secondary">
            Basato sulle ultime {sessionsCompleted} sessioni
          </Text>
        </View>

        {/* Trend Card */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <View style={[styles.trendCard, {backgroundColor: colors.background.secondary}]}>
            <View style={styles.trendRow}>
              <Text style={styles.trendArrow}>{tc.arrow}</Text>
              <Text style={[styles.trendDelta, {color: tc.color}]}>{deltaText}</Text>
            </View>
            <Text variant="titleMedium" style={[styles.trendLabel, {color: tc.color}]}>
              {tc.label}
            </Text>
          </View>
        </Animated.View>

        {/* Insight Card */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)}>
          <View style={[styles.insightCard, {backgroundColor: colors.background.secondary}]}>
            {/* Strength */}
            <View style={styles.insightSection}>
              <View style={styles.insightHeader}>
                <Text variant="labelMedium" style={{color: colors.semantic.success}}>
                  Cosa appare più spesso
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.insightText}>
                {topStrength}
              </Text>
            </View>

            {/* Divider */}
            <View style={[styles.divider, {backgroundColor: colors.border.light}]} />

            {/* Weakness */}
            <View style={styles.insightSection}>
              <View style={styles.insightHeader}>
                <Text variant="labelMedium" style={{color: colors.semantic.warning}}>
                  Aspetti su cui stiamo lavorando
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.insightText}>
                {topWeakness}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Focus Card */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={[styles.focusCard, {backgroundColor: colors.brand.primary}]}>
            <Text variant="overline" style={styles.focusLabel}>
              DOVE STIAMO ANDANDO
            </Text>
            <Text variant="titleMedium" style={styles.focusText}>
              {suggestedFocus}
            </Text>
            <TouchableOpacity
              onPress={navigateToConversation}
              style={[styles.focusButton, {backgroundColor: colors.background.primary}]}
              activeOpacity={0.8}>
              <Text variant="labelLarge" style={{color: colors.brand.primary}}>
                Pratica ora
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Time Machine Card */}
        {timeMachine && (
          <Animated.View entering={FadeInUp.delay(450).duration(400)}>
            <TouchableOpacity
              onPress={navigateToTimeMachine}
              style={[styles.timeMachineCard, {backgroundColor: colors.background.secondary}]}
              activeOpacity={0.8}>
              <Text variant="titleMedium">Ascolta il tuo percorso</Text>
              <Text variant="bodySmall" color="secondary" style={styles.timeMachineSubtext}>
                La tua voce di qualche tempo fa, e la tua voce oggi
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal * 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Trend Card
  trendCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  trendArrow: {
    fontSize: 32,
  },
  trendDelta: {
    fontSize: 36,
    fontWeight: '700',
  },
  trendLabel: {
    textAlign: 'center',
  },

  // Insight Card
  insightCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  insightSection: {
    paddingVertical: spacing.xs,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  insightIcon: {
    fontSize: 16,
  },
  insightText: {
    paddingLeft: spacing.lg,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },

  // Focus Card
  focusCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  focusLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
    letterSpacing: 2,
  },
  focusText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  focusButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },

  // Time Machine Card
  timeMachineCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  timeMachineSubtext: {
    marginTop: spacing.xxs,
  },

  // Empty State
  emptyContent: {
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  retryLink: {
    paddingVertical: spacing.sm,
  },
});

export default ProgressDashboardScreen;
