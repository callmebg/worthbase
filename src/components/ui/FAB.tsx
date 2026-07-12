/**
 * WorthBase Shared FAB Component
 * Wraps Paper FAB with Lucide icon support and optional text label.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { FAB as PaperFAB } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { radius } from '@/theme/tokens';

interface AppFABProps {
  /** Lucide icon name */
  icon: string;
  /** Optional label text */
  label?: string;
  /** Press handler */
  onPress: () => void;
  /** Small variant */
  small?: boolean;
  /** Custom style */
  style?: object;
}

export function AppFAB({
  icon,
  label,
  onPress,
  small = false,
  style,
}: AppFABProps) {
  const theme = useTheme();

  return (
    <PaperFAB
      icon={icon as never}
      label={label}
      onPress={onPress}
      small={small}
      style={[
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
        },
        style,
      ]}
      color={theme.colors.onPrimary}
    />
  );
}

const styles = StyleSheet.create({
  fab: {
    borderRadius: radius.lg,
    position: 'absolute',
    right: 16,
    bottom: 80,
  },
});
