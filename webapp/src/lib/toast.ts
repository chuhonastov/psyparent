const EVENT = 'parentguide:toast';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export type ToastPayload = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number; // default 2500
};

export function toast(message: string, opts: Omit<ToastPayload, 'message'> = {}) {
  const payload: ToastPayload = {
    message,
    variant: opts.variant ?? 'success',
    durationMs: opts.durationMs ?? 2500,
  };

  window.dispatchEvent(new CustomEvent(EVENT, { detail: payload }));
}

export function onToast(handler: (payload: ToastPayload) => void) {
  const fn = (e: Event) => {
    const ce = e as CustomEvent<ToastPayload>;
    if (!ce.detail?.message) return;
    handler(ce.detail);
  };

  window.addEventListener(EVENT, fn as any);
  return () => window.removeEventListener(EVENT, fn as any);
}
