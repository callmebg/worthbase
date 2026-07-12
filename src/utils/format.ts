/**
 * WorthBase (家底) - UI Utilities
 * Formatting helpers, color constants, and shared styles.
 */

import { useColorScheme } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '@/theme/build-theme';

/**
 * @deprecated Use `useTheme()` from react-native-paper or `useAppTheme()` instead.
 * Static color palette (used where hooks aren't available).
 * Will be removed after full migration to design tokens.
 */
export const COLORS = {
  PRIMARY: '#6C5CE7',
  PRIMARY_LIGHT: '#A29BFE',
  SUCCESS: '#00B894',
  WARNING: '#FDCB6E',
  DANGER: '#E17055',
  BG_LIGHT: '#f5f5f5',
  BG_WHITE: '#ffffff',
  TEXT_PRIMARY: '#2D3436',
  TEXT_SECONDARY: '#636E72',
  TEXT_TERTIARY: '#B2BEC3',
  BORDER: '#dfe6e9',
  CARD: '#ffffff',
};

/** @deprecated Use theme dark colors instead. */
const DARK_COLORS = {
  PRIMARY: '#A29BFE',
  PRIMARY_LIGHT: '#6C5CE7',
  SUCCESS: '#55EFC4',
  WARNING: '#FFEAA7',
  DANGER: '#FF7675',
  BG_LIGHT: '#1a1a2e',
  BG_WHITE: '#16213e',
  TEXT_PRIMARY: '#ECEFF1',
  TEXT_SECONDARY: '#B0BEC5',
  TEXT_TERTIARY: '#78909C',
  BORDER: '#2d3748',
  CARD: '#1e2a3a',
};

/**
 * @deprecated Use `useAppTheme()` instead.
 * Hook that returns the correct color palette based on system/user dark mode preference.
 */
export function useColors(darkModeSetting?: 'system' | 'light' | 'dark'): typeof COLORS {
  const systemScheme = useColorScheme();

  let isDark = false;
  if (darkModeSetting === 'dark') {
    isDark = true;
  } else if (darkModeSetting === 'light') {
    isDark = false;
  } else {
    // 'system' or undefined → follow system
    isDark = systemScheme === 'dark';
  }

  return isDark ? DARK_COLORS : COLORS;
}

/**
 * Typed wrapper around Paper's useTheme() that returns the WorthBase AppTheme.
 * Use this in any component to access design tokens, colors, typography, etc.
 */
export function useAppTheme(): AppTheme {
  return useTheme<AppTheme>();
}

/** Format a number as currency */
export function formatCurrency(amount: number, symbol = '¥'): string {
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
}

/** Format a number as compact currency (e.g., ¥12.3万) */
export function formatCompactCurrency(amount: number, symbol = '¥'): string {
  if (Math.abs(amount) >= 10000) {
    const wan = amount / 10000;
    return `${symbol}${wan.toFixed(1)}万`;
  }
  return formatCurrency(amount, symbol);
}

/** Format a date string (YYYY-MM-DD) for display */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Get current month string (YYYY-MM) */
export function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

/** Get current date string (YYYY-MM-DD) */
export function getCurrentDate(): string {
  return new Date().toISOString().substring(0, 10);
}

/** Calculate months between two YYYY-MM-DD dates (inclusive of start month) */
export function getMonthsHeld(purchaseDate: string): number {
  const start = new Date(purchaseDate);
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  let total = years * 12 + months;
  if (now.getDate() >= start.getDate()) total += 1;
  return Math.max(1, total);
}

/** Format months as human-readable duration */
export function formatDuration(months: number): string {
  if (months < 12) return `${months}个月`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `${years}年`;
  return `${years}年${remMonths}个月`;
}
