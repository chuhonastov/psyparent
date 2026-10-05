import React,{useEffect} from 'react';
import {Link,useParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import Disclosure from '../components/Disclosure';
import Sources from '../components/Sources';
import {navRouteById,navRoutes,navSources,navTopicById,navTopics,navUpdatedAt,navVerdicts,verdictTone,NavTopic} from '../lib/navigator';
import {trackRecent} from '../lib/recent';
function Topic({t,open}:{t:NavTopic;open?:boolean}){
 return <Disclosure title={t.title} defaultOpen={open}><p style={{marginTop:8}}>{t.text}</p><ul className="small">{t.points.map(p=><li key={p}>{p}</li>)}</ul></Disclosure>;
}
export default function Navigator(){
 const general=['uchet','free','pmpk','pmpk_docs','disability','school','tutor','home','exams','refuse'].map(navTopicById).filter((t):t is NavTopic=>!!t);
 return <div className="container"><PageHeader title="Навигатор по России" subtitle="Что делать после диагноза: какие специалисты нужны, ПМПК, школа, инвалидность и документы — по шагам." backTo="/library" backLabel="Справочник"/>
 <div className="callout"><strong>Порядок и списки документов меняются</strong><p>Здесь — общая карта. За деталями идите на сайт своей ПМПК и бюро МСЭ, в родительскую организацию или к социальному работнику поликлиники. Лучший навигатор — родители, которые прошли этот путь на год раньше вас.</p></div>
 <div className="sectionHeading"><h2>Маршруты</h2></div>
 <div className="list">{navRoutes.map(r=><Link key={r.id} className="listCard" to={'/navigator/'+r.id}><div className="listMain"><h3>{r.title}</h3><p>{r.intro}</p></div><Icon name="arrow" size={17}/></Link>)}</div>
 <div className="sectionHeading"><h2>Коротко о главном</h2></div>
 <section className="card">{general.map(t=><Topic key={t.id} t={t}/>)}</section>
 <Sources items={navSources([...new Set(navTopics.flatMap(t=>t.sources))])} updatedAt={navUpdatedAt}/>
 </div>;
}
export function NavigatorRoute(){
 const {id=''}=useParams(),r=navRouteById(id);
 useEffect(()=>{if(r)trackRecent('nav',r.id);},[r]);
 if(!r)return <div className="container"><PageHeader title="Маршрут не найден" backTo="/navigator" backLabel="Навигатор"/></div>;
 const used=[...new Set(r.steps.flatMap(s=>s.topics||[]))].map(navTopicById).filter((t):t is NavTopic=>!!t);
 return <div className="container"><PageHeader title={r.title} subtitle={r.intro} eyebrow="Маршрут в России" backTo="/navigator" backLabel="Навигатор"/>
 <ol className="navSteps">{r.steps.map((s,i)=><li key={s.title} className="card navStep"><div className="navStepHead"><span className="stepNumber">{i+1}</span><h2>{s.title}</h2></div>
  {s.verdict&&<span className={'tag '+verdictTone(s.verdict)}>{navVerdicts[s.verdict]}</span>}
  {s.text&&<p style={{marginTop:8}}>{s.text}</p>}
  {s.list&&<ul className="small">{s.list.map(x=><li key={x}>{x}</li>)}</ul>}
  {s.links&&<div className="pickChips" style={{marginTop:12}}>{s.links.map(l=><Link key={l.to} className="pickChip" to={l.to}>{l.label}</Link>)}</div>}
  {(s.topics||[]).map(navTopicById).filter((t):t is NavTopic=>!!t).map(t=><Topic key={t.id} t={t}/>)}
 </li>)}</ol>
 <Link className="btn secondary full" style={{marginTop:16}} to="/navigator">Другие маршруты и общие вопросы</Link>
 <Sources items={navSources([...new Set(used.flatMap(t=>t.sources))])} updatedAt={navUpdatedAt}/>
 </div>;
}
/** One general topic (ПМПК, инвалидность…) as its own page: search results and other screens link here. */
export function NavigatorTopic(){
 const {id=''}=useParams(),t=navTopicById(id);
 if(!t)return <div className="container"><PageHeader title="Раздел не найден" backTo="/navigator" backLabel="Навигатор"/></div>;
 const routes=navRoutes.filter(r=>r.steps.some(s=>s.topics?.includes(t.id)));
 return <div className="container"><PageHeader title={t.title} subtitle={t.text} eyebrow="Навигатор по России" backTo="/navigator" backLabel="Навигатор"/>
 <section className="card"><ul>{t.points.map(p=><li key={p}>{p}</li>)}</ul></section>
 {routes.length>0&&<><div className="sectionHeading"><h2>В маршрутах</h2></div><div className="pickChips">{routes.map(r=><Link key={r.id} className="pickChip" to={'/navigator/'+r.id}>{r.title}</Link>)}</div></>}
 <div className="callout" style={{marginTop:16}}><p>Порядок и списки документов в регионах отличаются. Уточняйте на сайте своей ПМПК или бюро МСЭ.</p></div>
 <Sources items={navSources(t.sources)} updatedAt={navUpdatedAt}/>
 </div>;
}
