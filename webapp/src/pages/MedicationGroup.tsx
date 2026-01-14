import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { cleanTitle } from '../lib/format';

type MedLeaf = { id: string; name?: string; title?: string; class?: string };
type MedGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type MedItem = MedLeaf | MedGroup;

const meds = medsRaw as unknown as MedItem[];

export default function MedicationGroupPage() {
  const { id } = useParams();
  const groupId = id ?? '';

  const group = useMemo(() => {
    return meds.find((x: any) => x.kind === 'group' && x.id === groupId) as MedGroup | undefined;
  }, [groupId]);

  const children = useMemo(() => {
    if (!group) return [];
    const byId = new Map<string, any>(meds.map((m: any) => [m.id, m]));
    return group.children
      .map((cid) => byId.get(cid))
      .filter(Boolean)
      .filter((m: any) => m.kind !== 'group')
      .map((m: any) => ({
        id: m.id,
        name: cleanTitle(m.name ?? m.title ?? m.id),
        class: m.class ?? '',
      })) as Array<{ id: string; name: string; class?: string }>;
  }, [group]);

  if (!group) {
    return (
      <div className="container">
        <PageHeader
          title="Группа не найдена"
          subtitle="Проверьте ссылку или вернитесь в «Лечение»"
          backTo={routes.medications}
          backLabel="Лечение"
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title={group.title}
        subtitle={group.summary}
        backTo={routes.medications}
        backLabel="Лечение"
      />

      <div className="list">
        {children.map((m) => (
          <Link key={m.id} className="item" to={routes.medication(m.id)}>
            <div className="listItem">
              <div className="listItemMain">
                <div className="listItemTitle">{m.name}</div>
                {!!m.class && <div className="listItemDesc">{m.class}</div>}
              </div>
              <div className="listItemRight">›</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}
