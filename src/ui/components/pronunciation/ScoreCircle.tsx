import React, {useEffect} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {Text} from '../Text';
import {useTheme} from '@state/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreCircleProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  animationDuration?: number;
  label?: string;
  sublabel?: string;
  showScore?: boolean;
  style?: ViewStyle;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  animated = true,
  animationDuration = 1000,
  label,
  sublabel,
  showScore = true,
  style,
}) => {
  const {colors} = useTheme();
  const animatedScore = useSharedValue(0);
  const [displayScore, setDisplayScore] = React.useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Get color based on score
  const getScoreColor = (value: number): string => {
    if (value >= 80) return colors.semantic.success;
    if (value >= 60) return colors.semantic.warning;
    return colors.semantic.error;
  };

  const scoreColor = getScoreColor(score);

  useEffect(() => {
    if (animated) {
      animatedScore.value = withTiming(score, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      });

      // Animate display score
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // cubic ease out
        setDisplayScore(Math.round(easedProgress * score));

        if (progress >= 1) {
          clearInterval(interval);
        }
      }, 16);

      return () => clearInterval(interval);
    } else {
      animatedScore.value = score;
      setDisplayScore(score);
    }
  }, [score, animated, animationDuration]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedScore.value / 100),
  }));

  return (
    <View style={[styles.container, {width: size, height: size}, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border.default}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {showScore && (
          <Text variant="headlineLarge" style={{color: scoreColor, fontWeight: '700'}}>
            {displayScore}
          </Text>
        )}
        {label && (
          <Text variant="labelMedium" color="secondary" style={styles.label}>
            {label}
          </Text>
        )}
        {sublabel && (
          <Text variant="caption" color="tertiary">
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
};

// Mini score circle for compact display
interface MiniScoreProps {
  score: number;
  size?: number;
  label?: string;
  style?: ViewStyle;
}

export const MiniScore: React.FC<MiniScoreProps> = ({
  score,
  size = 48,
  label,
  style,
}) => {
  const {colors} = useTheme();
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - score / 100);

  const getScoreColor = (value: number): string => {
    if (value >= 80) return colors.semantic.success;
    if (value >= 60) return colors.semantic.warning;
    return colors.semantic.error;
  };

  const scoreColor = getScoreColor(score);

  return (
    <View style={[styles.miniContainer, style]}>
      <View style={{width: size, height: size}}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border.default}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={progress}
            />
          </G>
        </Svg>
        <View style={[styles.centerContent, {position: 'absolute', width: size, height: size}]}>
          <Text variant="labelSmall" style={{color: scoreColor, fontWeight: '700'}}>
            {score}
          </Text>
        </View>
      </View>
      {label && (
        <Text variant="caption" color="secondary" style={styles.miniLabel}>
          {label}
        </Text>
      )}
    </View>
  );
};

// Score breakdown showing multiple scores
interface ScoreBreakdownProps {
  overallScore: number;
  rhythmScore: number;
  pitchScore: number;
  clarityScore: number;
  style?: ViewStyle;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  overallScore,
  rhythmScore,
  pitchScore,
  clarityScore,
  style,
}) => {
  const {colors} = useTheme();

  return (
    <View style={[styles.breakdownContainer, style]}>
      {/* Main score */}
      <ScoreCircle
        score={overallScore}
        size={140}
        strokeWidth={12}
        label="Overall"
      />

      {/* Sub-scores */}
      <View style={styles.subScores}>
        <MiniScore score={rhythmScore} label="Rhythm" />
        <MiniScore score={pitchScore} label="Pitch" />
        <MiniScore score={clarityScore} label="Clarity" />
      </View>

      {/* Score legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: colors.semantic.success}]} />
          <Text variant="caption" color="secondary">80+</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: colors.semantic.warning}]} />
          <Text variant="caption" color="secondary">60-79</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: colors.semantic.error}]} />
          <Text variant="caption" color="secondary">&lt;60</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 2,
  },
  miniContainer: {
    alignItems: 'center',
  },
  miniLabel: {
    marginTop: 4,
  },
  breakdownContainer: {
    alignItems: 'center',
    padding: 16,
  },
  subScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ScoreCircle;
