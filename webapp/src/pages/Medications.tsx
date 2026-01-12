import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import meds from '../content/medications.json';
import SearchBar from '../components/SearchBar';
import { routes } from '../app/routes';

type Med = typeof meds[number];

function match(m: Med, q: string) {
  const s = (x: string) => x.toLowerCase();
  const qq = s(q);
  return s(m.name).includes(qq) || s(m.class).includes(qq) || (m.whenDiscussed ?? []).some(x => s(x).includes(qq));
}

export default function Medications() {
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const list = meds as Med[];
    if (!q.trim()) return list;
    return list.filter(m => match(m, q.trim()));
  }, [q]);

  return (
    <div className="container">
      <h1 className="h1">Препараты и методы</h1>
      <SearchBar value={q} onChange={setQ} placeholder="Поиск: атомоксетин, СИОЗС, сон..." />

      <div style={{ height: 12 }} />

      <div className="list">
        {items.map(m => (
          <Link key={m.id} className="item" to={routes.medication(m.id)}>
            <div style={{ fontWeight: 700 }}>{m.name}</div>
            <div className="muted">{m.class}</div>
          </Link>
        ))}
      </div>

      <div style={{ height: 20 }} />
      <div className="muted">
        В этой версии раздел демонстрационный. Дальше добавим полные карточки из учебника.
      </div>
    </div>
  );
}
