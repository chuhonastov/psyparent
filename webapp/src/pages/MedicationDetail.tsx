import React from 'react';
import { Link, useParams } from 'react-router-dom';
import meds from '../content/medications.json';
import { routes } from '../app/routes';
import { loadVisitSheet, saveVisitSheet } from '../lib/storage';

type Med = typeof meds[number];

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

  const addToVisit = () => {
    const sheet = loadVisitSheet();
    const items = new Set(sheet.items);
    items.add(`Про препарат «${m.name}»: зачем назначен, как оценивать эффект, что мониторить?`);
    const next = { ...sheet, items: Array.from(items) };
    saveVisitSheet(next);
    alert('Добавлено в «К врачу».');
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

        <div style={{ height: 8 }} />
        <button className="btn" onClick={addToVisit}>Добавить вопрос к врачу</button>
      </div>

      <div style={{ height: 12 }} />
      <div className="card">
        <div className="h2">Источники</div>
        <ul>
          {(m.sources ?? []).map((s, i) => (
            <li key={i}>{('url' in s && s.url) ? (<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>) : (<span>{s.label}</span>)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
