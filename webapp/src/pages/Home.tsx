import React,{useEffect,useMemo,useState} from 'react';
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
import {todayItems,addDays} from '../lib/route';
import {acknowledge,isSnoozed,snooze,snoozeKey} from '../lib/snooze';
import {ageLabel} from '../lib/children';
import {useAppointment} from '../lib/useAppointment';
import {countdownLabel,daysUntil,formatAppointment} from '../lib/appointment';
import {count as counted} from '../lib/plural';
import {isTelegram} from '../lib/twa';
import StatsPrompt from '../components/StatsPrompt';
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
const CHOICES:{to:string;icon:'book'|'pill'|'heart'|'note';title:string;text:string}[]=[
 {to:'/diagnoses',icon:'book',title:'Хочу понять диагноз',text:'Что означает заключение и чем можно помочь'},
 {to:'/review',icon:'pill',title:'Хочу разобраться в назначении',text:'Зачем назначили препарат, чего ждать, что спросить'},
 {to:'/difficulties',icon:'heart',title:'Хочу помочь с конкретной трудностью',text:'Сон, речь, истерики, тревога, школа — первый шаг'},
 {to:'/visit',icon:'note',title:'Готовлюсь к приёму',text:'Собрать вопросы и наблюдения для врача'},
];
/** "Today" for the chosen child: one main action and a few optional ones, each can be put off. */
function Today(){
 const child=useActiveChild(),data=useRouteData(child?.id),[tick,setTick]=useState(0),appointment=useAppointment(),count=useVisitCount(),days=appointment?daysUntil(appointment.date):-1;
 useEffect(()=>{const h=()=>setTick(t=>t+1);window.addEventListener('kora:snooze',h);return ()=>window.removeEventListener('kora:snooze',h);},[]);
 const items=useMemo(()=>data?todayItems(data).filter(i=>!isSnoozed(snoozeKey(data.child.id,i.id),data.today)):[],[data,tick]);
 // Without a child profile the home screen asks what the parent came for; the profile is offered, not required.
 if(!child||!data)return <><section className="hero"><div className="heroMark"><Icon name="leaf" size={185}/></div><div className="eyebrow">Понятно о детской психиатрии</div><h1>После приёма<br/>хочется ясности.</h1><p>Разберитесь в диагнозе и назначениях, найдите первый шаг при трудностях ребёнка и подготовьтесь к следующему приёму.</p><div className="heroFoot"><Icon name="shield" size={16}/>С опорой на научные данные</div></section>
  {(days>=0||count>0)&&<Link to="/visit" className="actionCard warm"><span className="actionIcon"><Icon name={days>=0?'calendar':'note'} size={23}/></span><div className="actionMain">{days>=0&&appointment?<><h3>Приём {countdownLabel(days)}</h3><p>{formatAppointment(appointment)}{count?'. В памятке '+counted(count,'запись','записи','записей')+'.':''}</p></>:<><h3>В памятке {counted(count,'запись','записи','записей')}</h3><p>Можно продолжить и указать дату приёма</p></>}</div><Icon name="arrow" size={18}/></Link>}
  <section aria-labelledby="start-title"><div className="sectionHeading"><h2 id="start-title">С чего начнём?</h2></div>
  <div className="actionGrid">{CHOICES.map((c,i)=><Link key={c.to} to={c.to} className={'actionCard'+(i===0?' primary':'')}><span className="actionIcon"><Icon name={c.icon} size={23}/></span><div className="actionMain"><h3>{c.title}</h3><p>{c.text}</p></div><Icon name="arrow" size={18}/></Link>)}</div></section>
  <Link to="/child" className="screeningHistoryLink routeStart"><span className="actionIcon"><Icon name="user"/></span><span><strong>Сохранять историю ребёнка</strong><span className="small muted">Когда захотите отмечать лечение, цели и изменения к приёму. Нужны только имя и месяц рождения.</span></span><Icon name="arrow" size={18}/></Link></>;
 const [main,...rest]=items;
 const later=(id:string,urgent?:boolean)=>{const key=snoozeKey(child.id,id);if(urgent)acknowledge(key,data.today);else snooze(key,addDays(data.today,1),data.today);};
 return <section className="today" aria-labelledby="today-title">
  <div className="eyebrow">{todayTitle()}</div><h1 id="today-title">Сегодня · {child.label}, {ageLabel(child)}</h1>
  <ChildSwitcher active={child} manage={false}/>
  {main?<div className={'todayMainCard '+main.tone}><Link to={main.to} className="todayMainLink"><span className="todayIcon"><Icon name={main.icon} size={22}/></span><span className="todayMain"><strong>{main.title}</strong>{main.text&&<span>{main.text}</span>}</span><Icon name="arrow" size={18}/></Link><button type="button" className="textButton todayLater" onClick={()=>later(main.id,main.tone==='danger')}>{main.tone==='danger'?'Уже связались с врачом':'Отложить на завтра'}</button></div>
  :<div className="callout todayCalm"><strong>На сегодня дел нет</strong><p>Если что-то изменилось — запишите в ленту. Перед приёмом всё соберётся в сводку для врача.</p></div>}
  {rest.length>0&&<><p className="small muted todayMore">Ещё можно, если есть силы:</p><div className="todayList">{rest.map(i=><div key={i.id} className={'todayItem compact '+i.tone}><Link to={i.to} className="todayItemLink"><span className="todayMain"><strong>{i.title}</strong>{i.text&&<span>{i.text}</span>}</span></Link><button type="button" className="iconButton" aria-label={'Отложить: '+i.title} title="Отложить" onClick={()=>later(i.id,i.tone==='danger')}><Icon name="close" size={15}/></button></div>)}</div></>}
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
 {!q.trim()&&<StatsPrompt/>}
 <GlobalSearch hint="Можно писать торговое название или сокращение, например «Минирин» или «ПТСР».">
 <div className="libraryRow"><Link to="/diagnoses"><Icon name="book" size={20}/>Диагнозы</Link><Link to="/review"><Icon name="pill" size={20}/>Назначения</Link><Link to="/exams"><Icon name="flask" size={20}/>Обследования</Link><Link to="/specialists"><Icon name="heart" size={20}/>Специалисты</Link><Link to="/methods"><Icon name="alert" size={20}/>Что не помогает</Link><Link to="/library"><Icon name="arrow" size={20}/>Весь справочник</Link></div>
 {!!recent.length&&<><div className="sectionHeading"><h2>Вы недавно смотрели</h2><button type="button" className="textButton" onClick={()=>clearRecent()}>Очистить</button></div>
 <div className="list">{recent.map(r=><Link className="listCard compact" key={r.kind+r.id} to={r.to}><div className="listMain"><h3>{r.title}</h3><p>{r.label}</p></div><Icon name="arrow" size={17}/></Link>)}</div></>}
 </GlobalSearch>
 <Link to="/doctors" className="actionCard warm doctorsCta"><span className="actionIcon"><Icon name="user" size={23}/></span><div className="actionMain"><h3>Записаться к врачу</h3><p>Детские психиатры и психологи клиники. Запись на сайте клиники</p></div><Icon name="arrow" size={18}/></Link>
 <div className="authorCard"><span className="authorAvatar">СК</span><div><strong>Материалы Степана Краснощекова</strong><p>Детский психиатр.</p><p>Справочник помогает подготовиться к приёму.</p></div></div>
 <div className="footerLinks"><Link to="/about">О проекте и ваших данных</Link><Link to="/feedback">Написать автору</Link><Link to="/children">Мои дети</Link><Link to="/glossary">Словарь</Link><Link to="/about#reading">Размер текста</Link><Link className="urgentLink" to="/help">Когда нужна срочная помощь</Link></div>
 </div>;
}
