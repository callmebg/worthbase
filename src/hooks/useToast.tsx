/**
 * WorthBase (家底) - Toast Feedback System
 * React Context + Provider pattern for transient user feedback.
 * success: 2000ms, error: 4000ms, info: 2000ms
 *
 * context / 类型 / useToast 已下沉到 ./toast-context，本文件只保留 Provider ——
 * 否则会与 @/components/ui/Toast 形成 require cycle（原因见 toast-context.ts 顶部）。
 * 下方的 re-export 保证既有 `from '@/hooks/useToast'` 的十余处引用无需改动。
 */

import React, { useState, useCallback } from 'react';
import { ToastRenderer } from '@/components/ui/Toast';
import {
  ToastContext,
  useToast,
  type ToastContextValue,
  type ToastState,
  type ToastType,
} from './toast-context';

// 兼容既有引用路径（含 src/components/ui/index.ts 的再导出）
export { useToast };
export type { ToastContextValue, ToastState, ToastType };

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 2000,
  error: 4000,
  info: 2000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    duration: DEFAULT_DURATION.info,
  });

  const show = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const dur = duration ?? DEFAULT_DURATION[type];
      // Force state transition if toast is already visible,
      // otherwise Snackbar's internal timer won't reset.
      setState((prev) => {
        if (!prev.visible) {
          return { visible: true, message, type, duration: dur };
        }
        // Hide first, then show after a tick
        setTimeout(() => {
          setState({ visible: true, message, type, duration: dur });
        }, 50);
        return { ...prev, visible: false };
      });
    },
    [],
  );

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ show, state, hide }}>
      {children}
      <ToastRenderer />
    </ToastContext.Provider>
  );
}
