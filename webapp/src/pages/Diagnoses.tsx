import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import diagnosesRaw from '../content/diagnoses.json';
import { routes } from '../app/routes';

type DiagnosisLeaf = { id: string; title: string; summary?: string };
type DiagnosisGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type DiagnosisItem = DiagnosisLeaf | DiagnosisGroup;

const diagnoses = diagnosesRaw as unknown as DiagnosisItem[];

function matches(item: any, q: string) {
  const t = (item.title ?? '').toLowerCase();
  const s = (item.summary ?? '').toLowerCase();
  return t.includes(q) || s.includes(q);
}

export default function Diagnoses() {
  const [q, setQ] = useState('');

  const { groups, matchedGroups, matchedLeafs, totalFound } = useMemo(() => {
    const groups = diagnoses.filter((d: any) => d.kind === 'group') as DiagnosisGroup[];
    const leafs = diagnoses.filter((d: any) => d.kind !== 'group') as DiagnosisLeaf[];

    const query = q.trim().toLowerCase();

    if (!query) {
      return {
        groups,
        matchedGroups: groups,
        matchedLeafs: [] as DiagnosisLeaf[],
        totalFound: groups.length,
      };
    }

    const mg = groups.filter((x: any) => matches(x, query));
    const ml = leafs.filter((x: any) => matches(x, query));

    return { groups, matchedGroups: mg, matchedLeafs: ml, totalFound: mg.length + ml.length };
  }, [q]);

  const isSearching = !!q.trim();

  return (
    <div className="container">
      <PageHeader
        title="Диагнозы"
        subtitle="Сначала выберите рубрику — внутри будут конкретные диагнозы"
        back
      />

      <div className="card">
        <div className="searchBar">
          <input
            className="input"
            placeholder="Поиск (например: СДВГ, РАС, тревога, ОКР)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 13 }}>
            {isSearching ? `Найдено: ${totalFound}` : `Рубрик: ${groups.length}`}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {isSearching && totalFound === 0 ? (
        <div className="emptyState">
          Ничего не найдено. Попробуйте другой запрос (например: «СДВГ», «РАС», «тревога», «ОКР»).
        </div>
      ) : (
        <>
          {/* По умолчанию показываем только рубрики */}
          {!isSearching ? (
            <div className="list">
              {matchedGroups.map((g) => (
                <Link key={g.id} className="item" to={routes.diagnosisGroup(g.id)}>
                  <div className="listItem">
                    <div className="listItemMain">
                      <div className="listItemTitle">{g.title}</div>
                      {!!g.summary && <div className="listItemDesc">{g.summary}</div>}
                    </div>
                    <div className="listItemRight">›</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <>
              {!!matchedGroups.length && (
                <>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                    Рубрики
                  </div>
                  <div className="list">
                    {matchedGroups.map((g) => (
                      <Link key={g.id} className="item" to={routes.diagnosisGroup(g.id)}>
                        <div className="listItem">
                          <div className="listItemMain">
                            <div className="listItemTitle">{g.title}</div>
                            {!!g.summary && <div className="listItemDesc">{g.summary}</div>}
                          </div>
                          <div className="listItemRight">›</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div style={{ height: 12 }} />
                </>
              )}

              {!!matchedLeafs.length && (
                <>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                    Диагнозы
                  </div>
                  <div className="list">
                    {matchedLeafs.map((d) => (
                      <Link key={d.id} className="item" to={routes.diagnosis(d.id)}>
                        <div className="listItem">
                          <div className="listItemMain">
                            <div className="listItemTitle">{d.title}</div>
                            {!!d.summary && <div className="listItemDesc">{d.summary}</div>}
                          </div>
                          <div className="listItemRight">›</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
