/**
 * WorthBase Design Tokens
 * Spacing, border radius, and shadow scales used across the app.
 */

/** Spacing scale (multiples of 4) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Border radius scale */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/** Shadow presets for Paper elevation mapping */
export const shadows = {
  none: { elevation: 0 },
  sm: { elevation: 1 },
  md: { elevation: 3 },
  lg: { elevation: 6 },
  xl: { elevation: 10 },
} as const;

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
export type ShadowKey = keyof typeof shadows;
