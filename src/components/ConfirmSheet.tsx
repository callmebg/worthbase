/**
 * ConfirmSheet — elegant confirmation bottom sheet.
 * Replaces native Alert.alert for destructive/important actions.
 * Shows icon, title, description, and Cancel + Confirm buttons.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/utils/format';
import { AppBottomSheet } from '@/components/ui/BottomSheet';
import { AppButton } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/ui/Icon';
import { spacing, radius } from '@/theme/tokens';

interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Icon to display (default: AlertCircle) */
  icon?: IconName;
  /** 'danger' for destructive actions (red confirm button), 'primary' for neutral (default) */
  variant?: 'primary' | 'danger';
  /** Is the confirm action in progress? (shows loading) */
  loading?: boolean;
}

export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  icon = 'AlertCircle',
  variant = 'primary',
  loading = false,
}: ConfirmSheetProps) {
  const theme = useAppTheme();
  const isDanger = variant === 'danger';

  const iconColor = isDanger ? theme.colors.error : theme.colors.primary;
  const iconBgColor = isDanger
    ? theme.colors.error + '15'
    : theme.colors.primary + '15';

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['40%']}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
          <Icon name={icon} size={28} color={iconColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {title}
        </Text>

        {/* Description */}
        {description ? (
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
        ) : null}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <AppButton
            title={cancelLabel}
            variant="text"
            onPress={onClose}
            style={styles.button}
            disabled={loading}
          />
          <AppButton
            title={confirmLabel}
            variant={isDanger ? 'danger' : 'primary'}
            onPress={onConfirm}
            style={styles.button}
            loading={loading}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
  },
});
