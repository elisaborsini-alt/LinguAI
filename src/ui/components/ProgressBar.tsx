import {useTheme} from '@state/hooks/useTheme';
import React from 'react';
import {View, StyleSheet, ViewStyle, LayoutChangeEvent} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';


interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  showLabel?: boolean;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color,
  backgroundColor,
  animated = true,
  style,
}) => {
  const {colors} = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const trackWidth = useSharedValue(0);

  const fillColor = color || colors.brand.primary;
  const trackColor = backgroundColor || colors.background.tertiary;

  const onLayout = (event: LayoutChangeEvent) => {
    trackWidth.value = event.nativeEvent.layout.width;
  };

  const animatedStyle = useAnimatedStyle(() => {
    const targetWidth = trackWidth.value * (clampedProgress / 100);
    return {
      width: animated
        ? withTiming(targetWidth, {
            duration: 300,
            easing: Easing.out(Easing.ease),
          })
        : targetWidth,
    };
  }, [clampedProgress, animated]);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor,
          borderRadius: height / 2,
        },
        style,
      ]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default ProgressBar;
