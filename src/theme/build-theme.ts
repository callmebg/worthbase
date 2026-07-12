/**
 * WorthBase Theme Builder
 * Merges colors, typography, and tokens into a complete Paper MD3 theme object.
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { buildColors } from './colors';
import { buildFonts } from './typography';
import { spacing, radius, shadows } from './tokens';

/**
 * Build a complete Paper MD3 theme for the given theme color and dark mode state.
 */
export function buildTheme(themeColorHex: string, isDark: boolean) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const colors = buildColors(themeColorHex, isDark);
  const fonts = buildFonts();

  return {
    ...base,
    colors,
    fonts,
    /** Custom tokens accessible via theme.spacing, theme.radius, theme.shadows */
    spacing,
    radius,
    shadows,
    /** Whether this is a dark theme */
    dark: isDark,
  };
}

export type AppTheme = ReturnType<typeof buildTheme>;
