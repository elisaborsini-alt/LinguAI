import {useTheme} from '@state/hooks/useTheme';
import {typography} from '@ui/theme';
import React from 'react';
import {Text as RNText, TextProps as RNTextProps} from 'react-native';


type TypographyVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall'
  | 'caption'
  | 'overline'
  | 'mono';

type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'disabled'
  | 'link'
  | 'error'
  | 'success'
  | 'warning';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

const variantStyles: Record<TypographyVariant, object> = {
  displayLarge: typography.display.large,
  displayMedium: typography.display.medium,
  displaySmall: typography.display.small,
  headlineLarge: typography.headline.large,
  headlineMedium: typography.headline.medium,
  headlineSmall: typography.headline.small,
  titleLarge: typography.title.large,
  titleMedium: typography.title.medium,
  titleSmall: typography.title.small,
  bodyLarge: typography.body.large,
  bodyMedium: typography.body.medium,
  bodySmall: typography.body.small,
  labelLarge: typography.label.large,
  labelMedium: typography.label.medium,
  labelSmall: typography.label.small,
  caption: typography.caption,
  overline: typography.overline,
  mono: typography.mono,
};

export const Text: React.FC<TextProps> = ({
  variant = 'bodyMedium',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const {colors} = useTheme();

  const getColor = (): string => {
    switch (color) {
      case 'primary':
        return colors.text.primary;
      case 'secondary':
        return colors.text.secondary;
      case 'tertiary':
        return colors.text.tertiary;
      case 'inverse':
        return colors.text.inverse;
      case 'disabled':
        return colors.text.disabled;
      case 'link':
        return colors.text.link;
      case 'error':
        return colors.semantic.error;
      case 'success':
        return colors.semantic.success;
      case 'warning':
        return colors.semantic.warning;
      default:
        return colors.text.primary;
    }
  };

  return (
    <RNText
      style={[variantStyles[variant], {color: getColor(), textAlign: align}, style]}
      {...props}>
      {children}
    </RNText>
  );
};

export default Text;
