// Base spacing unit (4px)
const BASE = 4;

export const spacing = {
  // Atomic spacing values
  none: 0,
  xxs: BASE, // 4
  xs: BASE * 2, // 8
  sm: BASE * 3, // 12
  md: BASE * 4, // 16
  lg: BASE * 6, // 24
  xl: BASE * 8, // 32
  xxl: BASE * 10, // 40
  xxxl: BASE * 12, // 48

  // Screen padding
  screenHorizontal: BASE * 4, // 16
  screenVertical: BASE * 6, // 24

  // Component-specific
  cardPadding: BASE * 4, // 16
  listItemPadding: BASE * 3, // 12
  inputPadding: BASE * 3, // 12
  buttonPaddingHorizontal: BASE * 6, // 24
  buttonPaddingVertical: BASE * 3, // 12

  // Chat specific
  messageBubblePadding: BASE * 3, // 12
  messageGap: BASE * 2, // 8
  chatInputPadding: BASE * 3, // 12
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,

  // Component-specific
  card: 16,
  button: 12,
  input: 12,
  chip: 20,
  avatar: 9999,
  messageBubble: 20,
};

export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,

  // Tab bar
  tabBar: 24,

  // Avatar sizes
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 64,
  avatarXl: 96,
};

export const hitSlop = {
  small: {top: 8, right: 8, bottom: 8, left: 8},
  medium: {top: 12, right: 12, bottom: 12, left: 12},
  large: {top: 16, right: 16, bottom: 16, left: 16},
};

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type IconSize = typeof iconSize;
