import React from 'react';
import {Link} from 'react-router-dom';
import {limitationLabels,specialistById,supportForDiagnosis,diagnosisById,dxName,Limitation} from '../lib/content';
import Disclosure from './Disclosure';
import QuestionButton from './QuestionButton';
import Sources from './Sources';

export function Limitations({items}:{items:Limitation[]}){
 return <div className="stack">{items.map((item,i)=><div key={i}><span className={'tag '+(item.kind==='harmful'||item.kind==='limited'?'warm':'')}>{limitationLabels[item.kind]}</span><p>{item.text}</p></div>)}</div>;
}
export default function NonpharmHelp({diagnosisId}:{diagnosisId:string}){
 const support=supportForDiagnosis(diagnosisId);
 if(!support)return null;
 return <section className="stack" aria-label="Немедикаментозная помощь">
 <div className="card soft"><div className="eyebrow">Немедикаментозная помощь</div><h2>Кто и чем может помочь</h2><p style={{marginTop:10}}>{support.intro}</p><p className="small muted">Это варианты по потребности. Посещать всех специалистов одновременно не нужно.</p></div>
 {support.priority&&<div className="callout danger"><strong>Сначала безопасность</strong><p>{support.priority}</p><Link to="/help" className="textButton">Как получить срочную помощь</Link></div>}
 <div className="supportGrid">{support.providers.map(p=>{const specialist=specialistById(p.specialistId);return specialist?<article className="card supportCard" key={p.specialistId}>
 <span className={'tag '+(p.role==='conditional'?'warm':'')}>{p.role==='conditional'?'По отдельной потребности':'По основной задаче'}</span><h3><Link to={'/specialists/'+specialist.id}>{specialist.title}</Link></h3><p className="supportGoal">{p.goal}</p><p className="muted">{p.method}</p><Link className="textButton" to={'/specialists/'+specialist.id}>Как выбрать специалиста</Link>
 </article>:null;})}</div>
 <Disclosure title="Где помощь ограничена или не подходит"><Limitations items={support.limitations}/></Disclosure>
 <Disclosure title="Как оценить пользу занятий"><ul>{support.progress.map(x=><li key={x}>{x}</li>)}</ul><p className="small muted">До начала договоритесь об исходной точке и сроке пересмотра плана. Если результата нет, проверьте цель, метод, нагрузку и перенос навыка; это не означает, что ребёнок «плохо старается».</p><QuestionButton question={'Какая немедикаментозная помощь нужна при теме «'+dxName(diagnosisById(diagnosisId)!)+'»: цель, метод и критерии результата?'}/></Disclosure>
 <Link className="btn secondary" to="/specialists">Все специалисты и сферы помощи</Link>
 <Sources items={support.sources} updatedAt={support.updatedAt}/>
 </section>;
}
