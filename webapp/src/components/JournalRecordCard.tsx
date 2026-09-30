import React from 'react';
import {Link} from 'react-router-dom';
import {journalTemplate,journalValueLabel} from '../lib/journalContent';
import {formatJournal,journalAlerts,journalPeriod,JournalRecord,sleepMetrics} from '../lib/journals';
import {respondentLabels} from '../lib/screeningContent';
import {copyText,downloadText} from '../lib/export';
import {toast} from '../lib/toast';
import Sources from './Sources';
export default function JournalRecordCard({record:r}:{record:JournalRecord}){
 const t=journalTemplate(r.templateId)!;
 return <div className="stack" data-testid="journal-record">
 {journalAlerts(r).map(message=><div className="callout danger" role="alert" key={message}><strong>Не откладывайте помощь</strong><p>{message}</p><Link to="/help" className="textButton">Срочная помощь</Link></div>)}
 <section className="card soft"><span className="tag neutral">Наблюдения · без диагностического балла</span><h2>{t.title}</h2><p style={{marginTop:12}}><strong>{r.childLabel}</strong>{r.age!==undefined?' · '+r.age+' лет':''}<br/>{journalPeriod(r)}<br/>{respondentLabels[r.respondent]}{r.observerLabel?' · '+r.observerLabel:''}</p>{r.treatment&&<p className="journalPre">Лечение / занятия со слов заполняющего: {r.treatment}</p>}</section>
 <section className="card"><dl className="journalAnswers">{t.fields.filter(f=>r.values[f.id]!==undefined&&r.values[f.id]!=='').map(f=><div key={f.id}><dt>{f.label}</dt><dd>{journalValueLabel(f,r.values[f.id])}</dd></div>)}</dl></section>
 {!!sleepMetrics(r).length&&<section className="card"><h2>По внесённым временам</h2><dl className="journalAnswers">{sleepMetrics(r).map(m=><div key={m.label}><dt>{m.label}</dt><dd>{Math.floor(m.minutes/60)} ч {m.minutes%60} мин</dd></div>)}</dl><p className="small muted">Приблизительные интервалы по местным часам. Ночное бодрствование вычитается только если вы указали его длительность; дневной сон не добавляется. Переход часов автоматически не учитывается.</p></section>}
 <div className="buttonRow journalButtons"><button className="btn secondary" onClick={async()=>{const ok=await copyText(formatJournal(r));toast(ok?'Запись скопирована':'Не удалось скопировать. Скачайте файл.',{variant:ok?'success':'error'});}}>Скопировать запись</button><button className="btn secondary" onClick={()=>downloadText(formatJournal(r),'Kora-'+t.id+'-'+r.date+'.txt')}>Скачать запись .txt</button><button className="btn secondary" onClick={()=>window.print()}>Печать / PDF</button></div>
 <p className="small muted">Это запись наблюдений, не диагноз и не назначение лечения. Версия формы: {r.templateVersion}. Отсутствие записи или жалобы не подтверждает отсутствие трудностей.</p><Sources items={t.sources}/></div>;
}
