import React from 'react';
import { Link, useParams } from 'react-router-dom';
import meds from '../content/medications.json';
import { routes } from '../app/routes';
import { addVisitMedication, addVisitQuestion } from '../lib/visit';

// JSON imports infer strict literal types. We allow `sources.url` optionally
type Source = { label: string; url?: string };
type Med = Omit<typeof meds[number], 'sources'> & { sources?: Source[] };

function findMed(id: string): Med | undefined {
  return (meds as Med[]).find(m => m.id === id);
}

export default function MedicationDetail() {
  const { id } = useParams();
  const m = id ? findMed(id) : undefined;

  if (!m) {
    return (
      <div className="container">
        <h1 className="h1">Не найдено</h1>
        <Link to={routes.medications}>← Назад</Link>
      </div>
    );
  }

  const addMedToVisit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addVisitMedication(m.id);
    alert('Препарат добавлен в «К врачу» → «Лечение / препараты».');
  };

  const addQuestionToVisit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addVisitQuestion(`Про препарат «${m.name}»: зачем назначен, как оценивать эффект, что мониторить?`);
    alert('Вопрос добавлен в «К врачу» → «Вопросы».');
  };

  return (
    <div className="container">
      <Link to={routes.medications}>← Препараты</Link>
      <h1 className="h1">{m.name}</h1>

      <div className="card">
        <div className="tag">{m.class}</div>
        <div style={{ height: 8 }} />

        <div className="h2">Когда обсуждают</div>
        <ul>
          {(m.whenDiscussed ?? []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <div style={{ height: 8 }} />
        <div className="h2">Что обычно мониторят</div>
        <ul>
          {(m.monitoring ?? []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <div style={{ height: 8 }} />
        <div className="h2">Важно</div>
        <ul>
          {(m.warnings ?? []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <div style={{ height: 10 }} />

        <div className="row">
          <button className="btn" type="button" onClick={addMedToVisit}>
            Добавить препарат
          </button>
          <button className="btn secondary" type="button" onClick={addQuestionToVisit}>
            Добавить вопрос
          </button>
        </div>
      </div>

      <div style={{ height: 12 }} />
      <div className="card">
        <div className="h2">Источники</div>
        <ul>
          {(m.sources ?? []).map((s, i) => (
            <li key={i}>
              {s.url
                ? (<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>)
                : (<span>{s.label}</span>)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
