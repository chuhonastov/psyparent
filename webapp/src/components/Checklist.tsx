import React, { useEffect, useMemo, useState } from 'react';

export type ChecklistItem = { id: string; text: string };

type Props = {
  items: ChecklistItem[];
  /** Any stable string key, e.g. `dx:gad:fullCriteria` */
  storageKey: string;
  /** Optional hint shown above the checklist */
  hint?: string;

  /** Optional submit button at the bottom */
  submitLabel?: string;
  /** Called with selected items when user presses submit */
  onSubmit?: (selected: ChecklistItem[], checkedIds: string[]) => void;
};

const PREFIX = 'parentguide.checklist.v1:';

function safeRead(key: string): string[] {
  const raw = localStorage.getItem(PREFIX + key);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
    return [];
  } catch {
    return [];
  }
}

function safeWrite(key: string, ids: string[]) {
  localStorage.setItem(PREFIX + key, JSON.stringify(ids));
}

export default function Checklist({ items, storageKey, hint, submitLabel, onSubmit }: Props) {
  const [checked, setChecked] = useState<string[]>(() => safeRead(storageKey));

  const validIds = useMemo(() => new Set(items.map((x) => x.id)), [items]);
  const checkedSet = useMemo(() => new Set(checked), [checked]);

  // Remove ids that no longer exist (when content changes)
  useEffect(() => {
    setChecked((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      if (next.length !== prev.length) safeWrite(storageKey, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, items.length]);

  // Persist
  useEffect(() => {
    safeWrite(storageKey, checked);
  }, [storageKey, checked]);

  const total = items.length;
  const done = checked.length;

  const toggle = (id: string) => {
    setChecked((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  };

  const submit = () => {
    if (!onSubmit) return;
    const selected = items.filter((x) => checkedSet.has(x.id));
    onSubmit(selected, checked);
  };

  return (
    <div>
      {!!hint && (
        <div className="muted" style={{ marginBottom: 8 }}>
          {hint}
        </div>
      )}

      <div style={{ fontWeight: 900, marginBottom: 10 }}>
        Отмечено: {done} / {total}
      </div>

      <div className="list">
        {items.map((it) => (
          <label key={it.id} className="item" style={{ cursor: 'pointer' }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={checkedSet.has(it.id)}
                onChange={() => toggle(it.id)}
                style={{ marginTop: 2 }}
              />
              <div style={{ lineHeight: 1.35 }}>{it.text}</div>
            </div>
          </label>
        ))}
      </div>

      {!!onSubmit && (
        <div style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={submit} disabled={done === 0}>
            {submitLabel ?? 'Отправить в «К врачу»'}
          </button>
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Отправится список отмеченных пунктов.
          </div>
        </div>
      )}
    </div>
  );
}
