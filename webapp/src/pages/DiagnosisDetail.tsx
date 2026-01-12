import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import diagnosesRaw from '../content/diagnoses.json';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import Disclosure from '../components/Disclosure';
import Checklist, { ChecklistItem } from '../components/Checklist';
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

type DxItem = DiagnosisContent | { kind: 'group'; id: string; title: string; summary?: string; children: string[] };

const diagnoses = diagnosesRaw as unknown as DxItem[];
const meds = medsRaw as unknown as any[];

export default function DiagnosisDetail() {
  const { id } = useParams();
  const dxId = id ?? '';

  const d = useMemo(() => {
    return diagnoses.find((x: any) => (x as any).id === dxId && (x as any).kind !== 'group') as DiagnosisContent | undefined;
  }, [dxId]);

  const medsById = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of meds) m.set(it.id, it);
    return m;
  }, []);

  if (!d) {
    return (
      <div className="container">
        <Link className="muted" to={routes.diagnoses}>&larr; Назад</Link>
        <h1 className="h1">Диагноз не найден</h1>
      </div>
    );
  }

  return (
    <div className="container">
      <Link className="muted" to={routes.diagnoses}>&larr; Диагнозы</Link>

      <h1 className="h1">{d.title}</h1>
      {!!d.summary && <div className="muted">{d.summary}</div>}

      <div style={{ height: 14 }} />

      {/* Simplified criteria */}
      {!!(d.simplifiedCriteria && d.simplifiedCriteria.length) && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Упрощённые критерии</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.simplifiedCriteria.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}

      <div style={{ height: 12 }} />

      {/* Full criteria checklist */}
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

      {/* Questions to doctor */}
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
                  onClick={() => addVisitQuestion(q)}
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

      {/* Treatment blocks (collapsed) */}
      {!!(d.effectiveMeds && d.effectiveMeds.length) && (
        <Disclosure title="Эффективные препараты" defaultOpen={false} tone="green">
          <div className="list">
            {d.effectiveMeds.map((mid) => {
              const m = medsById.get(mid);
              if (!m) return null;
              return (
                <Link key={mid} className="item" to={routes.medication(mid)}>
                  <div style={{ fontWeight: 800 }}>{m.name}</div>
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

      {/* Red flags */}
      {!!(d.redFlags && d.redFlags.length) && (
        <Disclosure title="Красные флаги — когда нужно обращаться срочно" defaultOpen={false} tone="red">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.redFlags.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Disclosure>
      )}

      <div style={{ height: 12 }} />

      {/* Sources */}
      {!!(d.sources && d.sources.length) && (
        <Disclosure title="Источники" defaultOpen={false} tone="neutral">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {d.sources.map((s, i) => (
              <li key={i}>
                {s.url
                  ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                  : <span>{s.label}</span>}
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
