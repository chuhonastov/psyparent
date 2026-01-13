import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import diagnosesRaw from '../content/diagnoses.json';
import { routes } from '../app/routes';

type DiagnosisLeaf = { id: string; title: string; summary?: string };
type DiagnosisGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type DiagnosisItem = DiagnosisLeaf | DiagnosisGroup;

const diagnoses = diagnosesRaw as unknown as DiagnosisItem[];

export default function Diagnoses() {
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return diagnoses;

    return diagnoses.filter((d: any) => {
      const t = (d.title ?? '').toLowerCase();
      const s = (d.summary ?? '').toLowerCase();
      return t.includes(query) || s.includes(query);
    });
  }, [q]);

  return (
    <div className="container">
      <PageHeader
        title="Диагнозы"
        subtitle="Выберите диагноз, чтобы проверить критерии и терапию"
        back
      />

      <div className="card">
        <div className="searchBar">
          <input
            className="input"
            placeholder="Поиск (например: СДВГ, РАС, тревожные)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 13 }}>
            {q.trim() ? `Найдено: ${items.length}` : `Всего: ${diagnoses.length}`}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {items.length === 0 ? (
        <div className="emptyState">
          Ничего не найдено. Попробуйте другой запрос (например: «СДВГ», «РАС», «тревога»).
        </div>
      ) : (
        <div className="list">
          {items.map((d: any) => {
            const isGroup = d.kind === 'group';
            const to = isGroup ? routes.diagnosisGroup(d.id) : routes.diagnosis(d.id);

            return (
              <Link key={d.id} className="item" to={to}>
                <div className="listItem">
                  <div className="listItemMain">
                    <div className="listItemTitle">
                      {d.title}
                      {isGroup && <span className="tag" style={{ marginLeft: 8 }}>рубрика</span>}
                    </div>
                    {!!d.summary && <div className="listItemDesc">{d.summary}</div>}
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
