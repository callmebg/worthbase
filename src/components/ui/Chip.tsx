/**
 * WorthBase Shared Chip Component
 * Wraps Paper Chip with selected/unselected states and Lucide icon support.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip as PaperChip } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { Icon } from './Icon';
import { radius } from '@/theme/tokens';

interface AppChipProps {
  /** Chip label text */
  label: string;
  /** Selected state */
  selected?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Lucide icon name (left side) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom style */
  style?: object;
}

export function AppChip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  compact = false,
  style,
}: AppChipProps) {
  const theme = useTheme();

  const renderIcon = icon
    ? () => <Icon name={icon} size={compact ? 14 : 16} color={selected ? 'onPrimaryContainer' : 'onSurfaceVariant'} />
    : undefined;

  return (
    <PaperChip
      mode={selected ? 'flat' : 'outlined'}
      selected={selected}
      onPress={onPress}
      disabled={disabled}
      compact={compact}
      icon={renderIcon as never}
      style={[
        styles.chip,
        selected && {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
        },
        style,
      ]}
      textStyle={[
        styles.label,
        selected && { color: theme.colors.onPrimaryContainer },
      ]}
    >
      {label}
    </PaperChip>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.sm,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
  },
});
