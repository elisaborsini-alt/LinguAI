import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';

import {useTheme} from '@state/hooks/useTheme';
import {borderRadius, hitSlop, iconSize as iconSizes} from '@ui/theme';

type IconButtonVariant = 'default' | 'filled' | 'outlined' | 'ghost';
type IconButtonSize = 'small' | 'medium' | 'large';

interface IconButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<IconButtonSize, number> = {
  small: 36,
  medium: 44,
  large: 56,
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  ...props
}) => {
  const {colors} = useTheme();
  const isDisabled = disabled || loading;
  const dimension = sizeMap[size];

  const getBackgroundColor = (): string => {
    if (isDisabled && variant !== 'ghost') {
      return colors.border.light;
    }
    switch (variant) {
      case 'filled':
        return colors.brand.primary;
      case 'outlined':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return colors.background.secondary;
    }
  };

  const getBorderColor = (): string | undefined => {
    if (variant === 'outlined') {
      return isDisabled ? colors.border.default : colors.brand.primary;
    }
    return undefined;
  };

  const buttonStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: borderRadius.full,
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outlined' ? 1.5 : 0,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      hitSlop={hitSlop.small}
      style={[styles.button, buttonStyle, isDisabled && styles.disabled, style]}
      {...props}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'filled' ? colors.text.inverse : colors.brand.primary}
        />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default IconButton;
