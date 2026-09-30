import React,{useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {clinicalDiagnoses,dxName,diagnosisById,medications,medicationById,specialists,specialistById,supportForDiagnosis,treatmentGuidesForDiagnosis,treatmentGuidesForMedication,treatmentRelationLabels} from '../lib/content';
import {prepFor,reviewGuide,specialistPair,specialistPairLabels,diagnosesForSpecialist} from '../lib/pairs';
import {investigations,investigationById,reviewExam,examRelationLabels,examQuestions,examsForDiagnosis,diagnosesForExam,examNote} from '../lib/investigations';
import DiagnosisPicker from '../components/DiagnosisPicker';
import {matchesQuery} from '../lib/search';
import {addVisitMedication} from '../lib/visit';
import {useVisit} from '../lib/useVisit';
import {toast} from '../lib/toast';
import PageHeader from '../components/PageHeader';
import QuestionButton from '../components/QuestionButton';
import Icon from '../components/Icon';
import Sources from '../components/Sources';

// Three steps on one row: numbers above short labels, so the row fits a narrow phone with large text.
function Steps({labels,current}:{labels:string[];current:number}){
 return <ol className="reviewSteps" aria-label="Шаги разбора">{labels.map((label,i)=><li key={label} className={i+1<current?'done':i+1===current?'current':''} aria-current={i+1===current?'step':undefined}><span className="stepNumber">{i+1<current?<Icon name="check" size={13}/>:i+1}</span><span className="stepLabel">{label}</span></li>)}</ol>;
}
export default function TreatmentReview() {
 const [params,setParams]=useSearchParams(),[q,setQ]=useState(''),visit=useVisit();
 const dx=params.get('dx')||'',med=params.get('med')||'',spec=params.get('spec')||'',exam=params.get('exam')||'',what=params.get('what');
 const mode:'med'|'spec'|'exam'=what==='spec'||what==='exam'?what:med?'med':spec?'spec':exam?'exam':'med';
 const candidate=diagnosisById(dx),d=clinicalDiagnoses.some(x=>x.id===dx)?candidate:undefined,selected=medicationById(med),m=selected?.noteOnly?undefined:selected,s=specialistById(spec),e=investigationById(exam);
 const options=medications.filter(m=>!m.noteOnly&&matchesQuery(q,[m.name,...(m.aliases||[]),...(m.searchTerms||[])],m.class));
 const update=(changes:Record<string,string>)=>{const next=new URLSearchParams(params);for(const [k,v] of Object.entries(changes))v?next.set(k,v):next.delete(k);setParams(next,{replace:true});};
 const setParam=(name:string,value:string)=>update({[name]:value});
 const switchMode=(next:'med'|'spec'|'exam')=>{setQ('');update({what:next==='med'?'':next,med:next==='med'?med:'',spec:next==='spec'?spec:'',exam:next==='exam'?exam:''});};
 const guide=m&&d?reviewGuide(d.id,m.id):undefined,pair=s&&d?specialistPair(d.id,s.id):undefined,examGuide=e&&d?reviewExam(d.id,e.id):undefined;
 // Investigations: the written roles for the diagnosis first, then dubious tests that are offered to many families.
 const examOptions=q.trim()?investigations.filter(x=>matchesQuery(q,[x.name,...x.aliases],x.summary)):[];
 const writtenExams=d?examsForDiagnosis(d.id):[],writtenIds=writtenExams.flatMap(g=>g.items.map(x=>x.exam.id));
 const examGroups=d?[...writtenExams.map(g=>({title:examRelationLabels[g.kind],items:g.items.map(x=>x.exam)})),{title:'Сомнительные обследования',items:investigations.filter(x=>x.kind==='dubious'&&!writtenIds.includes(x.id))}]:[{title:'Частые вопросы',items:['eeg','mri_brain','cbc_biochem','hearing','cma','usdg_vessels','reg','hms_osipov','hair_analysis','food_igg'].map(id=>investigationById(id)!)}];
 // Quick picks for the chosen diagnosis, split so parents see at once which drugs have proven benefit.
 const quickFor=(kinds:string[])=>d?treatmentGuidesForDiagnosis(d.id).filter(g=>kinds.includes(g.relationKind)).map(g=>medicationById(g.medicationId)).filter((x):x is NonNullable<typeof x>=>!!x&&!x.noteOnly):[];
 const quickGroups=[{title:'С доказанной пользой',items:quickFor(['condition','specialist','cooccurring'])},{title:'Часто назначают, но польза не доказана',items:quickFor(['limited','not_recommended'])}].filter(g=>g.items.length);
 const plan=d?supportForDiagnosis(d.id):undefined,planIds=plan?.providers.map(p=>p.specialistId)||[];
 const specGroups=d?[{title:'Помогают при диагнозе «'+dxName(d)+'»',items:planIds.map(id=>specialistById(id)).filter((x):x is NonNullable<typeof x>=>!!x)},{title:'Другие специалисты',items:specialists.filter(x=>!planIds.includes(x.id))}]:[{title:'',items:specialists}];
 const suggestedDx=mode==='exam'?(e?diagnosesForExam(e.id).filter(g=>g.kind!=='not_routine'&&g.kind!=='not_recommended').flatMap(g=>g.items.map(x=>x.id)):[]):m?treatmentGuidesForMedication(m.id).filter(g=>['condition','specialist','cooccurring'].includes(g.relationKind)).map(g=>g.diagnosisId):s?diagnosesForSpecialist(s.id).filter(g=>g.kind!=='limited').flatMap(g=>g.items.map(x=>x.id)):[];
 const uncertain=guide?.relationKind==='limited'||guide?.relationKind==='not_recommended',safety=guide?.relationKind==='safety',aside=guide?.relationKind==='offlabel'||guide?.relationKind==='other';
 const questions=m?Array.from(new Set([
 ...(guide?.questions||[]),
 ...(uncertain?['Почему выбран «'+m.name+'», если пользы при этом состоянии не доказано? Какая помощь с доказанной пользой идёт параллельно?']:[]),
 ...(safety?['Какую отдельную проблему решает «'+m.name+'» и как он сочетается с остальными лекарствами?']:[]),
 ...(aside?['Для какой трудности назначен «'+m.name+'», если основное лечение '+(d?prepFor(d.id):'этого состояния')+' другое?']:[]),
 'Что именно должен изменить «'+m.name+'»'+(d?' при диагнозе «'+dxName(d)+'»':'')+'?',
 'Через сколько и по каким признакам мы поймём, что «'+m.name+'» помогает?',
 'Какие побочные эффекты бывают и с какими звонить вам сразу?',
 'Есть ли в инструкции наш возраст и диагноз? Если нет, почему вы всё же назначаете «'+m.name+'»?',
 'Как и когда мы будем заканчивать приём?'
 ])):[];
 const chosen=mode==='spec'?!!s:mode==='exam'?!!e:!!m,step=chosen?3:d?2:1,about=mode==='spec'?'о специалисте':mode==='exam'?'об обследовании':'о препарате';
 return <div className="container"><PageHeader title="Разобрать назначение" subtitle="Лекарство, специалист или обследование: зачем это нужно при диагнозе и что спросить." backTo="/medications" backLabel="Лечение"/>
 <Steps labels={['Диагноз',mode==='spec'?'Специалист':mode==='exam'?'Обследование':'Препарат','Вопросы']} current={step}/>
 <div className="stack">
 <section className="card"><DiagnosisPicker label="Какой диагноз указан в заключении?" value={d?dx:''} onChange={id=>setParam('dx',id)} suggested={suggestedDx} suggestedLabel={mode==='spec'?'Чаще всего этот специалист помогает при:':mode==='exam'?'Чаще всего это обследование нужно при:':'Чаще всего это лекарство обсуждают при:'}/><p className="small muted" style={{marginTop:8}}>Можно продолжить без диагноза: останутся общие сведения {about}.</p></section>
 <section className="card"><h2 style={{marginBottom:15}}>Что назначено?</h2>
 <div className="journalTabs modeSwitch" role="group" aria-label="Что разбираем"><button type="button" className={mode==='med'?'active':''} aria-pressed={mode==='med'} onClick={()=>switchMode('med')}>Лекарство</button><button type="button" className={mode==='spec'?'active':''} aria-pressed={mode==='spec'} onClick={()=>switchMode('spec')}>Специалист</button><button type="button" className={mode==='exam'?'active':''} aria-pressed={mode==='exam'} onClick={()=>switchMode('exam')}>Обследование</button></div>
 {mode==='med'?<>{selected?.noteOnly&&<p className="callout small" style={{marginBottom:15}}>Вы открыли общую памятку. Выберите конкретный препарат из заключения. <Link to={'/medications/'+selected.id}>Прочитать памятку</Link></p>}
 {m?<div className="reviewChoice"><div><strong>{m.name}</strong><p className="small muted">{m.class}</p></div><button className="textButton" onClick={()=>{setParam('med','');setQ('');}}>Изменить</button></div>:<><div className="searchWrap"><Icon name="search"/><input type="search" className="input" aria-label="Найти назначенный препарат" placeholder="Название с упаковки" value={q} onChange={e=>setQ(e.target.value)}/></div>
 <div className="list">{(q.trim()?options:[]).map(item=><button className="listCard" key={item.id} onClick={()=>setParam('med',item.id)}><div className="listMain"><h3>{item.name}</h3><p>{item.aliases?.slice(0,3).join(' · ')||item.class}</p></div><Icon name="plus" size={17}/></button>)}</div>
 {!q&&d&&quickGroups.length>0&&<><p className="small muted pickHint">Разобраны для диагноза «{dxName(d)}»:</p>{quickGroups.map(g=><React.Fragment key={g.title}><p className="pickGroupLabel">{g.title}</p><div className="pickChips">{g.items.map(x=><button type="button" className="pickChip" key={x.id} onClick={()=>setParam('med',x.id)}>{x.name}</button>)}</div></React.Fragment>)}</>}
 {!q&&<p className="small muted" style={{marginTop:12}}>{d&&quickGroups.length?'Или введите название из заключения или с упаковки. Разбор есть для любого препарата из справочника.':'Введите название из заключения или с упаковки.'}</p>}
 {q&&!options.length&&<p className="small muted">В справочнике пока нет этого препарата. Запишите название в <Link to="/visit">вопросах врачу</Link>.</p>}</>}</>
 :mode==='exam'?(e?<div className="reviewChoice"><div><strong>{e.name}</strong><p className="small muted">{e.aliases.slice(0,3).join(' · ')}</p></div><button className="textButton" onClick={()=>{setParam('exam','');setQ('');}}>Изменить</button></div>:<><div className="searchWrap"><Icon name="search"/><input type="search" className="input" aria-label="Найти обследование" placeholder="ЭЭГ, МРТ, анализ волос…" value={q} onChange={ev=>setQ(ev.target.value)}/></div>
 {q.trim()?<div className="list">{examOptions.map(x=><button className="listCard" key={x.id} onClick={()=>{setParam('exam',x.id);setQ('');}}><div className="listMain"><h3>{x.name}</h3><p>{x.aliases.slice(0,3).join(' · ')}</p></div><Icon name="plus" size={17}/></button>)}{!examOptions.length&&<p className="small muted">Такого обследования в справочнике пока нет. Запишите название в <Link to="/visit">вопросах врачу</Link>.</p>}</div>
 :examGroups.map(g=><React.Fragment key={g.title}><p className="pickGroupLabel">{g.title}</p><div className="pickChips">{g.items.map(x=><button type="button" className="pickChip" key={x.id} onClick={()=>setParam('exam',x.id)}>{x.name}</button>)}</div></React.Fragment>)}
 </>)
 :s?<div className="reviewChoice"><div><strong>{s.title}</strong><p className="small muted">{s.domains.join(' · ')}</p></div><button className="textButton" onClick={()=>setParam('spec','')}>Изменить</button></div>
 :specGroups.map(g=><React.Fragment key={g.title||'all'}>{g.title&&<p className="pickGroupLabel">{g.title}</p>}<div className="pickChips">{g.items.map(x=><button type="button" className="pickChip" key={x.id} onClick={()=>setParam('spec',x.id)}>{x.shortTitle}</button>)}</div></React.Fragment>)}
 </section>
 {mode==='med'&&m&&<>
 <section className={'card '+(uncertain||aside?'':'soft')}><div className="eyebrow">{d?dxName(d)+' · разбор назначения':'Что известно из справочника'}</div><h2>{uncertain?'Что известно об этом назначении':'Для чего это лекарство'}</h2>{guide&&<p style={{marginTop:12}}><span className={'tag '+(uncertain?'warm':aside?'neutral':'')}>{treatmentRelationLabels[guide.relationKind]}</span></p>}<p style={{marginTop:12}}>{guide?guide.summary:'Без диагноза доступны только общие сведения о препарате. Спросите врача, какую трудность он должен уменьшить.'}</p>
 {guide&&<><p className="small">{guide.context}</p>{guide.composed&&<p className="small muted">Общий разбор: составлен по сведениям о препарате и о том, что помогает при этом диагнозе.</p>}<h3 style={{marginTop:17}}>{uncertain||aside?'Что спросить у врача':safety?'Что проверить с врачом':'Чего ждать от лечения'}</h3><ul className="small">{guide.goals.map(goal=><li key={goal}>{goal}</li>)}</ul><p className="small muted">{uncertain?'Не отменяйте лекарство сами. Покажите этот разбор врачу и обсудите, что делать дальше.':aside?'Не отменяйте лекарство сами: сначала узнайте у врача, для чего оно назначено.':safety?'Это лекарство решает отдельную задачу и не лечит сам диагноз.':'Обсудите с врачом, какие из этих целей важны для вашего ребёнка и когда оценить результат.'}</p></>}
 </section>
 {m.evidenceNote&&<div className="callout">{m.evidenceNote}</div>}
 {m.availabilityNote&&<div className="callout warn">{m.availabilityNote}</div>}
 <section className="card"><h2>Наблюдение за переносимостью</h2><ul>{m.monitoring.map((text,i)=><li key={i}>{text}</li>)}</ul><Link to={'/medications/'+m.id} state={{from:'/review?'+params.toString()}} className="btn secondary compact">Предупреждения и источники<Icon name="arrow" size={15}/></Link></section>
 <section className="card"><h2 style={{marginBottom:18}}>Сохраните нужные вопросы</h2>{questions.map(question=><div className="question" key={question}><p>{question}</p><QuestionButton question={question} compact/></div>)}</section>
 <div className="buttonRow"><button className={'btn '+(visit.meds.includes(m.id)?'soft':'')} disabled={visit.meds.includes(m.id)} onClick={()=>{if(addVisitMedication(m.id))toast('Назначение добавлено в памятку');}}><Icon name={visit.meds.includes(m.id)?'check':'plus'}/>{visit.meds.includes(m.id)?'Назначение в памятке':'Записать назначение'}</button><Link to="/visit" className="btn secondary">Открыть памятку<Icon name="arrow" size={16}/></Link></div>
 {guide&&<Sources items={guide.sources} updatedAt={guide.updatedAt}/>}
 <p className="small muted">Разбор объясняет, что известно о препарате. Он не подбирает лечение и не проверяет дозу — это делает врач.</p>
 </>}
 {mode==='spec'&&s&&<>
 {pair?<section className={'card '+(pair.kind==='core'||pair.kind==='conditional'?'soft':'')}><div className="eyebrow">{dxName(d!)} · разбор помощи</div><h2>{pair.kind==='limited'?'Что известно о пользе':pair.kind==='not_needed'?'Нужен ли '+s.shortTitle.toLowerCase():'Чем поможет '+s.shortTitle.toLowerCase()}</h2>
  <p style={{marginTop:12}}><span className={'tag '+(pair.kind==='limited'?'warm':pair.kind==='not_needed'?'neutral':'')}>{specialistPairLabels[pair.kind]}</span></p>
  <p style={{marginTop:12}}>{pair.summary}</p>
  {pair.method&&<><h3 style={{marginTop:17}}>Как проходит помощь</h3><p className="small">{pair.method}</p></>}
  {pair.avoid&&<div className="callout warn small" style={{marginTop:14}}><strong>Чего не ждать</strong><p>{pair.avoid}</p></div>}
  <p className="small" style={{marginTop:14}}>{pair.context}</p>
  {pair.progress.length>0&&<><h3 style={{marginTop:17}}>Как понять, что помогает</h3><ul className="small">{pair.progress.map(x=><li key={x}>{x}</li>)}</ul></>}
  {pair.composed&&<p className="small muted">Общий разбор: составлен по сведениям о специалисте и о том, что помогает при этом диагнозе.</p>}
 </section>:<section className="card soft"><div className="eyebrow">Что известно из справочника</div><h2>{s.title}</h2><p style={{marginTop:12}}>{s.summary}</p><p className="small muted">Выберите диагноз выше, чтобы увидеть, чем этот специалист поможет именно при нём.</p></section>}
 <section className="card"><h2 style={{marginBottom:18}}>Сохраните нужные вопросы</h2>{(pair?pair.questions:s.questions).map(question=><div className="question" key={question}><p>{question}</p><QuestionButton question={question} compact/></div>)}</section>
 <div className="buttonRow"><Link to={'/specialists/'+s.id} state={{from:'/specialists'}} className="btn secondary">Как выбрать специалиста<Icon name="arrow" size={16}/></Link>{d&&<Link to={'/diagnoses/'+d.id+'?tab=help'} className="btn secondary">Весь план помощи</Link>}</div>
 {pair&&<Sources items={pair.sources} updatedAt={pair.updatedAt}/>}
 <p className="small muted">Разбор объясняет, чем обычно помогает специалист. План занятий составляет сам специалист после оценки ребёнка.</p>
 </>}
 {mode==='exam'&&e&&<>
 {examGuide?<section className={'card '+(['recommended','conditional','monitoring'].includes(examGuide.relationKind)?'soft':'')}><div className="eyebrow">{dxName(d!)} · разбор обследования</div><h2>{examGuide.relationKind==='not_recommended'?'Что известно об этом обследовании':examGuide.relationKind==='not_routine'?'Нужно ли это обследование':examGuide.relationKind==='monitoring'?'Зачем этот контроль':'Зачем это обследование'}</h2>
  <p style={{marginTop:12}}><span className={'tag '+(examGuide.relationKind==='not_recommended'?'warm':examGuide.relationKind==='not_routine'?'neutral':'')}>{examRelationLabels[examGuide.relationKind]}</span></p>
  <p style={{marginTop:12}}>{examGuide.summary}</p>
  {examNote(d!.id)&&<p className="small" style={{marginTop:12}}>{examNote(d!.id)}</p>}
  {examGuide.composed&&<p className="small muted">Общий разбор: составлен по сведениям об обследовании и о том, как ставят этот диагноз.</p>}
 </section>:<section className="card soft"><div className="eyebrow">Что известно из справочника</div><h2>{e.name}</h2><p style={{marginTop:12}}>{e.summary}</p><p className="small muted">Выберите диагноз выше, чтобы увидеть, нужно ли это обследование именно при нём.</p></section>}
 <section className="card"><h2>{e.kind==='dubious'?'Почему не рекомендуется':'Когда нужно'}</h2>{e.kind==='dubious'?<p style={{marginTop:10}}>Это обследование не нужно: {e.verdict}.</p>:<ul>{e.whenNeeded.map(x=><li key={x}>{x}</li>)}</ul>}<h3 style={{marginTop:16}}>Когда не нужно</h3><ul className="small">{e.whenNot.map(x=><li key={x}>{x}</li>)}</ul></section>
 <section className="card"><h2 style={{marginBottom:18}}>Сохраните нужные вопросы</h2>{(examGuide?examQuestions(examGuide):['Какие признаки у нашего ребёнка говорят в пользу этого обследования?','Что изменится в лечении по его результату?']).map(question=><div className="question" key={question}><p>{question}</p><QuestionButton question={question} compact/></div>)}</section>
 <div className="buttonRow"><Link to={'/exams/'+e.id} className="btn secondary">Как проходит и что значит результат<Icon name="arrow" size={16}/></Link><Link to="/exams" className="btn secondary">Все обследования</Link></div>
 <Sources items={examGuide?.sources||e.sources} updatedAt={examGuide?.updatedAt||e.updatedAt}/>
 <p className="small muted">Какие обследования нужны вашему ребёнку, решает врач. Разбор помогает задать вопросы и не делать лишнего.</p>
 </>}
 </div></div>;
}
