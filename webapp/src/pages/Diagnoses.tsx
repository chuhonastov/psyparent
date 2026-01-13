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
        subtitle="Выберите диагноз, чтобы проверить критерии и лечение"
      />

      <input
        className="input"
        placeholder="Поиск (например: СДВГ, РАС, тревожные)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div style={{ height: 12 }} />

      <div className="list">
        {items.map((d: any) => {
          const isGroup = d.kind === 'group';
          const to = isGroup ? routes.diagnosisGroup(d.id) : routes.diagnosis(d.id);

          return (
            <Link key={d.id} className="item" to={to}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 800 }}>
                  {d.title}
                  {isGroup && <span className="pill" style={{ marginLeft: 8 }}>рубрика</span>}
                </div>
                <div className="muted">›</div>
              </div>

              {!!d.summary && <div className="muted">{d.summary}</div>}
            </Link>
          );
        })}
      </div>

      <div style={{ height: 12 }} />
    </div>
  );
}
