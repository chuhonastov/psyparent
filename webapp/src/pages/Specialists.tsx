import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {specialists,specialistTasks,nonpharmSupport,diagnosisById,dxName} from '../lib/content';
import {matchesQuery} from '../lib/search';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';

export default function Specialists(){
 const [params,setParams]=useSearchParams(),q=params.get('q')||'',domain=params.get('domain')||'';
 const domains=[...new Set(specialists.flatMap(s=>s.domains))];
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 // A few parent-level tasks instead of a 30-item list of domains; ?domain= from a specialist card still works.
 const validDomain=domains.includes(domain)?domain:'',task=specialistTasks.find(t=>t.id===params.get('task'));
 const setTask=(id:string)=>{const next=new URLSearchParams(params);next.delete('domain');id?next.set('task',id):next.delete('task');setParams(next,{replace:true});};
 const items=specialists.filter(s=>(!validDomain||s.domains.includes(validDomain))&&(!task||s.domains.some(d=>task.domains.includes(d)))&&matchesQuery(q,[s.title,...s.domains],s.summary+' '+s.helps.map(h=>h.situation+' '+h.method).join(' ')+' '+nonpharmSupport.filter(p=>p.providers.some(x=>x.specialistId===s.id)).map(p=>dxName(diagnosisById(p.diagnosisId)!)).join(' ')));
 const from='/specialists'+(params.toString()?'?'+params.toString():'');
 return <div className="container"><PageHeader title="Специалисты и занятия" subtitle="К кому идти, с какой задачей и как понять, что помощь подходит." backTo="/library" backLabel="Справочник"/>
 <Link to="/doctors" className="actionCard warm" style={{marginBottom:16}}><span className="actionIcon"><Icon name="user" size={23}/></span><div className="actionMain"><h3>Врачи нашей клиники</h3><p>Выбрать врача и записаться</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/methods" className="actionCard" style={{marginBottom:16}}><span className="actionIcon"><Icon name="alert" size={23}/></span><div className="actionMain"><h3>Что не помогает</h3><p>Сомнительные методы, даже если их назначил врач</p></div><Icon name="arrow" size={18}/></Link>
 <div className="callout"><strong>Выбирайте задачу и метод</strong><p>За одним названием профессии бывает очень разная подготовка. Спросите, каким методом работает специалист и как вы поймёте, что стало лучше.</p></div>
 <div className="searchWrap" style={{marginTop:20}}><Icon name="search"/><input type="search" className="input" aria-label="Поиск специалиста или задачи" placeholder="Логопед, чтение, РАС" value={q} onChange={e=>set('q',e.target.value)}/>{q&&<button className="clearSearch" aria-label="Очистить поиск" onClick={()=>set('q','')}><Icon name="close"/></button>}</div>
 <p className="fieldLabel" id="support-task">С чем нужна помощь</p><div className="pickChips" role="group" aria-labelledby="support-task"><button type="button" className="pickChip" aria-pressed={!task&&!validDomain} onClick={()=>setTask('')}>Все</button>{validDomain&&<button type="button" className="pickChip" aria-pressed="true" onClick={()=>set('domain','')}>{validDomain} ✕</button>}{specialistTasks.map(t=><button type="button" className="pickChip" key={t.id} aria-pressed={task?.id===t.id} onClick={()=>setTask(task?.id===t.id?'':t.id)}>{t.title}</button>)}</div>
 <p className="searchMeta" role="status">Найдено: {items.length}</p>
 <div className="list">{items.map(s=><Link className="listCard" key={s.id} to={'/specialists/'+s.id} state={{from}}><div className="listMain"><h3>{s.title}</h3><p>{s.summary}</p><p>{s.domains.join(' · ')}</p></div><Icon name="arrow" size={17}/></Link>)}</div>
 {!items.length&&<div className="emptyState"><h3>По этому запросу ничего не найдено</h3><p>Попробуйте назвать навык: речь, обучение, эмоции или самостоятельность.</p><button className="btn secondary" onClick={()=>setParams({})}>Показать всех специалистов</button></div>}
 <Link to="/diagnoses" className="btn secondary full" style={{marginTop:20}}>Посмотреть помощь по диагнозу</Link></div>;
}
