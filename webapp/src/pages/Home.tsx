import PageHeader from '../components/PageHeader';
import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../app/routes';
import { getTgUserFirstName } from '../lib/twa';
import meta from '../content/meta.json';

export default function Home() {
  const name = getTgUserFirstName();

  return (
    <PageHeader
  title="PsyParent"
  subtitle="Второе мнение по диагнозу и терапии по международным рекомендациям"
/>
    <div className="container">
      <h1 className="h1">ParentGuide</h1>
      <div className="card">
        <div className="col">
          <div>
            <div style={{ fontWeight: 700 }}>
              {name ? `Привет, ${name}!` : 'Привет!'}
            </div>
            <div className="muted">
              Это справочник для родителей: критерии, доказательные подходы и вопросы к врачу.
              Не заменяет очную консультацию.
            </div>
          </div>

          <div className="row">
            <Link className="btn" to={routes.diagnoses}>Выбрать диагноз</Link>
            <Link className="btn secondary" to={routes.medications}>Препараты</Link>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Быстрый старт</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <Link className="pill" to={routes.diagnosis('adhd')}>СДВГ</Link>
          <Link className="pill" to={routes.diagnosis('asd')}>РАС</Link>
          <Link className="pill" to={routes.diagnosis('anxiety')}>Тревога</Link>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>Это справочник. Он не заменяет очную консультацию.</div>
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

    </div>
  );
}
