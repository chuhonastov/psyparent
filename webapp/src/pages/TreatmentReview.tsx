import React,{useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {clinicalDiagnoses,dxName,diagnosisById,medications,medicationById,treatmentGuideFor,treatmentGuidesForDiagnosis,treatmentGuidesForMedication,treatmentRelationLabels} from '../lib/content';
import DiagnosisPicker from '../components/DiagnosisPicker';
import {matchesQuery} from '../lib/search';
import {addVisitMedication} from '../lib/visit';
import {useVisit} from '../lib/useVisit';
import {toast} from '../lib/toast';
import PageHeader from '../components/PageHeader';
import QuestionButton from '../components/QuestionButton';
import Icon from '../components/Icon';
import Sources from '../components/Sources';
export default function TreatmentReview() {
 const [params,setParams]=useSearchParams(),[q,setQ]=useState(''),visit=useVisit();
 const dx=params.get('dx')||'',med=params.get('med')||'',candidate=diagnosisById(dx),d=clinicalDiagnoses.some(x=>x.id===dx)?candidate:undefined,selected=medicationById(med),m=selected?.noteOnly?undefined:selected;
 const options=medications.filter(m=>!m.noteOnly&&matchesQuery(q,[m.name,...(m.aliases||[]),...(m.searchTerms||[])],m.class));
 const setParam=(name:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(name,value):next.delete(name);setParams(next,{replace:true});};
 const guide=m?treatmentGuideFor(dx,m.id):undefined;
 // Quick picks for the chosen diagnosis, split so parents see at once which drugs have proven benefit.
 const quickFor=(kinds:string[])=>d?treatmentGuidesForDiagnosis(d.id).filter(g=>kinds.includes(g.relationKind)).map(g=>medicationById(g.medicationId)).filter((x):x is NonNullable<typeof x>=>!!x&&!x.noteOnly):[];
 const quickGroups=[{title:'С доказанной пользой',items:quickFor(['condition','specialist','cooccurring'])},{title:'Часто назначают, но польза не доказана',items:quickFor(['limited','not_recommended'])}].filter(g=>g.items.length);
 const uncertain=guide?.relationKind==='limited'||guide?.relationKind==='not_recommended';
 const safety=guide?.relationKind==='safety';
 const questions=m?Array.from(new Set([
 ...(guide?.questions||[]),
 ...(uncertain?['Почему выбран «'+m.name+'», если пользы при этом состоянии не доказано? Какая помощь с доказанной пользой идёт параллельно?']:[]),
 ...(safety?['Какую отдельную проблему решает «'+m.name+'» и как он сочетается с остальными лекарствами?']:[]),
 'Что именно должен изменить «'+m.name+'»'+(d?' при диагнозе «'+dxName(d)+'»':'')+'?',
 'Через сколько и по каким признакам мы поймём, что «'+m.name+'» помогает?',
 'Какие побочные эффекты бывают и с какими звонить вам сразу?',
 'Есть ли в инструкции наш возраст и диагноз? Если нет, почему вы всё же назначаете «'+m.name+'»?',
 'Как и когда мы будем заканчивать приём?'
 ])):[];
 return <div className="container"><PageHeader title="Разобрать назначение" subtitle="Узнайте, зачем обычно назначают это лекарство, и подготовьте вопросы врачу." backTo="/medications" backLabel="Лечение"/>
 <div className="reviewSteps"><span><span className="stepNumber">1</span>Диагноз</span><Icon name="arrow" size={13}/><span><span className="stepNumber">2</span>Препарат</span><Icon name="arrow" size={13}/><span><span className="stepNumber">3</span>Вопросы врачу</span></div>
 <div className="stack">
 <section className="card"><DiagnosisPicker label="Какой диагноз указан в заключении?" value={d?dx:''} onChange={id=>setParam('dx',id)} suggested={m?treatmentGuidesForMedication(m.id).filter(g=>['condition','specialist','cooccurring'].includes(g.relationKind)).map(g=>g.diagnosisId):[]}/><p className="small muted" style={{marginTop:8}}>Можно продолжить без диагноза: останутся общие сведения о препарате.</p></section>
 <section className="card"><h2 style={{marginBottom:15}}>Какой препарат назначен?</h2>{selected?.noteOnly&&<p className="callout small" style={{marginBottom:15}}>Вы открыли общую памятку. Выберите конкретный препарат из заключения. <Link to={'/medications/'+selected.id}>Прочитать памятку</Link></p>}
 {m?<div className="reviewChoice"><div><strong>{m.name}</strong><p className="small muted">{m.class}</p></div><button className="textButton" onClick={()=>{setParam('med','');setQ('');}}>Изменить</button></div>:<><div className="searchWrap"><Icon name="search"/><input type="search" className="input" aria-label="Найти назначенный препарат" placeholder="Название с упаковки" value={q} onChange={e=>setQ(e.target.value)}/></div>
 <div className="list">{(q.trim()?options:[]).map(item=><button className="listCard" key={item.id} onClick={()=>setParam('med',item.id)}><div className="listMain"><h3>{item.name}</h3><p>{item.aliases?.slice(0,3).join(' · ')||item.class}</p></div><Icon name="plus" size={17}/></button>)}</div>
 {!q&&d&&quickGroups.length>0&&<><p className="small muted pickHint">Разобраны для диагноза «{dxName(d)}»:</p>{quickGroups.map(g=><React.Fragment key={g.title}><p className="pickGroupLabel">{g.title}</p><div className="pickChips">{g.items.map(x=><button type="button" className="pickChip" key={x.id} onClick={()=>setParam('med',x.id)}>{x.name}</button>)}</div></React.Fragment>)}</>}
 {!q&&<p className="small muted" style={{marginTop:12}}>{d&&quickGroups.length?'Или введите название из заключения или с упаковки.':'Введите название из заключения или с упаковки.'}</p>}
 {q&&!options.length&&<p className="small muted">В справочнике пока нет этого препарата. Запишите название в <Link to="/visit">вопросах врачу</Link>.</p>}</>}
 </section>
 {m&&<>
 <section className={'card '+(uncertain?'':'soft')}><div className="eyebrow">{guide&&d?dxName(d)+' · разбор назначения':'Что известно из справочника'}</div><h2>{uncertain?'Что известно об этом назначении':safety?'Для чего это лекарство':'Для чего это лекарство'}</h2>{guide&&<p style={{marginTop:12}}><span className={'tag '+(uncertain?'warm':'')}>{treatmentRelationLabels[guide.relationKind]}</span></p>}<p style={{marginTop:12}}>{guide?guide.summary:d?'Для этой пары «диагноз — препарат» разбора пока нет. Это не значит, что назначение неправильное: возможно, врач лечит сопутствующую проблему. Спросите его об этом.':'Без диагноза доступны только общие сведения о препарате. Спросите врача, какую трудность он должен уменьшить.'}</p>
 {guide&&<><p className="small">{guide.context}</p><h3 style={{marginTop:17}}>{uncertain?'Что спросить у врача':safety?'Что проверить с врачом':'Чего ждать от лечения'}</h3><ul className="small">{guide.goals.map(goal=><li key={goal}>{goal}</li>)}</ul><p className="small muted">{uncertain?'Не отменяйте лекарство сами. Покажите этот разбор врачу и обсудите, что делать дальше.':safety?'Это лекарство решает отдельную задачу и не лечит сам диагноз.':'Обсудите с врачом, какие из этих целей важны для вашего ребёнка и когда оценить результат.'}</p></>}
 </section>
 {m.evidenceNote&&<div className="callout">{m.evidenceNote}</div>}
 {m.availabilityNote&&<div className="callout warn">{m.availabilityNote}</div>}
 <section className="card"><h2>Наблюдение за переносимостью</h2><ul>{m.monitoring.map((text,i)=><li key={i}>{text}</li>)}</ul><Link to={'/medications/'+m.id} state={{from:'/review?'+params.toString()}} className="btn secondary compact">Предупреждения и источники<Icon name="arrow" size={15}/></Link></section>
 <section className="card"><h2 style={{marginBottom:18}}>Сохраните нужные вопросы</h2>{questions.map(question=><div className="question" key={question}><p>{question}</p><QuestionButton question={question} compact/></div>)}</section>
 <div className="buttonRow"><button className={'btn '+(visit.meds.includes(m.id)?'soft':'')} disabled={visit.meds.includes(m.id)} onClick={()=>{if(addVisitMedication(m.id))toast('Назначение добавлено в памятку');}}><Icon name={visit.meds.includes(m.id)?'check':'plus'}/>{visit.meds.includes(m.id)?'Назначение в памятке':'Записать назначение'}</button><Link to="/visit" className="btn secondary">Открыть памятку<Icon name="arrow" size={16}/></Link></div>
 {guide&&<Sources items={guide.sources} updatedAt={guide.updatedAt}/>}
 <p className="small muted">Разбор объясняет, что известно о препарате. Он не подбирает лечение и не проверяет дозу — это делает врач.</p>
 </>}
 </div></div>;
}
