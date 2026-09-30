import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {dxName,leaves,diagnosisGroups,topicLabel} from '../lib/content';
import {matchesQuery} from '../lib/search';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
export default function Diagnoses() {
 const [params,setParams]=useSearchParams();
 const q=params.get('q')||'',group=params.get('group')||'';
 const selected=diagnosisGroups.find(g=>g.id===group);
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const showTopics=!!q.trim()||!!selected;
 const items=leaves.filter(d=>(!selected||selected.children?.includes(d.id))&&matchesQuery(q,[d.title,d.shortTitle||'',...(d.aliases||[])],d.summary));
 const from='/diagnoses'+(params.toString()?'?'+params.toString():'');
 return <div className="container"><PageHeader title="Разобраться в диагнозе" subtitle="Найдите название из заключения или выберите тему." backTo="/" backLabel="Главная"/>
 <div className="searchWrap"><Icon name="search"/><input className="input" type="search" aria-label="Поиск диагноза" placeholder="Например, депрессия, ПТСР или F42" value={q} onChange={e=>set('q',e.target.value)}/>{q&&<button className="clearSearch" aria-label="Очистить поиск" onClick={()=>set('q','')}><Icon name="close" size={17}/></button>}</div>
 <label className="fieldLabel filterLabel" htmlFor="diagnosis-category">Раздел справочника</label><select id="diagnosis-category" value={selected?.id||''} onChange={e=>set('group',e.target.value)}><option value="">Все разделы</option>{diagnosisGroups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select>
 <p className="searchMeta" role="status">{showTopics?'Найдено тем: '+items.length:'Тем: '+leaves.length+' · разделов: '+diagnosisGroups.length}</p>
 {showTopics?(items.length?<div className="list">{items.map(d=><Link key={d.id} state={{from}} className="listCard" to={'/diagnoses/'+d.id}><div className="listMain"><span className="tag">{topicLabel(d)}</span><h3>{dxName(d)}</h3><p>{d.summary}</p></div><Icon name="arrow" size={17}/></Link>)}</div>:<div className="emptyState"><Icon name="search" size={27}/><h3>Пока не нашли эту тему</h3><p>{selected?'Попробуйте поиск во всех разделах или другое название.':'Попробуйте другое название. Вопрос можно записать в памятку врачу.'}</p>{selected&&<button className="btn secondary" onClick={()=>set('group','')}>Искать во всех разделах</button>}<Link className="btn secondary" to="/visit">Записать вопрос</Link></div>):<div className="catalogGrid">{diagnosisGroups.map(g=><Link key={g.id} className="listCard" to={'/diagnoses/group/'+g.id}><div className="listMain"><span className="tag">Тем: {g.children?.length||0}</span><h3>{g.title}</h3><p>{g.summary}</p></div><Icon name="arrow" size={17}/></Link>)}</div>}
 <div className="callout" style={{marginTop:21}}><strong>Названия помогают начать разговор</strong><p>В каталоге есть диагнозы, обзоры и памятки о трудных ситуациях. Они отмечены отдельно. Карточки помогают понять заключение и подготовить вопросы; автоматического определения диагноза здесь нет.</p></div>
 </div>;
}
