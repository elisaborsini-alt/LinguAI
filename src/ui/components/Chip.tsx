import {useTheme} from '@state/hooks/useTheme';
import {spacing, borderRadius} from '@ui/theme';
import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';


import {Text} from './Text';

type ChipVariant = 'filled' | 'outlined';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'outlined',
  selected = false,
  onPress,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
}) => {
  const {colors} = useTheme();

  const getBackgroundColor = (): string => {
    if (disabled) {
      return colors.background.secondary;
    }
    if (selected) {
      return colors.brand.primary;
    }
    if (variant === 'filled') {
      return colors.brand.primaryLight;
    }
    return 'transparent';
  };

  const getBorderColor = (): string => {
    if (disabled) {
      return colors.border.default;
    }
    if (selected) {
      return colors.brand.primary;
    }
    return colors.border.default;
  };

  const getTextColor = (): string => {
    if (disabled) {
      return colors.text.disabled;
    }
    if (selected) {
      return colors.text.inverse;
    }
    return colors.text.primary;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        style,
      ]}>
      {leftIcon}
      <Text
        variant="labelMedium"
        style={[
          styles.label,
          {color: getTextColor()},
          leftIcon && styles.labelWithLeftIcon,
          rightIcon && styles.labelWithRightIcon,
        ]}>
        {label}
      </Text>
      {rightIcon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
  },
  label: {},
  labelWithLeftIcon: {
    marginLeft: spacing.xxs,
  },
  labelWithRightIcon: {
    marginRight: spacing.xxs,
  },
});

export default Chip;
