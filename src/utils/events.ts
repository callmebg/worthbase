/**
 * Simple event bus for cross-component communication.
 * Used to trigger add actions from the custom tab bar to screen components.
 */
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export const events = {
  on(name: string, fn: Listener): () => void {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name)!.add(fn);
    return () => { listeners.get(name)?.delete(fn); };
  },
  emit(name: string) {
    listeners.get(name)?.forEach(fn => fn());
  },
};
