import {lightTheme, darkTheme, palette, Theme} from './colors';
import {typography, Typography} from './typography';
import {spacing, borderRadius, iconSize, hitSlop, Spacing, BorderRadius, IconSize} from './spacing';

export {lightTheme, darkTheme, palette, typography, spacing, borderRadius, iconSize, hitSlop};
export type {Theme, Typography, Spacing, BorderRadius, IconSize};

export interface AppTheme {
  colors: Theme;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  iconSize: IconSize;
}

export const createTheme = (colorScheme: 'light' | 'dark'): AppTheme => ({
  colors: colorScheme === 'light' ? lightTheme : darkTheme,
  typography,
  spacing,
  borderRadius,
  iconSize,
});

// Default theme
export const theme = createTheme('light');

// Shadow styles
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
};

// Animation durations
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,

  // Spring configs for Reanimated
  spring: {
    gentle: {
      damping: 15,
      stiffness: 150,
    },
    bouncy: {
      damping: 10,
      stiffness: 180,
    },
    stiff: {
      damping: 20,
      stiffness: 300,
    },
  },
};
