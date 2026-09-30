import React,{useEffect} from 'react';
import {Link,Navigate,useParams,useSearchParams,useLocation} from 'react-router-dom';
import {diagnosisById,medicationById,parentGroup,dxName,topicLabel,treatmentGuideFor,treatmentGuidesForDiagnosis,treatmentRelationLabels} from '../lib/content';
import PageHeader from '../components/PageHeader';
import Disclosure from '../components/Disclosure';
import Observations from '../components/Observations';
import QuestionButton from '../components/QuestionButton';
import Sources from '../components/Sources';
import Icon from '../components/Icon';
import NonpharmHelp from '../components/NonpharmHelp';
import {journalTemplatesForDiagnosis} from '../lib/journalContent';
import {screenerById} from '../lib/screeningContent';
import {trackRecent} from '../lib/recent';
export default function DiagnosisDetail() {
 const {id=''}=useParams(),[params,setParams]=useSearchParams(),location=useLocation(),d=diagnosisById(id);
 useEffect(()=>{if(d&&d.kind!=='group')trackRecent('dx',d.id);},[d]);
 if(!d)return <div className="container"><PageHeader title="Такой карточки пока нет" backTo="/diagnoses" backLabel="Все диагнозы"/><Link to="/diagnoses" className="btn">Выбрать диагноз</Link></div>;
 if(d.kind==='group')return <Navigate to={'/diagnoses/group/'+d.id} replace/>;
 const group=parentGroup(id),tab=['understand','help','visit'].includes(params.get('tab')||'')?params.get('tab')!:'understand';
 const tabs=[{id:'understand',label:'Понять'},{id:'help',label:'Помощь'},{id:'visit',label:'К врачу'}];
 const from=typeof location.state?.from==='string'&&/^\/diagnoses\?/.test(location.state.from)?location.state.from:undefined;
 const additionalGuides=treatmentGuidesForDiagnosis(id).filter(g=>!d.effectiveMeds?.includes(g.medicationId));
 return <div className="container" key={id}><PageHeader title={dxName(d)} subtitle={d.summary} eyebrow={topicLabel(d)+' · разберёмся вместе'} backTo={from||(group?'/diagnoses/group/'+group.id:'/diagnoses')} backLabel={from?'Результаты поиска':group?group.title:'Все темы'}/>
 <div className="segmented" aria-label="Разделы карточки">{tabs.map(t=><button key={t.id} className={tab===t.id?'active':''} aria-pressed={tab===t.id} onClick={()=>setParams({tab:t.id},{replace:true,state:location.state})}>{t.label}</button>)}</div>
 <div className="stack">
 {tab==='understand'&&<>
 {d.introduction&&<section className="card"><div className="eyebrow">Простыми словами</div><h2 style={{marginBottom:14}}>{d.introductionTitle||'Что означает диагноз'}</h2>{d.introduction.map((text,i)=><p className="introText" key={i}>{text}</p>)}</section>}
 {d.takeaways&&<div className="summaryCards">{d.takeaways.map(item=><section key={item.title} className="card summaryCard"><h3>{item.title}</h3><p>{item.text}</p></section>)}</div>}
 {!!d.relatedTopics?.length&&<section className="card"><h2 style={{marginBottom:14}}>Выберите нужную тему</h2><div className="topics">{d.relatedTopics.map(topicId=>{const topic=diagnosisById(topicId);return topic?<Link key={topicId} className="topic" to={'/diagnoses/'+topicId}>{dxName(topic)}</Link>:null;})}</div></section>}
 <Disclosure title={d.topicKind&&d.topicKind!=='diagnosis'?'Что важно обсудить со специалистом':'Как врач обосновывает диагноз'} defaultOpen={!d.introduction}><ul>{d.simplifiedCriteria?.map((x,i)=><li key={i}>{x}</li>)}</ul><p className="small muted">Это подсказки для разговора с врачом, а не диагностика.</p></Disclosure>
 {!!d.diagnosticNotes?.length&&<Disclosure title="Что ещё важно уточнить"><ul>{d.diagnosticNotes.map((x,i)=><li key={i}>{x}</li>)}</ul></Disclosure>}
 <div className="buttonRow"><button className="btn" onClick={()=>setParams({tab:'help'},{replace:true,state:location.state})}>Какая помощь бывает полезна<Icon name="arrow" size={17}/></button></div>
 </>}
 {tab==='help'&&<>
 <div className="card soft"><div className="eyebrow">План помощи</div><h2>Сделать жизнь посильнее</h2><p style={{marginTop:10}}>{d.ageGuidance||'План подбирают под трудности ребёнка. Начните с того, что мешает больше всего.'}</p></div>
 {!!d.homeHelp?.length&&<section className="card"><h2 style={{marginBottom:18}}>Что можно изменить в повседневной жизни</h2><div className="stack">{d.homeHelp.map(item=><div key={item.title}><h3>{item.title}</h3><p className="muted" style={{marginTop:5,fontSize:14}}>{item.text}</p></div>)}</div></section>}
 <NonpharmHelp diagnosisId={id}/>
 <Disclosure title="Подробнее о немедикаментозных методах"><ul>{d.evidenceApproaches?.map((x,i)=><li key={i}>{x}</li>)}</ul></Disclosure>
 <Disclosure title={id==='asd'?'Препараты для отдельных трудностей':'Когда обсуждают препараты'}>
 <p className="small muted">{d.evidenceNote||'У каждого лекарства должна быть понятная цель. Какое лекарство нужно ребёнку, решает врач.'}</p>
 {d.effectiveMeds?.length?<div className="list" style={{marginTop:15}}>{d.effectiveMeds.map(mid=>{const m=medicationById(mid),g=treatmentGuideFor(id,mid);return m?<Link className="listCard" key={mid} to={'/review?dx='+id+'&med='+mid}><div className="listMain"><h3>{m.name}</h3><p>{g?treatmentRelationLabels[g.relationKind]:'Разобраться в назначении'}</p></div><Icon name="arrow" size={16}/></Link>:null;})}</div>:<p style={{marginTop:12}}>Лекарства, которое лечило бы это состояние, нет. Если лекарство всё же назначено, спросите врача, какую задачу оно решает.</p>}
 </Disclosure>
 <Disclosure title="Какие назначения стоит уточнить"><ul>{d.ineffectivePharm?.map((x,i)=><li key={i}>{x}</li>)}</ul><p className="small muted">Не меняйте лечение сами. Сохраните вопросы и задайте их врачу.</p></Disclosure>
 {!!additionalGuides.length&&<Disclosure title={'Разборы других назначений · '+additionalGuides.length}><p className="small muted">Здесь лекарства для сопутствующих проблем, а также те, чья польза не доказана или которые не рекомендуются. Это не список того, что стоит принимать.</p><div className="list" style={{marginTop:14}}>{additionalGuides.map(g=>{const m=medicationById(g.medicationId);return m?<Link className="listCard" key={g.medicationId} to={'/review?dx='+id+'&med='+g.medicationId}><div className="listMain"><span className={'tag '+(['limited','not_recommended'].includes(g.relationKind)?'warm':'')}>{treatmentRelationLabels[g.relationKind]}</span><h3>{m.name}</h3></div><Icon name="arrow" size={16}/></Link>:null;})}</div></Disclosure>}
 <button className="btn full" onClick={()=>setParams({tab:'visit'},{replace:true,state:location.state})}>Подготовить вопросы врачу<Icon name="arrow" size={17}/></button>
 </>}
 {tab==='visit'&&<>
 <div className="callout"><strong>Соберите то, что важно именно вам</strong><p>Вопросы и наблюдения попадут в памятку. Её можно скопировать или скачать перед приёмом.</p></div>
 {!!d.screeningIds?.length&&<section className="card"><h2>Тесты и шкалы для обсуждения</h2><p className="small muted" style={{marginTop:10}}>Проверьте возраст и кто должен отвечать. Результат теста — повод для разговора с врачом, а не диагноз.</p><div className="list" style={{marginTop:14}}>{d.screeningIds.map(sid=>{const s=screenerById(sid);return s?<Link key={sid} className="listCard" to={'/screenings/'+sid}><div className="listMain"><h3>{s.name} · {s.title}</h3><p>{s.ageLabel}</p></div><Icon name="arrow" size={16}/></Link>:null;})}</div></section>}
 <section className="card"><h2>Дневники перед консультацией</h2><p className="small muted" style={{marginTop:10}}>Выберите одну задачу, которая волнует сейчас. Заполнять все формы не нужно.</p><div className="topics" style={{marginTop:14}}>{journalTemplatesForDiagnosis(id).map(f=><Link key={f.id} className="topic" to={'/forms/'+f.id}>{f.title}</Link>)}</div></section>
 <section className="card"><h2 style={{marginBottom:18}}>Что спросить у врача</h2>{d.questionsToDoctor?.map(q=><div className="question" key={q}><p>{q}</p><QuestionButton question={q} compact/></div>)}</section>
 {!!d.fullCriteriaChecklist?.items.length&&<Disclosure title={id==='adhd'?'Что мы уже знаем о диагнозе':d.observationTitle||'Мои наблюдения'}><Observations key={id} dxId={id} title={dxName(d)} items={d.fullCriteriaChecklist.items}/></Disclosure>}
 <Link to="/visit" className="btn full"><Icon name="note"/>Открыть памятку к приёму</Link>
 </>}
 {!!d.redFlags?.length&&<Disclosure title="Когда обратиться за помощью быстрее" tone="red"><ul>{d.redFlags.map((x,i)=><li key={i}>{x}</li>)}</ul><Link to="/help" className="btn secondary compact">Если есть непосредственная опасность</Link></Disclosure>}
 <Sources items={d.sources||[]} updatedAt={d.updatedAt}/>
 </div></div>;
}
