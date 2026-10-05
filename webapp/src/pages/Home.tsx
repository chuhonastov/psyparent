import React,{useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import Icon from '../components/Icon';
import GlobalSearch from '../components/GlobalSearch';
import ChildSwitcher from '../components/ChildSwitcher';
import {useVisitCount} from '../lib/useVisitCount';
import {useRecent} from '../lib/useRecent';
import {clearRecent,resolveRecent,RecentItem} from '../lib/recent';
import {useScreenings} from '../lib/useScreenings';
import {useJournals} from '../lib/useJournals';
import {useActiveChild,useRouteData} from '../lib/useRoute';
import {todayItems} from '../lib/route';
import {ageLabel} from '../lib/children';
import {useAppointment} from '../lib/useAppointment';
import {countdownLabel,daysUntil,formatAppointment} from '../lib/appointment';
import {count as counted} from '../lib/plural';
import {isTelegram} from '../lib/twa';
import {backupReminderDue,isIOS,isStandalone,postponeBackupReminder} from '../lib/device';
/** Outside Telegram the records live only in this browser: a gentle reminder to keep a copy, and the Safari caveat on iPhone. */
function StorageReminder({hasRecords}:{hasRecords:boolean}){
 const [hidden,setHidden]=useState(false);
 if(hidden||isTelegram()||!backupReminderDue(hasRecords))return null;
 const safari=isIOS()&&!isStandalone();
 return <div className="callout warn storageReminder"><strong>{safari?'Safari может стереть записи':'Записи хранятся только в этом браузере'}</strong><p>{safari?'Если не открывать «Кору» неделю, Safari может удалить записи. Добавьте её на экран «Домой» или скачайте резервную копию.':'Скачайте резервную копию, чтобы не потерять их при очистке браузера или смене телефона.'}</p><div className="buttonRow" style={{marginTop:10,alignItems:'center'}}><Link className="btn secondary compact" to="/about#storage">Как сохранить</Link><button type="button" className="textButton" onClick={()=>{postponeBackupReminder();setHidden(true);}}>Напомнить позже</button></div></div>;
}
const WEEKDAYS=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const todayTitle=(d=new Date())=>WEEKDAYS[d.getDay()].replace(/^./,c=>c.toUpperCase())+', '+d.getDate()+' '+MONTHS[d.getMonth()];
/** "Today" for the chosen child: what is due now, computed from the family's own records. */
function Today(){
 const child=useActiveChild(),data=useRouteData(child?.id),items=useMemo(()=>data?todayItems(data):[],[data]),appointment=useAppointment(),count=useVisitCount(),days=appointment?daysUntil(appointment.date):-1;
 // Without a child profile the home screen keeps the memo strip: the reference works without a route.
 if(!child||!data)return <><section className="hero"><div className="heroMark"><Icon name="leaf" size={185}/></div><div className="eyebrow">Понятно о детской психиатрии</div><h1>После приёма<br/>хочется ясности.</h1><p>Разберитесь в диагнозе и назначениях. Ведите лечение ребёнка в одном месте — и приходите к врачу с готовой историей.</p><div className="heroFoot"><Icon name="shield" size={16}/>С опорой на научные данные</div></section>
  {(days>=0||count>0)&&<Link to="/visit" className="actionCard warm"><span className="actionIcon"><Icon name={days>=0?'calendar':'note'} size={23}/></span><div className="actionMain">{days>=0&&appointment?<><h3>Приём {countdownLabel(days)}</h3><p>{formatAppointment(appointment)}{count?'. В памятке '+counted(count,'запись','записи','записей')+'.':''}</p></>:<><h3>В памятке {counted(count,'запись','записи','записей')}</h3><p>Можно продолжить и указать дату приёма</p></>}</div><Icon name="arrow" size={18}/></Link>}
  <Link to="/child" className="actionCard primary routeStart"><span className="actionIcon"><Icon name="user" size={23}/></span><div className="actionMain"><h3>Начать маршрут ребёнка</h3><p>Препараты и дозы, цели, короткие опросы и сводка к приёму. Нужны только имя и месяц рождения.</p></div><Icon name="arrow" size={18}/></Link></>;
 return <section className="today" aria-labelledby="today-title">
  <div className="eyebrow">{todayTitle()}</div><h1 id="today-title">Сегодня · {child.label}, {ageLabel(child)}</h1>
  <ChildSwitcher active={child} manage={false}/>
  {items.length?<div className="todayList">{items.map(i=><Link key={i.id} to={i.to} className={'todayItem '+i.tone}><span className="todayIcon"><Icon name={i.icon} size={21}/></span><span className="todayMain"><strong>{i.title}</strong>{i.text&&<span>{i.text}</span>}</span><Icon name="arrow" size={17}/></Link>)}</div>
  :<div className="callout todayCalm"><strong>На сегодня дел нет</strong><p>Если что-то изменилось — запишите в ленту. Перед приёмом всё соберётся в сводку для врача.</p></div>}
  <div className="quickActions"><Link to="/child/timeline?add=effect"><Icon name="plus" size={18}/>В ленту</Link><Link to="/child/check-in"><Icon name="check" size={18}/>Опрос</Link><Link to="/visit"><Icon name="note" size={18}/>Вопрос врачу</Link></div>
 </section>;
}
export default function Home() {
 const [params]=useSearchParams(),q=params.get('q')||'';
 const count=useVisitCount(),screenings=useScreenings(),journals=useJournals(),recent=useRecent().map(resolveRecent).filter((r):r is RecentItem=>!!r).slice(0,3);
 return <div className="container">
 <div className="brandRow"><Link className="brand" to="/"><span className="brandMark"><Icon name="leaf" size={22}/></span>Кора</Link><Link className="releaseBadge" to="/about">Для родителей</Link></div>
 {!q.trim()&&<Today/>}
 {!q.trim()&&<StorageReminder hasRecords={count>0||screenings.length>0||journals.length>0}/>}
 <GlobalSearch hint="Можно писать торговое название или сокращение, например «Минирин» или «ПТСР».">
 <div className="libraryRow"><Link to="/diagnoses"><Icon name="book" size={20}/>Диагнозы</Link><Link to="/review"><Icon name="pill" size={20}/>Назначения</Link><Link to="/exams"><Icon name="flask" size={20}/>Обследования</Link><Link to="/specialists"><Icon name="heart" size={20}/>Специалисты</Link><Link to="/methods"><Icon name="alert" size={20}/>Что не помогает</Link><Link to="/library"><Icon name="arrow" size={20}/>Весь справочник</Link></div>
 {!!recent.length&&<><div className="sectionHeading"><h2>Вы недавно смотрели</h2><button type="button" className="textButton" onClick={()=>clearRecent()}>Очистить</button></div>
 <div className="list">{recent.map(r=><Link className="listCard compact" key={r.kind+r.id} to={r.to}><div className="listMain"><h3>{r.title}</h3><p>{r.label}</p></div><Icon name="arrow" size={17}/></Link>)}</div></>}
 </GlobalSearch>
 <Link to="/doctors" className="actionCard warm doctorsCta"><span className="actionIcon"><Icon name="user" size={23}/></span><div className="actionMain"><h3>Записаться к врачу</h3><p>Детские психиатры и психологи клиники. Запись на сайте клиники</p></div><Icon name="arrow" size={18}/></Link>
 <div className="authorCard"><span className="authorAvatar">СК</span><div><strong>Материалы Степана Краснощекова</strong><p>Детский психиатр.</p><p>Справочник помогает подготовиться к приёму.</p></div></div>
 <div className="footerLinks"><Link to="/about">О проекте и ваших данных</Link><Link to="/children">Мои дети</Link><Link to="/glossary">Словарь</Link><Link to="/about#reading">Размер текста</Link><Link className="urgentLink" to="/help">Когда нужна срочная помощь</Link></div>
 </div>;
}
