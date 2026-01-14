import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { cleanTitle } from '../lib/format';

type MedLeaf = { id: string; name?: string; title?: string; class?: string };
type MedGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type MedItem = MedLeaf | MedGroup;

const meds = medsRaw as unknown as MedItem[];

function matchesLeaf(m: any, q: string) {
  const name = cleanTitle(m.name ?? m.title ?? '').toLowerCase();
  const cls = (m.class ?? '').toLowerCase();
  return name.includes(q) || cls.includes(q);
}

function matchesGroup(g: any, q: string) {
  const t = (g.title ?? '').toLowerCase();
  const s = (g.summary ?? '').toLowerCase();
  return t.includes(q) || s.includes(q);
}

export default function Medications() {
  const [q, setQ] = useState('');

  const { groups, leafs, matchedGroups, matchedLeafs, totalFound } = useMemo(() => {
    const groups = meds.filter((m: any) => m.kind === 'group') as MedGroup[];
    const leafs = meds.filter((m: any) => m.kind !== 'group') as MedLeaf[];

    const query = q.trim().toLowerCase();
    if (!query) {
      return { groups, leafs, matchedGroups: groups, matchedLeafs: [] as MedLeaf[], totalFound: groups.length };
    }

    const mg = groups.filter((g: any) => matchesGroup(g, query));
    const ml = leafs.filter((m: any) => matchesLeaf(m, query));

    return { groups, leafs, matchedGroups: mg, matchedLeafs: ml, totalFound: mg.length + ml.length };
  }, [q]);

  const isSearching = !!q.trim();

  return (
    <div className="container">
      <PageHeader
        title="Лечение"
        subtitle="Сначала выберите группу препаратов — внутри будут лекарства"
        back
      />

      <div className="card">
        <div className="searchBar">
          <input
            className="input"
            placeholder="Поиск (например: сертралин, рисперидон, ноотропы)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 13 }}>
            {isSearching ? `Найдено: ${totalFound}` : `Групп: ${groups.length}`}
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {isSearching && totalFound === 0 ? (
        <div className="emptyState">Ничего не найдено. Попробуйте другой запрос.</div>
      ) : !isSearching ? (
        <div className="list">
          {matchedGroups.map((g) => (
            <Link key={g.id} className="item" to={routes.medicationGroup(g.id)}>
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
                Группы
              </div>
              <div className="list">
                {matchedGroups.map((g) => (
                  <Link key={g.id} className="item" to={routes.medicationGroup(g.id)}>
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
                Препараты
              </div>
              <div className="list">
                {matchedLeafs.map((m: any) => (
                  <Link key={m.id} className="item" to={routes.medication(m.id)}>
                    <div className="listItem">
                      <div className="listItemMain">
                        <div className="listItemTitle">{cleanTitle(m.name ?? m.title ?? m.id)}</div>
                        {!!m.class && <div className="listItemDesc">{m.class}</div>}
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

      <div style={{ height: 16 }} />
    </div>
  );
}
