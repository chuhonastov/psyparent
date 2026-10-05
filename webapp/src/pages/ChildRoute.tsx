import React,{useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import DiagnosisPicker from '../components/DiagnosisPicker';
import {ChildForm} from './Children';
import {useActiveChild,useRouteData} from '../lib/useRoute';
import {addCustomItem,addDoctor,addGoal,removeCustomItem,removeDoctor,removeGoal,saveProfile,toggleTracked,Doctor,GoalMeasure,MAX_CUSTOM,MAX_DOCTORS,MAX_GOALS} from '../lib/profile';
import {activeCourses,dayNumber} from '../lib/treatment';
import {checkInPlan,monitorItems,monitorNumbers,setForMed,summarizeCheckIn} from '../lib/monitoring';
import {childScreenings,dayMonth,changeReport,reportIsEmpty} from '../lib/route';
import {ageLabel} from '../lib/children';
import {diagnosisById,dxName,specialists} from '../lib/content';
import {journalTemplates} from '../lib/journalContent';
import {screenerById} from '../lib/screeningContent';
import {countdownLabel,daysUntil,formatAppointment} from '../lib/appointment';
import {toast} from '../lib/toast';
import {getPlan,planFilled} from '../lib/safety';
import {childAge} from '../lib/children';
import {routeForDiagnosis} from '../lib/navigator';
import {plural} from '../lib/plural';
const TRACKED_JOURNALS=['sleep','behavior','tolerability','anxiety','mood','tics','rituals','eating','toileting','communication'];

function Goals({childId,goals}:{childId:string;goals:{id:string;text:string;measure:GoalMeasure}[]}){
 const [text,setText]=useState(''),[measure,setMeasure]=useState<GoalMeasure>('severity');
 const add=(e:React.FormEvent)=>{e.preventDefault();if(addGoal(childId,text,measure)){setText('');toast('Цель добавлена');}};
 return <section className="card" id="goals"><h2>Что хотим изменить</h2><p className="small muted">{goals.length?'Короткий опрос будет спрашивать, как это меняется.':'Начните с одной главной цели своими словами — того, что сейчас важнее всего для семьи.'}</p>
  {goals.length>0&&<ul className="plainList">{goals.map(g=><li key={g.id}><span>{g.text}<span className="small muted"> · {g.measure==='count'?'сколько раз за неделю':'насколько выражено'}</span></span><button type="button" className="iconButton" aria-label={'Убрать цель «'+g.text+'»'} onClick={()=>removeGoal(childId,g.id)}><Icon name="close" size={15}/></button></li>)}</ul>}
  {goals.length<MAX_GOALS&&<form onSubmit={add} style={{marginTop:14}}><label className="fieldLabel" htmlFor="goal-text">Новая цель</label><input className="input" id="goal-text" maxLength={120} placeholder="Например: тревога перед школой, вспышки злости" value={text} onChange={e=>setText(e.target.value)}/>
   <div className="optionRow" role="radiogroup" aria-label="Как отмечать" style={{marginTop:10}}><label className={measure==='severity'?'selected':''}><input type="radio" name="goal-measure" checked={measure==='severity'} onChange={()=>setMeasure('severity')}/>Насколько выражено</label><label className={measure==='count'?'selected':''}><input type="radio" name="goal-measure" checked={measure==='count'} onChange={()=>setMeasure('count')}/>Сколько раз</label></div>
   <button className="btn secondary full" style={{marginTop:10}} disabled={!text.trim()}><Icon name="plus" size={16}/>Добавить цель</button></form>}
 </section>;
}

function Tracking({data}:{data:NonNullable<ReturnType<typeof useRouteData>>}){
 const p=data.profile,current=activeCourses(data.events),[custom,setCustom]=useState('');
 const sets=[...new Map(current.map(c=>{const s=setForMed(c.medId);return [s.id,{set:s,meds:current.filter(x=>setForMed(x.medId).id===s.id).map(x=>x.label)}] as const;})).values()];
 return <section className="card" id="tracking"><h2>Что отслеживаем</h2><p className="small muted">Отметьте то, что попросил отслеживать врач. Опасные признаки опрос спрашивает всегда.</p>
  {sets.map(({set,meds})=><fieldset className="plainFieldset" key={set.id}><legend className="fieldLabel">{meds.join(', ')}</legend>
   {[...set.items,...set.numbers].map(id=>{const item=monitorItems[id],number=monitorNumbers[id],label=item?.label||number?.label,always=item?.urgentAt!==undefined;
    return <label className="selectionCheck" key={id}><input type="checkbox" checked={always||p.tracking.items.includes(id)} disabled={always} onChange={e=>toggleTracked(data.child.id,'items',id,e.target.checked)}/><span>{label}{number&&<span className="small muted"> · {number.unit}</span>}{always&&<span className="small muted"> · всегда</span>}</span></label>;})}
  </fieldset>)}
  {!sets.length&&<p className="small" style={{marginTop:10}}>Когда вы добавите препарат в <Link to="/child/timeline?add=start">ленту</Link>, здесь появятся пункты, которые обычно отслеживают при нём.</p>}
  <fieldset className="plainFieldset"><legend className="fieldLabel">Свои наблюдения</legend>
   {p.tracking.custom.map(c=><div className="trackRow" key={c.id}><span>{c.label}</span><button type="button" className="iconButton" aria-label={'Убрать «'+c.label+'»'} onClick={()=>removeCustomItem(data.child.id,c.id)}><Icon name="close" size={15}/></button></div>)}
   {p.tracking.custom.length<MAX_CUSTOM&&<form className="inlineAdd" onSubmit={e=>{e.preventDefault();if(addCustomItem(data.child.id,custom))setCustom('');}}><input className="input" aria-label="Своё наблюдение" maxLength={80} placeholder="Например: кусает ногти" value={custom} onChange={e=>setCustom(e.target.value)}/><button className="btn secondary compact" disabled={!custom.trim()}>Добавить</button></form>}
  </fieldset>
  <fieldset className="plainFieldset"><legend className="fieldLabel">Дневники</legend><p className="small muted" style={{marginBottom:8}}>Выбранные появятся на экране «Сегодня», если за день нет записи.</p>
   <div className="pickChips">{journalTemplates.filter(t=>TRACKED_JOURNALS.includes(t.id)).map(t=><button type="button" key={t.id} className="pickChip" aria-pressed={p.tracking.journals.includes(t.id)} onClick={()=>toggleTracked(data.child.id,'journals',t.id,!p.tracking.journals.includes(t.id))}>{t.title}</button>)}</div>
  </fieldset>
 </section>;
}

function Doctors({childId,doctors}:{childId:string;doctors:Doctor[]}){
 const [adding,setAdding]=useState(false),[d,setD]=useState({name:'',role:'',phone:'',place:''});
 const save=(e:React.FormEvent)=>{e.preventDefault();if(addDoctor(childId,d)){setD({name:'',role:'',phone:'',place:''});setAdding(false);toast('Специалист добавлен');}};
 return <section className="card"><div className="cardHead"><h2>Мои специалисты</h2>{!adding&&doctors.length<MAX_DOCTORS&&<button type="button" className="textButton" onClick={()=>setAdding(true)}>Добавить</button>}</div><p className="small muted">Лечащий врач, психолог, логопед — где бы вы ни наблюдались. Их можно выбрать в памятке к приёму.</p>
  {doctors.length>0&&<ul className="plainList">{doctors.map(x=><li key={x.id}><span><strong>{x.name||'Без имени'}</strong>{(x.role||x.place)&&<span className="small muted"> · {[x.role,x.place].filter(Boolean).join(', ')}</span>}</span><span className="buttonRow" style={{flexWrap:'nowrap',gap:6}}>{x.phone&&<a className="btn secondary compact" href={'tel:'+x.phone.replace(/[^\d+]/g,'')}><Icon name="phone" size={14}/>{x.phone}</a>}<button type="button" className="iconButton" aria-label={'Удалить «'+(x.name||x.phone)+'»'} onClick={()=>removeDoctor(childId,x.id)}><Icon name="close" size={15}/></button></span></li>)}</ul>}
  {adding&&<form onSubmit={save} style={{marginTop:12}}><div className="contactRow"><input className="input" aria-label="Имя" placeholder="Имя" maxLength={80} value={d.name} onChange={e=>setD({...d,name:e.target.value})}/><input className="input" aria-label="Кто это" placeholder="Например, детский психиатр" maxLength={80} value={d.role} onChange={e=>setD({...d,role:e.target.value})}/></div><div className="contactRow"><input className="input" aria-label="Телефон" placeholder="Телефон" inputMode="tel" maxLength={40} value={d.phone} onChange={e=>setD({...d,phone:e.target.value})}/><input className="input" aria-label="Где принимает" placeholder="Где принимает" maxLength={120} value={d.place} onChange={e=>setD({...d,place:e.target.value})}/></div><div className="buttonRow" style={{marginTop:10}}><button className="btn compact" disabled={!d.name.trim()&&!d.phone.trim()}>Сохранить</button><button type="button" className="btn secondary compact" onClick={()=>setAdding(false)}>Отмена</button></div></form>}
  {!doctors.length&&!adding&&<p className="small" style={{marginTop:8}}>Добавьте лечащего врача — тогда его не придётся искать в телефоне перед приёмом или в трудную минуту.</p>}
 </section>;
}

export default function ChildRoute(){
 const child=useActiveChild(),data=useRouteData(child?.id),[addingDx,setAddingDx]=useState(false);
 const current=useMemo(()=>data?activeCourses(data.events):[],[data]);
 if(!child||!data)return <div className="container"><PageHeader title="Мой ребёнок" subtitle="Маршрут лечения одного ребёнка: препараты, цели, опросы и приёмы — вместо разрозненных записей." backTo="/" backLabel="Сегодня"/><ChildForm first onDone={()=>{}}/><div className="privacyNote"><Icon name="shield" size={16}/><span>Нужны только условное имя и месяц рождения. Фамилия и точная дата не нужны.</span></div></div>;
 const p=data.profile,last=data.checkIns[data.checkIns.length-1],plan=checkInPlan(p,current);
 const results=childScreenings(data.screenings,child).slice().sort((a,b)=>b.completedDate.localeCompare(a.completedDate)),latest=[...new Map(results.map(r=>[r.screenerId+r.respondent,r] as const)).values()].slice(0,4);
 const changes=changeReport(data),days=data.appointment?daysUntil(data.appointment.date):-1;
 const dxs=p.diagnoses.map(diagnosisById).filter((d):d is NonNullable<typeof d>=>!!d);
 return <div className="container"><PageHeader title={child.label} subtitle={[ageLabel(child),...dxs.map(dxName)].join(' · ')} eyebrow="Маршрут ребёнка" backTo="/" backLabel="Сегодня"/>
 <ChildSwitcher active={child}/>
 <div className="stack" style={{marginTop:16}}>
 <Goals childId={child.id} goals={p.goals}/>
 <section className="card"><div className="cardHead"><h2>Короткий опрос</h2>{data.checkIns.length>0&&<span className="small muted">{data.checkIns.length} {plural(data.checkIns.length,'опрос','опроса','опросов')}</span>}</div>
  <p className="small" style={{marginTop:8}}>{last?'Прошлый — '+dayMonth(last.date)+': '+summarizeCheckIn(last,p):'Цели и то, что врач просит отслеживать. Около минуты.'}</p>
  <div className="optionRow" role="radiogroup" aria-label="Как часто спрашивать" style={{marginTop:12}}>{([[7,'Раз в неделю'],[14,'Раз в 2 недели'],[0,'Перед приёмом']] as const).map(([v,l])=><label key={v} className={p.checkinEvery===v?'selected':''}><input type="radio" name="checkin-every" checked={p.checkinEvery===v} onChange={()=>saveProfile(child.id,{checkinEvery:v})}/>{l}</label>)}</div>
  <Link className="btn full" style={{marginTop:12}} to="/child/check-in"><Icon name="check" size={17}/>{plan.goals.length+plan.items.length?'Пройти опрос':'Настроить опрос'}</Link>
 </section>
 {current.length?<section className="card"><div className="cardHead"><h2>Лечение сейчас</h2><Link to="/child/timeline">Лента</Link></div>
  {current.length?<div className="courseList">{current.map(c=><div className="course" key={c.key}><div><h3>{c.label}</h3><p className="small">{c.dose||'Доза не указана'}</p><p className="small muted">{c.lastKind==='start'?'Начат':'Изменение'} {dayMonth(c.since)} · {dayNumber(c.since,data.today)}-й день</p></div>
   <div className="courseActions"><Link className="btn secondary compact" to={'/child/timeline?add=dose&med='+encodeURIComponent(c.key)}>Доза</Link><Link className="btn secondary compact" to={'/child/timeline?add=stop&med='+encodeURIComponent(c.key)}>Отменён</Link></div></div>)}</div>
  :<p className="small muted" style={{marginTop:8}}>Препараты не отмечены. Добавьте текущий — с датой начала и дозой из назначения.</p>}
  <div className="buttonRow" style={{marginTop:14}}><Link className="btn compact" to="/child/timeline?add=start"><Icon name="plus" size={16}/>Препарат</Link><Link className="btn secondary compact" to="/child/timeline?add=effect">Записать изменение</Link></div>
 </section>
  :<Link to="/child/timeline?add=start" className="screeningHistoryLink"><span className="actionIcon"><Icon name="pill"/></span><span><strong>Если назначены лекарства</strong><span className="small muted">Отметьте препарат с дозой из назначения — опрос будет спрашивать то, что при нём важно</span></span><Icon name="arrow" size={18}/></Link>}
 <section className="card"><div className="cardHead"><h2>Диагнозы</h2>{!addingDx&&<button type="button" className="textButton" onClick={()=>setAddingDx(true)}>Добавить</button>}</div><p className="small muted">Из заключения врача — чтобы справочник и подсказки были про вашего ребёнка.</p>
  {dxs.length>0&&<div className="pickChips" style={{marginTop:12}}>{dxs.map(d=><span className="chipWithRemove" key={d.id}><Link className="pickChip" to={'/diagnoses/'+d.id}>{dxName(d)}</Link><button type="button" className="chipRemove" aria-label={'Убрать «'+dxName(d)+'»'} onClick={()=>saveProfile(child.id,pr=>({diagnoses:pr.diagnoses.filter(x=>x!==d.id)}))}><Icon name="close" size={13}/></button></span>)}</div>}
  {addingDx&&<div style={{marginTop:12}}><DiagnosisPicker label="Какой диагноз указан в заключении?" value="" onChange={id=>{if(id)saveProfile(child.id,pr=>({diagnoses:[...pr.diagnoses,id]}));setAddingDx(false);}}/></div>}
 </section>
 <section className="card"><h2>Специалисты и занятия</h2><p className="small muted">С кем ребёнок занимается сейчас.</p>
  <div className="pickChips" style={{marginTop:12}}>{specialists.map(s=><button type="button" key={s.id} className="pickChip" aria-pressed={p.specialists.includes(s.id)} onClick={()=>saveProfile(child.id,pr=>({specialists:pr.specialists.includes(s.id)?pr.specialists.filter(x=>x!==s.id):[...pr.specialists,s.id]}))}>{s.shortTitle}</button>)}</div>
  {p.specialists.length>0&&<p className="small" style={{marginTop:12}}>Чем помогает каждый — в <Link to="/specialists">разделе специалистов</Link>.</p>}
 </section>
 <Doctors childId={child.id} doctors={p.doctors}/>
 <Tracking data={data}/>
 <section className="card"><div className="cardHead"><h2>Тесты и шкалы</h2><Link to="/screenings">Все тесты</Link></div>
  {latest.length?<ul className="plainList">{latest.map(r=><li key={r.id}><Link to={'/screenings/result/'+r.id}>{screenerById(r.screenerId)?.name}</Link><span className="small muted">{r.score.total} из {r.score.max} · {dayMonth(r.completedDate)}</span></li>)}</ul>
  :<p className="small muted" style={{marginTop:8}}>Пока нет результатов с именем «{child.label}». Повторные тесты раз в 1–2 месяца показывают, как меняется состояние.</p>}
  <Link className="btn secondary compact" style={{marginTop:12}} to="/screenings/send"><Icon name="share" size={15}/>Форма для учителя</Link>
 </section>
 <Link to="/child/documents" className="screeningHistoryLink"><span className="actionIcon"><Icon name="note"/></span><span><strong>Документы</strong><span className="small muted">{data.docs?.length?data.docs.length+' '+plural(data.docs.length,'документ','документа','документов')+' · заключения, ПМПК, обследования':'Заключения, ПМПК, ЭЭГ, анализы, выписки — фото или PDF'}</span></span><Icon name="arrow" size={18}/></Link>
 {(()=>{const routes=[...new Map(p.diagnoses.map(routeForDiagnosis).filter((r):r is NonNullable<typeof r>=>!!r).map(r=>[r.id,r] as const)).values()];return routes.length>0&&<section className="card"><h2>Маршрут в России</h2><p className="small muted">Специалисты, ПМПК, школа, инвалидность и документы — по шагам.</p><div className="pickChips" style={{marginTop:12}}>{routes.map(r=><Link key={r.id} className="pickChip" to={'/navigator/'+r.id}>{r.title}</Link>)}</div></section>;})()}
 {(()=>{const filled=planFilled(getPlan(child.id)),teen=childAge(child).years>=10;return (filled||teen)&&<Link to="/child/safety" className="screeningHistoryLink"><span className="actionIcon"><Icon name="shield"/></span><span><strong>План безопасности</strong><span className="small muted">{filled?'Признаки, кому звонить, безопасный дом — открыть или отправить':'На случай кризиса: заполните заранее, вместе с подростком'}</span></span><Icon name="arrow" size={18}/></Link>;})()}
 <section className="card soft"><h2>{data.appointment&&days>=0?'Приём '+countdownLabel(days):'Следующий приём'}</h2><p className="small" style={{marginTop:8}}>{data.appointment&&days>=0?formatAppointment(data.appointment):'Дату можно указать в памятке к приёму.'}</p>
  <div className="buttonRow" style={{marginTop:12}}><Link className="btn compact" to="/visit/changes">Что изменилось{reportIsEmpty(changes)?'':' · '+changes.weeks+' нед.'}</Link><Link className="btn secondary compact" to="/visit">Памятка</Link></div>
 </section>
 </div>
 <div className="privacyNote"><Icon name="shield" size={16}/><span>Профиль, лента и опросы хранятся на вашем устройстве и попадают в резервную копию. <Link to="/about#storage">Где хранятся записи</Link></span></div>
 </div>;
}
