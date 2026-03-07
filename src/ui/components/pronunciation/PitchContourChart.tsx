import React, {useMemo} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryArea,
  VictoryTheme,
  VictoryLegend,
} from 'victory-native';
import {Text} from '../Text';
import {useTheme} from '@state/hooks/useTheme';
import type {PitchPoint} from '@appTypes/pronunciation';

interface PitchContourChartProps {
  referencePitchData: PitchPoint[];
  userPitchData: PitchPoint[];
  durationMs: number;
  height?: number;
  showLegend?: boolean;
  highlightDifferences?: boolean;
  referenceColor?: string;
  userColor?: string;
  style?: ViewStyle;
}

export const PitchContourChart: React.FC<PitchContourChartProps> = ({
  referencePitchData,
  userPitchData,
  durationMs,
  height = 200,
  showLegend = true,
  highlightDifferences = true,
  referenceColor,
  userColor,
  style,
}) => {
  const {colors} = useTheme();

  const refColor = referenceColor || colors.semantic.info;
  const usrColor = userColor || colors.brand.accent;

  // Normalize data for chart
  const normalizedRefData = useMemo(() => {
    if (!referencePitchData || referencePitchData.length === 0) return [];
    return referencePitchData
      .filter(p => p.confidence > 0.5)
      .map(p => ({
        x: p.timestamp / 1000, // Convert to seconds
        y: p.frequency,
      }));
  }, [referencePitchData]);

  const normalizedUserData = useMemo(() => {
    if (!userPitchData || userPitchData.length === 0) return [];
    return userPitchData
      .filter(p => p.confidence > 0.5)
      .map(p => ({
        x: p.timestamp / 1000,
        y: p.frequency,
      }));
  }, [userPitchData]);

  // Calculate pitch range for axis
  const {minPitch, maxPitch} = useMemo(() => {
    const allPitches = [
      ...normalizedRefData.map(d => d.y),
      ...normalizedUserData.map(d => d.y),
    ];
    if (allPitches.length === 0) return {minPitch: 80, maxPitch: 300};
    const min = Math.min(...allPitches);
    const max = Math.max(...allPitches);
    const padding = (max - min) * 0.1;
    return {
      minPitch: Math.max(50, min - padding),
      maxPitch: max + padding,
    };
  }, [normalizedRefData, normalizedUserData]);

  // Calculate difference regions
  const differenceRegions = useMemo(() => {
    if (!highlightDifferences) return [];
    if (normalizedRefData.length === 0 || normalizedUserData.length === 0) return [];

    const regions: Array<{start: number; end: number}> = [];
    const threshold = 30; // Hz difference threshold

    // Simple difference detection
    const samplePoints = 20;
    const duration = durationMs / 1000;
    const step = duration / samplePoints;

    let inDifferentRegion = false;
    let regionStart = 0;

    for (let t = 0; t <= duration; t += step) {
      const refPoint = normalizedRefData.find(
        d => Math.abs(d.x - t) < step / 2,
      );
      const userPoint = normalizedUserData.find(
        d => Math.abs(d.x - t) < step / 2,
      );

      if (refPoint && userPoint) {
        const diff = Math.abs(refPoint.y - userPoint.y);
        if (diff > threshold) {
          if (!inDifferentRegion) {
            regionStart = t;
            inDifferentRegion = true;
          }
        } else {
          if (inDifferentRegion) {
            regions.push({start: regionStart, end: t});
            inDifferentRegion = false;
          }
        }
      }
    }

    if (inDifferentRegion) {
      regions.push({start: regionStart, end: duration});
    }

    return regions;
  }, [normalizedRefData, normalizedUserData, highlightDifferences, durationMs]);

  if (normalizedRefData.length === 0 && normalizedUserData.length === 0) {
    return (
      <View style={[styles.container, {height}, style]}>
        <View style={styles.emptyState}>
          <Text variant="bodyMedium" color="secondary">
            No pitch data available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <VictoryChart
        height={height}
        padding={{top: 20, bottom: 40, left: 50, right: 20}}
        domain={{
          x: [0, durationMs / 1000],
          y: [minPitch, maxPitch],
        }}>
        {/* Axis */}
        <VictoryAxis
          label="Time (s)"
          style={{
            axis: {stroke: colors.border.default},
            axisLabel: {fontSize: 10, fill: colors.text.secondary, padding: 25},
            tickLabels: {fontSize: 9, fill: colors.text.tertiary},
            grid: {stroke: colors.border.light, strokeDasharray: '3,3'},
          }}
        />
        <VictoryAxis
          dependentAxis
          label="Pitch (Hz)"
          style={{
            axis: {stroke: colors.border.default},
            axisLabel: {fontSize: 10, fill: colors.text.secondary, padding: 35},
            tickLabels: {fontSize: 9, fill: colors.text.tertiary},
            grid: {stroke: colors.border.light, strokeDasharray: '3,3'},
          }}
        />

        {/* Difference highlighting regions */}
        {differenceRegions.map((region, index) => (
          <VictoryArea
            key={`diff-${index}`}
            data={[
              {x: region.start, y: minPitch, y0: maxPitch},
              {x: region.end, y: minPitch, y0: maxPitch},
            ]}
            style={{
              data: {
                fill: colors.semantic.error,
                fillOpacity: 0.1,
              },
            }}
          />
        ))}

        {/* Reference pitch line */}
        {normalizedRefData.length > 0 && (
          <VictoryLine
            data={normalizedRefData}
            style={{
              data: {
                stroke: refColor,
                strokeWidth: 2,
              },
            }}
            interpolation="monotoneX"
          />
        )}

        {/* User pitch line */}
        {normalizedUserData.length > 0 && (
          <VictoryLine
            data={normalizedUserData}
            style={{
              data: {
                stroke: usrColor,
                strokeWidth: 2,
                strokeDasharray: '5,3',
              },
            }}
            interpolation="monotoneX"
          />
        )}
      </VictoryChart>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, {backgroundColor: refColor}]} />
            <Text variant="caption" color="secondary">
              Native Speaker
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendLine,
                styles.legendDashed,
                {backgroundColor: usrColor},
              ]}
            />
            <Text variant="caption" color="secondary">
              Your Pronunciation
            </Text>
          </View>
          {highlightDifferences && differenceRegions.length > 0 && (
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendBox,
                  {backgroundColor: colors.semantic.error + '20'},
                ]}
              />
              <Text variant="caption" color="secondary">
                Difference Areas
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Simplified pitch comparison indicator
interface PitchComparisonIndicatorProps {
  correlation: number; // -1 to 1
  style?: ViewStyle;
}

export const PitchComparisonIndicator: React.FC<PitchComparisonIndicatorProps> = ({
  correlation,
  style,
}) => {
  const {colors} = useTheme();

  const getIndicatorColor = (value: number): string => {
    if (value >= 0.8) return colors.semantic.success;
    if (value >= 0.5) return colors.semantic.warning;
    return colors.semantic.error;
  };

  const percentage = Math.round(((correlation + 1) / 2) * 100);
  const indicatorColor = getIndicatorColor(correlation);

  return (
    <View style={[styles.indicatorContainer, style]}>
      <Text variant="labelMedium" color="secondary">
        Pitch Match
      </Text>
      <View style={styles.indicatorBar}>
        <View
          style={[
            styles.indicatorFill,
            {
              width: `${percentage}%`,
              backgroundColor: indicatorColor,
            },
          ]}
        />
      </View>
      <Text variant="caption" style={{color: indicatorColor}}>
        {percentage}%
      </Text>
    </View>
  );
};

// Timing comparison bar
interface TimingComparisonProps {
  referenceDuration: number;
  userDuration: number;
  style?: ViewStyle;
}

export const TimingComparison: React.FC<TimingComparisonProps> = ({
  referenceDuration,
  userDuration,
  style,
}) => {
  const {colors} = useTheme();

  const ratio = userDuration / referenceDuration;
  const percentage = Math.min(100, Math.max(0, ratio * 100));

  const getStatus = () => {
    if (ratio >= 0.9 && ratio <= 1.1) {
      return {label: 'Good timing!', color: colors.semantic.success};
    }
    if (ratio < 0.9) {
      return {label: 'Too fast', color: colors.semantic.warning};
    }
    return {label: 'Too slow', color: colors.semantic.warning};
  };

  const status = getStatus();

  return (
    <View style={[styles.timingContainer, style]}>
      <View style={styles.timingHeader}>
        <Text variant="labelMedium" color="secondary">
          Timing
        </Text>
        <Text variant="caption" style={{color: status.color}}>
          {status.label}
        </Text>
      </View>

      <View style={styles.timingBarContainer}>
        {/* Reference marker at center */}
        <View
          style={[
            styles.timingMarker,
            {left: '50%', backgroundColor: colors.semantic.info},
          ]}
        />

        {/* User position */}
        <View
          style={[
            styles.timingIndicator,
            {
              left: `${Math.min(100, Math.max(0, percentage / 2))}%`,
              backgroundColor: status.color,
            },
          ]}
        />

        {/* Scale */}
        <View style={[styles.timingScale, {backgroundColor: colors.border.default}]}>
          <View
            style={[
              styles.timingTarget,
              {
                backgroundColor: colors.semantic.success + '30',
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.timingLabels}>
        <Text variant="caption" color="tertiary">
          Faster
        </Text>
        <Text variant="caption" color="tertiary">
          Perfect
        </Text>
        <Text variant="caption" color="tertiary">
          Slower
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  legendDashed: {
    // Style for dashed line - approximated with opacity
    opacity: 0.8,
  },
  legendBox: {
    width: 16,
    height: 12,
    borderRadius: 2,
  },
  indicatorContainer: {
    alignItems: 'center',
    padding: 12,
  },
  indicatorBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  indicatorFill: {
    height: '100%',
    borderRadius: 4,
  },
  timingContainer: {
    padding: 12,
  },
  timingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingBarContainer: {
    height: 24,
    position: 'relative',
    justifyContent: 'center',
  },
  timingScale: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  timingTarget: {
    position: 'absolute',
    left: '40%',
    width: '20%',
    height: '100%',
    borderRadius: 2,
  },
  timingMarker: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 1,
    top: 4,
    marginLeft: -1,
    zIndex: 1,
  },
  timingIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 6,
    marginLeft: -6,
    zIndex: 2,
  },
  timingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

export default PitchContourChart;
