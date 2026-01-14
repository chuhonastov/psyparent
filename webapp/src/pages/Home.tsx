import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { routes } from '../app/routes';
import { getTgUserFirstName } from '../lib/twa';
import meta from '../content/meta.json';

function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 6h14v2H7V6zm0 5h14v2H7v-2zm0 5h14v2H7v-2zM3 6h2v2H3V6zm0 5h2v2H3v-2zm0 5h2v2H3v-2z"
      />
    </svg>
  );
}

function IconPill() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.7 6.3a6 6 0 0 0-8.5 0l-2.9 2.9a6 6 0 0 0 8.5 8.5l2.9-2.9a6 6 0 0 0 0-8.5zm-1.4 7.1l-2.9 2.9a4 4 0 1 1-5.7-5.7l1.1-1.1 7.5 7.5zM9.9 8.7l.7-.7a4 4 0 0 1 5.7 5.7l-.7.7-5.7-5.7z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v2.5c0 .4.5.6.8.3L13.6 20H20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14h-7.1l-3.9 3V18H4V6h16v12z"
      />
    </svg>
  );
}

export default function Home() {
  const name = getTgUserFirstName();

  return (
    <div className="container">
      <PageHeader
        title="PsyParent"
        subtitle="Второе мнение по диагнозу и терапии по международным рекомендациям"
      />

      <div className="card">
        <div className="col">
          <div>
            <div style={{ fontWeight: 950 }}>
              {name ? `Привет, ${name}!` : 'Привет!'}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Это справочник для родителей: критерии, доказательные подходы и вопросы к врачу.
              Не заменяет очную консультацию.
            </div>
          </div>

          {/* Плитки вместо обычных кнопок */}
          <div style={{ display: 'grid', gap: 10 }}>
            <Link className="item" to={routes.diagnoses}>
              <div className="listItem">
                <div className="listItemMain">
                  <div className="listItemTitle" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="muted" style={{ display: 'inline-flex' }}><IconList /></span>
                    Выбрать диагноз
                  </div>
                  <div className="listItemDesc">Критерии, красные флаги, вопросы к врачу</div>
                </div>
                <div className="listItemRight">›</div>
              </div>
            </Link>

            <Link className="item" to={routes.medications}>
              <div className="listItem">
                <div className="listItemMain">
                  <div className="listItemTitle" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="muted" style={{ display: 'inline-flex' }}><IconPill /></span>
                    Лечение / препараты
                  </div>
                  <div className="listItemDesc">Когда обсуждают, что мониторят, что важно</div>
                </div>
                <div className="listItemRight">›</div>
              </div>
            </Link>

            <Link className="item" to={routes.visit}>
              <div className="listItem">
                <div className="listItemMain">
                  <div className="listItemTitle" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="muted" style={{ display: 'inline-flex' }}><IconChat /></span>
                    К врачу
                  </div>
                  <div className="listItemDesc">Соберите вопросы и чек-листы — можно копировать одним нажатием</div>
                </div>
                <div className="listItemRight">›</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Быстрый старт</div>
        <div className="row" style={{ gap: 8 }}>
<Link className="pill" to={routes.diagnosis('adhd')}>СДВГ</Link>
<Link className="pill" to={routes.diagnosis('asd')}>РАС</Link>
<Link className="pill" to={routes.diagnosis('anxiety')}>Тревога</Link>
<Link className="pill" to={routes.diagnosis('depression')}>Депрессия</Link>
<Link className="pill" to={routes.diagnosis('ocd')}>ОКР</Link>

        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Это справочник. Он не заменяет очную консультацию.
        </div>
      </div>

      <div className="card">
        <div className="h2">Как пользоваться</div>
        <ol className="muted">
          <li>Выберите диагноз (как он написан в заключении).</li>
          <li>Посмотрите критерии и что важно уточнить у врача.</li>
          <li>Соберите список вопросов на приём в разделе «К врачу».</li>
        </ol>
      </div>

      <div className="card">
        <div className="h2">О проекте</div>
        <div className="muted">{meta.disclaimer}</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Версия контента: <b>{meta.contentVersion}</b>
        </div>
      </div>

      <div style={{ height: 12 }} />
    </div>
  );
}
