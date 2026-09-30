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
export default function Home() {
 const [params,setParams]=useSearchParams(),q=params.get('q')||'';
 const count=useVisitCount(),appointment=useAppointment(),recent=useRecent().map(resolveRecent).filter((r):r is RecentItem=>!!r).slice(0,3);
 const groups=useMemo(()=>searchEverything(q),[q]),found=groups.reduce((sum,g)=>sum+g.total,0);
 const setQuery=(value:string)=>setParams(value?{q:value}:{},{replace:true});
 const days=appointment?daysUntil(appointment.date):-1;
 return <div className="container">
 <div className="brandRow"><Link className="brand" to="/"><span className="brandMark"><Icon name="leaf" size={22}/></span>PsyParent</Link><span className="releaseBadge">Для родителей</span></div>
 <section className="hero"><div className="heroMark"><Icon name="leaf" size={185}/></div><div className="eyebrow">Понятно о детской психиатрии</div><h1>После приёма<br/>хочется ясности.</h1><p>Разберитесь в диагнозе и назначениях. Сохраните вопросы, которые важно обсудить с врачом.</p><div className="heroFoot"><Icon name="shield" size={16}/>С опорой на научные данные</div></section>
 {(days>=0||count>0)&&<Link to="/visit" className="actionCard warm"><span className="actionIcon"><Icon name={days>=0?'calendar':'note'} size={23}/></span><div className="actionMain">{days>=0&&appointment?<><h3>Приём {countdownLabel(days)}</h3><p>{formatAppointment(appointment)}{count?'. В памятке '+counted(count,'запись','записи','записей')+'.':''}</p></>:<><h3>В памятке {counted(count,'запись','записи','записей')}</h3><p>Можно продолжить и указать дату приёма</p></>}</div><Icon name="arrow" size={18}/></Link>}
 <div className="sectionHeading"><h2>{q.trim()?'Результаты поиска':'Найти в справочнике'}</h2></div>
 <div className="searchWrap homeSearch" role="search"><Icon name="search"/><input className="input" type="search" enterKeyHint="search" aria-label="Поиск по справочнику" placeholder="Диагноз или препарат" value={q} onChange={e=>setQuery(e.target.value)}/>{q&&<button className="clearSearch" type="button" aria-label="Очистить поиск" onClick={()=>setQuery('')}><Icon name="close" size={17}/></button>}</div>
 {q.trim()?<>
 <p className="searchMeta" role="status">{found?'Найдено: '+found:'Ничего не нашлось'}</p>
 {groups.map(g=><section key={g.id} aria-label={g.title}><div className="sectionHeading"><h2>{g.title}</h2><span className="small muted">{g.total}</span></div>
 <div className="list">{g.hits.map(h=><Link className="listCard" key={h.id} to={h.to}><div className="listMain">{h.label&&<span className="tag">{h.label}</span>}<h3>{h.title}</h3><p>{h.note}</p></div><Icon name="arrow" size={17}/></Link>)}</div>
 {g.total>g.hits.length&&<Link className="searchMore" to={g.moreTo}>Показать все: {g.total}</Link>}</section>)}
 {!found&&<div className="emptyState"><Icon name="search" size={27}/><h3>В справочнике нет такого названия</h3><p>Попробуйте название из заключения, действующее вещество с упаковки или более короткое слово. Вопрос можно записать в памятку.</p><Link className="btn secondary" to="/visit">Записать вопрос врачу</Link></div>}
 </>:<>
 <p className="searchHint">Можно писать торговое название или сокращение, например «Минирин» или «ПТСР».</p>
 <div className="sectionHeading"><h2>С чего начнём?</h2></div>
 <div className="actionGrid">
 <Link to="/diagnoses" className="actionCard primary"><span className="actionIcon"><Icon name="book" size={23}/></span><div className="actionMain"><h3>Разобраться в диагнозе</h3><p>Что означает заключение и какая помощь бывает полезна</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/review" className="actionCard"><span className="actionIcon"><Icon name="pill" size={23}/></span><div className="actionMain"><h3>Разобрать назначения</h3><p>Цель препарата, наблюдение и вопросы врачу</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/specialists" className="actionCard"><span className="actionIcon"><Icon name="heart" size={23}/></span><div className="actionMain"><h3>Выбрать специалиста и занятия</h3><p>Кто помогает с речью, эмоциями, поведением и обучением</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/screenings" className="actionCard"><span className="actionIcon"><Icon name="check" size={23}/></span><div className="actionMain"><h3>Пройти скрининг</h3><p>Опросники по возрасту и результаты для визита к врачу</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/forms" className="actionCard"><span className="actionIcon"><Icon name="clock" size={23}/></span><div className="actionMain"><h3>Дневники и формы</h3><p>Сон, поведение, переносимость лечения и наблюдения за изменениями</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/visit" className="actionCard"><span className="actionIcon"><Icon name="note" size={23}/></span><div className="actionMain"><h3>Памятка к приёму</h3><p>{count?'Сохранённых записей: '+count+'. Можно продолжить.':'Соберите всё важное в одном месте'}</p></div><Icon name="arrow" size={18}/></Link>
 </div>
 {!!recent.length&&<><div className="sectionHeading"><h2>Вы недавно смотрели</h2><button type="button" className="textButton" onClick={()=>clearRecent()}>Очистить</button></div>
 <div className="list">{recent.map(r=><Link className="listCard compact" key={r.kind+r.id} to={r.to}><div className="listMain"><h3>{r.title}</h3><p>{r.label}</p></div><Icon name="arrow" size={17}/></Link>)}</div></>}
 <div className="sectionHeading"><h2>Частые темы</h2><Link to="/diagnoses">Все темы</Link></div>
 <div className="topics"><Link className="topic" to="/diagnoses/adhd">СДВГ</Link><Link className="topic" to="/diagnoses/asd">Аутизм</Link><Link className="topic" to="/diagnoses/group/anxiety">Тревога и страхи</Link><Link className="topic" to="/diagnoses/depression">Депрессия</Link><Link className="topic" to="/diagnoses/group/stress">Стресс и травма</Link><Link className="topic" to="/diagnoses/group/eating_disorders">Питание</Link></div>
 </>}
 <div className="authorCard"><span className="authorAvatar">СК</span><div><strong>Материалы Степана Краснощекова</strong><p>Детский психиатр.</p><p>Справочник помогает подготовиться к приёму.</p></div></div>
 <div className="footerLinks"><Link to="/about">О проекте и ваших данных</Link><Link to="/about#reading">Размер текста</Link><Link className="urgentLink" to="/help">Когда нужна срочная помощь</Link></div>
 </div>;
}
