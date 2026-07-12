/**
 * WorthBase Shared Card Component
 * Wraps Paper Card with project-level defaults for radius, surface, and elevation.
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { radius } from '@/theme/tokens';

interface AppCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Press handler — makes card tappable */
  onPress?: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Selected state — shows primary border */
  selected?: boolean;
  /** Elevation level (0-5, default: 1) */
  elevation?: number;
  /** Custom style */
  style?: ViewStyle;
}

export function AppCard({
  children,
  onPress,
  onLongPress,
  selected = false,
  elevation = 1,
  style,
}: AppCardProps) {
  const theme = useTheme();

  const cardStyle: ViewStyle = {
    borderRadius: radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: selected ? 2 : 0,
    borderColor: selected ? theme.colors.primary : 'transparent',
  };

  if (onPress || onLongPress) {
    return (
      <PaperCard
        mode="elevated"
        onPress={onPress}
        onLongPress={onLongPress}
        style={[cardStyle, { elevation }, style]}
      >
        <PaperCard.Content>{children}</PaperCard.Content>
      </PaperCard>
    );
  }

  return (
    <PaperCard mode="elevated" style={[cardStyle, { elevation }, style]}>
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
}
