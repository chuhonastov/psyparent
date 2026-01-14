import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cleanTitle } from '../lib/format';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Disclosure from '../components/Disclosure';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { toast } from '../lib/toast';
import {
  addVisitQuestion,
  clearVisit,
  getVisit,
  removeVisitMedication,
  removeVisitQuestion,
  setVisitMedicationField,
  subscribeVisit,
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
    toast('Скопировано.', { variant: 'success' });
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('Скопировано.', { variant: 'success' });
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

function makeMedSummary(d: MedDetail) {
  const parts: string[] = [];
  if (d.dose?.trim()) parts.push('доза');
  if (d.schedule?.trim()) parts.push('режим');
  if (d.goal?.trim()) parts.push('цель');
  if (d.monitoring?.trim()) parts.push('мониторинг');
  if (d.warnings?.trim()) parts.push('важно');
  if (d.note?.trim()) parts.push('комм.');

  if (parts.length === 0) return 'Ничего не заполнено — нажмите, чтобы добавить детали';
  return `Заполнено: ${parts.join(' • ')}`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractDxName(raw: string) {
  const text = raw.replace(/^\[DX\]\s*/, '');
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  if (!firstLine) return 'Диагноз';
  const m = firstLine.match(/^(.+?)(:|—|-)\s*/);
  const name = (m?.[1] ?? firstLine).trim();
  return name.length > 60 ? name.slice(0, 60) + '…' : name;
}

function extractChecklistTitleInsideDx(raw: string, dxName: string) {
  const text = raw.replace(/^\[DX\]\s*/, '');
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  if (!firstLine) return 'Чек-лист';

  const re = new RegExp(`^${escapeRegExp(dxName)}\\s*[:—-]\\s*`, 'i');
  const t = firstLine.replace(re, '').trim();
  return t || 'Чек-лист';
}

/* авторастущая textarea с лимитом по высоте */
function AutoTextarea(props: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  minRows?: number;
}) {
  const { value, placeholder, onChange, onBlur, minRows = 2 } = props;
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;

    const MAX = 180;
    el.style.height = 'auto';
    el.style.overflowY = 'hidden';

    const next = el.scrollHeight;
    if (next > MAX) {
      el.style.height = `${MAX}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${next}px`;
      el.style.overflowY = 'hidden';
    }
  };

  useEffect(() => {
    resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="input textarea textareaAuto"
      rows={minRows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      onBlur={onBlur}
    />
  );
}

export default function VisitSheet() {
 const medsById = useMemo(() => {
  const m = new Map<string, any>();
  for (const it of meds) {
    if ((it as any).kind === 'group') continue;
    m.set((it as any).id, it);
  }
  return m;
}, []);


  useEffect(() => {
    const v = getVisit();
    setVisit(v);
    setDraft(((v as any).medDetails ?? {}) as any);

    const unsub = subscribeVisit(() => {
      const next = getVisit();
      setVisit(next);
      setDraft(((next as any).medDetails ?? {}) as any);
    });

    return () => unsub();
  }, []);

  const dxChecklists = useMemo(() => {
    return ((visit as any).questions ?? []).filter((x: string) => x.startsWith('[DX] '));
  }, [visit]);

  const normalQuestions = useMemo(() => {
    return ((visit as any).questions ?? []).filter((x: string) => !x.startsWith('[DX] '));
  }, [visit]);

  const dxGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, string[]>();

    for (const raw of dxChecklists) {
      const name = extractDxName(raw);
      if (!map.has(name)) {
        map.set(name, []);
        order.push(name);
      }
      map.get(name)!.push(raw);
    }

    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [dxChecklists]);

  const dxNamesLine = useMemo(() => {
    if (!dxGroups.length) return '';
    return dxGroups.map((g) => g.name).join(', ');
  }, [dxGroups]);

  const copyAll = async () => {
    const parts: string[] = [];
    parts.push('К врачу — список для приёма');

    if (dxChecklists.length) {
      parts.push('\nДиагнозы / чек-листы:');
      dxChecklists.forEach((raw: string, i: number) => {
        const text = raw.replace(/^\[DX\]\s*/, '');
        parts.push(`${i + 1}. ${text.replace(/\n/g, ' | ')}`);
      });
    } else {
      parts.push('\nДиагнозы / чек-листы: (пока нет)');
    }

    if (normalQuestions.length) {
      parts.push('\nВопросы:');
      normalQuestions.forEach((q: string, i: number) => parts.push(`${i + 1}. ${q}`));
    } else {
      parts.push('\nВопросы: (пока нет)');
    }

    if (((visit as any).meds ?? []).length) {
      parts.push('\nЛечение / препараты:');
      ((visit as any).meds ?? []).forEach((id: string, i: number) => {
        const m = medsById.get(id);
const name = cleanTitle((m as any)?.name ?? (m as any)?.title ?? id);
        const d = (((visit as any).medDetails?.[id] ?? {}) as MedDetail);
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
    toast('Добавлено в «Вопросы».', { variant: 'success' });
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
        subtitle="Ваш список вопросов, диагнозов и лечения для обсуждения"
        right={
          <div className="row">
            <button className="btn secondary" type="button" onClick={copyAll}>
              Скопировать
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (confirm('Очистить весь список?')) {
                  clearVisit();
                  toast('Список очищен.', { variant: 'info' });
                }
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
        <div className="h2">Диагнозы (чек-листы)</div>

        {dxGroups.length === 0 ? (
          <div className="muted">
            Пока нет чек-листов. Они появятся здесь после отправки из «Полных критериев».
          </div>
        ) : (
          <>
            <div className="muted" style={{ marginBottom: 10 }}>
              Диагнозы: <b>{dxNamesLine}</b>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {dxGroups.map((g) => (
                <Disclosure
                  key={g.name}
                  title={`${g.name}${g.items.length > 1 ? ` (${g.items.length})` : ''}`}
                  defaultOpen={false}
                  tone="neutral"
                >
                  <div style={{ display: 'grid', gap: 10 }}>
                    {g.items.map((raw: string) => {
                      const titleInside = extractChecklistTitleInsideDx(raw, g.name);
                      const text = raw.replace(/^\[DX\]\s*/, '');
                      const lines = text.split('\n');
                      const body = lines.slice(1).join('\n').trim();

                      return (
                        <div key={raw} className="card" style={{ padding: 10 }}>
                          <div style={{ fontWeight: 900, marginBottom: 6 }}>{titleInside}</div>

                          {body ? (
                            <div className="muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>
                              {body}
                            </div>
                          ) : (
                            <div className="muted">Пока нет отмеченных пунктов.</div>
                          )}

                          <div style={{ height: 10 }} />
                          <button
                            className="btn secondary compact"
                            type="button"
                            onClick={() => removeVisitQuestion(raw)}
                          >
                            Удалить
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Disclosure>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ height: 12 }} />

      <div className="card" style={{ padding: 12 }}>
        <div className="h2">Вопросы</div>

        {normalQuestions.length === 0 ? (
          <div className="muted">
            Пока нет вопросов. Добавляйте их на страницах диагнозов/препаратов или вручную выше.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {normalQuestions.map((q: string) => (
              <div key={q} className="card" style={{ padding: 10 }}>
                <div style={{ marginBottom: 8 }}>{q}</div>
                <button className="btn secondary compact" type="button" onClick={() => removeVisitQuestion(q)}>
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

        {(((visit as any).meds ?? []) as string[]).length === 0 ? (
          <div className="muted">
            Пока нет препаратов. Добавляйте их на странице препарата кнопкой «Добавить препарат».
          </div>
        ) : (
          <div className="list">
            {(((visit as any).meds ?? []) as string[]).map((id: string) => {
              const m = medsById.get(id);
const name = cleanTitle((m as any)?.name ?? (m as any)?.title ?? id);
              const cls = (m as any)?.class;

              const d = (draft[id] ?? {}) as MedDetail;
              const summary = makeMedSummary(d);

              return (
                <div key={id} className="item">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}>{name}</div>
                      {!!cls && <div className="muted">{cls}</div>}
                    </div>

                    <div className="row">
                      <Link className="btn secondary compact" to={routes.medication(id)}>
                        Открыть
                      </Link>
                      <button
                        className="btn secondary compact"
                        type="button"
                        onClick={() => removeVisitMedication(id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>

                  <div style={{ height: 8 }} />

                  <Disclosure title="Детали (доза/мониторинг/важно)" defaultOpen={false} tone="neutral">
                    <div className="muted" style={{ marginBottom: 10 }}>
                      {summary}
                    </div>

                    <div className="medFields">
                      <div>
                        <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Доза</div>
                        <AutoTextarea
                          minRows={2}
                          placeholder="Напр.: 25 мг"
                          value={d.dose ?? ''}
                          onChange={(v) => setDraftField(id, 'dose', v)}
                          onBlur={() => commitField(id, 'dose')}
                        />
                      </div>

                      <div>
                        <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Режим / кратность</div>
                        <AutoTextarea
                          minRows={2}
                          placeholder="Напр.: утром, 1 раз/день"
                          value={d.schedule ?? ''}
                          onChange={(v) => setDraftField(id, 'schedule', v)}
                          onBlur={() => commitField(id, 'schedule')}
                        />
                      </div>

                      <div>
                        <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Цель / критерии эффекта</div>
                        <AutoTextarea
                          minRows={2}
                          placeholder="Напр.: уменьшение симптомов через 4–6 недель"
                          value={d.goal ?? ''}
                          onChange={(v) => setDraftField(id, 'goal', v)}
                          onBlur={() => commitField(id, 'goal')}
                        />
                      </div>

                      <div>
                        <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Мониторинг</div>
                        <AutoTextarea
                          minRows={3}
                          placeholder="Напр.: АД/пульс, рост/вес, сон, аппетит"
                          value={d.monitoring ?? ''}
                          onChange={(v) => setDraftField(id, 'monitoring', v)}
                          onBlur={() => commitField(id, 'monitoring')}
                        />
                      </div>

                      <div className="medFieldsSpan2">
                        <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Важно</div>
                        <AutoTextarea
                          minRows={3}
                          placeholder="Напр.: основные предупреждения/риски"
                          value={d.warnings ?? ''}
                          onChange={(v) => setDraftField(id, 'warnings', v)}
                          onBlur={() => commitField(id, 'warnings')}
                        />
                      </div>

                      <div className="medFieldsSpan2">
                        <div className="muted" style={{ marginBottom: 6, fontSize: 12 }}>Комментарий (опционально)</div>
                        <AutoTextarea
                          minRows={3}
                          placeholder="Любые дополнительные пометки"
                          value={d.note ?? ''}
                          onChange={(v) => setDraftField(id, 'note', v)}
                          onBlur={() => commitField(id, 'note')}
                        />
                      </div>
                    </div>
                  </Disclosure>
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
