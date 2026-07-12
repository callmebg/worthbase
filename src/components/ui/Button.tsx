/**
 * WorthBase Shared Button Component
 * Wraps Paper Button with project-level defaults.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { Icon } from './Icon';
import { radius } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'icon' | 'danger';

interface AppButtonProps {
  /** Button label */
  title: string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Lucide icon name (left side) */
  icon?: string;
  /** Press handler */
  onPress: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom style */
  style?: object;
  /** Custom label style */
  labelStyle?: object;
}

export function AppButton({
  title,
  variant = 'primary',
  icon,
  onPress,
  disabled = false,
  loading = false,
  compact = false,
  style,
  labelStyle,
}: AppButtonProps) {
  const theme = useTheme();

  const getPaperMode = (): 'contained' | 'outlined' | 'text' | 'elevated' => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'contained';
      case 'secondary':
        return 'outlined';
      case 'text':
      case 'icon':
        return 'text';
      default:
        return 'contained';
    }
  };

  const getColor = () => {
    switch (variant) {
      case 'danger':
        return theme.colors.error;
      default:
        return undefined; // Use theme default
    }
  };

  const renderIcon = icon
    ? () => <Icon name={icon} size={compact ? 16 : 20} color={variant === 'primary' || variant === 'danger' ? 'onPrimary' : 'primary'} />
    : undefined;

  return (
    <PaperButton
      mode={getPaperMode()}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      compact={compact}
      icon={renderIcon as never}
      buttonColor={getColor()}
      style={[styles.button, variant === 'secondary' && styles.outlined, style]}
      labelStyle={[styles.label, labelStyle]}
      contentStyle={styles.content}
    >
      {title}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
  },
  outlined: {
    borderWidth: 1.5,
  },
  content: {
    paddingVertical: 2,
  },
  label: {
    fontWeight: '600',
  },
});
