import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import {
  addVisitQuestion,
  clearVisit,
  getVisit,
  removeVisitMedication,
  removeVisitQuestion,
  subscribeVisit
} from '../lib/visit';

const meds = medsRaw as unknown as any[];

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Скопировано.');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Скопировано.');
  }
}

export default function VisitSheet() {
  const [visit, setVisit] = useState(() => getVisit());
  const [newQ, setNewQ] = useState('');

  const medsById = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of meds) m.set(it.id, it);
    return m;
  }, []);

  useEffect(() => {
    setVisit(getVisit());
    const unsub = subscribeVisit(() => setVisit(getVisit()));
    return () => unsub();
  }, []);

  const copyAll = async () => {
    const parts: string[] = [];
    parts.push('К врачу — список для приёма');

    if (visit.questions.length) {
      parts.push('\nВопросы:');
      visit.questions.forEach((q, i) => parts.push(`${i + 1}. ${q}`));
    } else {
      parts.push('\nВопросы: (пока нет)');
    }

    if (visit.meds.length) {
      parts.push('\nЛечение / препараты:');
      visit.meds.forEach((id, i) => {
        const m = medsById.get(id);
        const name = m?.name ?? m?.title ?? id;
        parts.push(`${i + 1}. ${name}`);
      });
    } else {
      parts.push('\nЛечение / препараты: (пока нет)');
    }

    await copyToClipboard(parts.join('\n'));
  };

  const addCustomQuestion = () => {
    const t = newQ.trim();
    if (!t) return;
    addVisitQuestion(t);
    setNewQ('');
  };

  return (
    <div className="container">
      <PageHeader
        title="К врачу"
        subtitle="Ваш список вопросов и лечения для обсуждения"
        right={
          <div className="row">
            <button className="btn secondary" type="button" onClick={copyAll}>
              Скопировать
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (confirm('Очистить весь список?')) clearVisit();
              }}
            >
              Очистить
            </button>
          </div>
        }
      />

      {/* Добавить свой вопрос */}
      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Добавить свой вопрос</div>
        <div className="row">
          <input
            className="input"
            placeholder="Например: «Какие альтернативы, если эффекта нет через 6–8 недель?»"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustomQuestion();
            }}
          />
          <button className="btn" type="button" onClick={addCustomQuestion}>
            Добавить
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Можно писать любые вопросы — они сохранятся и будут доступны при следующем открытии.
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* Вопросы */}
      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Вопросы</div>

        {visit.questions.length === 0 ? (
          <div className="muted">Пока нет вопросов. Добавляйте их на страницах диагнозов/препаратов или вручную выше.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {visit.questions.map((q) => (
              <div key={q} className="card" style={{ padding: 10 }}>
                <div style={{ marginBottom: 8 }}>{q}</div>
                <button className="btn secondary" type="button" onClick={() => removeVisitQuestion(q)}>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />

      {/* Лечение / препараты */}
      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Лечение / препараты</div>

        {visit.meds.length === 0 ? (
          <div className="muted">Пока нет препаратов. Добавляйте их на странице препарата кнопкой «Добавить препарат».</div>
        ) : (
          <div className="list">
            {visit.meds.map((id) => {
              const m = medsById.get(id);
              const name = m?.name ?? m?.title ?? id;
              const cls = m?.class;

              return (
                <div key={id} className="item">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{name}</div>
                      {!!cls && <div className="muted">{cls}</div>}
                    </div>

                    <div className="row">
                      <Link className="btn secondary" to={routes.medication(id)}>
                        Открыть
                      </Link>
                      <button className="btn secondary" type="button" onClick={() => removeVisitMedication(id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
