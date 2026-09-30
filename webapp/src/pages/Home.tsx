import React,{useMemo} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import Icon from '../components/Icon';
import {useVisitCount} from '../lib/useVisitCount';
import {useAppointment} from '../lib/useAppointment';
import {useRecent} from '../lib/useRecent';
import {clearRecent,resolveRecent,RecentItem} from '../lib/recent';
import {countdownLabel,daysUntil,formatAppointment} from '../lib/appointment';
import {searchEverything} from '../lib/globalSearch';
import {count as counted} from '../lib/plural';
import {leaves,medications,specialists} from '../lib/content';
import {screeners} from '../lib/screeningContent';
import {journalTemplates} from '../lib/journalContent';
import meta from '../content/meta.json';
const popular=[['СДВГ','/diagnoses/adhd'],['Аутизм','/diagnoses/asd'],['Тревога и страхи','/diagnoses/group/anxiety'],['Депрессия','/diagnoses/depression'],['Стресс и травма','/diagnoses/group/stress'],['Питание','/diagnoses/group/eating_disorders']];
export default function Home() {
 const [params,setParams]=useSearchParams(),q=params.get('q')||'';
 const records=useVisitCount(),appointment=useAppointment(),recent=useRecent().map(resolveRecent).filter((r):r is RecentItem=>!!r).slice(0,4);
 const groups=useMemo(()=>searchEverything(q),[q]),found=groups.reduce((sum,g)=>sum+g.total,0);
 const setQuery=(value:string)=>setParams(value?{q:value}:{},{replace:true});
 const days=appointment?daysUntil(appointment.date):-1;
 const contents=[
  {to:'/diagnoses',title:'Диагнозы и темы',text:'Что означает заключение, как врач его обосновывает и какая помощь бывает полезна',meta:counted(leaves.length,'тема','темы','тем')},
  {to:'/review',title:'Разобрать назначение',text:'Цель препарата, наблюдение за переносимостью и вопросы лечащему врачу',meta:counted(medications.length,'карточка','карточки','карточек')},
  {to:'/specialists',title:'Специалисты и занятия',text:'Кто помогает с речью, эмоциями, поведением и обучением и как оценить пользу',meta:counted(specialists.length,'специалист','специалиста','специалистов')},
  {to:'/screenings',title:'Тесты и шкалы',text:'Опросники по возрасту и задаче; результат сохраняется для разговора с врачом',meta:counted(screeners.length,'инструмент','инструмента','инструментов')},
  {to:'/forms',title:'Дневники наблюдений',text:'Сон, поведение, переносимость лечения и другие изменения между приёмами',meta:counted(journalTemplates.length,'форма','формы','форм')},
  {to:'/visit',title:'Памятка к приёму',text:'Вопросы, наблюдения и назначения одним текстом: скопировать, скачать или отправить',meta:records?counted(records,'запись','записи','записей'):'пока пусто',marked:records>0}
 ];
 return <div className="container">
 <header className="masthead"><div className="mastTop"><Link className="wordmark" to="/">PsyParent</Link><Link to="/about">О проекте</Link></div>
 <h1>Справочник для родителей после приёма детского психиатра</h1><p className="mastBy">Автор — {meta.author}, детский психиатр</p></header>
 <div className="homeSearch" role="search"><Icon name="search"/><input className="input" type="search" enterKeyHint="search" aria-label="Поиск по справочнику" placeholder="Поиск по справочнику" value={q} onChange={e=>setQuery(e.target.value)}/>{q&&<button className="clearSearch" type="button" aria-label="Очистить поиск" onClick={()=>setQuery('')}><Icon name="close" size={17}/></button>}</div>
 {q.trim()?<>
 <p className="searchMeta" role="status">{found?'Найдено: '+found:'Ничего не нашлось'}</p>
 {groups.map(g=><section className="searchGroup" key={g.id} aria-label={g.title}><h2 className="blockTitle">{g.title}<span>{g.total}</span></h2>
 {g.hits.map(h=><Link className="listCard" key={h.id} to={h.to}><div className="listMain">{h.label&&<span className="tag">{h.label}</span>}<h3>{h.title}</h3><p>{h.note}</p></div><Icon name="arrow" size={16}/></Link>)}
 {g.total>g.hits.length&&<Link className="searchMore" to={g.moreTo}>Показать все: {g.total}</Link>}</section>)}
 {!found&&<div className="emptyState"><h3>В справочнике нет такого названия</h3><p>Попробуйте название из заключения, действующее вещество с упаковки или более короткое слово. Вопрос можно записать в памятку.</p><Link className="btn secondary" to="/visit">Записать вопрос врачу</Link></div>}
 </>:<>
 <p className="searchHint">Можно искать по торговому названию, сокращению или коду из заключения, например «Минирин», «ПТСР» или «F42».</p>
 {(days>=0||records>0)&&<Link className="noteStrip" to="/visit"><Icon name={days>=0?'calendar':'note'} size={22}/><div>{days>=0&&appointment?<><strong>Приём {countdownLabel(days)}</strong><span>{formatAppointment(appointment)}{records?' · в памятке '+counted(records,'запись','записи','записей'):''}</span></>:<><strong>В памятке {counted(records,'запись','записи','записей')}</strong><span>Можно продолжить и указать дату приёма</span></>}</div><Icon name="arrow" size={18}/></Link>}
 <h2 className="blockTitle">Содержание</h2>
 <ol className="toc">{contents.map((c,i)=><li key={c.to}><Link className="tocRow" to={c.to}><span className="tocNum">{String(i+1).padStart(2,'0')}</span><h3>{c.title}</h3><span className={'tocCount'+(c.marked?' marked':'')}>{c.meta}</span><p>{c.text}</p></Link></li>)}</ol>
 {!!recent.length&&<section aria-label="Недавно открытые"><h2 className="blockTitle">Недавно открытые<button type="button" onClick={()=>clearRecent()}>Очистить</button></h2>
 <div style={{marginBottom:30}}>{recent.map(r=><Link className="listCard" key={r.kind+r.id} to={r.to}><div className="listMain"><span className="tag neutral">{r.label}</span><h3>{r.title}</h3></div><Icon name="arrow" size={16}/></Link>)}</div></section>}
 <h2 className="blockTitle">Частые темы<Link to="/diagnoses">Все темы</Link></h2>
 <div className="inlineLinks">{popular.map(([title,to])=><Link className="topic" key={to} to={to}>{title}</Link>)}</div>
 </>}
 <footer className="homeFoot"><p className="urgentLine"><span>Если есть непосредственная опасность, звоните <a href="tel:112">112</a>. <Link to="/help">Когда нельзя ждать</Link></span></p><Link to="/about">О проекте, ваших данных и настройках чтения</Link><p>{meta.disclaimer}</p></footer>
 </div>;
}
