import React,{useEffect} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {specialistById,dxName} from '../lib/content';
import {diagnosesForSpecialist,specialistPairLabels} from '../lib/pairs';
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
 const groups=diagnosesForSpecialist(id);
 const from=typeof location.state?.from==='string'&&/^\/specialists\?/.test(location.state.from)?location.state.from:'/specialists';
 return <div className="container"><PageHeader title={s.title} subtitle={s.summary} eyebrow="Немедикаментозная помощь" backTo={from} backLabel="Все специалисты"/><div className="stack">
 <div className="topics">{s.domains.map(d=><Link key={d} className="topic" to={'/specialists?domain='+encodeURIComponent(d)}>{d}</Link>)}</div>
 <section className="card"><h2>Когда и чем может помочь</h2><div className="stack" style={{marginTop:18}}>{s.helps.map(h=><article key={h.situation}><h3>{h.situation}</h3><p style={{marginTop:6}}>{h.method}</p><p className="small muted"><strong>Ожидаемая польза:</strong> {h.result}</p></article>)}</div></section>
 <Disclosure title="Где не подходит и что стоит уточнить" defaultOpen><Limitations items={s.limitations}/></Disclosure>
 <section className="card"><h2>Как выбрать специалиста</h2><ul>{s.whatToCheck.map(x=><li key={x}>{x}</li>)}</ul><p className="small muted">Результат видно в жизни ребёнка, а не в кабинете. Если занятия не помогают, пересмотрите цель и программу.</p></section>
 <section className="card"><h2>Что спросить до начала</h2>{s.questions.map(q=><div className="question" key={q}><p>{q}</p><QuestionButton question={q} compact/></div>)}</section>
 <section className="card"><h2>При каких диагнозах</h2><p className="small muted">Нажмите на диагноз: откроется разбор — чем поможет специалист, чего не ждать и что спросить.</p>{groups.map(g=><div key={g.kind} style={{marginTop:16}}><p className="pickGroupLabel">{specialistPairLabels[g.kind]}</p><div className="pickChips">{g.items.map(x=><Link key={x.id} className="pickChip" to={'/review?what=spec&dx='+x.id+'&spec='+s.id}>{dxName(x)}</Link>)}</div></div>)}<Link className="btn secondary compact" style={{marginTop:18}} to={'/review?what=spec&spec='+s.id}>Разобрать при другом диагнозе<Icon name="arrow" size={15}/></Link></section>
 <Sources items={s.sources} updatedAt={s.updatedAt}/></div></div>;
}
