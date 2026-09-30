import React from 'react';
import {Link} from 'react-router-dom';
import {clinicalDiagnoses,limitationLabels,specialistById,supportForDiagnosis,diagnosisById,dxName,Limitation} from '../lib/content';
import Disclosure from './Disclosure';
import QuestionButton from './QuestionButton';
import Sources from './Sources';

export function Limitations({items}:{items:Limitation[]}){
 return <div className="stack">{items.map((item,i)=><div key={i}><span className={'tag '+(item.kind==='harmful'||item.kind==='limited'?'warm':'')}>{limitationLabels[item.kind]}</span><p>{item.text}</p></div>)}</div>;
}
export default function NonpharmHelp({diagnosisId}:{diagnosisId:string}){
 const support=supportForDiagnosis(diagnosisId),reviewable=clinicalDiagnoses.some(d=>d.id===diagnosisId);
 if(!support)return null;
 return <section className="stack" aria-label="Немедикаментозная помощь">
 <div className="card soft"><div className="eyebrow">Немедикаментозная помощь</div><h2>Кто и чем может помочь</h2><p style={{marginTop:10}}>{support.intro}</p><p className="small muted">Посещать всех специалистов сразу не нужно — начните с главного.</p></div>
 {support.priority&&<div className="callout danger"><strong>Сначала безопасность</strong><p>{support.priority}</p><Link to="/help" className="textButton">Как получить срочную помощь</Link></div>}
 <div className="supportGrid">{support.providers.map(p=>{const specialist=specialistById(p.specialistId);return specialist?<article className="card supportCard" key={p.specialistId}>
 <span className={'tag '+(p.role==='conditional'?'warm':'')}>{p.role==='conditional'?'По отдельной потребности':'По основной задаче'}</span><h3><Link to={'/specialists/'+specialist.id}>{specialist.title}</Link></h3><p className="supportGoal">{p.goal}</p><p className="muted">{p.method}</p>{p.avoid&&<p className="small supportAvoid"><strong>Чего не ждать:</strong> {p.avoid}</p>}<div className="buttonRow">{reviewable&&<Link className="textButton" to={'/review?what=spec&dx='+diagnosisId+'&spec='+specialist.id}>Разбор и вопросы</Link>}<Link className="textButton" to={'/specialists/'+specialist.id}>Как выбрать специалиста</Link></div>
 </article>:null;})}</div>
 <Disclosure title="Где помощь ограничена или не подходит">{!!support.notFor?.length&&<div className="stack" style={{marginBottom:16}}>{support.notFor.map(n=>{const sp=specialistById(n.specialistId);return sp?<div key={n.specialistId}><span className="tag warm">{n.kind==='limited'?'Польза не доказана':'Обычно не нужен'}</span><p><strong>{sp.shortTitle}.</strong> {n.text}</p>{reviewable&&<Link className="textButton" to={'/review?what=spec&dx='+diagnosisId+'&spec='+sp.id}>Разбор и вопросы</Link>}</div>:null;})}</div>}<Limitations items={support.limitations}/></Disclosure>
 <Disclosure title="Как оценить пользу занятий"><ul>{support.progress.map(x=><li key={x}>{x}</li>)}</ul><p className="small muted">Договоритесь заранее, когда вы посмотрите на результат. Если его нет, дело не в том, что ребёнок «плохо старается»: пересмотрите цель, метод или нагрузку.</p><QuestionButton question={'Какая немедикаментозная помощь нужна при теме «'+dxName(diagnosisById(diagnosisId)!)+'»: цель, метод и критерии результата?'}/></Disclosure>
 <Link className="btn secondary" to="/specialists">Все специалисты и сферы помощи</Link>
 <Sources items={support.sources} updatedAt={support.updatedAt}/>
 </section>;
}
