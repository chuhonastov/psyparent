import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';

type MedLeaf = { id: string; name?: string; title?: string; class?: string; summary?: string };
type MedGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type MedItem = MedLeaf | MedGroup;

const meds = medsRaw as unknown as MedItem[];

function isGroup(x: MedItem): x is MedGroup {
  return (x as any).kind === 'group';
}

export default function Medications() {
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    // По умолчанию показываем только рубрики.
    if (!query) return meds.filter((m) => isGroup(m));

    // При поиске показываем и рубрики, и препараты.
    return meds.filter((m: any) => {
      const title = (m.title ?? m.name ?? '').toLowerCase();
      const cls = (m.class ?? '').toLowerCase();
      const summary = (m.summary ?? '').toLowerCase();
      return title.includes(query) || cls.includes(query) || summary.includes(query);
    });
  }, [q]);

  return (
    <div className="container">
      <PageHeader
        title="Лечение"
        subtitle="Препараты: когда обсуждают, что мониторят, что важно"
        back
      />

      <div className="card">
        <div className="searchBar">
          <input
            className="input"
            placeholder="Поиск (например: атомоксетин, стимуляторы, СИОЗС)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 13 }}>
            {q.trim()
              ? `Найдено: ${items.length}`
              : `Рубрик: ${meds.filter((m) => isGroup(m)).length}`}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {items.length === 0 ? (
        <div className="emptyState">
          Ничего не найдено. Попробуйте другой запрос (например: «атомоксетин», «СИОЗС»).
        </div>
      ) : (
        <div className="list">
          {items.map((m: any) => {
            const group = isGroup(m);
            const id = m.id;
            const title = group ? m.title : (m.name ?? m.title ?? id);
            const cls = group ? undefined : m.class;
            const to = group ? routes.medicationGroup(id) : routes.medication(id);

            return (
              <Link key={id} className="item" to={to}>
                <div className="listItem">
                  <div className="listItemMain">
                    <div className="listItemTitle">
                      {title}
                      {group && <span className="tag" style={{ marginLeft: 8 }}>рубрика</span>}
                    </div>
                    {!!m.summary && <div className="listItemDesc">{m.summary}</div>}
                    {!!cls && <div className="listItemDesc">{cls}</div>}
                  </div>
                  <div className="listItemRight">›</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
