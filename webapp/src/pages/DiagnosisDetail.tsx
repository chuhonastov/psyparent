import React from 'react';
import { Link, useParams } from 'react-router-dom';
import diagnoses from '../content/diagnoses.json';
import medications from '../content/medications.json';
import { routes } from '../app/routes';
import { loadVisitSheet, saveVisitSheet } from '../lib/storage';

type Diagnosis = typeof diagnoses[number];
type Medication = typeof medications[number];

function findDiagnosis(id: string): Diagnosis | undefined {
  return (diagnoses as Diagnosis[]).find(d => d.id === id);
}

function findMedication(id: string): Medication | undefined {
  return (medications as Medication[]).find(m => m.id === id);
}

export default function DiagnosisDetail() {
  const { id } = useParams();
  const d = id ? findDiagnosis(id) : undefined;

  if (!d) {
    return (
      <div className="container">
        <h1 className="h1">Не найдено</h1>
        <Link to={routes.diagnoses}>← Назад</Link>
      </div>
    );
  }

  const addQuestions = () => {
    const sheet = loadVisitSheet();
    const items = new Set(sheet.items);
    (d.whatToAskDoctor ?? []).forEach(q => items.add(q));
    const next = { ...sheet, items: Array.from(items) };
    saveVisitSheet(next);
    alert('Вопросы добавлены в «К врачу».');
  };

  return (
    <div className="container">
      <Link to={routes.diagnoses}>← Диагнозы</Link>
      <h1 className="h1">{d.title}</h1>
      <div className="card">
        <div className="muted">{d.summary}</div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Критерии (упрощённо)</div>
        <ul>
          {(d.criteria ?? []).map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="h2">Вопросы к врачу</div>
          <button className="btn" onClick={addQuestions}>Добавить в «К врачу»</button>
        </div>
        <ul>
          {(d.whatToAskDoctor ?? []).map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Доказательные подходы</div>
        <ul>
          {(d.evidenceBasedHelp ?? []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Препараты, которые иногда обсуждают</div>
        <div className="muted">Это справочная информация. Решение о назначении принимает врач.</div>
        <div style={{ height: 8 }} />
        <div className="list">
          {(d.medications ?? []).map(mid => {
            const m = findMedication(mid);
            if (!m) return null;
            return (
              <Link key={mid} className="item" to={routes.medication(mid)}>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div className="muted">{m.class}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Что часто назначают без пользы</div>
        <div className="muted">Раздел для обсуждения с врачом: цель, альтернативы, доказательность.</div>
        <div style={{ height: 8 }} />
        <div className="list">
          {(d.oftenLowEvidence ?? []).map(mid => {
            const m = findMedication(mid);
            if (!m) return null;
            return (
              <Link key={mid} className="item" to={routes.medication(mid)}>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div className="muted">{m.whenDiscussed?.[0] ?? ''}</div>
              </Link>
            );
          })}
        </div>
      </div>


      <div style={{ height: 12 }} />

      {!!(d.redFlags ?? []).length && (
        <div className="card">
          <div className="h2">Когда срочно обращаться</div>
          <ul>
            {(d.redFlags ?? []).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Источники</div>
        <ul>
          {(d.sources ?? []).map((s, i) => (
            <li key={i}>{('url' in s && s.url) ? (<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>) : (<span>{s.label}</span>)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
