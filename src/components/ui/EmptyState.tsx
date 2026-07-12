/**
 * WorthBase EmptyState Component
 * Displays a centered illustration with text and optional action button.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { Icon } from './Icon';
import { AppButton } from './Button';

interface EmptyStateProps {
  /** Lucide icon name */
  icon: string;
  /** Main message */
  title: string;
  /** Secondary description */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button handler */
  onAction?: () => void;
  /** Custom style */
  style?: object;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Icon name={icon} size={48} color="onSurfaceVariant" />
      </View>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <AppButton
          title={actionLabel}
          variant="secondary"
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    marginTop: 4,
  },
});
