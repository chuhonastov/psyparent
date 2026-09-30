import React,{useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {screenerById,respondentLabels,screeners} from '../lib/screeningContent';
import {includeScreening,removeScreening} from '../lib/screenings';
import {useScreenings} from '../lib/useScreenings';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ScreeningResultCard from '../components/ScreeningResultCard';
import {toast} from '../lib/toast';
export default function ScreeningHistory(){
 const results=useScreenings(),[child,setChild]=useState(''),[instrument,setInstrument]=useState('');
 const children=[...new Set(results.map(r=>r.childLabel))],shown=results.filter(r=>(!children.includes(child)||r.childLabel===child)&&(!instrument||r.screenerId===instrument));
 return <div className="container"><PageHeader title="История скринингов" subtitle="Сохраняйте отдельные результаты и выбирайте, какие взять на приём." backTo="/screenings" backLabel="Все скрининги"/>
 {!results.length?<div className="emptyState"><Icon name="note" size={30}/><h3>Сохранённых результатов пока нет</h3><p>Пройдите опросник или внесите баллы внешнего теста, затем нажмите кнопку сохранения.</p><Link data-tone="purple" className="btn" to="/screenings">Выбрать опросник</Link></div>:<>
 <label className="fieldLabel" htmlFor="history-child">Чьи результаты показать</label><select id="history-child" value={children.includes(child)?child:''} onChange={e=>setChild(e.target.value)}><option value="">Все записи</option>{children.map(c=><option key={c}>{c}</option>)}</select>
 <label className="fieldLabel" htmlFor="history-instrument" style={{marginTop:14}}>Какой инструмент</label><select id="history-instrument" value={instrument} onChange={e=>setInstrument(e.target.value)}><option value="">Все инструменты</option>{screeners.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>{!shown.length&&<p className="callout">Для этого выбора сохранённых результатов нет.</p>}<p className="searchMeta">В памятку включено: {results.filter(r=>r.includeInVisit).length}. Ответы разных детей и разных людей не объединяются.</p>
 <div className="stack">{shown.map(r=>{const s=screenerById(r.screenerId)!;return <article className="card" key={r.id}><span className={'tag '+(r.score.status==='followup'||r.score.safety?'warm':'')}>{s.mode==='clinical'?'Клиническая оценка':s.mode==='external'?'Внесённый результат':'Пройдено в приложении'}</span><h2><Link to={'/screenings/result/'+r.id}>{s.name} · {r.score.total} / {r.score.max}</Link></h2><p style={{marginTop:8}}>{r.childLabel} · {new Date(r.completedDate+'T12:00:00').toLocaleDateString('ru-RU')}</p><p className="small muted">{respondentLabels[r.respondent]} · {r.age} {s.ageUnit==='months'?'мес.':'лет'}</p><p>{r.score.label}</p>{r.score.safety&&<p className="callout danger"><strong>Нужна отдельная оценка безопасности.</strong> Ответ о смерти или самоповреждении отмечен. Откройте результат: там указано, как обратиться за поддержкой сегодня.</p>}<label className="selectionCheck"><input type="checkbox" checked={r.includeInVisit} onChange={e=>{if(!includeScreening(r.id,e.target.checked))toast('Не удалось изменить выбор',{variant:'error'});}}/><span>Включить в памятку врачу</span></label><div className="buttonRow"><Link data-tone="purple" className="btn secondary compact" to={'/screenings/result/'+r.id}>Открыть результат</Link><button className="textButton danger" onClick={()=>{if(window.confirm('Удалить этот результат из истории и памятки?')){if(removeScreening(r.id))toast('Результат удалён');else toast('Не удалось удалить результат',{variant:'error'});}}}>Удалить</button></div></article>;})}</div><Link data-tone="yellow" className="btn full" to="/visit" style={{marginTop:20}}>Открыть памятку врачу</Link></>}
 <div className="privacyNote"><Icon name="shield" size={16}/><span>История хранится только в этом браузере. Скачайте важные результаты: очистка браузера удалит записи, а на другом устройстве они не появятся.</span></div></div>;
}
export function ScreeningSavedResult(){
 const {resultId=''}=useParams(),results=useScreenings(),r=results.find(x=>x.id===resultId);
 if(!r)return <div className="container"><PageHeader title="Результат не найден" backTo="/screenings/history" backLabel="История"/><p>Возможно, запись удалена или сохранена в другом браузере. Ссылка не переносит результат между устройствами.</p></div>;
 const s=screenerById(r.screenerId)!;
 return <div className="container"><PageHeader title={'Результат '+s.name} backTo="/screenings/history" backLabel="История результатов"/><ScreeningResultCard result={r}/><label className="selectionCheck"><input type="checkbox" checked={r.includeInVisit} onChange={e=>{if(!includeScreening(r.id,e.target.checked))toast('Не удалось изменить выбор',{variant:'error'});}}/><span>Включить в памятку врачу</span></label><Link data-tone="yellow" className="btn full" to="/visit">К памятке врачу</Link></div>;
}
