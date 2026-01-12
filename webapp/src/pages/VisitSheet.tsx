import React, { useMemo, useState } from 'react';
import { loadVisitSheet, saveVisitSheet } from '../lib/storage';

export default function VisitSheet() {
  const [sheet, setSheet] = useState(() => loadVisitSheet());
  const [newItem, setNewItem] = useState('');

  const text = useMemo(() => {
    const lines = [
      'Список вопросов к врачу',
      `Дата: ${new Date(sheet.createdAt).toLocaleDateString('ru-RU')}`,
      '',
      ...sheet.items.map((x, i) => `${i + 1}. ${x}`)
    ];
    return lines.join('\n');
  }, [sheet]);

  const add = () => {
    const v = newItem.trim();
    if (!v) return;
    const next = { ...sheet, items: [...sheet.items, v] };
    setSheet(next);
    saveVisitSheet(next);
    setNewItem('');
  };

  const remove = (idx: number) => {
    const next = { ...sheet, items: sheet.items.filter((_, i) => i !== idx) };
    setSheet(next);
    saveVisitSheet(next);
  };

  const clearAll = () => {
    const next = { createdAt: new Date().toISOString(), items: [] };
    setSheet(next);
    saveVisitSheet(next);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    alert('Скопировано.');
  };

  return (
    <div className="container">
      <h1 className="h1">К врачу</h1>

      <div className="card">
        <div className="h2">Добавить вопрос</div>
        <div className="row">
          <input className="search" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Например: как оценить эффект лечения?" />
          <button className="btn" onClick={add}>Добавить</button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Советы: уточняйте цель назначения, критерии эффективности, план мониторинга и сроки переоценки.
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="h2">Ваш список</div>
          <div className="row">
            <button className="btn secondary" onClick={copy}>Скопировать</button>
            <button className="btn secondary" onClick={clearAll}>Очистить</button>
          </div>
        </div>

        <div style={{ height: 8 }} />

        {sheet.items.length === 0 ? (
          <div className="muted">Пока пусто. Добавьте вопросы из карточек диагноза/препарата.</div>
        ) : (
          <div className="list">
            {sheet.items.map((x, i) => (
              <div key={i} className="item">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700 }}>{i + 1}.</div>
                  <button className="btn secondary" onClick={() => remove(i)}>Удалить</button>
                </div>
                <div>{x}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="h2">Текст для отправки врачу</div>
        <textarea className="search" style={{ height: 180 }} readOnly value={text} />
      </div>
    </div>
  );
}
