import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Animated, {FadeInUp, FadeInDown} from 'react-native-reanimated';

interface SessionReportData {
  summary: string;
  duration: number;
  scores: {
    overall: number;
    fluency: number;
    accuracy: number;
    vocabulary: number;
  };
  strengths: string[];
  areasToImprove: string[];
  mistakes: Array<{
    type: string;
    original: string;
    correction: string;
    explanation: string;
    frequency: number;
  }>;
  newVocabulary: Array<{
    word: string;
    translation?: string;
    context: string;
    difficulty: string;
  }>;
  suggestions: string[];
  nextSteps: string[];
  achievements?: Array<{
    type: string;
    description: string;
  }>;
}

export const SessionReportScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  // Get report data from route params
  const report = (route.params as any)?.report as SessionReportData | undefined;

  if (!report) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" color="secondary" align="center">
            No report data available
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={{marginTop: spacing.lg}}
          />
        </View>
      </SafeAreaView>
    );
  }

  const getScoreColor = (_score: number): string => {
    return colors.text.secondary;
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text variant="headlineMedium">Sessione conclusa</Text>
          <Text variant="bodyMedium" color="secondary">
            {report.duration} minuti insieme
          </Text>
        </Animated.View>

        {/* Achievements */}
        {report.achievements && report.achievements.length > 0 && (
          <Animated.View entering={FadeInUp.delay(150)} style={styles.section}>
            <View style={[styles.achievementBanner, {backgroundColor: colors.semantic.successLight}]}>
              {report.achievements.map((achievement, index) => (
                <View key={index} style={styles.achievementItem}>
                  <Text style={styles.achievementIcon}>
                    {'\u2014'}
                  </Text>
                  <Text variant="bodyMedium" style={{color: colors.brand.primaryDark}}>
                    {achievement.description}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Score Overview */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
          <View style={styles.scoreGrid}>
            <ScoreCircle
              score={report.scores.overall}
              label="Overall"
              color={getScoreColor(report.scores.overall)}
              isLarge
            />
            <View style={styles.scoreRow}>
              <ScoreCircle
                score={report.scores.fluency}
                label="Fluency"
                color={getScoreColor(report.scores.fluency)}
              />
              <ScoreCircle
                score={report.scores.accuracy}
                label="Accuracy"
                color={getScoreColor(report.scores.accuracy)}
              />
              <ScoreCircle
                score={report.scores.vocabulary}
                label="Vocabulary"
                color={getScoreColor(report.scores.vocabulary)}
              />
            </View>
          </View>
        </Animated.View>

        {/* Summary */}
        <Animated.View entering={FadeInUp.delay(250)} style={styles.section}>
          <Card variant="outlined" padding="md">
            <Text variant="bodyMedium">{report.summary}</Text>
          </Card>
        </Animated.View>

        {/* Strengths & Areas to Improve */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Osservazioni
          </Text>
          <Card variant="outlined" padding="md">
            {report.strengths.length > 0 && (
              <View style={styles.analysisSection}>
                <Text variant="labelMedium" style={{color: colors.semantic.success}}>
                  Cosa è emerso
                </Text>
                {report.strengths.map((strength, index) => (
                  <Text key={index} variant="bodySmall" color="secondary">
                    • {strength}
                  </Text>
                ))}
              </View>
            )}
            {report.areasToImprove.length > 0 && (
              <View style={[styles.analysisSection, {marginTop: spacing.md}]}>
                <Text variant="labelMedium" style={{color: colors.semantic.warning}}>
                  Aspetti su cui stiamo lavorando
                </Text>
                {report.areasToImprove.map((area, index) => (
                  <Text key={index} variant="bodySmall" color="secondary">
                    • {area}
                  </Text>
                ))}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Mistakes */}
        {report.mistakes.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350)} style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Corrections ({report.mistakes.length})
            </Text>
            {report.mistakes.slice(0, 5).map((mistake, index) => (
              <Card key={index} variant="outlined" padding="sm" style={styles.mistakeCard}>
                <View style={styles.mistakeHeader}>
                  <View style={[styles.mistakeBadge, {backgroundColor: colors.semantic.errorLight}]}>
                    <Text variant="caption" style={{color: colors.semantic.error}}>
                      {mistake.type}
                    </Text>
                  </View>
                  {mistake.frequency > 1 && (
                    <Text variant="caption" color="secondary">
                      {mistake.frequency}x
                    </Text>
                  )}
                </View>
                <View style={styles.mistakeContent}>
                  <Text variant="bodySmall" style={{textDecorationLine: 'line-through', color: colors.semantic.error}}>
                    {mistake.original}
                  </Text>
                  <Text variant="bodySmall" style={{color: colors.semantic.success}}>
                    {mistake.correction}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  {mistake.explanation}
                </Text>
              </Card>
            ))}
          </Animated.View>
        )}

        {/* New Vocabulary */}
        {report.newVocabulary.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              New Vocabulary ({report.newVocabulary.length})
            </Text>
            <Card variant="outlined" padding="md">
              {report.newVocabulary.map((vocab, index) => (
                <View key={index} style={styles.vocabItem}>
                  <View style={styles.vocabHeader}>
                    <Text variant="bodyMedium" style={{fontWeight: '600'}}>
                      {vocab.word}
                    </Text>
                    <View style={[styles.levelBadge, {backgroundColor: colors.levels[vocab.difficulty as keyof typeof colors.levels] || colors.text.secondary}]}>
                      <Text variant="caption" style={{color: '#FFF'}}>
                        {vocab.difficulty}
                      </Text>
                    </View>
                  </View>
                  {vocab.translation && (
                    <Text variant="caption" color="secondary">
                      {vocab.translation}
                    </Text>
                  )}
                  <Text variant="caption" color="secondary" style={{fontStyle: 'italic'}}>
                    &quot;{vocab.context}&quot;
                  </Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Next Steps */}
        {report.nextSteps.length > 0 && (
          <Animated.View entering={FadeInUp.delay(450)} style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Next Steps
            </Text>
            <Card variant="elevated" padding="md" style={{backgroundColor: colors.brand.primaryLight}}>
              {report.nextSteps.map((step, index) => (
                <Text key={index} variant="bodySmall" style={{color: colors.brand.primaryDark, marginBottom: spacing.xs}}>
                  {index + 1}. {step}
                </Text>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.actions}>
          <Button
            title="Continua"
            onPress={() => (navigation.navigate as (screen: string, params: object) => void)('ConversationTab', {screen: 'ConversationHome'})}
            variant="primary"
            fullWidth
          />
          <Button
            title="Vedi il percorso"
            onPress={() => (navigation.navigate as (screen: string, params: object) => void)('ProgressTab', {screen: 'ProgressDashboard'})}
            variant="secondary"
            fullWidth
            style={{marginTop: spacing.sm}}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface ScoreCircleProps {
  score: number;
  label: string;
  color: string;
  isLarge?: boolean;
}

const ScoreCircle: React.FC<ScoreCircleProps> = ({score, label, color, isLarge}) => {
  const size = isLarge ? 100 : 70;
  const fontSize = isLarge ? 28 : 18;

  return (
    <View style={styles.scoreCircleContainer}>
      <View
        style={[
          styles.scoreCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
        ]}>
        <Text
          style={[styles.scoreValue, {fontSize, color}]}>
          {score}
        </Text>
      </View>
      <Text variant={isLarge ? 'labelMedium' : 'caption'} color="secondary" style={{marginTop: spacing.xs}}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  achievementBanner: {
    padding: spacing.md,
    borderRadius: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xxs,
  },
  achievementIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  scoreGrid: {
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
  },
  scoreCircleContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontWeight: '700',
  },
  analysisSection: {},
  mistakeCard: {
    marginBottom: spacing.sm,
  },
  mistakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mistakeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mistakeContent: {
    marginBottom: spacing.xs,
  },
  vocabItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  vocabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actions: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
  },
});

export default SessionReportScreen;
