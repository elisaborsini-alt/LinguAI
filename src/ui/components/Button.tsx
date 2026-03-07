import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';

import {useTheme} from '@state/hooks/useTheme';
import {spacing, borderRadius} from '@ui/theme';

import {Text} from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...props
}) => {
  const {colors} = useTheme();

  const isDisabled = disabled || loading;

  const getBackgroundColor = (): string => {
    if (isDisabled) {
      return colors.border.default;
    }
    switch (variant) {
      case 'primary':
        return colors.brand.primary;
      case 'secondary':
        return colors.brand.primaryLight;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.semantic.error;
      default:
        return colors.brand.primary;
    }
  };

  const getBorderColor = (): string | undefined => {
    if (variant === 'outline') {
      return isDisabled ? colors.border.default : colors.brand.primary;
    }
    return undefined;
  };

  const getTextColor = (): string => {
    if (isDisabled) {
      return colors.text.disabled;
    }
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.text.inverse;
      case 'secondary':
      case 'outline':
      case 'ghost':
        return colors.brand.primary;
      default:
        return colors.text.inverse;
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          minHeight: 36,
        };
      case 'medium':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minHeight: 48,
        };
      case 'large':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minHeight: 48,
        };
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'labelMedium' as const;
      case 'medium':
        return 'labelLarge' as const;
      case 'large':
        return 'titleSmall' as const;
      default:
        return 'labelLarge' as const;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[
        styles.button,
        getSizeStyles(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text variant={getTextVariant()} style={[{color: getTextColor()}, textStyle]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.button,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
  },
});

export default Button;
