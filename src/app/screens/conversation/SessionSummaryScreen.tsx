import React, {useState, useEffect} from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Animated, {FadeInUp, FadeInDown} from 'react-native-reanimated';
import {useTheme} from '@state/hooks/useTheme';
import {Text, Button} from '@ui/components';
import {MomentumCard} from '@ui/components/MomentumCard';
import {spacing, borderRadius} from '@ui/theme';
import {progressApi} from '@data/api/endpoints/progress';
import type {MomentumInsight} from '@data/api/endpoints/progress';
import type {ConversationStackScreenProps} from '@appTypes/navigation';
import {storageHelpers} from '@data/storage/mmkv';
import type {SessionReportData} from '@appTypes/api';

type NavigationProp = ConversationStackScreenProps<'SessionSummary'>['navigation'];
type RouteProp = ConversationStackScreenProps<'SessionSummary'>['route'];

// ============================================
// Score Circle Component
// ============================================

interface ScoreCircleProps {
  score: number;
  label: string;
  size: 'large' | 'small';
  color: string;
}

const ScoreCircle: React.FC<ScoreCircleProps> = ({score, label, size, color}) => {
  const {colors} = useTheme();
  const dimension = size === 'large' ? 96 : 64;
  const fontSize = size === 'large' ? 28 : 18;
  const labelSize = size === 'large' ? 'bodySmall' : 'caption';

  return (
    <View style={styles.scoreCircleContainer}>
      <View
        style={[
          styles.scoreCircle,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderColor: color,
            borderWidth: 3,
          },
        ]}>
        <Text style={{fontSize, fontWeight: '700', color}}>{score}</Text>
      </View>
      <Text variant={labelSize as any} color="secondary" style={styles.scoreLabel}>
        {label}
      </Text>
    </View>
  );
};

// ============================================
// SessionSummaryScreen
// ============================================

export const SessionSummaryScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();

  const {report} = route.params;
  const [momentum, setMomentum] = useState<MomentumInsight | null>(null);

  useEffect(() => {
    if (!report) return;

    const COOLDOWN_KEY = 'momentum_last_shown';
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const lastShown = storageHelpers.getNumber(COOLDOWN_KEY);
    if (lastShown && Date.now() - lastShown < SEVEN_DAYS_MS) return;

    (async () => {
      try {
        const response = await progressApi.getMomentum();
        if (response.data) {
          setMomentum(response.data);
          storageHelpers.setNumber(COOLDOWN_KEY, Date.now());
        }
      } catch {
        // Silently ignore — momentum is non-essential
      }
    })();
  }, [report]);

  // Empty state — no report data
  if (!report) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Sessione conclusa
          </Text>
          <Text variant="bodyLarge" color="secondary" style={styles.emptySubtitle}>
            I dati del report non sono disponibili al momento.
          </Text>
          <Button
            title="Torna alla Home"
            onPress={() => navigation.popToTop()}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  const durationMinutes = Math.max(1, Math.round(report.duration / 60));
  const hasAchievements = report.achievements && report.achievements.length > 0;

  const getScoreColor = (_score: number): string => {
    return colors.text.secondary;
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Ecco cosa abbiamo osservato oggi
          </Text>
          <Text variant="bodyLarge" color="secondary">
            {durationMinutes} min di pratica
          </Text>
        </Animated.View>

        {/* Achievements Banner */}
        {hasAchievements && (
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <View
              style={[
                styles.achievementBanner,
                {backgroundColor: colors.brand.primaryLight},
              ]}>
              {report.achievements!.map((a, i) => (
                <Text key={i} variant="bodyMedium" style={styles.achievementText}>
                  {'\u2014'}{' '}
                  {a.description}
                </Text>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Scores */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.scoresSection}>
          <ScoreCircle
            score={report.scores.overall}
            label="Complessivo"
            size="large"
            color={getScoreColor(report.scores.overall)}
          />
          <View style={styles.smallScoresRow}>
            <ScoreCircle
              score={report.scores.fluency}
              label="Fluenza"
              size="small"
              color={getScoreColor(report.scores.fluency)}
            />
            <ScoreCircle
              score={report.scores.accuracy}
              label="Precisione"
              size="small"
              color={getScoreColor(report.scores.accuracy)}
            />
            <ScoreCircle
              score={report.scores.vocabulary}
              label="Vocabolario"
              size="small"
              color={getScoreColor(report.scores.vocabulary)}
            />
          </View>
        </Animated.View>

        {/* Summary */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <View style={[styles.card, {backgroundColor: colors.background.secondary}]}>
            <Text variant="bodyMedium">{report.summary}</Text>
          </View>
        </Animated.View>

        {/* Strengths */}
        {report.strengths.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400).duration(400)}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Cosa abbiamo notato
            </Text>
            {report.strengths.slice(0, 3).map((s, i) => (
              <View key={i} style={styles.listItem}>
                <Text variant="bodyMedium" style={{color: colors.semantic.success}}>
                  {'\u2713'}{' '}
                </Text>
                <Text variant="bodyMedium" style={styles.listItemText}>{s}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Top Mistakes */}
        {report.mistakes.length > 0 && (
          <Animated.View entering={FadeInUp.delay(500).duration(400)}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Aspetti su cui stiamo lavorando
            </Text>
            {report.mistakes.slice(0, 3).map((m, i) => (
              <View
                key={i}
                style={[styles.mistakeCard, {backgroundColor: colors.background.secondary}]}>
                <View style={styles.mistakeHeader}>
                  <Text
                    variant="caption"
                    style={[styles.mistakeType, {backgroundColor: colors.semantic.errorLight, color: colors.semantic.error}]}>
                    {m.type}
                  </Text>
                </View>
                <Text variant="bodySmall">
                  <Text style={{textDecorationLine: 'line-through', color: colors.semantic.error}}>
                    {m.original}
                  </Text>
                  {'  \u2192  '}
                  <Text style={{color: colors.semantic.success, fontWeight: '600'}}>
                    {m.correction}
                  </Text>
                </Text>
                {m.explanation && (
                  <Text variant="caption" color="secondary" style={styles.mistakeExplanation}>
                    {m.explanation}
                  </Text>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Momentum Insight */}
        {momentum && (
          <View style={styles.momentumSection}>
            <MomentumCard insight={momentum} delay={600} />
          </View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(momentum ? 750 : 600).duration(400)} style={styles.actions}>
          <Button
            title="Continua quando vuoi"
            onPress={() => navigation.popToTop()}
            fullWidth
            size="large"
          />
          <TouchableOpacity
            onPress={() => navigation.popToTop()}
            style={styles.secondaryButton}>
            <Text variant="labelLarge" color="link">
              Torna alla Home
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    marginBottom: spacing.xxs,
  },

  // Achievements
  achievementBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  achievementText: {
    marginBottom: spacing.xxs,
  },

  // Scores
  scoresSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreCircleContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLabel: {
    marginTop: spacing.xxs,
  },
  smallScoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  // Sections
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  listItemText: {
    flex: 1,
  },

  // Mistakes
  mistakeCard: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  mistakeHeader: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
  },
  mistakeType: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '600',
  },
  mistakeExplanation: {
    marginTop: spacing.xxs,
  },

  // Momentum
  momentumSection: {
    marginTop: spacing.lg,
  },

  // Actions
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal * 2,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});

export default SessionSummaryScreen;
