import React from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { toast } from '../lib/toast';
import { addVisitMedication, addVisitQuestion } from '../lib/visit';

// Разрешаем url в источниках
type Source = { label: string; url?: string };
// Берём тип из JSON как есть, но источники типизируем мягко
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

  // На случай если в каких-то записях поле называется иначе — безопасно
  const medName = (m as any).name ?? m.id;

  const addMedToVisit = () => {
    addVisitMedication(m.id);
    toast('Препарат добавлен в «К врачу» → «Лечение / препараты».', { variant: 'success' });
  };

  const addQuestionToVisit = () => {
    const q = `Про препарат «${medName}»: зачем назначен, как оценивать эффект, что мониторить?`;
    addVisitQuestion(q);
    toast('Вопрос добавлен в «К врачу» → «Вопросы».', { variant: 'success' });
  };

  return (
    <div className="container">
      <PageHeader
        title={medName}
        subtitle={(m as any).class}
        backTo={routes.medications}
        backLabel="Лечение"
      />

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            {!!(m as any).class && <div className="tag">{(m as any).class}</div>}

           <div
  style={{
    display: 'flex',
    gap: 10,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}
>
  <button
    className="btn secondary compact"
    type="button"
    onClick={addQuestionToVisit}
    style={{ flex: '0 0 auto' }}
  >
    Добавить вопрос
  </button>

  <button
    className="btn compact"
    type="button"
    onClick={addMedToVisit}
    style={{ flex: '0 0 auto' }}
  >
    Добавить препарат
  </button>
</div>


          {!!(m as any).whenDiscussed?.length && (
            <>
              <div style={{ height: 10 }} />
              <div className="h2">Когда обсуждают</div>
              <ul>
                {(m as any).whenDiscussed.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </>
          )}

          {!!(m as any).monitoring?.length && (
            <>
              <div style={{ height: 10 }} />
              <div className="h2">Что обычно мониторят</div>
              <ul>
                {(m as any).monitoring.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </>
          )}

          {!!(m as any).warnings?.length && (
            <>
              <div style={{ height: 10 }} />
              <div className="h2">Важно</div>
              <ul>
                {(m as any).warnings.map((x: string, i: number) => (
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

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
