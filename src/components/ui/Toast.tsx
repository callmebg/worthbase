/**
 * WorthBase Shared Toast Component
 * Renders a Paper Snackbar positioned at the bottom.
 * Background color is determined by the toast type (success/error/info).
 * Consumes the ToastContext provided by ToastProvider.
 */

import React from 'react';
import { Snackbar } from 'react-native-paper';
import { useToast } from '@/hooks/useToast';
import type { ToastType } from '@/hooks/useToast';
import { useAppTheme } from '@/utils/format';

/** Map toast type → theme color key */
function getToastColor(type: ToastType, colors: ReturnType<typeof useAppTheme>['colors']): string {
  switch (type) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.error;
    case 'info':
    default:
      return colors.info;
  }
}

export function ToastRenderer() {
  const { state, hide } = useToast();
  const theme = useAppTheme();

  const backgroundColor = getToastColor(state.type, theme.colors);

  return (
    <Snackbar
      visible={state.visible}
      onDismiss={hide}
      duration={state.duration}
      style={{ backgroundColor }}
      theme={theme}
      wrapperStyle={{ marginBottom: 80 }}
    >
      {state.message}
    </Snackbar>
  );
}
