import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import diagnosesRaw from '../content/diagnoses.json';
import { routes } from '../app/routes';

type DiagnosisLeaf = { id: string; title: string; summary?: string };
type DiagnosisGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type DiagnosisItem = DiagnosisLeaf | DiagnosisGroup;

const diagnoses = diagnosesRaw as unknown as DiagnosisItem[];

function isGroup(x: DiagnosisItem): x is DiagnosisGroup {
  return (x as any).kind === 'group';
}

export default function DiagnosisGroupPage() {
  const { id } = useParams();
  const groupId = id ?? '';

  const group = useMemo(() => {
    return diagnoses.find((x: any) => x.kind === 'group' && x.id === groupId) as DiagnosisGroup | undefined;
  }, [groupId]);

  const children = useMemo(() => {
    if (!group) return [] as DiagnosisLeaf[];

    const byId = new Map<string, DiagnosisItem>();
    for (const d of diagnoses) byId.set((d as any).id, d);

    return group.children
      .map((cid) => byId.get(cid))
      .filter((x): x is DiagnosisLeaf => !!x && !isGroup(x))
      .map((d) => ({ id: d.id, title: d.title, summary: d.summary }));
  }, [group]);

  if (!group) {
    return (
      <div className="container">
        <PageHeader
          title="Рубрика не найдена"
          subtitle="Проверьте ссылку или выберите рубрику из списка"
          backTo={routes.diagnoses}
          backLabel="Диагнозы"
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title={group.title}
        subtitle={group.summary}
        backTo={routes.diagnoses}
        backLabel="Диагнозы"
      />

      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Выберите диагноз</div>

        <div className="list">
          {children.map((d) => (
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
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
