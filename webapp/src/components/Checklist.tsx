import React, { useEffect, useMemo, useState } from 'react';

export type ChecklistItem = {
  id: string;
  text: string;
};

type Props = {
  storageKey: string;          // unique per diagnosis + section
  items: ChecklistItem[];
  hint?: string;
};

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter(x => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function saveSet(key: string, s: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(s)));
  } catch {
    // ignore
  }
}

export default function Checklist({ storageKey, items, hint }: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => loadSet(storageKey));

  // keep in sync if storageKey changes
  useEffect(() => {
    setChecked(loadSet(storageKey));
  }, [storageKey]);

  useEffect(() => {
    saveSet(storageKey, checked);
  }, [storageKey, checked]);

  const checkedCount = useMemo(() => {
    let c = 0;
    for (const it of items) if (checked.has(it.id)) c++;
    return c;
  }, [items, checked]);

  return (
    <div className="card" style={{ padding: 12 }}>
      {hint && <div className="muted" style={{ marginBottom: 8 }}>{hint}</div>}

      <div className="muted" style={{ marginBottom: 10 }}>
        Отмечено: <b>{checkedCount}</b> из {items.length}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((it) => {
          const isOn = checked.has(it.id);
          return (
            <label key={it.id} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => {
                  setChecked(prev => {
                    const next = new Set(prev);
                    if (next.has(it.id)) next.delete(it.id);
                    else next.add(it.id);
                    return next;
                  });
                }}
                style={{ marginTop: 4 }}
              />
              <span>{it.text}</span>
            </label>
          );
        })}
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        Это чек-лист для самоориентации. Диагноз ставит специалист по результатам оценки.
      </div>
    </div>
  );
}
