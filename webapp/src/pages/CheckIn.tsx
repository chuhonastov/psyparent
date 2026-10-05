import React,{useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ScalePick from '../components/ScalePick';
import Disclosure from '../components/Disclosure';
import ChildSwitcher from '../components/ChildSwitcher';
import {useActiveChild,useRouteData} from '../lib/useRoute';
import {checkInPlan,countLabel,missedLabels,planIsEmpty,saveCheckIn,scaleLabels,summarizeCheckIn,urgentAnswers,validateCheckIn,CheckIn as Record_} from '../lib/monitoring';
import {activeCourses} from '../lib/treatment';
import {ageLabel} from '../lib/children';
import {localDate} from '../lib/screenings';
import {dayMonth} from '../lib/route';
import {toast} from '../lib/toast';
import {useDraft} from '../lib/drafts';
import DraftNotice from '../components/DraftNotice';

export default function CheckIn(){
 const child=useActiveChild(),data=useRouteData(child?.id),today=localDate();
 const current=useMemo(()=>data?activeCourses(data.events):[],[data]);
 const plan=useMemo(()=>data?checkInPlan(data.profile,current):null,[data,current]);
 const [date,setDate]=useState(today),[goals,setGoals]=useState<Record<string,number>>({}),[counts,setCounts]=useState<Record<string,string>>({}),[items,setItems]=useState<Record<string,number>>({}),[numbers,setNumbers]=useState<Record<string,string>>({}),[missed,setMissed]=useState<number>(),[note,setNote]=useState(''),[errors,setErrors]=useState<string[]>([]),[saved,setSaved]=useState<Record_|null>(null);
 const draft=useDraft(child?'checkin.'+child.id:null,{date,goals,counts,items,numbers,missed,note},d=>{setDate(d.date);setGoals(d.goals);setCounts(d.counts);setItems(d.items);setNumbers(d.numbers);setMissed(d.missed);setNote(d.note);});
 if(!child||!data||!plan)return <div className="container"><PageHeader title="Короткий опрос" backTo="/child" backLabel="Ребёнок"/><div className="emptyState"><h3>Сначала добавьте ребёнка</h3><Link className="btn" to="/child">Добавить ребёнка</Link></div></div>;
 const header=<PageHeader title="Короткий опрос" subtitle="Как прошла последняя неделя. Около минуты — без медицинских чек-листов." eyebrow={child.label+', '+ageLabel(child)} backTo="/child" backLabel="Ребёнок"/>;
 if(saved){
  const urgent=urgentAnswers(saved);
  return <div className="container">{header}<div className="stack">
   {urgent.length?<div className="callout danger" role="alert"><strong>Свяжитесь с врачом, не дожидаясь приёма</strong><p>Вы отметили: {urgent.join(', ').toLocaleLowerCase('ru')}. Позвоните лечащему врачу сегодня. Если есть угроза жизни — 112.</p>{plan.urgent.map(x=><p key={x} className="small">{x}</p>)}<Link className="btn danger compact" style={{marginTop:12}} to="/help">Когда нельзя ждать</Link></div>
   :<div className="callout"><strong>Готово</strong><p>{summarizeCheckIn(saved,data.profile,plan)}</p></div>}
   <div className="buttonRow"><Link className="btn" to="/child/timeline">Открыть ленту</Link><Link className="btn secondary" to="/">На «Сегодня»</Link></div>
  </div></div>;
 }
 if(planIsEmpty(plan))return <div className="container">{header}<ChildSwitcher active={child} manage={false}/><div className="emptyState"><Icon name="check" size={27}/><h3>Опросу пока не о чем спросить</h3><p>Добавьте цели — что хочется изменить — или текущий препарат. Тогда опрос будет из нескольких коротких вопросов именно о вашем ребёнке.</p><div className="buttonRow" style={{justifyContent:'center'}}><Link className="btn" to="/child#goals">Добавить цели</Link><Link className="btn secondary" to="/child/timeline?add=start">Добавить препарат</Link></div></div></div>;
 const submit=(e:React.FormEvent)=>{
  e.preventDefault();
  const allGoals={...goals};for(const [id,v] of Object.entries(counts))if(v.trim()!=='')allGoals[id]=Number(v);
  const nums:Record<string,number>={};for(const [id,v] of Object.entries(numbers))if(v.trim()!=='')nums[id]=Number(v.replace(',','.'));
  const input={childId:child.id,date,goals:allGoals,items,numbers:nums,missed,note:note.trim()};
  const issues=[...validateCheckIn(input,plan,today),...Object.entries(counts).filter(([,v])=>v.trim()!==''&&!/^\d{1,3}$/.test(v.trim())).map(()=>'Число раз за неделю — целое число до 999.')];
  setErrors(issues);if(issues.length){window.scrollTo(0,0);return;}
  const rec=saveCheckIn(input);if(!rec){toast('Не удалось сохранить',{variant:'error'});return;}
  draft.clear();setSaved(rec);window.scrollTo(0,0);if(!urgentAnswers(rec).length)toast('Опрос сохранён');
 };
 const last=data.checkIns[data.checkIns.length-1];
 return <div className="container">{header}<ChildSwitcher active={child} manage={false}/>
 <form className="stack" noValidate onSubmit={submit}>
  {draft.pending&&<DraftNotice at={draft.pending.at} onRestore={draft.restore} onDiscard={draft.discard}/>}
  {errors.length>0&&<div className="callout danger" role="alert">{errors.map(x=><p key={x}>{x}</p>)}</div>}
  {last&&<p className="small muted">Прошлый опрос — {dayMonth(last.date)}. Можно ответить не на всё: пропуск не считается ответом «нет».</p>}
  <div className="formField"><label className="fieldLabel" htmlFor="checkin-date">Дата</label><input className="input" id="checkin-date" type="date" max={today} value={date} onChange={e=>setDate(e.target.value)}/></div>
  {plan.goals.length>0&&<section className="card"><h2>Цели</h2><p className="small muted">Насколько это было выражено за последнюю неделю.</p>
   {plan.goals.map(g=>g.measure==='count'?<div className="formField" key={g.id} style={{marginTop:16}}><label className="fieldLabel" htmlFor={'g-'+g.id}>{g.text} — сколько {countLabel}</label><input className="input narrowInput" id={'g-'+g.id} inputMode="numeric" value={counts[g.id]||''} onChange={e=>setCounts({...counts,[g.id]:e.target.value})}/></div>
    :<ScalePick key={g.id} name={'g-'+g.id} legend={g.text} labels={scaleLabels} value={goals[g.id]} onChange={v=>{const n={...goals};if(v===undefined)delete n[g.id];else n[g.id]=v;setGoals(n);}}/>)}
  </section>}
  {plan.items.length>0&&<section className="card"><h2>Самочувствие на лечении</h2><p className="small muted">То, что врач просит отслеживать при {current.length>1?'текущих препаратах':'текущем препарате'}{current.length?': '+current.map(c=>c.label).join(', '):''}.</p>
   {plan.items.map(i=><React.Fragment key={i.id}><ScalePick name={'i-'+i.id} legend={i.label} hint={i.hint} danger={i.urgentAt!==undefined} labels={scaleLabels} value={items[i.id]} onChange={v=>{const n={...items};if(v===undefined)delete n[i.id];else n[i.id]=v;setItems(n);}}/>
    {i.urgentAt!==undefined&&items[i.id]!==undefined&&items[i.id]>=i.urgentAt&&<div className="callout danger urgentNow" role="alert"><strong>Свяжитесь с врачом сегодня, не дожидаясь приёма</strong><p>Это тревожный признак. Если есть угроза жизни — 112. Опрос можно сохранить позже.</p><Link className="btn danger compact" style={{marginTop:10}} to="/help">Когда нельзя ждать</Link></div>}</React.Fragment>)}
  </section>}
  {(plan.numbers.length>0||plan.askMissed)&&<section className="card"><h2>Цифры и приём</h2>
   {plan.numbers.map(n=><div className="formField" key={n.id} style={{marginTop:14}}><label className="fieldLabel" htmlFor={'n-'+n.id}>{n.label}, {n.unit}</label><input className="input narrowInput" id={'n-'+n.id} inputMode="decimal" value={numbers[n.id]||''} onChange={e=>setNumbers({...numbers,[n.id]:e.target.value})}/></div>)}
   {plan.askMissed&&<ScalePick name="missed" legend="Пропуски приёма за неделю" labels={missedLabels} value={missed} onChange={setMissed}/>}
  </section>}
  <div className="formField"><label className="fieldLabel" htmlFor="checkin-note">Заметка (необязательно)</label><textarea id="checkin-note" maxLength={1000} placeholder="Что ещё важно: события недели, вопросы врачу" value={note} onChange={e=>setNote(e.target.value)}/></div>
  <button className="btn full">Сохранить опрос</button>
  {plan.labs.length>0&&<Disclosure title="Анализы и обследования, если их назначил врач">{plan.labs.map(l=><div key={l.title} style={{marginTop:10}}><h3>{l.title}</h3><ul className="small">{l.lines.map(x=><li key={x}>{x}</li>)}</ul></div>)}<p className="small muted">Сдали анализ — запишите результат в ленту как «Обследование или анализ».</p></Disclosure>}
  {plan.urgent.length>0&&<div className="callout warn"><strong>Когда не ждать опроса и приёма</strong>{plan.urgent.map(x=><p key={x} className="small">{x}</p>)}</div>}
  <p className="small muted">Вопросы можно поменять в профиле ребёнка: <Link to="/child#tracking">что отслеживаем</Link>.</p>
 </form></div>;
}
