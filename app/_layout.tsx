/**
 * WorthBase (家底) - Root Layout
 * Initializes database, loads stores, sets up Tab Navigator.
 * Also handles: auto backup on background, first-use onboarding, app lock.
 * Tab order: 总览(Dashboard) / 账户(Accounts) / 资产(Assets) / 设置(Settings)
 */

import 'react-native-gesture-handler';
import { Tabs } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from 'react-native-paper';
import { LayoutDashboard, Wallet, Package, Settings } from 'lucide-react-native';
import { useDatabaseInit } from '@/hooks/useDatabaseInit';
import { useSettingsStore } from '@/stores/settings-store';
import { useAccountStore } from '@/stores/account-store';
import { BackupService } from '@/services/backup-service';
import { LockScreen } from '@/components/LockScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';

const TAB_CONFIG = [
  { name: 'index', title: '总览', Icon: LayoutDashboard },
  { name: 'accounts', title: '账户', Icon: Wallet },
  { name: 'assets', title: '资产', Icon: Package },
  { name: 'settings', title: '设置', Icon: Settings },
];

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { state, error } = useDatabaseInit();
  const { themeColor, appLockEnabled, isLoading: settingsLoading } = useSettingsStore();
  const theme = useTheme();

  // ─── App Lock State ───
  const [isLocked, setIsLocked] = useState(true); // Start locked; will be set false if no lock
  const wasBackgrounded = useRef(false);

  // Determine initial lock state once settings are loaded
  useEffect(() => {
    if (!settingsLoading) {
      setIsLocked(appLockEnabled);
    }
  }, [settingsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-lock when app goes to background, unlock on foreground
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // Going from active to background/inactive → backup + mark backgrounded
      if (prev === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        BackupService.createBackup();
        wasBackgrounded.current = true;
      }

      // Coming back from background → re-lock if app lock is enabled
      if (
        prev !== 'active' &&
        nextAppState === 'active' &&
        wasBackgrounded.current &&
        useSettingsStore.getState().appLockEnabled
      ) {
        setIsLocked(true);
        wasBackgrounded.current = false;
      }
    });
    return () => subscription.remove();
  }, []);

  const handleUnlocked = useCallback(() => {
    setIsLocked(false);
  }, []);

  if (state === 'loading') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>家底 WorthBase</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>数据库初始化失败</Text>
        <Text style={[styles.errorDetail, { color: theme.colors.onSurfaceVariant }]}>{error?.message}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
            tabBarStyle: {
              paddingBottom: 4,
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.outline,
            },
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.onSurface,
          }}
        >
          {TAB_CONFIG.map(tab => {
            const { Icon: TabIcon } = tab;
            return (
              <Tabs.Screen
                key={tab.name}
                name={tab.name}
                options={{
                  title: tab.title,
                  tabBarLabel: tab.title,
                  tabBarIcon: ({ color, size }) => (
                    <TabIcon size={size} color={color} strokeWidth={2} />
                  ),
                }}
              />
            );
          })}
        </Tabs>

        {/* Lock screen overlay — covers the entire app when locked */}
        {isLocked && appLockEnabled && (
          <LockScreen onUnlocked={handleUnlocked} themeColor={themeColor} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});
