import type {EmotionalState, EmotionFeedback} from '@core/emotion';
import {useTheme} from '@state/hooks/useTheme';
import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';

import {Text} from './Text';

interface EmotionIndicatorProps {
  emotion: EmotionalState;
  confidence: number;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

const EMOTION_COLORS: Record<EmotionalState, string> = {
  confident: '#4CAF50',
  enthusiastic: '#FF9800',
  frustrated: '#F44336',
  anxious: '#9C27B0',
  bored: '#607D8B',
  confused: '#FF5722',
  tired: '#795548',
  neutral: '#2196F3',
};

const EMOTION_ICONS: Record<EmotionalState, string> = {
  confident: '',
  enthusiastic: '',
  frustrated: '',
  anxious: '',
  bored: '',
  confused: '',
  tired: '',
  neutral: '',
};

const EMOTION_LABELS: Record<EmotionalState, string> = {
  confident: 'Confident',
  enthusiastic: 'Enthusiastic',
  frustrated: 'Frustrated',
  anxious: 'Anxious',
  bored: 'Disengaged',
  confused: 'Confused',
  tired: 'Tired',
  neutral: 'Neutral',
};

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({
  emotion,
  confidence,
  showLabel = true,
  size = 'medium',
  animated = true,
}) => {
  const {colors} = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const emotionColor = EMOTION_COLORS[emotion];
  const emotionIcon = EMOTION_ICONS[emotion];
  const emotionLabel = EMOTION_LABELS[emotion];

  // Size configurations
  const sizes = {
    small: {container: 32, icon: 16, label: 10},
    medium: {container: 48, icon: 24, label: 12},
    large: {container: 64, icon: 32, label: 14},
  };
  const sizeConfig = sizes[size];

  // Animate on emotion change
  useEffect(() => {
    if (animated) {
      // Fade in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse effect for high-intensity emotions
      if (['frustrated', 'anxious', 'enthusiastic'].includes(emotion)) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ).start();
      } else {
        pulseAnim.setValue(1);
      }
    }
  }, [emotion, animated]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.indicator,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.container / 2,
            backgroundColor: emotionColor + '20',
            borderColor: emotionColor,
            transform: [{scale: pulseAnim}],
            opacity: opacityAnim,
          },
        ]}>
        <Text style={{fontSize: sizeConfig.icon}}>{emotionIcon}</Text>
      </Animated.View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text
            variant="caption"
            style={[styles.label, {color: emotionColor, fontSize: sizeConfig.label}]}>
            {emotionLabel}
          </Text>
          <View
            style={[
              styles.confidenceBar,
              {backgroundColor: colors.border.default},
            ]}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${confidence * 100}%`,
                  backgroundColor: emotionColor,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

interface EmotionFeedbackBannerProps {
  feedback: EmotionFeedback | null;
  onDismiss?: () => void;
}

export const EmotionFeedbackBanner: React.FC<EmotionFeedbackBannerProps> = ({
  feedback,
  onDismiss,
}) => {
  const {colors} = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (feedback && feedback.primaryEmotion !== 'neutral') {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss?.());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!feedback || feedback.primaryEmotion === 'neutral') {
    return null;
  }

  const emotionColor = EMOTION_COLORS[feedback.primaryEmotion];
  const emotionIcon = EMOTION_ICONS[feedback.primaryEmotion];

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: emotionColor + '15',
          borderLeftColor: emotionColor,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <Text style={styles.bannerIcon}>{emotionIcon}</Text>
      <View style={styles.bannerContent}>
        {feedback.message && (
          <Text variant="bodyMedium" style={{color: emotionColor, fontWeight: '600'}}>
            {feedback.message}
          </Text>
        )}
        {feedback.suggestion && (
          <Text variant="caption" style={{color: colors.text.secondary}}>
            {feedback.suggestion}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

interface EmotionHistoryProps {
  history: Array<{emotion: EmotionalState; timestamp: number}>;
  maxItems?: number;
}

export const EmotionHistory: React.FC<EmotionHistoryProps> = ({
  history,
  maxItems = 10,
}) => {
  const {colors} = useTheme();
  const recentHistory = history.slice(-maxItems);

  if (recentHistory.length === 0) {
    return null;
  }

  return (
    <View style={styles.historyContainer}>
      <Text variant="caption" style={{color: colors.text.secondary, marginBottom: 8}}>
        Emotional Journey
      </Text>
      <View style={styles.historyTrack}>
        {recentHistory.map((item, index) => (
          <View key={index} style={styles.historyItem}>
            <View
              style={[
                styles.historyDot,
                {
                  backgroundColor: EMOTION_COLORS[item.emotion],
                },
              ]}
            />
            {index < recentHistory.length - 1 && (
              <View
                style={[
                  styles.historyLine,
                  {backgroundColor: colors.border.default},
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.historyLabels}>
        <Text variant="caption" style={{color: colors.text.tertiary}}>
          Start
        </Text>
        <Text variant="caption" style={{color: colors.text.tertiary}}>
          Now
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  indicator: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    fontWeight: '600',
  },
  confidenceBar: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  historyContainer: {
    padding: 16,
  },
  historyTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  historyLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  historyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

export default EmotionIndicator;
