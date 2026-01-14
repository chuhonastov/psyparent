import React from 'react';
import { toast } from '../lib/toast';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { addVisitMedication, addVisitQuestion } from '../lib/visit';

// JSON imports infer strict literal types; allow optional url in sources
type Source = { label: string; url?: string };
type Med = Omit<(typeof medsRaw)[number], 'sources'> & { sources?: Source[] };

const meds = medsRaw as unknown as Med[];

function findMed(id: string): Med | undefined {
  return meds.find((m) => m.id === id);
}

export default function MedicationDetail() {
  const { id } = useParams();
  const m = id ? findMed(id) : undefined;

  if (!m) {
    return (
      <div className="container">
        <PageHeader
          title="Препарат не найден"
          subtitle="Проверьте ссылку или выберите препарат из списка"
          backTo={routes.medications}
          backLabel="Лечение"
        />
      </div>
    );
  }

  const addMedToVisit = () => {
    addVisitMedication(m.id);
    toast('Препарат добавлен в «К врачу» → «Лечение / препараты».', { variant: 'success' });
  };

  const addQuestionToVisit = () => {
    const q = `Про препарат «${m.name ?? m.title ?? m.id}»: зачем назначен, как оценивать эффект, что мониторить?`;
    addVisitQuestion(q);
    toast('Вопрос добавлен в «К врачу» → «Вопросы».', { variant: 'success' });
  };

  return (
    <div className="container">
      <PageHeader
        title={m.name ?? m.title ?? m.id}
        subtitle={m.class}
        backTo={routes.medications}
        backLabel="Лечение"
      />

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              {!!m.class && <div className="tag">{m.class}</div>}
            </div>

            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn secondary compact" type="button" onClick={addQuestionToVisit}>
                Добавить вопрос
              </button>
              <button className="btn compact" type="button" onClick={addMedToVisit}>
                Добавить препарат
              </button>
            </div>
          </div>

          <div style={{ height: 10 }} />

          {!!(m.whenDiscussed?.length) && (
            <>
              <div className="h2">Когда обсуждают</div>
              <ul>
                {m.whenDiscussed.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              <div style={{ height: 10 }} />
            </>
          )}

          {!!(m.monitoring?.length) && (
            <>
              <div className="h2">Что обычно мониторят</div>
              <ul>
                {m.monitoring.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
              <div style={{ height: 10 }} />
            </>
          )}

          {!!(m.warnings?.length) && (
            <>
              <div className="h2">Важно</div>
              <ul>
                {m.warnings.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="h2">Источники</div>

          {!(m.sources?.length) ? (
            <div className="muted">Источники не указаны.</div>
          ) : (
            <ul>
              {m.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  ) : (
                    <span>{s.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="muted" style={{ fontSize: 13 }}>
          Важно: информация носит справочный характер и не заменяет очную консультацию.
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
