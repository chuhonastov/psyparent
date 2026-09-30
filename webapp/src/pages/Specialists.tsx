import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {specialists,nonpharmSupport,diagnosisById,dxName} from '../lib/content';
import {matchesQuery} from '../lib/search';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';

export default function Specialists(){
 const [params,setParams]=useSearchParams(),q=params.get('q')||'',domain=params.get('domain')||'';
 const domains=[...new Set(specialists.flatMap(s=>s.domains))].sort((a,b)=>a.localeCompare(b,'ru'));
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const validDomain=domains.includes(domain)?domain:'';
 const items=specialists.filter(s=>(!validDomain||s.domains.includes(validDomain))&&matchesQuery(q,[s.title,...s.domains],s.summary+' '+s.helps.map(h=>h.situation+' '+h.method).join(' ')+' '+nonpharmSupport.filter(p=>p.providers.some(x=>x.specialistId===s.id)).map(p=>dxName(diagnosisById(p.diagnosisId)!)).join(' ')));
 const from='/specialists'+(params.toString()?'?'+params.toString():'');
 return <div className="container"><PageHeader title="Специалисты и занятия" subtitle="К кому идти, с какой задачей и как понять, что помощь подходит." backTo="/" backLabel="Главная"/>
 <div className="callout"><strong>Выбирайте задачу и метод</strong><p>Одинаковое название специальности может скрывать разную подготовку. Уточните, чему учат, как это связано с вашей трудностью и как проверят результат.</p></div>
 <div className="searchWrap" style={{marginTop:20}}><Icon name="search"/><input type="search" className="input" aria-label="Поиск специалиста или задачи" placeholder="Логопед, чтение, РАС" value={q} onChange={e=>set('q',e.target.value)}/>{q&&<button className="clearSearch" aria-label="Очистить поиск" onClick={()=>set('q','')}><Icon name="close"/></button>}</div>
 <label className="fieldLabel" htmlFor="support-domain">Сфера помощи</label><select id="support-domain" value={validDomain} onChange={e=>set('domain',e.target.value)}><option value="">Все сферы</option>{domains.map(d=><option key={d}>{d}</option>)}</select>
 <p className="searchMeta" role="status">Найдено: {items.length}</p>
 <div className="list">{items.map(s=><Link className="listCard" key={s.id} to={'/specialists/'+s.id} state={{from}}><div className="listMain"><h3>{s.title}</h3><p>{s.summary}</p><p>{s.domains.join(' · ')}</p></div><Icon name="arrow" size={17}/></Link>)}</div>
 {!items.length&&<div className="emptyState"><h3>По этому запросу ничего не найдено</h3><p>Попробуйте назвать навык: речь, обучение, эмоции или самостоятельность.</p><button className="btn secondary" onClick={()=>setParams({})}>Показать всех специалистов</button></div>}
 <Link data-tone="blue" to="/diagnoses" className="btn secondary full" style={{marginTop:20}}>Посмотреть помощь по диагнозу</Link></div>;
}
