import React,{useMemo,useState} from 'react';
import {track} from '../lib/analytics';
import {useUnsaved} from '../lib/unsaved';
import {Link,useSearchParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import MedicationPicker,{PickedMed} from '../components/MedicationPicker';
import {useActiveChild,useRouteData} from '../lib/useRoute';
import {timelineEntries,formatTimeline,fullDate,EntryGroup,RouteData} from '../lib/route';
import {addEvent,activeCourses,eventKindHints,eventKindLabels,getEvents,medLabel,removeEvent,updateEvent,validateEvent,EventKind,TreatmentEvent} from '../lib/treatment';
import {removeCheckIn,setForMed} from '../lib/monitoring';
import {applyTrackingSet} from '../lib/profile';
import {ageLabel} from '../lib/children';
import {localDate} from '../lib/screenings';
import {copyText,shareText} from '../lib/export';
import {savePdf} from '../lib/files';
import {shareToTelegram} from '../lib/twa';
import {toast} from '../lib/toast';
const KINDS:EventKind[]=['start','dose','stop','effect','side','exam','visit','event'];
const FILTERS:{id:''|EntryGroup;label:string}[]=[{id:'',label:'Всё'},{id:'treatment',label:'Лечение и приёмы'},{id:'state',label:'Самочувствие'},{id:'scales',label:'Шкалы и анализы'},{id:'docs',label:'Документы'}];

export function EventForm({data,event,initialKind,initialMed,onDone}:{data:RouteData;event?:TreatmentEvent;initialKind?:EventKind;initialMed?:string;onDone:()=>void}){
 const today=localDate(),current=activeCourses(data.events);
 const quick:PickedMed[]=current.map(c=>({medId:c.medId,medName:c.medName,label:c.label}));
 const fromKey=current.find(c=>c.key===initialMed);
 const [kind,setKind]=useState<EventKind>(event?.kind||initialKind||'start');
 const [date,setDate]=useState(event?.date||today);
 const [med,setMed]=useState<PickedMed|null>(event&&(event.medId||event.medName)?{medId:event.medId,medName:event.medName,label:medLabel(event)}:fromKey?{medId:fromKey.medId,medName:fromKey.medName,label:fromKey.label}:null);
 const [dose,setDose]=useState(event?.dose||''),[text,setText]=useState(event?.text||''),[errors,setErrors]=useState<string[]>([]);
 const medKind=kind==='start'||kind==='dose'||kind==='stop';
 useUnsaved(dose.trim()!==(event?.dose||'').trim()||text.trim()!==(event?.text||'').trim()||(!event&&!fromKey&&!!med));
 const submit=(e:React.FormEvent)=>{
  e.preventDefault();
  const input={date,kind,medId:medKind?med?.medId:undefined,medName:medKind&&!med?.medId?med?.medName:undefined,dose:medKind&&kind!=='stop'?dose.trim():undefined,text:text.trim()||undefined};
  const issues=validateEvent(input,today);setErrors(issues);if(issues.length)return;
  if(event){if(!updateEvent(event.id,input,today)){toast('Не удалось сохранить',{variant:'error'});return;}track('edit');toast('Запись изменена');onDone();return;}
  if(!addEvent({...input,childId:data.child.id},today)){toast('Не удалось сохранить',{variant:'error'});return;}
  if(kind==='start'){const s=setForMed(input.medId);if(s.id!=='general'&&!data.profile.tracking.sets.includes(s.id)){applyTrackingSet(data.child.id,s.id,[...s.items,...s.numbers]);toast('Записано. В короткий опрос добавлены вопросы для этого препарата',{durationMs:4000});onDone();return;}}
  track('event');toast('Записано в ленту');onDone();
 };
 return <form className="card eventForm" noValidate onSubmit={submit}><h2 style={{marginBottom:14}}>{event?'Изменить запись':'Новая запись'}</h2>
  {errors.length>0&&<div className="callout danger" role="alert" style={{marginBottom:14}}>{errors.map(x=><p key={x}>{x}</p>)}</div>}
  <fieldset className="plainFieldset"><legend className="fieldLabel">Что произошло</legend><div className="pickChips">{KINDS.map(k=><button type="button" key={k} className="pickChip" aria-pressed={kind===k} onClick={()=>setKind(k)}>{eventKindLabels[k]}</button>)}</div></fieldset>
  <div className="formField" style={{marginTop:14}}><label className="fieldLabel" htmlFor="event-date">Дата</label><input className="input" id="event-date" type="date" max={today} value={date} onChange={e=>setDate(e.target.value)}/></div>
  {medKind&&<div className="formField"><MedicationPicker value={med} onChange={setMed} quick={kind==='start'?[]:quick}/></div>}
  {medKind&&kind!=='stop'&&<div className="formField"><label className="fieldLabel" htmlFor="event-dose">{kind==='start'?'Доза':'Новая доза'}</label><input className="input" id="event-dose" maxLength={80} placeholder="Как в назначении: например, 12,5 мг утром" value={dose} onChange={e=>setDose(e.target.value)}/><p className="small muted">Перепишите из назначения врача. Приложение не проверяет и не подбирает дозу.</p></div>}
  <div className="formField"><label className="fieldLabel" htmlFor="event-text">{medKind?'Заметка (необязательно)':kind==='visit'?'Что решили на приёме (необязательно)':'Что произошло'}</label><textarea id="event-text" maxLength={600} placeholder={eventKindHints[kind]||'Например: причина изменения'} value={text} onChange={e=>setText(e.target.value)}/></div>
  <div className="buttonRow" style={{marginTop:14}}><button className="btn">{event?'Сохранить':'Записать'}</button><button type="button" className="btn secondary" onClick={onDone}>Отмена</button></div>
 </form>;
}

export default function Timeline(){
 const child=useActiveChild(),data=useRouteData(child?.id),[params,setParams]=useSearchParams();
 const addParam=params.get('add') as EventKind|null,add=addParam&&KINDS.includes(addParam)?addParam:null,filter=(params.get('show')||'') as ''|EntryGroup,oldFirst=params.get('order')==='old';
 const [editing,setEditing]=useState<string|null>(null);
 const set=(patch:Record<string,string|null>)=>{const next=new URLSearchParams(params);for(const [k,v] of Object.entries(patch))v?next.set(k,v):next.delete(k);setParams(next,{replace:true});};
 const entries=useMemo(()=>data?timelineEntries(data):[],[data]);
 if(!child||!data)return <div className="container"><PageHeader title="Лента лечения" backTo="/child" backLabel="Ребёнок"/><div className="emptyState"><h3>Сначала добавьте ребёнка</h3><p>Лента собирает препараты, дозы, самочувствие и приёмы одного ребёнка.</p><Link className="btn" to="/child">Добавить ребёнка</Link></div></div>;
 const title=child.label+', '+ageLabel(child),shown=entries.filter(e=>!filter||e.group===filter),ordered=oldFirst?shown:shown.slice().reverse();
 const text=()=>formatTimeline(entries,title);
 const share=async()=>{track('report_export');const t=text();if(await shareText(t,'Лента лечения')!=='unavailable'||shareToTelegram(t))return;const ok=await copyText(t);toast(ok?'Текст скопирован':'Не удалось отправить',{variant:ok?'info':'error'});};
 const days:[string,typeof ordered][]=[];for(const e of ordered){const last=days[days.length-1];if(last&&last[0]===e.date)last[1].push(e);else days.push([e.date,[e]]);}
 const eventById=(id?:string)=>id?getEvents().find(e=>e.id===id):undefined;
 return <div className="container"><PageHeader title="Лента лечения" subtitle="Препараты, дозы, самочувствие, шкалы и приёмы — по датам. Через полгода не придётся вспоминать." eyebrow={title} backTo="/child" backLabel="Ребёнок"/>
 <ChildSwitcher active={child} manage={false}/>
 {add?<EventForm data={data} initialKind={add} initialMed={params.get('med')||undefined} onDone={()=>set({add:null,med:null})}/>:<div className="buttonRow"><button className="btn" onClick={()=>set({add:'start'})}><Icon name="plus" size={17}/>Добавить запись</button>{entries.length>0&&<button className="btn secondary" onClick={share}><Icon name="share" size={17}/>Отправить</button>}</div>}
 {entries.length>0&&<><div className="pickChips" role="group" aria-label="Показать" style={{marginTop:18}}>{FILTERS.map(f=><button type="button" key={f.id} className="pickChip" aria-pressed={filter===f.id} onClick={()=>set({show:f.id||null})}>{f.label}</button>)}</div>
 <div className="timelineTools"><span className="small muted" role="status">Записей: {shown.length}</span><button type="button" className="textButton" onClick={()=>set({order:oldFirst?null:'old'})}>{oldFirst?'Сначала новые':'Сначала старые'}</button></div></>}
 {data.appointment&&data.appointment.date>=data.today&&!filter&&!oldFirst&&<div className="timelineDay"><h2 className="timelineDate">{fullDate(data.appointment.date)}</h2><div className="timelineItem upcoming"><span className="tag warm">Предстоит</span><p>Приём{data.appointment.with?': '+data.appointment.with:''}</p><Link className="textButton" to="/visit">Подготовить памятку</Link></div></div>}
 {days.map(([date,items])=><section className="timelineDay" key={date} aria-label={fullDate(date)}><h2 className="timelineDate">{fullDate(date)}</h2>
  {items.map(e=>editing===e.key&&e.eventId?<EventForm key={e.key} data={data} event={eventById(e.eventId)} onDone={()=>setEditing(null)}/>:<div className={'timelineItem '+e.tone} key={e.key}>
   <span className={'tag '+(e.tone==='danger'?'danger':e.tone==='warm'?'warm':e.tone==='neutral'?'neutral':'')}>{e.tag}</span>
   <p className="timelineTitle">{e.to?<Link to={e.to}>{e.title}</Link>:e.title}</p>{e.text&&<p className="small muted">{e.text}</p>}
   {(e.eventId||e.checkInId)&&<div className="timelineActions">{e.eventId&&<button type="button" className="textButton" onClick={()=>setEditing(e.key)}>Изменить</button>}<button type="button" className="textButton danger" onClick={()=>{if(window.confirm('Удалить эту запись из ленты?')&&(e.eventId?removeEvent(e.eventId):removeCheckIn(e.checkInId!)))toast('Запись удалена');}}>Удалить</button></div>}
  </div>)}
 </section>)}
 {!entries.length&&!add&&<div className="emptyState"><Icon name="clock" size={27}/><h3>Лента пока пустая</h3><p>Начните с текущего препарата: когда его начали и в какой дозе. Потом отмечайте изменения дозы, самочувствие и приёмы. Результаты тестов и дневники этого ребёнка появятся здесь сами.</p></div>}
 {entries.length>0&&<div className="buttonRow" style={{marginTop:20}}><button className="btn secondary compact" onClick={async()=>{const ok=await copyText(text());toast(ok?'Лента скопирована':'Не удалось скопировать',{variant:ok?'success':'error'});}}><Icon name="copy" size={16}/>Скопировать</button><button className="btn secondary compact" onClick={()=>{track('report_export');savePdf(text(),'Kora-lenta-'+data.today+'.pdf');}}><Icon name="download" size={16}/>Скачать PDF</button></div>}
 <p className="small muted" style={{marginTop:16}}>Тесты и дневники попадают в ленту, если в них указано имя «{child.label}».</p>
 </div>;
}
