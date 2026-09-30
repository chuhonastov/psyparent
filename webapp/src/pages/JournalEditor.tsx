import React,{useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {journalTemplate,JournalTemplate,JournalField} from '../lib/journalContent';
import {createJournal,formatJournal,journalAlerts,JournalInput,JournalRecord,saveJournal,updateJournal,validateJournal} from '../lib/journals';
import {useJournals} from '../lib/useJournals';
import {localDate} from '../lib/screenings';
import {Respondent,respondentLabels} from '../lib/screeningContent';
import {downloadText} from '../lib/export';
import {toast} from '../lib/toast';
import PageHeader from '../components/PageHeader';
import Sources from '../components/Sources';
export default function JournalEditor(){
 const {formId=''}=useParams(),t=journalTemplate(formId),[params]=useSearchParams(),rows=useJournals(),location=useLocation();
 const editId=params.get('edit'),copyId=params.get('copy'),existing=rows.find(r=>r.id===editId),previous=rows.find(r=>r.id===copyId);
 if(!t||editId&&(!existing||existing.templateId!==t.id))return <div className="container"><PageHeader title="Форма или запись не найдена" backTo="/forms/history" backLabel="История"/><p>Ссылка не переносит записи между устройствами. Откройте форму из каталога или найдите сохранённую запись в этом браузере.</p></div>;
 const from=typeof location.state?.from==='string'&&location.state.from.startsWith('/forms?')?location.state.from:'/forms';
 return <Editor key={formId+'-'+editId+'-'+copyId} t={t} existing={existing} previous={previous} backTo={existing?'/forms/record/'+existing.id:from}/>;
}
function Editor({t,existing,previous,backTo}:{t:JournalTemplate;existing?:JournalRecord;previous?:JournalRecord;backTo:string}){
 const nav=useNavigate(),meta=existing||previous;
 const [childLabel,setChild]=useState(meta?.childLabel||''),[age,setAge]=useState(meta?.age===undefined?'':String(meta.age)),[respondent,setRespondent]=useState<Respondent>(meta&&t.respondents.includes(meta.respondent)?meta.respondent:t.respondents[0]);
 const [observerLabel,setObserver]=useState(meta?.observerLabel||''),[date,setDate]=useState(existing?.date||localDate()),[periodStart,setStart]=useState(existing?.periodStart||''),[treatment,setTreatment]=useState(meta?.treatment||'');
 const [values,setValues]=useState<Record<string,string>>(existing?.values||(previous?.templateId===t.id?Object.fromEntries(t.compareKeys.filter(k=>previous.values[k]!==undefined).map(k=>[k,previous.values[k]])):{}));
 const [includeInVisit,setInclude]=useState(existing?.includeInVisit||false),[errors,setErrors]=useState<string[]>([]),[failed,setFailed]=useState(false),errorRef=useRef<HTMLDivElement>(null);
 const input:JournalInput={templateId:t.id,childLabel,age:age===''?undefined:Number(age),respondent,observerLabel,date,periodStart:periodStart||undefined,treatment,values,includeInVisit};
 const alertMessages=journalAlerts(input),set=(id:string,value:string)=>setValues(old=>({...old,[id]:value}));
 const validated=()=>{const issues=validateJournal(input);setErrors(issues);if(issues.length){requestAnimationFrame(()=>errorRef.current?.focus());return false;}return true;};
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(!validated())return;const row=existing?{...existing,...input}:createJournal(input),ok=existing?updateJournal(existing.id,input):saveJournal(row);setFailed(!ok);if(ok){toast(existing?'Изменения сохранены':'Запись сохранена');nav('/forms/record/'+row.id,{replace:true});}else toast('Не удалось сохранить. Скачайте запись перед закрытием.',{variant:'error'});};
 const download=()=>{if(validated())downloadText(formatJournal(existing?{...existing,...input}:createJournal(input)),'PsyParent-'+t.id+'-'+date+'.txt');};
 const renderField=(f:JournalField)=>{const id='journal-'+f.id,help=f.help?'journal-help-'+f.id:undefined,props={id,value:values[f.id]??'',onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>set(f.id,e.target.value),'aria-describedby':help};return <div className={'formField '+(f.type==='textarea'?'journalWide':'')} key={f.id}><label className="fieldLabel" htmlFor={id}>{f.label}{f.required?' *':''}</label>{f.type==='textarea'?<textarea {...props} maxLength={3000}/>:f.type==='select'?<select {...props}><option value="">Не указано</option>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input {...props} type={f.type} className="input" min={f.min} max={f.max} step={f.type==='number'?f.step||1:undefined} maxLength={f.type==='text'?3000:undefined}/>} {f.help&&<p id={help} className="small muted">{f.help}</p>}</div>;};
 return <div className="container"><PageHeader title={t.title} subtitle={t.cadence} backTo={backTo} backLabel={existing?'К записи':'Все формы'} eyebrow={existing?'Редактирование записи':'Новая запись'}/>
 <form noValidate onSubmit={submit} className="stack"><div className="callout"><strong>Как заполнять</strong><p>{t.instructions}</p></div>
 {previous&&!existing&&<p className="small muted">Перенесены сведения о ребёнке, наблюдателе, лечении и выбранной цели. Проверьте их. Наблюдения за новый период заполните заново.</p>}
 <section className="card"><h2 style={{marginBottom:18}}>О ком и за какой период</h2><div className="journalFields">
 <div className="formField"><label className="fieldLabel" htmlFor="journal-child">Обозначение ребёнка *</label><input className="input" id="journal-child" value={childLabel} maxLength={60} placeholder="Можно без фамилии" autoComplete="off" onChange={e=>setChild(e.target.value)}/></div>
 <div className="formField"><label className="fieldLabel" htmlFor="journal-age">Возраст, полных лет</label><input className="input" id="journal-age" type="number" min="0" max="17" step="1" value={age} onChange={e=>setAge(e.target.value)}/></div>
 <div className="formField"><label className="fieldLabel" htmlFor="journal-date">Дата записи / конец периода *</label><input className="input" id="journal-date" type="date" max={localDate()} value={date} onChange={e=>setDate(e.target.value)}/></div>
 <div className="formField"><label className="fieldLabel" htmlFor="journal-period-start">Начало периода, если несколько дней</label><input className="input" id="journal-period-start" type="date" max={date} value={periodStart} onChange={e=>setStart(e.target.value)}/></div>
 <div className="formField"><label className="fieldLabel" htmlFor="journal-respondent">Кто заполняет *</label><select id="journal-respondent" value={respondent} onChange={e=>setRespondent(e.target.value as Respondent)}>{t.respondents.map(r=><option key={r} value={r}>{respondentLabels[r]}</option>)}</select></div>
 <div className="formField"><label className="fieldLabel" htmlFor="journal-observer">Обозначение наблюдателя</label><input className="input" id="journal-observer" value={observerLabel} maxLength={60} placeholder="Например: мама, классный руководитель" onChange={e=>setObserver(e.target.value)}/><p className="small muted">Поможет сравнивать записи одного человека.</p></div>
 <div className="formField journalWide"><label className="fieldLabel" htmlFor="journal-treatment">Лечение или занятия в этот период</label><textarea id="journal-treatment" value={treatment} maxLength={1000} onChange={e=>setTreatment(e.target.value)} placeholder="По желанию: что было назначено и когда изменилось"/></div></div></section>
 <section className="card"><h2 style={{marginBottom:18}}>Наблюдения</h2><p className="small muted" style={{marginBottom:18}}>Пустое поле означает «не указано», а не отсутствие симптома. * — необходимые сведения.</p><div className="journalFields">{t.fields.map(renderField)}</div></section>
 {alertMessages.map(text=><div className="callout danger" role="alert" key={text}><strong>Не откладывайте помощь</strong><p>{text}</p><Link to="/help" className="textButton">Когда нужна срочная помощь</Link></div>)}
 <label className="selectionCheck"><input type="checkbox" checked={includeInVisit} onChange={e=>setInclude(e.target.checked)}/><span>Включить эту запись в памятку врачу</span></label>
 {!!errors.length&&<div className="callout danger" role="alert" tabIndex={-1} ref={errorRef}><strong>Проверьте запись</strong><ul>{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
 {failed&&<p className="callout danger" role="alert">Браузер не сохранил запись. Текст остаётся на экране: скачайте его перед закрытием.</p>}
 <button className="btn full" type="submit">{existing?'Сохранить изменения':'Сохранить запись'}</button><button className="btn secondary full" type="button" onClick={download}>Скачать запись без сохранения .txt</button>
 <p className="small muted">До сохранения текст остаётся только на этом экране. Приложение не отправляет записи врачу. На общем устройстве сохранённые сведения могут увидеть другие.</p>
 <p className="small muted">Форма наблюдений PsyParent. Не валидированная диагностическая шкала. Источники ниже описывают принципы оценки и помощи, а не подтверждают точность этой формы.</p><Sources items={t.sources}/>
 </form></div>;
}
