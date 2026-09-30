import React,{useMemo} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import Icon,{IconName} from '../components/Icon';
import {useVisitCount} from '../lib/useVisitCount';
import {useAppointment} from '../lib/useAppointment';
import {useRecent} from '../lib/useRecent';
import {clearRecent,resolveRecent,RecentItem} from '../lib/recent';
import {countdownLabel,daysUntil,formatAppointment} from '../lib/appointment';
import {searchEverything,SearchGroup} from '../lib/globalSearch';
import {recentTone,Tone} from '../lib/tones';
import {count as counted} from '../lib/plural';
import {leaves,medications,specialists} from '../lib/content';
import {screeners} from '../lib/screeningContent';
import {journalTemplates} from '../lib/journalContent';
import meta from '../content/meta.json';
const popular=[['СДВГ','/diagnoses/adhd'],['Аутизм','/diagnoses/asd'],['Тревога и страхи','/diagnoses/group/anxiety'],['Депрессия','/diagnoses/depression'],['Стресс и травма','/diagnoses/group/stress'],['Питание','/diagnoses/group/eating_disorders']];
const groupLook:Record<SearchGroup['id'],{tone:Tone;icon:IconName}>={topics:{tone:'blue',icon:'book'},medications:{tone:'green',icon:'pill'},specialists:{tone:'pink',icon:'heart'},screenings:{tone:'purple',icon:'check'},forms:{tone:'orange',icon:'clock'}};
const recentIcon:Record<RecentItem['kind'],IconName>={dx:'book',med:'pill',spec:'heart',scr:'check',form:'clock'};
// Two overlapping circles: a parent and a child.
const Mark=()=><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="11" cy="13" r="9" fill="var(--t-blue)"/><circle cx="20" cy="18" r="6.5" fill="var(--t-yellow)" stroke="var(--bg)" strokeWidth="2"/></svg>;
export default function Home() {
 const [params,setParams]=useSearchParams(),q=params.get('q')||'';
 const records=useVisitCount(),appointment=useAppointment(),recent=useRecent().map(resolveRecent).filter((r):r is RecentItem=>!!r).slice(0,4);
 const groups=useMemo(()=>searchEverything(q),[q]),found=groups.reduce((sum,g)=>sum+g.total,0);
 const setQuery=(value:string)=>setParams(value?{q:value}:{},{replace:true});
 const days=appointment?daysUntil(appointment.date):-1;
 const contents:{to:string;title:string;text:string;meta:string;tone:Tone;icon:IconName;marked?:boolean}[]=[
  {to:'/diagnoses',title:'Диагнозы и темы',text:'Что означает заключение и какая помощь бывает полезна',meta:counted(leaves.length,'тема','темы','тем'),tone:'blue',icon:'book'},
  {to:'/review',title:'Разобрать назначение',text:'Цель препарата, переносимость и вопросы врачу',meta:counted(medications.length,'карточка','карточки','карточек'),tone:'green',icon:'pill'},
  {to:'/specialists',title:'Специалисты и занятия',text:'Речь, эмоции, поведение, обучение',meta:String(specialists.length),tone:'pink',icon:'heart'},
  {to:'/screenings',title:'Тесты и шкалы',text:'Опросники по возрасту и задаче',meta:String(screeners.length),tone:'purple',icon:'check'},
  {to:'/forms',title:'Дневники наблюдений',text:'Сон, поведение, переносимость лечения',meta:String(journalTemplates.length),tone:'orange',icon:'clock'},
  {to:'/visit',title:'Памятка к приёму',text:'Вопросы и назначения одним текстом',meta:records?counted(records,'запись','записи','записей'):'',tone:'yellow',icon:'note',marked:records>0}
 ];
 return <div className="container">
 <header className="masthead"><div className="mastTop"><Link className="wordmark" to="/"><Mark/>PsyParent</Link><Link to="/about">О проекте</Link></div>
 <h1>Справочник для родителей после приёма детского психиатра</h1><p className="mastBy">Автор — {meta.author}, детский психиатр</p></header>
 <div className="homeSearch" role="search"><Icon name="search"/><input className="input" type="search" enterKeyHint="search" aria-label="Поиск по справочнику" placeholder="Поиск по справочнику" value={q} onChange={e=>setQuery(e.target.value)}/>{q&&<button className="clearSearch" type="button" aria-label="Очистить поиск" onClick={()=>setQuery('')}><Icon name="close" size={17}/></button>}</div>
 {q.trim()?<>
 <p className="searchMeta" role="status">{found?'Найдено: '+found:'Ничего не нашлось'}</p>
 {groups.map(g=><section className="searchGroup" key={g.id} aria-label={g.title} data-tone={groupLook[g.id].tone}><h2 className="blockTitle"><span className="tile small"><Icon name={groupLook[g.id].icon} size={17}/></span>{g.title}<span>{g.total}</span></h2>
 <div className="list">{g.hits.map(h=><Link className="listCard" key={h.id} to={h.to}><div className="listMain">{h.label&&<span className="tag">{h.label}</span>}<h3>{h.title}</h3><p>{h.note}</p></div><Icon name="arrow" size={16}/></Link>)}</div>
 {g.total>g.hits.length&&<Link className="searchMore" to={g.moreTo}>Показать все: {g.total}</Link>}</section>)}
 {!found&&<div className="emptyState"><h3>В справочнике нет такого названия</h3><p>Попробуйте название из заключения, действующее вещество с упаковки или более короткое слово. Вопрос можно записать в памятку.</p><Link className="btn secondary" to="/visit">Записать вопрос врачу</Link></div>}
 </>:<>
 <p className="searchHint">Можно искать по торговому названию, сокращению или коду из заключения, например «Минирин», «ПТСР» или «F42».</p>
 {(days>=0||records>0)&&<Link className="noteStrip" to="/visit" data-tone="yellow"><span className="tile"><Icon name={days>=0?'calendar':'note'} size={21}/></span><div>{days>=0&&appointment?<><strong>Приём {countdownLabel(days)}</strong><span>{formatAppointment(appointment)}{records?' · в памятке '+counted(records,'запись','записи','записей'):''}</span></>:<><strong>В памятке {counted(records,'запись','записи','записей')}</strong><span>Можно продолжить и указать дату приёма</span></>}</div><Icon name="arrow" size={18}/></Link>}
 <h2 className="blockTitle">Разделы</h2>
 <ul className="toc">{contents.map(c=><li key={c.to} data-tone={c.tone}><Link className="tocRow" to={c.to}><span className="tile"><Icon name={c.icon} size={21}/></span><h3>{c.title}</h3><p>{c.text}</p><span className="tocSide">{c.meta&&<span className={'tocCount'+(c.marked?' marked':'')}>{c.meta}</span>}<Icon name="arrow" size={16}/></span></Link></li>)}</ul>
 {!!recent.length&&<section aria-label="Недавно открытые"><h2 className="blockTitle">Недавно открытые<button type="button" onClick={()=>clearRecent()}>Очистить</button></h2>
 <div className="list recentList">{recent.map(r=><Link className="listCard" key={r.kind+r.id} to={r.to} data-tone={recentTone[r.kind]}><span className="tile small"><Icon name={recentIcon[r.kind]} size={17}/></span><div className="listMain"><h3>{r.title}</h3><p>{r.label}</p></div><Icon name="arrow" size={16}/></Link>)}</div></section>}
 <h2 className="blockTitle">Частые темы<Link to="/diagnoses">Все темы</Link></h2>
 <div className="inlineLinks">{popular.map(([title,to])=><Link className="topic" key={to} to={to}>{title}</Link>)}</div>
 </>}
 <footer className="homeFoot"><p className="urgentLine"><span>Если есть непосредственная опасность, звоните <a href="tel:112">112</a>. <Link to="/help">Когда нельзя ждать</Link></span></p><Link to="/about">О проекте, ваших данных и настройках чтения</Link><p>{meta.disclaimer}</p></footer>
 </div>;
}
