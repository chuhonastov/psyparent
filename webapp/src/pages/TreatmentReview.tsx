import React,{useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {clinicalDiagnoses,diagnosisGroups,dxName,diagnosisById,medications,medicationById,treatmentGuideFor,treatmentRelationLabels} from '../lib/content';
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
 const uncertain=guide?.relationKind==='limited'||guide?.relationKind==='not_recommended';
 const safety=guide?.relationKind==='safety';
 const questions=m?Array.from(new Set([
 ...(guide?.questions||[]),
 ...(uncertain?['Какие данные и обстоятельства обосновывают «'+m.name+'» именно для возраста и трудности моего ребёнка?']:[]),
 ...(safety?['Какую сопутствующую проблему должен решить «'+m.name+'» и как проверены взаимодействия со всей схемой?']:[]),
 'Для какой конкретной трудности назначен «'+m.name+'»'+(d?' при диагнозе «'+dxName(d)+'»':'')+'?',
 'По каким изменениям и через какой срок будем оценивать эффект «'+m.name+'»?',
 'Что отслеживать при приёме «'+m.name+'» и при каких изменениях связаться с врачом раньше?',
 'Соответствует ли применение «'+m.name+'» возрасту ребёнка и инструкции? Если нет, почему выбран этот вариант?'
 ])):[];
 return <div className="container"><PageHeader title="Разобрать назначение" subtitle="Поймём возможную цель и подготовим вопросы лечащему врачу." backTo="/medications" backLabel="Лечение"/>
 <div className="reviewSteps"><span><span className="stepNumber">1</span>Диагноз</span><Icon name="arrow" size={13}/><span><span className="stepNumber">2</span>Препарат</span><Icon name="arrow" size={13}/><span><span className="stepNumber">3</span>Вопросы врачу</span></div>
 <div className="stack">
 <section className="card"><label className="fieldLabel" htmlFor="review-dx">Какой диагноз указан в заключении?</label><select id="review-dx" value={d?dx:''} onChange={e=>setParam('dx',e.target.value)}><option value="">Не знаю / нет в списке</option>{diagnosisGroups.map(group=>{const options=clinicalDiagnoses.filter(x=>group.children?.includes(x.id));return options.length?<optgroup key={group.id} label={group.title}>{options.map(x=><option key={x.id} value={x.id}>{dxName(x)}</option>)}</optgroup>:null;})}</select><p className="small muted" style={{marginTop:8}}>Можно продолжить без диагноза: останутся общие сведения о препарате. Обзорные памятки в этот список не включены.</p></section>
 <section className="card"><h2 style={{marginBottom:15}}>Какой препарат назначен?</h2>{selected?.noteOnly&&<p className="callout small" style={{marginBottom:15}}>Вы открыли общую памятку. Выберите конкретный препарат из заключения. <Link to={'/medications/'+selected.id}>Прочитать памятку</Link></p>}
 {m?<div className="reviewChoice"><div><strong>{m.name}</strong><p className="small muted">{m.class}</p></div><button className="textButton" onClick={()=>{setParam('med','');setQ('');}}>Изменить</button></div>:<><div className="searchWrap"><Icon name="search"/><input type="search" className="input" aria-label="Найти назначенный препарат" placeholder="Название с упаковки" value={q} onChange={e=>setQ(e.target.value)}/></div>
 <div className="list">{(q.trim()?options:[]).map(item=><button className="listCard" key={item.id} onClick={()=>setParam('med',item.id)}><div className="listMain"><h3>{item.name}</h3><p>{item.aliases?.slice(0,3).join(' · ')||item.class}</p></div><Icon name="plus" size={17}/></button>)}</div>
 {!q&&<p className="small muted" style={{marginTop:12}}>Введите название из заключения или с упаковки.</p>}
 {q&&!options.length&&<p className="small muted">В справочнике пока нет этого препарата. Запишите название в <Link to="/visit">вопросах врачу</Link>.</p>}</>}
 </section>
 {m&&<>
 <section className={'card '+(uncertain?'':'soft')}><div className="eyebrow">{guide&&d?dxName(d)+' · разбор назначения':'Что известно из справочника'}</div><h2>{uncertain?'Обсудим обоснование':safety?'Уточним отдельную задачу':'Начнём с цели'}</h2>{guide&&<p style={{marginTop:12}}><span className={'tag '+(uncertain?'warm':'')}>{treatmentRelationLabels[guide.relationKind]}</span></p>}<p style={{marginTop:12}}>{guide?guide.summary:d?'Для этой пары «диагноз — препарат» отдельный разбор ещё не подготовлен. По отсутствию записи нельзя сделать вывод о правильности назначения. Возможно, врач учитывал сопутствующее состояние.':'Без диагноза и цели назначения можно обсудить общие сведения. Уточните у врача, какую именно трудность должен уменьшить препарат.'}</p>
 {guide&&<><p className="small">{guide.context}</p><h3 style={{marginTop:17}}>{uncertain?'Что стоит уточнить':safety?'Что проверить с врачом':'Цели и условия для обсуждения'}</h3><ul className="small">{guide.goals.map(goal=><li key={goal}>{goal}</li>)}</ul><p className="small muted">{uncertain?'Наличие разбора не означает, что препарат рекомендован. Не меняйте текущую схему самостоятельно: обсудите основания и дальнейший план.':safety?'Связь относится к отдельной задаче или безопасности сочетания и не означает лечение самого диагноза.':'Обсудите с врачом цель и срок оценки. Эти примеры не определяют, нужен ли препарат вашему ребёнку.'}</p></>}
 </section>
 {m.evidenceNote&&<div className="callout">{m.evidenceNote}</div>}
 {m.availabilityNote&&<div className="callout warn">{m.availabilityNote}</div>}
 <section className="card"><h2>Наблюдение за переносимостью</h2><ul>{m.monitoring.map((text,i)=><li key={i}>{text}</li>)}</ul><Link to={'/medications/'+m.id} state={{from:'/review?'+params.toString()}} className="btn secondary compact">Предупреждения и источники<Icon name="arrow" size={15}/></Link></section>
 <section className="card"><h2 style={{marginBottom:18}}>Сохраните нужные вопросы</h2>{questions.map(question=><div className="question" key={question}><p>{question}</p><QuestionButton question={question} compact/></div>)}</section>
 <div className="buttonRow"><button className={'btn '+(visit.meds.includes(m.id)?'soft':'')} disabled={visit.meds.includes(m.id)} onClick={()=>{if(addVisitMedication(m.id))toast('Назначение добавлено в памятку');}}><Icon name={visit.meds.includes(m.id)?'check':'plus'}/>{visit.meds.includes(m.id)?'Назначение в памятке':'Записать назначение'}</button><Link to="/visit" className="btn secondary">Открыть памятку<Icon name="arrow" size={16}/></Link></div>
 {guide&&<Sources items={guide.sources} updatedAt={guide.updatedAt}/>}
 <p className="small muted">Разбор объясняет справочную информацию. Он не подбирает препарат, не проверяет дозировку и не предлагает менять лечение.</p>
 </>}
 </div></div>;
}
