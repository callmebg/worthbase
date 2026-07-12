/**
 * WorthBase Typography Scale
 * Font hierarchy for Paper MD3 theme.
 */

export interface TypographyVariant {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
}

export const typography: Record<string, TypographyVariant> = {
  displayLarge: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: 0,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: 0,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};

/** Paper MD3 fonts config object */
export function buildFonts() {
  return typography;
}
