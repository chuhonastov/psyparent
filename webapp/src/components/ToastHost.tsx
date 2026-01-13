import React, { useEffect, useState } from 'react';
import { onToast, ToastPayload } from '../lib/toast';

type ToastItem = {
  id: string;
  message: string;
  variant: NonNullable<ToastPayload['variant']>;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = onToast((p) => {
      const id = uid();
      const variant = p.variant ?? 'success';

      setItems((prev) => [...prev, { id, message: p.message, variant }]);

      const ms = p.durationMs ?? 2500;
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, ms);
    });

    return () => unsub();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toastHost" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.variant}`}>
          <div className="toastMsg">{t.message}</div>
          <button
            className="toastClose"
            type="button"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Закрыть"
            title="Закрыть"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
