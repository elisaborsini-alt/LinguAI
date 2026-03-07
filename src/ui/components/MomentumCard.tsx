import React from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';

import {useTheme} from '@state/hooks/useTheme';
import {Text} from './Text';
import {spacing, borderRadius} from '@ui/theme';
import type {MomentumInsight} from '@data/api/endpoints/progress';

interface MomentumCardProps {
  insight: MomentumInsight;
  delay?: number;
}

const typeConfig: Record<MomentumInsight['type'], {icon: string}> = {
  resolved_weakness: {icon: ''},
  new_strength: {icon: ''},
  accuracy_gain: {icon: ''},
  consistency: {icon: ''},
};

export const MomentumCard: React.FC<MomentumCardProps> = ({insight, delay = 0}) => {
  const {colors} = useTheme();
  const config = typeConfig[insight.type];

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(500)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background.secondary,
            borderLeftColor: colors.brand.primary,
          },
        ]}>
        <Text variant="bodyMedium" style={styles.message}>
          {insight.message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    lineHeight: 22,
  },
});

export default MomentumCard;
