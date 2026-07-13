/**
 * WorthBase (家底) - Toast Feedback System
 * React Context + Provider pattern for transient user feedback.
 * success: 2000ms, error: 4000ms, info: 2000ms
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastRenderer } from '@/components/ui/Toast';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
  state: ToastState;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

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
      setState({
        visible: true,
        message,
        type,
        duration: duration ?? DEFAULT_DURATION[type],
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

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
