import React, { useEffect, useMemo, useState } from 'react';

export type ChecklistItem = { id: string; text: string };

type Props = {
  items: ChecklistItem[];
  /** Any stable string key, e.g. `dx:gad:fullCriteria` */
  storageKey: string;
  /** Optional hint shown above the checklist */
  hint?: string;
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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Скопировано.');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Скопировано.');
  }
}

export default function Checklist({ items, storageKey, hint }: Props) {
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

  const clearAll = () => setChecked([]);
  const selectAll = () => setChecked(items.map((x) => x.id));

  const copySelected = async () => {
    const selected = items.filter((x) => checkedSet.has(x.id));
    const text =
      selected.length === 0
        ? 'Отмеченные пункты: (пока нет)'
        : 'Отмеченные пункты:\n' +
          selected.map((x, i) => `${i + 1}. ${x.text}`).join('\n');
    await copyToClipboard(text);
  };

  return (
    <div>
      {!!hint && <div className="muted" style={{ marginBottom: 8 }}>{hint}</div>}

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 800 }}>
          Отмечено: {done} / {total}
        </div>

        <div className="row">
          <button className="btn secondary" type="button" onClick={copySelected}>
            Скопировать
          </button>
          <button className="btn secondary" type="button" onClick={clearAll}>
            Сбросить
          </button>
          <button className="btn" type="button" onClick={selectAll}>
            Все
          </button>
        </div>
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
    </div>
  );
}
