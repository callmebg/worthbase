/**
 * WorthBase Shared FAB Component
 * Custom implementation using TouchableOpacity to avoid Paper Surface elevation artifacts.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Icon } from './Icon';
import { radius, spacing } from '@/theme/tokens';

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
  const size = small ? 40 : 56;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
          height: size,
          minWidth: size,
          borderRadius: size / 2,
          paddingHorizontal: label ? spacing.md : 0,
          width: label ? undefined : size,
        },
        style,
      ]}
    >
      <Icon name={icon} size={24} color={theme.colors.onPrimary} />
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onPrimary }]}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    paddingRight: 4,
  },
});
