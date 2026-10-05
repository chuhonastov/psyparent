import React,{useMemo} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import Icon from './Icon';
import {searchEverything} from '../lib/globalSearch';
/** Search over the whole reference with the query kept in the URL; without a query it shows its children. */
export default function GlobalSearch({title='Найти в справочнике',hint,children}:{title?:string;hint?:React.ReactNode;children?:React.ReactNode}){
 const [params,setParams]=useSearchParams(),q=params.get('q')||'';
 const groups=useMemo(()=>searchEverything(q),[q]),found=groups.reduce((sum,g)=>sum+g.total,0);
 const setQuery=(value:string)=>{const next=new URLSearchParams(params);value?next.set('q',value):next.delete('q');setParams(next,{replace:true});};
 return <>
 <div className="sectionHeading"><h2>{q.trim()?'Результаты поиска':title}</h2></div>
 <div className="searchWrap homeSearch" role="search"><Icon name="search"/><input className="input" type="search" enterKeyHint="search" aria-label="Поиск по справочнику" placeholder="Диагноз, препарат, обследование" value={q} onChange={e=>setQuery(e.target.value)}/>{q&&<button className="clearSearch" type="button" aria-label="Очистить поиск" onClick={()=>setQuery('')}><Icon name="close" size={17}/></button>}</div>
 {q.trim()?<>
 <p className="searchMeta" role="status">{found?'Найдено: '+found:'Ничего не нашлось'}</p>
 {groups.map(g=><section key={g.id} aria-label={g.title}><div className="sectionHeading"><h2>{g.title}</h2><span className="small muted">{g.total}</span></div>
 <div className="list">{g.hits.map(h=><Link className="listCard" key={h.id} to={h.to}><div className="listMain">{h.label&&<span className="tag">{h.label}</span>}<h3>{h.title}</h3><p>{h.note}</p></div><Icon name="arrow" size={17}/></Link>)}</div>
 {g.total>g.hits.length&&<Link className="searchMore" to={g.moreTo}>Показать все: {g.total}</Link>}</section>)}
 {!found&&<div className="emptyState"><Icon name="search" size={27}/><h3>В справочнике нет такого названия</h3><p>Попробуйте название из заключения, действующее вещество с упаковки или более короткое слово. Вопрос можно записать в памятку.</p><Link className="btn secondary" to="/visit">Записать вопрос врачу</Link></div>}
 </>:<>{hint&&<p className="searchHint">{hint}</p>}{children}</>}
 </>;
}
