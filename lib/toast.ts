export type ToastKind = 'ok' | 'error' | 'info';
export type ToastPayload = { id: number; message: string; kind: ToastKind };

const listeners = new Set<(payload: ToastPayload) => void>();
let counter = 0;

export function toast(message: string, kind: ToastKind = 'ok') {
  counter += 1;
  const payload: ToastPayload = { id: counter, message, kind };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeToasts(listener: (payload: ToastPayload) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
