/**
 * WorthBase (家底) - Toast Context
 * 只承载 context、类型与消费端 hook，不含任何组件。
 *
 * 为什么要单独一个文件：
 *   useToast.tsx（Provider）需要渲染 Toast.tsx 里的 ToastRenderer，
 *   而 Toast.tsx 又要用 useToast 读取 context —— 两者互相 import 形成 require cycle。
 *   Metro 启动时会告警，且 LogBox 横幅（bounds 与底部导航可点区重叠）会吃掉点击。
 * 把共享部分下沉到本模块后，依赖变成单向：
 *   toast-context  ←  Toast.tsx  ←  useToast.tsx
 */

import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
  state: ToastState;
  hide: () => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** 读取 toast context；必须在 ToastProvider 内使用 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
