import {useTheme} from '@state/hooks/useTheme';
import React, {useEffect, useMemo} from 'react';
import {View, StyleSheet, ViewStyle, Pressable} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

interface WaveformVisualizerProps {
  audioData: number[]; // Normalized amplitudes 0-1
  isPlaying?: boolean;
  playbackPosition?: number; // 0-1 progress
  color?: string;
  activeColor?: string;
  backgroundColor?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  barCount?: number;
  style?: ViewStyle;
  onSeek?: (position: number) => void;
  animated?: boolean;
}

const DEFAULT_BAR_COUNT = 50;
const DEFAULT_HEIGHT = 60;
const DEFAULT_BAR_WIDTH = 3;
const DEFAULT_BAR_GAP = 2;

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioData,
  isPlaying = false,
  playbackPosition = 0,
  color,
  activeColor,
  backgroundColor,
  height = DEFAULT_HEIGHT,
  barWidth = DEFAULT_BAR_WIDTH,
  barGap = DEFAULT_BAR_GAP,
  barCount = DEFAULT_BAR_COUNT,
  style,
  onSeek,
  animated = true,
}) => {
  const {colors} = useTheme();

  const waveformColor = color || colors.voice?.waveformInactive || colors.border.default;
  const waveformActiveColor = activeColor || colors.voice?.waveformActive || colors.brand.primary;
  const bgColor = backgroundColor || 'transparent';

  // Downsample or interpolate audio data to match bar count
  const sampledData = useMemo(() => {
    if (!audioData || audioData.length === 0) {
      return new Array(barCount).fill(0.1);
    }

    const result: number[] = [];
    const step = audioData.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.floor((i + 1) * step);

      // Average the values in this segment
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx && j < audioData.length; j++) {
        sum += audioData[j];
        count++;
      }

      const avg = count > 0 ? sum / count : 0;
      // Ensure minimum height and clamp to max
      result.push(Math.max(0.05, Math.min(1, avg)));
    }

    return result;
  }, [audioData, barCount]);

  const handlePress = (event: {nativeEvent: {locationX: number}}) => {
    if (onSeek) {
      const totalWidth = barCount * (barWidth + barGap) - barGap;
      const position = event.nativeEvent.locationX / totalWidth;
      onSeek(Math.max(0, Math.min(1, position)));
    }
  };

  const containerWidth = barCount * (barWidth + barGap) - barGap;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onSeek}
      style={[
        styles.container,
        {
          height,
          backgroundColor: bgColor,
          width: containerWidth,
        },
        style,
      ]}>
      <View style={styles.barsContainer}>
        {sampledData.map((amplitude, index) => (
          <WaveformBar
            key={index}
            index={index}
            amplitude={amplitude}
            totalBars={barCount}
            playbackPosition={playbackPosition}
            isPlaying={isPlaying}
            color={waveformColor}
            activeColor={waveformActiveColor}
            height={height}
            barWidth={barWidth}
            barGap={barGap}
            animated={animated}
          />
        ))}
      </View>
    </Pressable>
  );
};

interface WaveformBarProps {
  index: number;
  amplitude: number;
  totalBars: number;
  playbackPosition: number;
  isPlaying: boolean;
  color: string;
  activeColor: string;
  height: number;
  barWidth: number;
  barGap: number;
  animated: boolean;
}

const WaveformBar: React.FC<WaveformBarProps> = ({
  index,
  amplitude,
  totalBars,
  playbackPosition,
  isPlaying: _isPlaying,
  color,
  activeColor,
  height,
  barWidth,
  barGap,
  animated,
}) => {
  const animatedHeight = useSharedValue(amplitude * height * 0.8);
  const barPosition = index / totalBars;
  const isActive = barPosition <= playbackPosition;

  useEffect(() => {
    if (animated) {
      animatedHeight.value = withSpring(amplitude * height * 0.8, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      animatedHeight.value = amplitude * height * 0.8;
    }
  }, [amplitude, height, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: barWidth,
          marginRight: barGap,
          backgroundColor: isActive ? activeColor : color,
          borderRadius: barWidth / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

// Live waveform for recording visualization
interface LiveWaveformProps {
  audioLevel: number; // 0-1 current level
  color?: string;
  height?: number;
  barCount?: number;
  style?: ViewStyle;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({
  audioLevel,
  color,
  height = 60,
  barCount = 30,
  style,
}) => {
  const {colors} = useTheme();
  const waveformColor = color || colors.semantic.error;

  // Generate bars with random variation based on audio level
  const bars = useMemo(() => {
    return Array.from({length: barCount}, (_, i) => {
      const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
      const baseHeight = audioLevel * (1 - centerDistance * 0.5);
      const variation = (Math.random() - 0.5) * 0.2;
      return Math.max(0.1, Math.min(1, baseHeight + variation));
    });
  }, [audioLevel, barCount]);

  return (
    <View style={[styles.container, {height}, style]}>
      <View style={styles.barsContainer}>
        {bars.map((amplitude, index) => (
          <LiveBar
            key={index}
            amplitude={amplitude}
            height={height}
            color={waveformColor}
          />
        ))}
      </View>
    </View>
  );
};

interface LiveBarProps {
  amplitude: number;
  height: number;
  color: string;
}

const LiveBar: React.FC<LiveBarProps> = ({amplitude, height, color}) => {
  const animatedHeight = useSharedValue(amplitude * height * 0.8);

  useEffect(() => {
    animatedHeight.value = withTiming(amplitude * height * 0.8, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  }, [amplitude, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: 3,
          marginRight: 2,
          backgroundColor: color,
          borderRadius: 1.5,
        },
        animatedStyle,
      ]}
    />
  );
};

// Comparison waveform showing two overlaid waveforms
interface WaveformComparisonProps {
  referenceData: number[];
  userData: number[];
  referenceColor?: string;
  userColor?: string;
  height?: number;
  barCount?: number;
  style?: ViewStyle;
}

export const WaveformComparison: React.FC<WaveformComparisonProps> = ({
  referenceData,
  userData,
  referenceColor,
  userColor,
  height = 80,
  barCount = 50,
  style,
}) => {
  const {colors} = useTheme();
  const refColor = referenceColor || colors.semantic.info;
  const usrColor = userColor || colors.brand.accent;

  // Sample both datasets
  const sampleData = (data: number[]): number[] => {
    if (!data || data.length === 0) {return new Array(barCount).fill(0.1);}
    const result: number[] = [];
    const step = data.length / barCount;
    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor(i * step);
      result.push(Math.max(0.05, Math.min(1, data[idx] || 0)));
    }
    return result;
  };

  const refSampled = useMemo(() => sampleData(referenceData), [referenceData, barCount]);
  const usrSampled = useMemo(() => sampleData(userData), [userData, barCount]);

  return (
    <View style={[styles.comparisonContainer, {height}, style]}>
      {/* Reference waveform (top half, inverted) */}
      <View style={[styles.halfContainer, {height: height / 2}]}>
        <View style={[styles.barsContainer, styles.invertedBars]}>
          {refSampled.map((amp, i) => (
            <View
              key={`ref-${i}`}
              style={[
                styles.bar,
                {
                  width: 3,
                  marginRight: 2,
                  height: amp * (height / 2) * 0.9,
                  backgroundColor: refColor,
                  borderRadius: 1.5,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Center line */}
      <View style={[styles.centerLine, {backgroundColor: colors.border.default}]} />

      {/* User waveform (bottom half) */}
      <View style={[styles.halfContainer, {height: height / 2}]}>
        <View style={styles.barsContainer}>
          {usrSampled.map((amp, i) => (
            <View
              key={`usr-${i}`}
              style={[
                styles.bar,
                {
                  width: 3,
                  marginRight: 2,
                  height: amp * (height / 2) * 0.9,
                  backgroundColor: usrColor,
                  borderRadius: 1.5,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    minHeight: 4,
  },
  comparisonContainer: {
    width: '100%',
  },
  halfContainer: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  invertedBars: {
    transform: [{scaleY: -1}],
    alignItems: 'flex-start',
  },
  centerLine: {
    height: 1,
    width: '100%',
  },
});

export default WaveformVisualizer;
