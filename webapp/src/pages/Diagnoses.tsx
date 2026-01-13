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

  const groups = useMemo(() => {
    return diagnoses.filter((d: any) => d.kind === 'group') as DiagnosisGroup[];
  }, []);

  const hasId = (id: string) =>
    diagnoses.some((d: any) => (d?.kind !== 'group') && d?.id === id);

  const quick = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    if (hasId('adhd')) out.push({ id: 'adhd', label: 'СДВГ' });
    if (hasId('asd')) out.push({ id: 'asd', label: 'РАС' });
    if (hasId('anxiety')) out.push({ id: 'anxiety', label: 'Тревога' });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="stickyBar">
        <div className="card">
          <div className="searchBar">
            <div className="searchRow">
              <input
                className="input"
                placeholder="Поиск (например: СДВГ, РАС, тревожные)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {!!q.trim() && (
                <button className="btn secondary btnSmall" type="button" onClick={() => setQ('')}>
                  Очистить
                </button>
              )}
            </div>

            <div className="chipRow" aria-label="Быстрый выбор">
              <button className="pill" type="button" onClick={() => setQ('')}>
                Все
              </button>

              {quick.map((x) => (
                <Link key={x.id} className="pill" to={routes.diagnosis(x.id)}>
                  {x.label}
                </Link>
              ))}

              {groups.map((g) => (
                <Link key={g.id} className="pill" to={routes.diagnosisGroup(g.id)}>
                  {g.title}
                </Link>
              ))}
            </div>

            <div className="muted" style={{ fontSize: 13 }}>
              {q.trim() ? `Найдено: ${items.length}` : `Всего: ${diagnoses.length}`}
            </div>
          </div>
        </div>
      </div>

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
