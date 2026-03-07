import React, {useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Text} from '../Text';
import {useTheme} from '@state/hooks/useTheme';

interface RecordingButtonProps {
  isRecording: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  recordingDuration?: number; // seconds
  maxDuration?: number; // auto-stop threshold in seconds
  style?: ViewStyle;
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({
  isRecording,
  onPress,
  size = 80,
  disabled = false,
  recordingDuration,
  maxDuration,
  style,
}) => {
  const {colors} = useTheme();
  const pulseScale = useSharedValue(1);
  const innerScale = useSharedValue(1);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, {duration: 600, easing: Easing.inOut(Easing.ease)}),
          withTiming(1, {duration: 600, easing: Easing.inOut(Easing.ease)}),
        ),
        -1,
        true,
      );
      innerScale.value = withTiming(0.6, {duration: 200});
    } else {
      pulseScale.value = withTiming(1, {duration: 200});
      innerScale.value = withTiming(1, {duration: 200});
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseScale.value}],
    opacity: isRecording ? 0.3 : 0,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{scale: innerScale.value}],
    borderRadius: isRecording ? 8 : size / 2,
  }));

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonColor = isRecording
    ? colors.semantic.error
    : colors.voice?.recordingIndicator || colors.semantic.error;

  return (
    <View style={[styles.container, style]}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            backgroundColor: buttonColor,
          },
          pulseStyle,
        ]}
      />

      {/* Main button */}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: disabled ? colors.border.default : buttonColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        <Animated.View
          style={[
            styles.innerCircle,
            {
              width: size * 0.5,
              height: size * 0.5,
              backgroundColor: colors.text.inverse,
            },
            innerStyle,
          ]}
        />
      </TouchableOpacity>

      {/* Duration display */}
      {recordingDuration !== undefined && (
        <View style={styles.durationContainer}>
          <Text
            variant="labelMedium"
            style={{color: isRecording ? colors.semantic.error : colors.text.secondary, fontWeight: '600'}}>
            {formatDuration(recordingDuration)}
          </Text>
          {maxDuration && (
            <Text variant="caption" color="tertiary">
              / {formatDuration(maxDuration)}
            </Text>
          )}
        </View>
      )}

      {/* Recording indicator dot */}
      {isRecording && (
        <View style={styles.indicatorContainer}>
          <RecordingIndicator />
          <Text variant="caption" style={{color: colors.semantic.error, marginLeft: 4}}>
            Recording
          </Text>
        </View>
      )}
    </View>
  );
};

// Blinking recording indicator
const RecordingIndicator: React.FC = () => {
  const {colors} = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, {duration: 500}),
        withTiming(1, {duration: 500}),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.recordingDot,
        {backgroundColor: colors.semantic.error},
        animatedStyle,
      ]}
    />
  );
};

// Play/Pause button for audio playback
interface PlayButtonProps {
  isPlaying: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  isPlaying,
  onPress,
  size = 64,
  disabled = false,
  color,
  style,
}) => {
  const {colors} = useTheme();
  const buttonColor = color || colors.brand.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.playButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? colors.border.default : buttonColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {isPlaying ? (
        // Pause icon
        <View style={styles.pauseIcon}>
          <View style={[styles.pauseBar, {backgroundColor: colors.text.inverse}]} />
          <View style={[styles.pauseBar, {backgroundColor: colors.text.inverse}]} />
        </View>
      ) : (
        // Play icon
        <View
          style={[
            styles.playIcon,
            {
              borderLeftColor: colors.text.inverse,
              borderLeftWidth: size * 0.35,
              borderTopWidth: size * 0.2,
              borderBottomWidth: size * 0.2,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

// Speed control button
interface SpeedButtonProps {
  speed: number;
  onPress: () => void;
  style?: ViewStyle;
}

export const SpeedButton: React.FC<SpeedButtonProps> = ({
  speed,
  onPress,
  style,
}) => {
  const {colors} = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.speedButton,
        {
          backgroundColor: colors.background.secondary,
          borderColor: colors.border.default,
        },
        style,
      ]}>
      <Text variant="labelSmall" style={{fontWeight: '600'}}>
        {speed}x
      </Text>
    </TouchableOpacity>
  );
};

// Combined audio controls
interface AudioControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentSpeed: number;
  onSpeedChange: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  onPlayPause,
  currentSpeed,
  onSpeedChange,
  disabled = false,
  style,
}) => {
  return (
    <View style={[styles.audioControls, style]}>
      <SpeedButton speed={currentSpeed} onPress={onSpeedChange} />
      <PlayButton
        isPlaying={isPlaying}
        onPress={onPlayPause}
        disabled={disabled}
      />
      <View style={styles.spacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  innerCircle: {
    // borderRadius set dynamically
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 20,
    borderRadius: 2,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spacer: {
    width: 48, // Same as speed button to center play button
  },
});

export default RecordingButton;
