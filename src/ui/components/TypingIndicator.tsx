import {useTheme} from '@state/hooks/useTheme';
import {spacing, borderRadius} from '@ui/theme';
import React from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';


interface TypingIndicatorProps {
  /** Dot color override (defaults to chat.aiText at 40% opacity) */
  color?: string;
  /** Overall size scale: 'small' (6px dots) or 'medium' (8px dots) */
  size?: 'small' | 'medium';
}

const DOT_ANIMATION_DURATION = 400;
const STAGGER_DELAY = 150;

const AnimatedDot: React.FC<{delay: number; dotSize: number; color: string}> = ({
  delay,
  dotSize,
  color,
}) => {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {duration: DOT_ANIMATION_DURATION}),
          withTiming(0.3, {duration: DOT_ANIMATION_DURATION}),
        ),
        -1,
      ),
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, {duration: DOT_ANIMATION_DURATION}),
          withTiming(1, {duration: DOT_ANIMATION_DURATION}),
        ),
        -1,
      ),
    );
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{scale: scale.value}],
  }));

  return (
    <Animated.View
      style={[
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  color,
  size = 'medium',
}) => {
  const {colors} = useTheme();

  const dotSize = size === 'small' ? 6 : 8;
  const dotColor = color || colors.chat.aiText;
  const bubbleColor = colors.chat.aiBubble;

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, {backgroundColor: bubbleColor}]}>
        <AnimatedDot delay={0} dotSize={dotSize} color={dotColor} />
        <AnimatedDot delay={STAGGER_DELAY} dotSize={dotSize} color={dotColor} />
        <AnimatedDot delay={STAGGER_DELAY * 2} dotSize={dotSize} color={dotColor} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.messageBubble,
  },
});

export default TypingIndicator;
