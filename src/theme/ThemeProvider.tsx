/**
 * WorthBase ThemeProvider
 * Reads themeColor/darkMode from settings-store, builds theme, wraps PaperProvider.
 */

import React, { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useSettingsStore } from '@/stores/settings-store';
import { buildTheme } from './build-theme';
import type { AppTheme } from './build-theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeColor = useSettingsStore((s) => s.themeColor);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (darkMode === 'dark') return true;
    if (darkMode === 'light') return false;
    return systemScheme === 'dark';
  }, [darkMode, systemScheme]);

  const theme: AppTheme = useMemo(
    () => buildTheme(themeColor, isDark),
    [themeColor, isDark],
  );

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
