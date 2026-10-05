import React,{useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import {useActiveChild,useRouteData} from '../lib/useRoute';
import {activeRuns,extendPlan,finishPlan,planById,planDay,plansFor,plansNote,plansSource,planTrend,runFor,startPlan,toggleStep,PLAN_DAYS} from '../lib/plans';
import {scaleLabels} from '../lib/monitoring';
import {ageLabel} from '../lib/children';
import {localDate} from '../lib/screenings';
import {toast} from '../lib/toast';
const value=(measure:'count'|'severity',v:number)=>measure==='count'?v+' за неделю':(scaleLabels[v]||'').toLocaleLowerCase('ru');

/** The catalogue: plans that fit the child's diagnoses first, running ones on top. */
export default function Plans(){
 const child=useActiveChild(),data=useRouteData(child?.id),list=plansFor(data?.profile.diagnoses||[]),running=data?activeRuns(data.profile):[];
 return <div className="container"><PageHeader title="Мини-планы" subtitle="Две недели на одну трудность: несколько понятных шагов и одна цель в коротком опросе — чтобы увидеть, что изменилось." eyebrow={child?child.label+', '+ageLabel(child):undefined} backTo={child?'/child':'/library'} backLabel={child?'Ребёнок':'Справочник'}/>
 {child&&<ChildSwitcher active={child} manage={false}/>}
 {running.length>0&&<><div className="sectionHeading"><h2>Сейчас</h2></div><div className="list">{running.map(r=>{const p=planById(r.planId)!,{day,over}=planDay(r,data!.today);return <Link key={r.id} className="listCard" to={'/plans/'+p.id}><div className="listMain"><h3>{p.title}</h3><p>{over?'Две недели прошли — посмотрите итог':'День '+day+' из '+PLAN_DAYS}</p></div><Icon name="arrow" size={17}/></Link>;})}</div></>}
 <div className="sectionHeading"><h2>{running.length?'Другие планы':'Выберите трудность'}</h2></div>
 <div className="list">{list.filter(p=>!running.some(r=>r.planId===p.id)).map(p=><Link key={p.id} className="listCard" to={'/plans/'+p.id}><div className="listMain"><h3>{p.title}</h3><p>{p.short} · {p.ages}</p></div><Icon name="arrow" size={17}/></Link>)}</div>
 <p className="small muted" style={{marginTop:16}}>{plansNote}</p>
 </div>;
}

export function PlanDetail(){
 const {id=''}=useParams(),plan=planById(id),child=useActiveChild(),data=useRouteData(child?.id),today=localDate();
 const [goalText,setGoalText]=useState(plan?.goal.text||'');
 if(!plan)return <div className="container"><PageHeader title="План не найден" backTo="/plans" backLabel="Мини-планы"/><Link className="btn" to="/plans">Все планы</Link></div>;
 const run=data?runFor(data.profile,plan.id):undefined,active=run?.status==='active'?run:undefined,state=active?planDay(active,today):null;
 const trend=run&&data?planTrend(run,data.checkIns):null,goal=run&&data?data.profile.goals.find(g=>g.id===run.goalId):undefined,measure=goal?.measure||plan.goal.measure;
 const start=()=>{if(!child)return;const r=startPlan(child.id,plan.id,today,plan.editGoal?goalText:undefined);if(r){toast('План начат. Цель добавлена в короткий опрос');window.scrollTo(0,0);}else toast('Не удалось начать: в профиле уже 6 целей. Уберите одну в профиле ребёнка.',{variant:'error',durationMs:5000});};
 // One answer is a starting point, not a trend.
 const trendLine=!trend||trend.last===undefined||trend.first===undefined?null:trend.answers<2?'сейчас: '+value(measure,trend.last):value(measure,trend.first)+' → '+value(measure,trend.last)+(trend.last<trend.first?' — лучше':trend.last>trend.first?' — пока хуже':' — без изменений');
 return <div className="container"><PageHeader title={plan.title} subtitle={plan.short+' · '+plan.ages} eyebrow="Мини-план на две недели" backTo="/plans" backLabel="Мини-планы"/>
 {child&&<ChildSwitcher active={child} manage={false}/>}
 <div className="stack">
  {active&&state&&(state.over
   ?<section className="card soft"><h2>Две недели прошли</h2><p style={{marginTop:8}}>{trendLine?'«'+(goal?.text||plan.goal.text)+'»: '+trendLine+'.':'В коротких опросах нет ответов про эту цель — отметьте неделю, чтобы увидеть результат.'}</p><p className="small muted" style={{marginTop:6}}>Перемены идут волнами: если сейчас не видно разницы, это не значит, что план не работает.</p>
     <div className="buttonRow" style={{marginTop:12}}><button className="btn" onClick={()=>{extendPlan(child!.id,active.id,today);toast('Продолжаем ещё две недели');}}>Продолжить ещё 2 недели</button><button className="btn secondary" onClick={()=>{finishPlan(child!.id,active.id,today);toast('План завершён');}}>Завершить</button></div></section>
   :<section className="card soft"><div className="cardHead"><h2>День {state.day} из {PLAN_DAYS}</h2><Link to="/child/check-in">Опрос</Link></div><p className="small" style={{marginTop:6}}>Цель в коротком опросе: «{goal?.text||plan.goal.text}»{trendLine?' · '+trendLine:''}.</p></section>)}
  <section className="card"><h2>Почему так бывает</h2><p style={{marginTop:8}}>{plan.why}</p></section>
  {plan.weeks.map((w,i)=><section className={'card planWeek'+(state&&!state.over&&state.week===i?' current':'')} key={w.title}><div className="eyebrow">Неделя {i+1}</div><h2>{w.title}</h2>
   <ul className="planSteps">{w.steps.map(s=><li key={s.id}>{active?<label className="selectionCheck"><input type="checkbox" checked={active.done.includes(s.id)} onChange={()=>toggleStep(child!.id,active.id,s.id)}/><span>{s.text}</span></label>:<span>{s.text}</span>}</li>)}</ul></section>)}
  {!active&&<section className="card">{child
   ?<>{run&&<p className="small muted" style={{marginBottom:10}}>{run.status==='done'?'План был завершён':'План был остановлен'} {run.endedAt?new Date(run.endedAt+'T12:00:00').toLocaleDateString('ru-RU'):''}{trendLine?': '+trendLine:''}.</p>}
     {plan.editGoal&&<div className="formField"><label className="fieldLabel" htmlFor="plan-goal">Что будем отмечать в опросе</label><input className="input" id="plan-goal" maxLength={120} value={goalText} onChange={e=>setGoalText(e.target.value)}/><p className="small muted">Назовите конкретный страх, например: «Страх спать одному».</p></div>}
     {!plan.editGoal&&<p className="small" style={{marginBottom:10}}>Цель в коротком опросе: «{plan.goal.text}» — {plan.goal.measure==='count'?'сколько раз за неделю':'насколько выражено'}. Раз в неделю приложение напомнит ответить.</p>}
     <button className="btn full" onClick={start}><Icon name="plus" size={17}/>{run?'Начать снова':'Начать на 2 недели'} — {child.label}</button></>
   :<><p>Чтобы отмечать шаги и видеть, что меняется, добавьте ребёнка — нужны только имя и месяц рождения.</p><Link className="btn" style={{marginTop:10}} to="/child">Добавить ребёнка</Link></>}</section>}
  {active&&<button type="button" className="textButton" onClick={()=>{if(window.confirm('Остановить план «'+plan.title+'»? Цель останется в опросе — её можно убрать в профиле ребёнка.')){finishPlan(child!.id,active.id,today,'stopped');toast('План остановлен');}}}>Остановить план</button>}
  <div className="callout warn"><strong>Когда к врачу</strong>{plan.doctor.map(x=><p key={x} className="small">{x}</p>)}</div>
  <p className="small muted">{plansSource}</p>
 </div></div>;
}
