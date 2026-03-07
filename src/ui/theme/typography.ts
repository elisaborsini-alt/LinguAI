import {Platform, TextStyle} from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
});

const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

export const typography = {
  // Display styles - for hero sections
  display: {
    large: {
      fontFamily: fontFamily.bold,
      fontSize: 57,
      lineHeight: 64,
      fontWeight: fontWeights.bold,
      letterSpacing: -0.25,
    } as TextStyle,
    medium: {
      fontFamily: fontFamily.bold,
      fontSize: 45,
      lineHeight: 52,
      fontWeight: fontWeights.bold,
      letterSpacing: 0,
    } as TextStyle,
    small: {
      fontFamily: fontFamily.bold,
      fontSize: 36,
      lineHeight: 44,
      fontWeight: fontWeights.bold,
      letterSpacing: 0,
    } as TextStyle,
  },

  // Headline styles - for section headers
  headline: {
    large: {
      fontFamily: fontFamily.semibold,
      fontSize: 32,
      lineHeight: 40,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0,
    } as TextStyle,
    medium: {
      fontFamily: fontFamily.semibold,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0,
    } as TextStyle,
    small: {
      fontFamily: fontFamily.semibold,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0,
    } as TextStyle,
  },

  // Title styles - for card titles, list headers
  title: {
    large: {
      fontFamily: fontFamily.medium,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: fontWeights.medium,
      letterSpacing: 0,
    } as TextStyle,
    medium: {
      fontFamily: fontFamily.medium,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: fontWeights.medium,
      letterSpacing: 0.15,
    } as TextStyle,
    small: {
      fontFamily: fontFamily.medium,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      letterSpacing: 0.1,
    } as TextStyle,
  },

  // Body styles - for main content
  body: {
    large: {
      fontFamily: fontFamily.regular,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: fontWeights.regular,
      letterSpacing: 0.5,
    } as TextStyle,
    medium: {
      fontFamily: fontFamily.regular,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: fontWeights.regular,
      letterSpacing: 0.25,
    } as TextStyle,
    small: {
      fontFamily: fontFamily.regular,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.regular,
      letterSpacing: 0.4,
    } as TextStyle,
  },

  // Label styles - for buttons, tabs, form labels
  label: {
    large: {
      fontFamily: fontFamily.medium,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      letterSpacing: 0.1,
    } as TextStyle,
    medium: {
      fontFamily: fontFamily.medium,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: fontWeights.medium,
      letterSpacing: 0.5,
    } as TextStyle,
    small: {
      fontFamily: fontFamily.medium,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: fontWeights.medium,
      letterSpacing: 0.5,
    } as TextStyle,
  },

  // Caption styles - for supporting text
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.4,
  } as TextStyle,

  // Overline - for category labels
  overline: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,

  // Monospace - for code or transcripts
  mono: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  } as TextStyle,
};

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
