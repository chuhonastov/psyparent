import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Disclosure from '../components/Disclosure';
import Checklist, { ChecklistItem } from '../components/Checklist';
import diagnosesRaw from '../content/diagnoses.json';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { addVisitQuestion } from '../lib/visit';

type Source = { label: string; url?: string };

type DiagnosisContent = {
  id: string;
  title: string;
  summary?: string;

  simplifiedCriteria?: string[];
  fullCriteriaChecklist?: { title?: string; items: ChecklistItem[] };

  questionsToDoctor?: string[];

  effectiveMeds?: string[];      // array of medication ids
  evidenceApproaches?: string[]; // bullets
  ineffectivePharm?: string[];   // bullets

  redFlags?: string[];
  sources?: Source[];
};

type DiagnosisGroup = {
  kind: 'group';
  id: string;
  title: string;
  summary?: string;
  children: string[];
};

type DxItem = DiagnosisContent | DiagnosisGroup;

const diagnoses = diagnosesRaw as unknown as DxItem[];
const meds = medsRaw as unknown as any[];

export default function DiagnosisDetail() {
  const { id } = useParams();
  const dxId = id ?? '';

  const item = useMemo(() => {
    return diagnoses.find((x: any) => (x as any).id === dxId) as DxItem | undefined;
  }, [dxId]);

  const medsById = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of meds) m.set(it.id, it);
    return m;
  }, []);

  // --- Not found
  if (!item) {
    return (
      <div className="container">
        <PageHeader title="Диагноз не найден" subtitle="Проверьте ссылку или выберите диагноз из списка" back />
        <Link className="btn secondary" to={routes.diagnoses}>Перейти к диагнозам</Link>
        <div style={{ height: 80 }} />
      </div>
    );
  }

  // --- GROUP VIEW (e.g. "Тревожные расстройства")
  if ((item as any).kind === 'group') {
    const g = item as DiagnosisGroup;

    return (
      <div className="container">
        <PageHeader title={g.title} subtitle={g.summary ?? 'Выберите диагноз из рубрики'} back />

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Выберите диагноз</div>

          <div className="list">
            {g.children.map((cid) => {
              const child = diagnoses.find(
                (x: any) => (x as any).id === cid && (x as any).kind !== 'group'
              ) as DiagnosisContent | undefined;

              return (
                <Link key={cid} className="item" to={routes.diagnosis(cid)}>
                  <div style={{ fontWeight: 800 }}>{child?.title ?? cid}</div>
                  {!!child?.summary && <div className="muted">{child.summary}</div>}
                </Link>
              );
            })}
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>
    );
  }

  // --- NORMAL DIAGNOSIS VIEW
  const d = item as DiagnosisContent;

  return (
    <div className="container">
      <PageHeader title={d.title} subtitle={d.summary ?? 'Критерии, терапия и вопросы к врачу'} back />

      {!!(d.simplifiedCriteria && d.simplifiedCriteria.length) && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Упрощённые критерии</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.simplifiedCriteria.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}

      <div style={{ height: 12 }} />

      {!!d.fullCriteriaChecklist?.items?.length && (
        <Disclosure title="Полные критерии (чек-лист)" defaultOpen={false} tone="neutral">
          <Checklist
            storageKey={`dx:${d.id}:fullCriteria`}
            items={d.fullCriteriaChecklist.items}
            hint={d.fullCriteriaChecklist.title}
          />
        </Disclosure>
      )}

      <div style={{ height: 12 }} />

      {!!(d.questionsToDoctor && d.questionsToDoctor.length) && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Вопросы к врачу</div>

          <div style={{ display: 'grid', gap: 10 }}>
            {d.questionsToDoctor.map((q, i) => (
              <div key={i} className="card" style={{ padding: 10 }}>
                <div style={{ marginBottom: 8 }}>{q}</div>
                <button
  className="btn"
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    addVisitQuestion(q);
  }}
>
  Добавить
</button>
              </div>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Все добавленные вопросы будут в разделе “К врачу”.
          </div>
        </div>
      )}

      <div style={{ height: 12 }} />

      {!!(d.effectiveMeds && d.effectiveMeds.length) && (
        <Disclosure title="Эффективные препараты" defaultOpen={false} tone="green">
          <div className="list">
            {d.effectiveMeds.map((mid) => {
              const m = medsById.get(mid);
              if (!m) return null;
              return (
                <Link key={mid} className="item" to={routes.medication(mid)}>
                  <div style={{ fontWeight: 800 }}>{m.name ?? m.title ?? mid}</div>
                  {!!m.class && <div className="muted">{m.class}</div>}
                </Link>
              );
            })}
          </div>
        </Disclosure>
      )}

      {!!(d.evidenceApproaches && d.evidenceApproaches.length) && (
        <Disclosure title="Доказательные подходы" defaultOpen={false} tone="lime">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.evidenceApproaches.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Disclosure>
      )}

      {!!(d.ineffectivePharm && d.ineffectivePharm.length) && (
        <Disclosure title="Неэффективная фармакотерапия" defaultOpen={false} tone="red">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.ineffectivePharm.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Disclosure>
      )}

      <div style={{ height: 12 }} />

      {!!(d.redFlags && d.redFlags.length) && (
        <Disclosure title="Красные флаги — когда нужно обращаться срочно" defaultOpen={false} tone="red">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.redFlags.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Disclosure>
      )}

      <div style={{ height: 12 }} />

      {!!(d.sources && d.sources.length) && (
        <Disclosure title="Источники" defaultOpen={false} tone="neutral">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.sources.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                ) : (
                  <span>{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
