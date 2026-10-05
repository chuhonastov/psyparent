import React,{useEffect} from 'react';
import {Link,useLocation,useParams,useSearchParams} from 'react-router-dom';
import {investigations,investigationGroups,investigationById,diagnosesForExam,examRelationLabels} from '../lib/investigations';
import {dxName} from '../lib/content';
import {matchesQuery} from '../lib/search';
import {trackRecent} from '../lib/recent';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import Sources from '../components/Sources';

export default function Exams(){
 const [params,setParams]=useSearchParams(),location=useLocation(),q=params.get('q')||'',group=params.get('group')||'';
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const shown=investigations.filter(e=>(!group||e.group===group)&&matchesQuery(q,[e.name,...e.aliases],e.summary));
 const from=location.pathname+location.search;
 return <div className="container"><PageHeader title="Обследования" subtitle="Какие анализы и исследования действительно нужны ребёнку, а какие — нет." backTo="/library" backLabel="Справочник"/>
 <div className="callout"><strong>Обследуют прицельно</strong><p>Диагноз в детской психиатрии ставят в беседе и наблюдении. Обследования нужны при особых признаках, перед лекарствами и для контроля лечения. «Полное обследование на всё» чаще находит безобидные отклонения, которые потом зря лечат.</p></div>
 <Link to="/review?what=exam" className="actionCard" style={{marginTop:16}}><span className="actionIcon"><Icon name="flask" size={23}/></span><div className="actionMain"><h3>Разобрать обследование при диагнозе</h3><p>Нужно ли оно, при каких признаках и что спросить врача</p></div><Icon name="arrow" size={18}/></Link>
 <div className="searchWrap" style={{marginTop:20}}><Icon name="search"/><input type="search" className="input" aria-label="Найти обследование" placeholder="ЭЭГ, МРТ, анализ волос…" value={q} onChange={e=>set('q',e.target.value)}/>{q&&<button className="clearSearch" aria-label="Очистить поиск" onClick={()=>set('q','')}><Icon name="close"/></button>}</div>
 <div className="pickChips" role="group" aria-label="Группа обследований" style={{marginTop:12}}><button type="button" className="pickChip" aria-pressed={!group} onClick={()=>set('group','')}>Все</button>{investigationGroups.map(g=><button type="button" className="pickChip" key={g.id} aria-pressed={group===g.id} onClick={()=>set('group',group===g.id?'':g.id)}>{g.title}</button>)}</div>
 <p className="searchMeta" role="status">Найдено: {shown.length}</p>
 {investigationGroups.map(g=>{const items=shown.filter(e=>e.group===g.id);return items.length?<section key={g.id} aria-label={g.title} style={{marginTop:18}}><div className="sectionHeading"><h2>{g.title}</h2></div>
  <div className="list">{items.map(e=><Link className="listCard" key={e.id} to={'/exams/'+e.id} state={{from}}><div className="listMain">{e.kind==='dubious'&&<span className="tag warm">Не рекомендуется</span>}<h3>{e.name}</h3><p>{e.summary}</p></div><Icon name="arrow" size={17}/></Link>)}</div></section>:null;})}
 {!shown.length&&<div className="emptyState"><h3>Ничего не нашлось</h3><p>Попробуйте короче: «ЭЭГ», «МРТ», «волос», «ферритин».</p><button className="btn secondary" onClick={()=>setParams({})}>Показать все</button></div>}
 </div>;
}

export function ExamDetail(){
 const {id=''}=useParams(),location=useLocation(),e=investigationById(id);
 useEffect(()=>{if(e)trackRecent('exam',e.id);},[e]);
 if(!e)return <div className="container"><PageHeader title="Такого обследования пока нет" backTo="/exams" backLabel="Все обследования"/></div>;
 const groups=diagnosesForExam(e.id),group=investigationGroups.find(g=>g.id===e.group);
 const from=typeof location.state?.from==='string'&&location.state.from.startsWith('/exams')?location.state.from:'/exams';
 return <div className="container"><PageHeader title={e.name} subtitle={e.summary} eyebrow={group?.title} backTo={from} backLabel="Все обследования"/><div className="stack">
 {e.kind==='dubious'&&<div className="callout warn"><strong>Не рекомендуется</strong><p>Это обследование не нужно: {e.verdict}.</p></div>}
 <section className="card"><h2>Когда нужно</h2>{e.whenNeeded.length?<ul>{e.whenNeeded.map(x=><li key={x}>{x}</li>)}</ul>:<p style={{marginTop:10}}>Показаний нет: ни при одном детском психическом или неврологическом состоянии это обследование не помогает.</p>}</section>
 <section className="card"><h2>Когда не нужно</h2><ul>{e.whenNot.map(x=><li key={x}>{x}</li>)}</ul></section>
 <section className="card"><h2>Как проходит</h2><p style={{marginTop:10}}>{e.howItGoes}</p><h3 style={{marginTop:16}}>Как понимать результат</h3><p className="small" style={{marginTop:6}}>{e.results}</p></section>
 {groups.length>0&&<section className="card"><h2>При каких диагнозах</h2><p className="small muted">Нажмите на диагноз: откроется разбор — нужно ли обследование и что спросить врача.</p>{groups.map(g=><div key={g.kind} style={{marginTop:16}}><p className="pickGroupLabel">{examRelationLabels[g.kind]}</p><div className="pickChips">{g.items.map(d=><Link key={d.id} className="pickChip" to={'/review?what=exam&dx='+d.id+'&exam='+e.id}>{dxName(d)}</Link>)}</div></div>)}</section>}
 <Link className="btn secondary" to={'/review?what=exam&exam='+e.id}>Разобрать при диагнозе<Icon name="arrow" size={16}/></Link>
 <Sources items={e.sources} updatedAt={e.updatedAt}/>
 <p className="small muted">Какие обследования нужны вашему ребёнку, решает врач. Справочник помогает задать вопросы и не делать лишнего.</p>
 </div></div>;
}
