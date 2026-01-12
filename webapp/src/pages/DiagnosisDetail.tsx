import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import diagnosesRaw from '../content/diagnoses.json';
import { routes } from '../app/routes';

type DiagnosisLeaf = { id: string; title: string; summary?: string };
type DiagnosisGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type DiagnosisItem = DiagnosisLeaf | DiagnosisGroup;

const diagnoses = diagnosesRaw as unknown as DiagnosisItem[];

export default function DiagnosisGroupPage() {
  const { id } = useParams();
  const groupId = id ?? '';

  const group = useMemo(() => {
    return diagnoses.find((x: any) => x.kind === 'group' && x.id === groupId) as DiagnosisGroup | undefined;
  }, [groupId]);

  const children = useMemo(() => {
    if (!group) return [];
    const byId = new Map<string, any>(diagnoses.map((d: any) => [d.id, d]));
    return group.children
      .map(cid => byId.get(cid))
      .filter(Boolean)
      .map((d: any) => ({ id: d.id, title: d.title, summary: d.summary ?? '' })) as DiagnosisLeaf[];
  }, [group]);

  if (!group) {
    return (
      <div className="container">
        <Link className="muted" to={routes.diagnoses()}>&larr; Назад</Link>
        <h1 className="h1">Рубрика не найдена</h1>
      </div>
    );
  }

  return (
    <div className="container">
      <Link className="muted" to={routes.diagnoses()}>&larr; Диагнозы</Link>

      <h1 className="h1">{group.title}</h1>
      {!!group.summary && <div className="muted">{group.summary}</div>}

      <div style={{ height: 12 }} />

      <div className="list">
        {children.map((d) => (
          <Link key={d.id} className="item" to={routes.diagnosis(d.id)}>
            <div style={{ fontWeight: 700 }}>{d.title}</div>
            {!!d.summary && <div className="muted">{d.summary}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
