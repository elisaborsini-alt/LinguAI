export const palette = {
  // Primary brand colors
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main primary
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  // Secondary accent
  secondary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // Main secondary
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Accent for highlights
  accent: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Main accent
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Neutral grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic colors
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#047857',
  },

  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#B45309',
  },

  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#B91C1C',
  },

  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#1D4ED8',
  },

  // Base colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Level colors (CEFR)
  levels: {
    A1: '#94A3B8', // Slate
    A2: '#60A5FA', // Blue
    B1: '#34D399', // Emerald
    B2: '#FBBF24', // Amber
    C1: '#F97316', // Orange
    C2: '#EF4444', // Red
  },
};

export const lightTheme = {
  // Background colors
  background: {
    primary: palette.white,
    secondary: palette.gray[50],
    tertiary: palette.gray[100],
    inverse: palette.gray[900],
  },

  // Surface colors (cards, modals)
  surface: {
    primary: palette.white,
    secondary: palette.gray[50],
    elevated: palette.white,
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text colors
  text: {
    primary: palette.gray[900],
    secondary: palette.gray[600],
    tertiary: palette.gray[400],
    inverse: palette.white,
    disabled: palette.gray[300],
    link: palette.primary[600],
  },

  // Border colors
  border: {
    default: palette.gray[200],
    light: palette.gray[100],
    focused: palette.primary[500],
    error: palette.error.main,
  },

  // Brand colors
  brand: {
    primary: palette.primary[500],
    primaryLight: palette.primary[100],
    primaryDark: palette.primary[700],
    secondary: palette.secondary[500],
    accent: palette.accent[500],
  },

  // Semantic colors
  semantic: {
    success: palette.success.main,
    successLight: palette.success.light,
    warning: palette.warning.main,
    warningLight: palette.warning.light,
    error: palette.error.main,
    errorLight: palette.error.light,
    info: palette.info.main,
    infoLight: palette.info.light,
  },

  // Chat/Conversation specific
  chat: {
    userBubble: palette.primary[500],
    userText: palette.white,
    aiBubble: palette.gray[100],
    aiText: palette.gray[900],
    correctionBubble: palette.warning.light,
    correctionText: palette.warning.dark,
  },

  // Voice mode specific
  voice: {
    waveformActive: palette.primary[500],
    waveformInactive: palette.gray[300],
    recordingIndicator: palette.error.main,
    speakingIndicator: palette.secondary[500],
  },

  // Level colors
  levels: palette.levels,
};

export const darkTheme = {
  // Background colors
  background: {
    primary: palette.gray[900],
    secondary: palette.gray[800],
    tertiary: palette.gray[700],
    inverse: palette.white,
  },

  // Surface colors
  surface: {
    primary: palette.gray[800],
    secondary: palette.gray[700],
    elevated: palette.gray[700],
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Text colors
  text: {
    primary: palette.gray[50],
    secondary: palette.gray[300],
    tertiary: palette.gray[500],
    inverse: palette.gray[900],
    disabled: palette.gray[600],
    link: palette.primary[400],
  },

  // Border colors
  border: {
    default: palette.gray[700],
    light: palette.gray[800],
    focused: palette.primary[400],
    error: palette.error.main,
  },

  // Brand colors
  brand: {
    primary: palette.primary[400],
    primaryLight: palette.primary[900],
    primaryDark: palette.primary[300],
    secondary: palette.secondary[400],
    accent: palette.accent[400],
  },

  // Semantic colors
  semantic: {
    success: palette.success.main,
    successLight: 'rgba(16, 185, 129, 0.2)',
    warning: palette.warning.main,
    warningLight: 'rgba(245, 158, 11, 0.2)',
    error: palette.error.main,
    errorLight: 'rgba(239, 68, 68, 0.2)',
    info: palette.info.main,
    infoLight: 'rgba(59, 130, 246, 0.2)',
  },

  // Chat/Conversation specific
  chat: {
    userBubble: palette.primary[600],
    userText: palette.white,
    aiBubble: palette.gray[700],
    aiText: palette.gray[50],
    correctionBubble: 'rgba(245, 158, 11, 0.2)',
    correctionText: palette.warning.main,
  },

  // Voice mode specific
  voice: {
    waveformActive: palette.primary[400],
    waveformInactive: palette.gray[600],
    recordingIndicator: palette.error.main,
    speakingIndicator: palette.secondary[400],
  },

  // Level colors
  levels: palette.levels,
};

export type Theme = typeof lightTheme;
export type ThemeColors = keyof Theme;
