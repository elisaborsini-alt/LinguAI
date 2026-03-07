import React, {useState, useCallback} from 'react';
import {View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {Text, Card, Button} from '@ui/components';
import {
  ScoreCircle,
  ScoreBreakdown,
  WaveformComparison,
  PitchContourChart,
  TimingComparison,
} from '@ui/components/pronunciation';
import {spacing} from '@ui/theme';
import type {ConversationStackScreenProps} from '@appTypes/navigation';
import type {
  PronunciationAnalysis,
  PronunciationFeedback,
  PitchPoint,
} from '@appTypes/pronunciation';

type NavigationProp = ConversationStackScreenProps<'PronunciationResults'>['navigation'];
type RouteProp = ConversationStackScreenProps<'PronunciationResults'>['route'];

// Mock analysis result
const MOCK_ANALYSIS: PronunciationAnalysis = {
  overallScore: 78,
  rhythmScore: 82,
  pitchScore: 75,
  clarityScore: 77,
  userDurationMs: 1650,
  referenceDurationMs: 1500,
  durationDifferencePercent: 10,
  transcript: 'Hello, how are you?',
  transcriptConfidence: 0.92,
  pitchComparison: {
    correlationCoefficient: 0.75,
    avgPitchDifferenceHz: 15,
    avgPitchDifferenceSemitones: 1.2,
    userPitchMean: 165,
    referencePitchMean: 150,
    userPitchVariance: 25,
    referencePitchVariance: 30,
    divergentSegments: [
      {startMs: 500, endMs: 800, difference: 25},
    ],
  },
  timingComparison: {
    overallAlignmentScore: 82,
    tempoRatio: 1.1,
    wordTimings: [
      {word: 'Hello', referenceDurationMs: 400, userDurationMs: 450, differenceMs: 50},
      {word: 'how', referenceDurationMs: 200, userDurationMs: 180, differenceMs: -20},
      {word: 'are', referenceDurationMs: 200, userDurationMs: 220, differenceMs: 20},
      {word: 'you', referenceDurationMs: 300, userDurationMs: 350, differenceMs: 50},
    ],
  },
  wordAnalysis: [
    {word: 'Hello', position: 0, recognized: true, confidence: 0.95, pronunciationScore: 85},
    {word: 'how', position: 1, recognized: true, confidence: 0.90, pronunciationScore: 75},
    {word: 'are', position: 2, recognized: true, confidence: 0.92, pronunciationScore: 80},
    {word: 'you', position: 3, recognized: true, confidence: 0.88, pronunciationScore: 72, issues: ['vowel clarity']},
  ],
};

const MOCK_FEEDBACK: PronunciationFeedback = {
  overallMessage: 'Your pronunciation is clear and understandable.',
  specificIssues: [
    {
      category: 'rhythm_too_slow',
      message: 'Your pace was slightly slower than natural speech',
      severity: 'minor',
      suggestion: 'Try to maintain a more natural rhythm without rushing',
    },
    {
      category: 'pitch_wrong_pattern',
      segment: 'you',
      message: 'The rising intonation on "you" could be more natural',
      severity: 'minor',
      suggestion: 'Practice the question intonation pattern',
    },
  ],
  encouragement: 'You\'re making great progress! Keep practicing.',
  focusArea: 'Question intonation',
  nextSteps: [
    'Practice more question phrases',
    'Listen carefully to native rising intonation',
    'Record yourself and compare regularly',
  ],
};

// Generate mock pitch data
const generateMockPitchData = (basePitch: number, duration: number): PitchPoint[] => {
  const points: PitchPoint[] = [];
  const step = 50; // ms per point
  for (let t = 0; t < duration; t += step) {
    points.push({
      timestamp: t,
      frequency: basePitch + Math.sin(t / 200) * 20 + Math.random() * 10,
      confidence: 0.8 + Math.random() * 0.2,
    });
  }
  return points;
};

const MOCK_REF_PITCH = generateMockPitchData(150, 1500);
const MOCK_USER_PITCH = generateMockPitchData(165, 1650);
const MOCK_REF_WAVEFORM = Array.from({length: 50}, () => Math.random() * 0.8 + 0.1);
const MOCK_USER_WAVEFORM = Array.from({length: 50}, () => Math.random() * 0.8 + 0.1);

export const PronunciationResultsScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();

  const {phraseId} = route.params;
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'feedback'>('overview');

  const analysis = MOCK_ANALYSIS;
  const feedback = MOCK_FEEDBACK;

  const handleTryAgain = useCallback(() => {
    navigation.navigate('PronunciationSession', {phraseId});
  }, [navigation, phraseId]);

  const handleNextPhrase = useCallback(() => {
    navigation.navigate('PronunciationPractice');
  }, [navigation]);

  const handleDone = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const getScoreMessage = (score: number): string => {
    if (score >= 90) return 'Molto vicino al riferimento';
    if (score >= 80) return 'Vicino al riferimento';
    if (score >= 70) return 'In costruzione';
    if (score >= 60) return 'Stiamo lavorando su questo';
    return "C'è spazio per esplorare";
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Main score */}
      <View style={styles.scoreSection}>
        <ScoreCircle
          score={analysis.overallScore}
          size={160}
          strokeWidth={14}
          label={getScoreMessage(analysis.overallScore)}
        />
      </View>

      {/* Score breakdown */}
      <Card variant="outlined" style={styles.breakdownCard}>
        <Text variant="titleSmall" style={styles.cardTitle}>
          Dettagli
        </Text>
        <View style={styles.scoreRow}>
          <ScoreItem label="Rhythm" score={analysis.rhythmScore} icon="" />
          <ScoreItem label="Pitch" score={analysis.pitchScore} icon="" />
          <ScoreItem label="Clarity" score={analysis.clarityScore} icon="" />
        </View>
      </Card>

      {/* Quick feedback */}
      <Card variant="outlined" style={styles.feedbackCard}>
        <Text variant="bodyMedium" style={{color: colors.semantic.success, fontWeight: '500'}}>
          {feedback.overallMessage}
        </Text>
        <Text variant="bodySmall" color="secondary" style={styles.encouragement}>
          {feedback.encouragement}
        </Text>
      </Card>
    </View>
  );

  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      {/* Waveform comparison */}
      <Card variant="outlined" style={styles.chartCard}>
        <Text variant="titleSmall" style={styles.cardTitle}>
          Waveform Comparison
        </Text>
        <WaveformComparison
          referenceData={MOCK_REF_WAVEFORM}
          userData={MOCK_USER_WAVEFORM}
          height={100}
        />
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: colors.semantic.info}]} />
            <Text variant="caption" color="secondary">Native</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: colors.brand.accent}]} />
            <Text variant="caption" color="secondary">You</Text>
          </View>
        </View>
      </Card>

      {/* Pitch contour */}
      <Card variant="outlined" style={styles.chartCard}>
        <Text variant="titleSmall" style={styles.cardTitle}>
          Pitch Pattern
        </Text>
        <PitchContourChart
          referencePitchData={MOCK_REF_PITCH}
          userPitchData={MOCK_USER_PITCH}
          durationMs={1650}
          height={180}
          showLegend={true}
          highlightDifferences={true}
        />
      </Card>

      {/* Timing comparison */}
      <Card variant="outlined" style={styles.chartCard}>
        <TimingComparison
          referenceDuration={analysis.referenceDurationMs}
          userDuration={analysis.userDurationMs}
        />
      </Card>

      {/* Word-by-word analysis */}
      <Card variant="outlined" style={styles.wordCard}>
        <Text variant="titleSmall" style={styles.cardTitle}>
          Word Analysis
        </Text>
        {analysis.wordAnalysis.map((word, index) => (
          <View
            key={index}
            style={[
              styles.wordRow,
              index < analysis.wordAnalysis.length - 1 && styles.wordRowBorder,
            ]}>
            <View style={styles.wordInfo}>
              <Text variant="bodyMedium" style={{fontWeight: '500'}}>
                {word.word}
              </Text>
              {word.issues && word.issues.length > 0 && (
                <Text variant="caption" style={{color: colors.semantic.warning}}>
                  {word.issues.join(', ')}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.wordScore,
                {
                  backgroundColor:
                    word.pronunciationScore >= 80
                      ? colors.semantic.success + '20'
                      : word.pronunciationScore >= 60
                      ? colors.semantic.warning + '20'
                      : colors.semantic.error + '20',
                },
              ]}>
              <Text
                variant="labelSmall"
                style={{
                  color:
                    word.pronunciationScore >= 80
                      ? colors.semantic.success
                      : word.pronunciationScore >= 60
                      ? colors.semantic.warning
                      : colors.semantic.error,
                }}>
                {word.pronunciationScore}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );

  const renderFeedbackTab = () => (
    <View style={styles.tabContent}>
      {/* Focus area */}
      <Card variant="outlined" style={styles.focusCard}>
        <Text variant="labelMedium" color="secondary">
          Focus Area
        </Text>
        <Text variant="titleMedium" style={styles.focusTitle}>
          {feedback.focusArea}
        </Text>
      </Card>

      {/* Specific issues */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        Things to Improve
      </Text>
      {feedback.specificIssues.map((issue, index) => (
        <Card key={index} variant="outlined" style={styles.issueCard}>
          <View style={styles.issueHeader}>
            <View
              style={[
                styles.severityBadge,
                {
                  backgroundColor:
                    issue.severity === 'significant'
                      ? colors.semantic.error + '20'
                      : issue.severity === 'moderate'
                      ? colors.semantic.warning + '20'
                      : colors.semantic.success + '20',
                },
              ]}>
              <Text
                variant="caption"
                style={{
                  color:
                    issue.severity === 'significant'
                      ? colors.semantic.error
                      : issue.severity === 'moderate'
                      ? colors.semantic.warning
                      : colors.semantic.success,
                }}>
                {issue.severity}
              </Text>
            </View>
            {issue.segment && (
              <Text variant="labelSmall" color="secondary">
                "{issue.segment}"
              </Text>
            )}
          </View>
          <Text variant="bodyMedium" style={styles.issueMessage}>
            {issue.message}
          </Text>
          {issue.suggestion && (
            <Text variant="bodySmall" color="secondary">
              💡 {issue.suggestion}
            </Text>
          )}
        </Card>
      ))}

      {/* Next steps */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        Next Steps
      </Text>
      <Card variant="outlined" style={styles.stepsCard}>
        {feedback.nextSteps.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <Text variant="bodyMedium" style={styles.stepNumber}>
              {index + 1}
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDone} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text variant="titleMedium">Results</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'details', 'feedback'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && {
                borderBottomColor: colors.brand.primary,
                borderBottomWidth: 2,
              },
            ]}>
            <Text
              variant="labelMedium"
              style={{
                color:
                  activeTab === tab ? colors.brand.primary : colors.text.secondary,
              }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'feedback' && renderFeedbackTab()}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button title="Try Again" variant="outline" onPress={handleTryAgain} style={styles.actionButton} />
        <Button title="Next Phrase" variant="primary" onPress={handleNextPhrase} style={styles.actionButton} />
      </View>
    </SafeAreaView>
  );
};

interface ScoreItemProps {
  label: string;
  score: number;
  icon: string;
}

const ScoreItem: React.FC<ScoreItemProps> = ({label, score, icon}) => {
  const {colors} = useTheme();

  const getScoreColor = (value: number): string => {
    if (value >= 80) return colors.semantic.success;
    if (value >= 60) return colors.semantic.warning;
    return colors.semantic.error;
  };

  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreIcon}>{icon}</Text>
      <Text variant="headlineSmall" style={{color: getScoreColor(score)}}>
        {score}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeIcon: {
    fontSize: 20,
  },
  headerSpacer: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  tabContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  breakdownCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  feedbackCard: {
    padding: spacing.md,
  },
  encouragement: {
    marginTop: spacing.xs,
  },
  chartCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  wordCard: {
    padding: spacing.md,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  wordRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  wordInfo: {
    flex: 1,
  },
  wordScore: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  focusCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  focusTitle: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  issueCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  issueMessage: {
    marginBottom: spacing.xs,
  },
  stepsCard: {
    padding: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: spacing.sm,
  },
  stepText: {
    flex: 1,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
  },
});

export default PronunciationResultsScreen;
