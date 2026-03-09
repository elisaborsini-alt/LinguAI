import {useTheme} from '@state/hooks/useTheme';
import {spacing} from '@ui/theme';
import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';


import {Text} from './Text';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  thickness?: number;
  color?: string;
  spacing?: keyof typeof spacing | number;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  thickness = 1,
  color,
  spacing: spacingProp = 'md',
  style,
}) => {
  const {colors} = useTheme();
  const dividerColor = color || colors.border.light;

  const getSpacing = (): number => {
    if (typeof spacingProp === 'number') {
      return spacingProp;
    }
    return spacing[spacingProp] || spacing.md;
  };

  const marginValue = getSpacing();

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            width: thickness,
            backgroundColor: dividerColor,
            marginHorizontal: marginValue,
          },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.labelContainer, {marginVertical: marginValue}, style]}>
        <View style={[styles.line, {backgroundColor: dividerColor, height: thickness}]} />
        <Text variant="caption" color="tertiary" style={styles.label}>
          {label}
        </Text>
        <View style={[styles.line, {backgroundColor: dividerColor, height: thickness}]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          height: thickness,
          backgroundColor: dividerColor,
          marginVertical: marginValue,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
  },
  label: {
    marginHorizontal: spacing.sm,
  },
});

export default Divider;
