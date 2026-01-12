import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import diagnoses from '../content/diagnoses.json';
import { routes } from '../app/routes';

type Diagnosis = typeof diagnoses[number];

function match(d: Diagnosis, q: string) {
  const s = (x: string) => x.toLowerCase();
  const qq = s(q);
  return (
    s(d.title).includes(qq) ||
    (d.aliases ?? []).some(a => s(a).includes(qq)) ||
    s(d.summary).includes(qq)
  );
}

export default function Diagnoses() {
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const list = diagnoses as Diagnosis[];
    if (!q.trim()) return list;
    return list.filter(d => match(d, q.trim()));
  }, [q]);

  return (
    <div className="container">
      <h1 className="h1">Диагнозы</h1>
      <SearchBar value={q} onChange={setQ} placeholder="Например: СДВГ, аутизм, ASD..." />

      <div style={{ height: 12 }} />

      <div className="list">
        {items.map(d => (
          <Link key={d.id} className="item" to={routes.diagnosis(d.id)}>
            <div style={{ fontWeight: 700 }}>{d.title}</div>
            <div className="muted">{d.summary}</div>
          </Link>
        ))}
      </div>
      <div style={{ height: 24 }} />
      <div className="muted">Если нужного диагноза нет — это значит, что мы ещё не добавили его в справочник.</div>
</div>
  );
}
