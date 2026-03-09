import {useTheme} from '@state/hooks/useTheme';
import {spacing, borderRadius, shadows} from '@ui/theme';
import React from 'react';
import {View, ViewProps, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';


type CardVariant = 'default' | 'outlined' | 'elevated';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  padding?: keyof typeof spacing | number;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  onPress,
  disabled = false,
  padding = 'cardPadding',
  style,
  children,
  ...props
}) => {
  const {colors} = useTheme();

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'elevated':
        return colors.surface.elevated;
      default:
        return colors.surface.primary;
    }
  };

  const getBorderColor = (): string | undefined => {
    if (variant === 'outlined') {
      return colors.border.default;
    }
    return undefined;
  };

  const getShadow = () => {
    if (variant === 'elevated') {
      return shadows.md;
    }
    return shadows.none;
  };

  const getPadding = (): number => {
    if (typeof padding === 'number') {
      return padding;
    }
    return spacing[padding] || spacing.cardPadding;
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outlined' ? 1 : 0,
    padding: getPadding(),
    borderRadius: borderRadius.card,
    ...getShadow(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        style={[cardStyle, disabled && styles.disabled, style]}
        {...props}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});

export default Card;
