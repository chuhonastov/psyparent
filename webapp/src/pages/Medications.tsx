import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';

const meds = medsRaw as unknown as any[];

export default function Medications() {
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return meds;

    return meds.filter((m: any) => {
      const name = (m.name ?? m.title ?? '').toLowerCase();
      const cls = (m.class ?? '').toLowerCase();
      return name.includes(query) || cls.includes(query);
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
            {q.trim() ? `Найдено: ${items.length}` : `Всего: ${meds.length}`}
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
            const id = m.id;
            const title = m.name ?? m.title ?? id;
            const cls = m.class;

            return (
              <Link key={id} className="item" to={routes.medication(id)}>
                <div className="listItem">
                  <div className="listItemMain">
                    <div className="listItemTitle">{title}</div>
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
