import React from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import medsRaw from '../content/medications.json';
import { routes } from '../app/routes';
import { toast } from '../lib/toast';
import { addVisitMedication, addVisitQuestion } from '../lib/visit';

type Source = { label: string; url?: string };
type MedGroup = { kind: 'group'; id: string; title: string; summary?: string; children: string[] };
type MedLeaf = Omit<(typeof medsRaw)[number], 'sources'> & { sources?: Source[] };
type MedItem = MedLeaf | MedGroup;

const meds = medsRaw as unknown as MedItem[];

function isGroup(x: MedItem): x is MedGroup {
  return (x as any).kind === 'group';
}

function findMed(id: string): MedLeaf | undefined {
  return meds.find((m: any) => m.id === id && m.kind !== 'group') as MedLeaf | undefined;
}

function findGroup(id: string): MedGroup | undefined {
  return meds.find((m: any) => m.id === id && m.kind === 'group') as MedGroup | undefined;
}

export default function MedicationDetail() {
  const { id } = useParams();
  const m = id ? findMed(id) : undefined;
  const g = !m && id ? findGroup(id) : undefined;

  // Если случайно открыли рубрику через /medications/:id — показываем список препаратов.
  if (g) {
    const byId = new Map<string, MedLeaf>();
    for (const it of meds) {
      if (!isGroup(it)) byId.set((it as any).id, it as MedLeaf);
    }

    return (
      <div className="container">
        <PageHeader
          title={g.title}
          subtitle={g.summary}
          backTo={routes.medications}
          backLabel="Лечение"
        />

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Выберите препарат</div>

          <div className="list">
            {g.children.map((cid) => {
              const child = byId.get(cid);
              const title = child?.name ?? child?.title ?? cid;
              const cls = (child as any)?.class as string | undefined;

              return (
                <Link key={cid} className="item" to={routes.medication(cid)}>
                  <div className="listItem">
                    <div className="listItemMain">
                      <div className="listItemTitle">{title}</div>
                      {!!cls && <div className="listItemDesc">{cls}</div>}
                    </div>
                    <div className="listItemRight">›</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>
    );
  }

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

  const medName = (m as any).name ?? m.id;
  const medClass = (m as any).class as string | undefined;

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
        subtitle={medClass}
        backTo={routes.medications}
        backLabel="Лечение"
      />

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              className="btn secondary compact"
              type="button"
              onClick={addQuestionToVisit}
              style={{ flex: 1 }}
            >
              Добавить вопрос
            </button>

            <button
              className="btn compact"
              type="button"
              onClick={addMedToVisit}
              style={{ flex: 1 }}
            >
              Добавить препарат
            </button>
          </div>

          {!!(m as any).whenDiscussed?.length && (
            <>
              <div style={{ height: 12 }} />
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
              <div style={{ height: 12 }} />
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
              <div style={{ height: 12 }} />
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
