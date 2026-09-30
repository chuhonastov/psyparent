import React,{useEffect} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {specialistById,nonpharmSupport,diagnosisById,dxName} from '../lib/content';
import PageHeader from '../components/PageHeader';
import Disclosure from '../components/Disclosure';
import QuestionButton from '../components/QuestionButton';
import Sources from '../components/Sources';
import {Limitations} from '../components/NonpharmHelp';
import Icon from '../components/Icon';
import {trackRecent} from '../lib/recent';

export default function SpecialistDetail(){
 const {id=''}=useParams(),location=useLocation(),s=specialistById(id);
 useEffect(()=>{if(s)trackRecent('spec',s.id);},[s]);
 if(!s)return <div className="container"><PageHeader title="Такого специалиста пока нет" backTo="/specialists" backLabel="Все специалисты"/></div>;
 const related=nonpharmSupport.flatMap(p=>{const provider=p.providers.find(x=>x.specialistId===id),d=diagnosisById(p.diagnosisId);return provider&&d?[{d,provider}]:[];});
 const from=typeof location.state?.from==='string'&&/^\/specialists\?/.test(location.state.from)?location.state.from:'/specialists';
 return <div className="container"><PageHeader title={s.title} subtitle={s.summary} eyebrow="Немедикаментозная помощь" backTo={from} backLabel="Все специалисты"/><div className="stack">
 <div className="topics">{s.domains.map(d=><Link key={d} className="topic" to={'/specialists?domain='+encodeURIComponent(d)}>{d}</Link>)}</div>
 <section className="card"><h2>Когда и чем может помочь</h2><div className="stack" style={{marginTop:18}}>{s.helps.map(h=><article key={h.situation}><h3>{h.situation}</h3><p style={{marginTop:6}}>{h.method}</p><p className="small muted"><strong>Ожидаемая польза:</strong> {h.result}</p></article>)}</div></section>
 <Disclosure title="Где не подходит и что стоит уточнить" defaultOpen><Limitations items={s.limitations}/></Disclosure>
 <section className="card"><h2>Как выбрать специалиста</h2><ul>{s.whatToCheck.map(x=><li key={x}>{x}</li>)}</ul><p className="small muted">Результат оценивают в жизни ребёнка. Если занятия не помогают, обсудите пересмотр цели и программы.</p></section>
 <section className="card"><h2>Что спросить до начала</h2>{s.questions.map(q=><div className="question" key={q}><p>{q}</p><QuestionButton question={q} compact/></div>)}</section>
 <Disclosure title={'Ситуации и диагнозы · '+related.length}><p className="small muted">В каждой карточке указана конкретная задача. Связь не означает, что специалист нужен всем детям с таким диагнозом.</p><div className="list" style={{marginTop:14}}>{related.map(({d,provider})=><Link className="listCard" key={d.id} to={'/diagnoses/'+d.id+'?tab=help'}><div className="listMain"><span className={'tag '+(provider.role==='conditional'?'warm':'')}>{provider.role==='conditional'?'По отдельной потребности':'По основной задаче'}</span><h3>{dxName(d)}</h3><p>{provider.goal}</p></div><Icon name="arrow" size={16}/></Link>)}</div></Disclosure>
 <Sources items={s.sources} updatedAt={s.updatedAt}/></div></div>;
}
