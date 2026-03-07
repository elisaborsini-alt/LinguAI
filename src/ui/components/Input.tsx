import React, {useState, forwardRef} from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import {useTheme} from '@state/hooks/useTheme';
import {spacing, borderRadius, typography} from '@ui/theme';

import {Text} from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      style,
      onFocus,
      onBlur,
      editable = true,
      ...props
    },
    ref,
  ) => {
    const {colors} = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const getBorderColor = (): string => {
      if (error) {
        return colors.border.error;
      }
      if (isFocused) {
        return colors.border.focused;
      }
      return colors.border.default;
    };

    const getBackgroundColor = (): string => {
      if (!editable) {
        return colors.background.tertiary;
      }
      return colors.background.primary;
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text variant="labelMedium" color="secondary" style={styles.label}>
            {label}
          </Text>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              borderColor: getBorderColor(),
              backgroundColor: getBackgroundColor(),
            },
          ]}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              typography.body.large,
              {color: colors.text.primary},
              !editable && {color: colors.text.disabled},
              style,
            ]}
            placeholderTextColor={colors.text.tertiary}
            editable={editable}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              style={styles.rightIcon}>
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <Text variant="caption" color="error" style={styles.error}>
            {error}
          </Text>
        )}

        {hint && !error && (
          <Text variant="caption" color="tertiary" style={styles.hint}>
            {hint}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.input,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.inputPadding,
    paddingVertical: spacing.sm,
  },
  leftIcon: {
    paddingLeft: spacing.inputPadding,
  },
  rightIcon: {
    paddingRight: spacing.inputPadding,
  },
  error: {
    marginTop: spacing.xxs,
  },
  hint: {
    marginTop: spacing.xxs,
  },
});

export default Input;
