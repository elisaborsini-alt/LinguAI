import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from './Text';
import {Card} from './Card';
import {useTheme} from '@state/hooks/useTheme';
import type {EmotionalState} from '@appTypes/domain';

interface EmotionDistribution {
  emotion: EmotionalState;
  percentage: number;
}

interface EmotionSummary {
  dominantEmotion: EmotionalState;
  engagementLevel: 'high' | 'medium' | 'low';
  emotionDistribution: EmotionDistribution[];
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
}

interface EmotionSummaryCardProps {
  summary: EmotionSummary;
}

const EMOTION_CONFIG: Record<EmotionalState, {color: string; icon: string; label: string}> = {
  confident: {color: '#4CAF50', icon: '', label: 'Confident'},
  enthusiastic: {color: '#FF9800', icon: '', label: 'Enthusiastic'},
  frustrated: {color: '#F44336', icon: '', label: 'Frustrated'},
  anxious: {color: '#9C27B0', icon: '', label: 'Anxious'},
  bored: {color: '#607D8B', icon: '', label: 'Disengaged'},
  confused: {color: '#FF5722', icon: '', label: 'Confused'},
  tired: {color: '#795548', icon: '', label: 'Tired'},
  neutral: {color: '#2196F3', icon: '', label: 'Neutral'},
};

const ENGAGEMENT_CONFIG = {
  high: {color: '#4CAF50', label: 'Presente', icon: ''},
  medium: {color: '#FF9800', label: 'In ascolto', icon: ''},
  low: {color: '#F44336', label: 'Distante', icon: ''},
};

const TREND_CONFIG = {
  improving: {color: '#4CAF50', label: 'In evoluzione', icon: ''},
  stable: {color: '#2196F3', label: 'Costante', icon: ''},
  declining: {color: '#FF9800', label: 'In variazione', icon: ''},
};

export const EmotionSummaryCard: React.FC<EmotionSummaryCardProps> = ({summary}) => {
  const {colors} = useTheme();
  const dominantConfig = EMOTION_CONFIG[summary.dominantEmotion];
  const engagementConfig = ENGAGEMENT_CONFIG[summary.engagementLevel];
  const trendConfig = TREND_CONFIG[summary.trend];

  return (
    <Card variant="outlined" padding="md">
      {/* Dominant Emotion */}
      <View style={styles.section}>
        <Text variant="labelMedium" color="secondary">
          Dominant Mood
        </Text>
        <View style={styles.dominantContainer}>
          <View
            style={[
              styles.dominantBadge,
              {backgroundColor: dominantConfig.color + '20'},
            ]}>
            <Text style={styles.dominantIcon}>{dominantConfig.icon}</Text>
            <Text
              variant="bodyLarge"
              style={{color: dominantConfig.color, fontWeight: '600'}}>
              {dominantConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Engagement & Trend */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text variant="caption" color="secondary">
            Engagement
          </Text>
          <View style={styles.metricValue}>
            <Text style={styles.metricIcon}>{engagementConfig.icon}</Text>
            <Text variant="labelMedium" style={{color: engagementConfig.color}}>
              {engagementConfig.label}
            </Text>
          </View>
        </View>
        <View style={styles.metric}>
          <Text variant="caption" color="secondary">
            Trend
          </Text>
          <View style={styles.metricValue}>
            <Text style={styles.metricIcon}>{trendConfig.icon}</Text>
            <Text variant="labelMedium" style={{color: trendConfig.color}}>
              {trendConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Emotion Distribution */}
      {summary.emotionDistribution.length > 0 && (
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.distributionTitle}>
            Session Breakdown
          </Text>
          <View style={styles.distributionContainer}>
            {summary.emotionDistribution
              .filter(e => e.percentage > 5)
              .slice(0, 4)
              .map((item, index) => {
                const config = EMOTION_CONFIG[item.emotion];
                return (
                  <View key={index} style={styles.distributionItem}>
                    <View
                      style={[
                        styles.distributionBar,
                        {
                          width: `${Math.max(item.percentage, 10)}%`,
                          backgroundColor: config.color,
                        },
                      ]}
                    />
                    <View style={styles.distributionLabel}>
                      <Text style={styles.distributionIcon}>{config.icon}</Text>
                      <Text variant="caption" color="secondary">
                        {Math.round(item.percentage)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* Insights */}
      {summary.insights.length > 0 && (
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.insightsTitle}>
            Emotional Insights
          </Text>
          {summary.insights.slice(0, 2).map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text variant="bodySmall" color="secondary">
                • {insight}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

// Compact version for session end summary
interface EmotionSessionBadgeProps {
  emotion: EmotionalState;
  engagementLevel: 'high' | 'medium' | 'low';
}

export const EmotionSessionBadge: React.FC<EmotionSessionBadgeProps> = ({
  emotion,
  engagementLevel,
}) => {
  const config = EMOTION_CONFIG[emotion];
  const engagement = ENGAGEMENT_CONFIG[engagementLevel];

  return (
    <View style={styles.sessionBadge}>
      <View style={[styles.badgeIcon, {backgroundColor: config.color + '20'}]}>
        <Text style={styles.badgeIconText}>{config.icon}</Text>
      </View>
      <View style={styles.badgeContent}>
        <Text variant="labelMedium" style={{color: config.color}}>
          {config.label}
        </Text>
        <Text variant="caption" style={{color: engagement.color}}>
          {engagement.icon} {engagement.label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  dominantContainer: {
    marginTop: 8,
  },
  dominantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  dominantIcon: {
    fontSize: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metricIcon: {
    fontSize: 16,
  },
  distributionTitle: {
    marginBottom: 8,
  },
  distributionContainer: {
    gap: 8,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionBar: {
    height: 20,
    borderRadius: 4,
    minWidth: 20,
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distributionIcon: {
    fontSize: 14,
  },
  insightsTitle: {
    marginBottom: 8,
  },
  insightItem: {
    marginBottom: 4,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIconText: {
    fontSize: 24,
  },
  badgeContent: {
    gap: 2,
  },
});

export default EmotionSummaryCard;
