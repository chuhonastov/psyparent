import React,{useEffect} from 'react';
import {Link,useLocation,useParams,useSearchParams} from 'react-router-dom';
import {methods,methodGroups,methodById,methodVerdictLabels,ifPrescribed,methodQuestions,methodRedFlags,verdictTag} from '../lib/methods';
import {diagnosisById,dxName} from '../lib/content';
import {matchesQuery} from '../lib/search';
import {trackRecent} from '../lib/recent';
import PageHeader from '../components/PageHeader';
import QuestionButton from '../components/QuestionButton';
import Icon from '../components/Icon';
import Sources from '../components/Sources';

export default function Methods(){
 const [params,setParams]=useSearchParams(),location=useLocation(),q=params.get('q')||'',group=params.get('group')||'';
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const shown=methods.filter(x=>(!group||x.group===group)&&matchesQuery(q,[x.name,...x.aliases],x.summary+' '+x.promise));
 const from=location.pathname+location.search;
 return <div className="container"><PageHeader title="Что не помогает" subtitle="Методы, которые часто предлагают детям с особенностями. Выводы разные: где-то пользы для этой задачи не показано, где-то есть серьёзные риски, а где-то польза возможна только как дополнение к основной помощи." backTo="/library" backLabel="Справочник"/>
 <div className="callout"><strong>Почему кажется, что помогает</strong><p>Ребёнок и сам развивается, а на любых занятиях есть регулярность, внимание взрослого и надежда. Если вам «помог» курс чего-то сомнительного, вы не глупы — вас поймали на надежде. Главный вред таких методов — украденное время, когда настоящая помощь не начинается.</p></div>
 <section className="card" style={{marginTop:16}}><h2>Признаки, что вам продают надежду, а не помощь</h2><ul>{methodRedFlags.map(x=><li key={x}>{x}</li>)}</ul></section>
 <div className="searchWrap" style={{marginTop:20}}><Icon name="search"/><input type="search" className="input" aria-label="Найти метод" placeholder="Остеопат, дельфины, микротоки…" value={q} onChange={e=>set('q',e.target.value)}/>{q&&<button className="clearSearch" aria-label="Очистить поиск" onClick={()=>set('q','')}><Icon name="close"/></button>}</div>
 <div className="pickChips" role="group" aria-label="Группа методов" style={{marginTop:12}}><button type="button" className="pickChip" aria-pressed={!group} onClick={()=>set('group','')}>Все</button>{methodGroups.map(g=><button type="button" className="pickChip" key={g.id} aria-pressed={group===g.id} onClick={()=>set('group',group===g.id?'':g.id)}>{g.title}</button>)}</div>
 <p className="searchMeta" role="status">Найдено: {shown.length}</p>
 {methodGroups.map(g=>{const items=shown.filter(x=>x.group===g.id);return items.length?<section key={g.id} aria-label={g.title} style={{marginTop:18}}><div className="sectionHeading"><h2>{g.title}</h2></div>
  <div className="list">{items.map(x=><Link className="listCard" key={x.id} to={'/methods/'+x.id} state={{from}}><div className="listMain"><span className={'tag '+verdictTag(x.verdict)}>{methodVerdictLabels[x.verdict]}</span><h3>{x.name}</h3><p>{x.summary}</p></div><Icon name="arrow" size={17}/></Link>)}</div></section>:null;})}
 {!shown.length&&<div className="emptyState"><h3>Ничего не нашлось</h3><p>Попробуйте короче: «остеопат», «токи», «диета», «дельфин».</p><button className="btn secondary" onClick={()=>setParams({})}>Показать все</button></div>}
 <Link to="/specialists" className="btn secondary full" style={{marginTop:20}}>Что помогает: специалисты и занятия</Link>
 </div>;
}

export function MethodDetail(){
 const {id=''}=useParams(),location=useLocation(),m=methodById(id);
 useEffect(()=>{if(m)trackRecent('method',m.id);},[m]);
 if(!m)return <div className="container"><PageHeader title="Такого метода пока нет" backTo="/methods" backLabel="Что не помогает"/></div>;
 const group=methodGroups.find(g=>g.id===m.group),from=typeof location.state?.from==='string'&&location.state.from.startsWith('/methods')?location.state.from:'/methods';
 const topics=m.offeredFor.map(diagnosisById).filter((d):d is NonNullable<typeof d>=>!!d);
 return <div className="container"><PageHeader title={m.name} subtitle={m.summary} eyebrow={group?.title} backTo={from} backLabel="Что не помогает"/><div className="stack">
 <div className={'callout '+(m.verdict==='harmful'?'danger':m.verdict==='useless'?'warn':'')}><strong>{methodVerdictLabels[m.verdict]}</strong><p>{m.evidence}</p></div>
 <section className="card"><h2>Что обещают</h2><p style={{marginTop:10}}>{m.promise}</p></section>
 <section className="card"><h2>{m.verdict==='harmful'?'Чем опасно':'Чем вредит'}</h2><p style={{marginTop:10}}>{m.risks}</p></section>
 <section className="card soft"><h2>Что помогает вместо этого</h2><p style={{marginTop:10}}>{m.instead}</p></section>
 <section className="card"><h2>Если это назначил врач</h2><ul>{ifPrescribed[m.verdict].map(x=><li key={x}>{x}</li>)}</ul><h3 style={{marginTop:16}}>Что спросить</h3>{methodQuestions(m).map(q=><div className="question" key={q}><p>{q}</p><QuestionButton question={q} compact/></div>)}</section>
 {topics.length>0&&<section className="card"><h2>Когда это обычно предлагают</h2><p className="small muted">Откройте тему, чтобы посмотреть, какая помощь при ней действительно работает.</p><div className="pickChips" style={{marginTop:12}}>{topics.map(d=><Link key={d.id} className="pickChip" to={'/diagnoses/'+d.id+'?tab=help'}>{dxName(d)}</Link>)}</div></section>}
 <Sources items={m.sources} updatedAt={m.updatedAt}/>
 <p className="small muted">Не отменяйте лекарства и занятия, которые уже помогают, без разговора с врачом. Справочник помогает задать вопросы и не тратить время на то, что не работает.</p>
 </div></div>;
}
