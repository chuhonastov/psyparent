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
  setVisitMedicationField,
  subscribeVisit
} from '../lib/visit';

const meds = medsRaw as unknown as any[];

type MedDetail = {
  dose?: string;
  schedule?: string;
  goal?: string;
  monitoring?: string;
  warnings?: string;
  note?: string;
};

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

function formatMedLine(name: string, d?: MedDetail) {
  if (!d) return name;
  const parts: string[] = [];

  if (d.dose?.trim()) parts.push(`доза: ${d.dose.trim()}`);
  if (d.schedule?.trim()) parts.push(`режим: ${d.schedule.trim()}`);
  if (d.goal?.trim()) parts.push(`цель: ${d.goal.trim()}`);
  if (d.monitoring?.trim()) parts.push(`мониторинг: ${d.monitoring.trim()}`);
  if (d.warnings?.trim()) parts.push(`важно: ${d.warnings.trim()}`);
  if (d.note?.trim()) parts.push(`коммент.: ${d.note.trim()}`);

  return parts.length ? `${name} — ${parts.join('; ')}` : name;
}

export default function VisitSheet() {
  const [visit, setVisit] = useState(() => getVisit());
  const [newQ, setNewQ] = useState('');
  const [draft, setDraft] = useState<Record<string, MedDetail>>({});

  const medsById = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of meds) m.set(it.id, it);
    return m;
  }, []);

  useEffect(() => {
    const v = getVisit();
    setVisit(v);
    setDraft((v.medDetails ?? {}) as any);

    const unsub = subscribeVisit(() => {
      const next = getVisit();
      setVisit(next);
      setDraft((next.medDetails ?? {}) as any);
    });

    return () => unsub();
  }, []);

  const copyAll = async () => {
    const parts: string[] = [];
    parts.push('К врачу — список для приёма');

    if (visit.questions.length) {
      parts.push('\nВопросы:');
      visit.questions.forEach((q: string, i: number) => parts.push(`${i + 1}. ${q}`));
    } else {
      parts.push('\nВопросы: (пока нет)');
    }

    if (visit.meds.length) {
      parts.push('\nЛечение / препараты:');
      visit.meds.forEach((id: string, i: number) => {
        const m = medsById.get(id);
        const name = m?.name ?? m?.title ?? id;
        const d = (visit.medDetails?.[id] ?? {}) as MedDetail;
        parts.push(`${i + 1}. ${formatMedLine(name, d)}`);
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

  const setDraftField = (id: string, field: keyof MedDetail, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [field]: value },
    }));
  };

  const commitField = (id: string, field: keyof MedDetail) => {
    const v = (draft[id]?.[field] ?? '') as string;
    setVisitMedicationField(id, field, v);
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

      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Добавить свой вопрос</div>
        <div className="row">
          <input
            className="input"
            placeholder="Например: «Что считаем хорошим эффектом и когда менять план?»"
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
          Можно писать любые вопросы — они сохранятся.
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Вопросы</div>

        {visit.questions.length === 0 ? (
          <div className="muted">
            Пока нет вопросов. Добавляйте их на страницах диагнозов/препаратов или вручную выше.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {visit.questions.map((q: string) => (
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

      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Лечение / препараты</div>

        {visit.meds.length === 0 ? (
          <div className="muted">
            Пока нет препаратов. Добавляйте их на странице препарата кнопкой «Добавить препарат».
          </div>
        ) : (
          <div className="list">
            {visit.meds.map((id: string) => {
              const m = medsById.get(id);
              const name = m?.name ?? m?.title ?? id;
              const cls = m?.class;

              const d = (draft[id] ?? {}) as MedDetail;

              return (
                <div key={id} className="item">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
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

                  <div className="medFields" style={{ marginTop: 10 }}>
                    <div>
                      <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Доза</div>
                      <textarea
                        className="input textarea"
                        rows={2}
                        placeholder="Напр.: 25 мг"
                        value={d.dose ?? ''}
                        onChange={(e) => setDraftField(id, 'dose', e.target.value)}
                        onBlur={() => commitField(id, 'dose')}
                      />
                    </div>

                    <div>
                      <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Режим / кратность</div>
                      <textarea
                        className="input textarea"
                        rows={2}
                        placeholder="Напр.: утром, 1 раз/день"
                        value={d.schedule ?? ''}
                        onChange={(e) => setDraftField(id, 'schedule', e.target.value)}
                        onBlur={() => commitField(id, 'schedule')}
                      />
                    </div>

                    <div>
                      <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Цель / критерии эффекта</div>
                      <textarea
                        className="input textarea"
                        rows={2}
                        placeholder="Напр.: уменьшение симптомов через 4–6 недель"
                        value={d.goal ?? ''}
                        onChange={(e) => setDraftField(id, 'goal', e.target.value)}
                        onBlur={() => commitField(id, 'goal')}
                      />
                    </div>

                    <div>
                      <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Мониторинг</div>
                      <textarea
                        className="input textarea"
                        rows={3}
                        placeholder="Напр.: АД/пульс, рост/вес, сон, аппетит"
                        value={d.monitoring ?? ''}
                        onChange={(e) => setDraftField(id, 'monitoring', e.target.value)}
                        onBlur={() => commitField(id, 'monitoring')}
                      />
                    </div>

                    <div className="medFieldsSpan2">
                      <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Важно</div>
                      <textarea
                        className="input textarea"
                        rows={3}
                        placeholder="Напр.: основные предупреждения/риски"
                        value={d.warnings ?? ''}
                        onChange={(e) => setDraftField(id, 'warnings', e.target.value)}
                        onBlur={() => commitField(id, 'warnings')}
                      />
                    </div>

                    <div className="medFieldsSpan2">
                      <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Комментарий (опционально)</div>
                      <textarea
                        className="input textarea"
                        rows={4}
                        placeholder="Любые дополнительные пометки"
                        value={d.note ?? ''}
                        onChange={(e) => setDraftField(id, 'note', e.target.value)}
                        onBlur={() => commitField(id, 'note')}
                      />
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
