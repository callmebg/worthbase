/**
 * WorthBase Theme Colors
 * Light/dark color palettes for Paper MD3 theme, supporting 4 user-selectable theme colors.
 */

export type ThemeColorKey = 'purple' | 'blue' | 'green' | 'orange';

/** Map of hex theme color → ThemeColorKey */
export const THEME_COLOR_MAP: Record<string, ThemeColorKey> = {
  '#6C5CE7': 'purple',
  '#0984E3': 'blue',
  '#00B894': 'green',
  '#E17055': 'orange',
};

/** Primary color variants per theme key */
const THEME_PRIMARIES: Record<ThemeColorKey, { primary: string; primaryLight: string; primaryContainer: string }> = {
  purple: { primary: '#6C5CE7', primaryLight: '#A29BFE', primaryContainer: '#E8E5FD' },
  blue:   { primary: '#0984E3', primaryLight: '#74B9FF', primaryContainer: '#D6ECFA' },
  green:  { primary: '#00B894', primaryLight: '#55EFC4', primaryContainer: '#D0F5EC' },
  orange: { primary: '#E17055', primaryLight: '#FAB1A0', primaryContainer: '#FDE8E2' },
};

/** Dark mode primary variants */
const THEME_PRIMARIES_DARK: Record<ThemeColorKey, { primary: string; primaryLight: string; primaryContainer: string }> = {
  purple: { primary: '#A29BFE', primaryLight: '#6C5CE7', primaryContainer: '#2D2654' },
  blue:   { primary: '#74B9FF', primaryLight: '#0984E3', primaryContainer: '#0A3A5C' },
  green:  { primary: '#55EFC4', primaryLight: '#00B894', primaryContainer: '#0A3D33' },
  orange: { primary: '#FAB1A0', primaryLight: '#E17055', primaryContainer: '#4A2520' },
};

/** Shared colors that don't change with theme color */
const SHARED_LIGHT = {
  secondary: '#636E72',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DFE6E9',
  tertiary: '#B2BEC3',
  error: '#E17055',
  onError: '#FFFFFF',
  errorContainer: '#FDE8E2',
  background: '#F5F5F5',
  onBackground: '#2D3436',
  surface: '#FFFFFF',
  onSurface: '#2D3436',
  surfaceVariant: '#F0F0F0',
  onSurfaceVariant: '#636E72',
  outline: '#DFE6E9',
  outlineVariant: '#B2BEC3',
  // Custom semantic colors
  success: '#00B894',
  warning: '#FDCB6E',
  info: '#74B9FF',
};

const SHARED_DARK = {
  secondary: '#B0BEC5',
  onSecondary: '#1A1A2E',
  secondaryContainer: '#2D3748',
  tertiary: '#78909C',
  error: '#FF7675',
  onError: '#1A1A2E',
  errorContainer: '#4A2520',
  background: '#1A1A2E',
  onBackground: '#ECEFF1',
  surface: '#16213E',
  onSurface: '#ECEFF1',
  surfaceVariant: '#1E2A3A',
  onSurfaceVariant: '#B0BEC5',
  outline: '#2D3748',
  outlineVariant: '#4A5568',
  // Custom semantic colors
  success: '#55EFC4',
  warning: '#FFEAA7',
  info: '#74B9FF',
};

/**
 * Build the color palette for Paper's MD3 theme.
 */
export function buildColors(themeColorHex: string, isDark: boolean) {
  const key = THEME_COLOR_MAP[themeColorHex] ?? 'purple';
  const primaries = isDark ? THEME_PRIMARIES_DARK[key] : THEME_PRIMARIES[key];
  const shared = isDark ? SHARED_DARK : SHARED_LIGHT;

  return {
    primary: primaries.primary,
    onPrimary: isDark ? '#1A1A2E' : '#FFFFFF',
    primaryContainer: primaries.primaryContainer,
    onPrimaryContainer: isDark ? '#ECEFF1' : '#2D3436',
    secondary: shared.secondary,
    onSecondary: shared.onSecondary,
    secondaryContainer: shared.secondaryContainer,
    onSecondaryContainer: isDark ? '#ECEFF1' : '#2D3436',
    tertiary: shared.tertiary,
    onTertiary: isDark ? '#1A1A2E' : '#FFFFFF',
    error: shared.error,
    onError: shared.onError,
    errorContainer: shared.errorContainer,
    onErrorContainer: isDark ? '#ECEFF1' : '#2D3436',
    background: shared.background,
    onBackground: shared.onBackground,
    surface: shared.surface,
    onSurface: shared.onSurface,
    surfaceVariant: shared.surfaceVariant,
    onSurfaceVariant: shared.onSurfaceVariant,
    outline: shared.outline,
    outlineVariant: shared.outlineVariant,
    // Paper-specific
    elevation: {
      level0: 'transparent',
      level1: shared.surface,
      level2: isDark ? '#1C2640' : '#FAFAFA',
      level3: isDark ? '#202D45' : '#F5F5F5',
      level4: isDark ? '#25334D' : '#EEEEEE',
      level5: isDark ? '#2A3A55' : '#E8E8E8',
    },
    // Custom semantic (accessible via theme.colors)
    success: shared.success,
    warning: shared.warning,
    info: shared.info,
    /** Original primary hex for backward compat */
    primaryHex: themeColorHex,
    /** Light variant of primary */
    primaryLight: primaries.primaryLight,
  };
}

export type AppColors = ReturnType<typeof buildColors>;
