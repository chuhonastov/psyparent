import React,{useState} from 'react';
import Icon from './Icon';
import {beforeVisitReminder,checkinReminder,planReminder,weekdayOf,WEEKDAYS} from '../lib/reminders';
import {saveWithNotice} from '../lib/files';
import {daysUntil,Appointment} from '../lib/appointment';
import {isTelegram} from '../lib/twa';
import {localDate} from '../lib/screenings';
import type {Child} from '../lib/children';
import type {CheckinEvery} from '../lib/profile';
import type {PlanContent,PlanRun} from '../lib/plans';
const NOTE='Напоминание будет в календаре телефона — изменить или удалить его можно там. «Кора» ничего не хранит на сервере.';
const save=(content:string,name:string)=>saveWithNotice({kind:'file',name,type:'text/calendar',content},'Файл календаря сохранён — откройте его, чтобы добавить напоминание');
function Time({value,onChange,id}:{value:string;onChange:(v:string)=>void;id:string}){
 return <div className="formField" style={{marginTop:10}}><label className="fieldLabel" htmlFor={id}>Во сколько</label><input className="input narrowInput" id={id} type="time" value={value} onChange={e=>onChange(e.target.value||'20:00')}/></div>;
}
/** «Напомнить об опросе» — a repeating event in the phone's calendar, or one before the visit. */
export function CheckinReminder({child,every,appointment}:{child:Child;every:CheckinEvery;appointment:Appointment|null}){
 const today=localDate(),[open,setOpen]=useState(false),[day,setDay]=useState(6),[time,setTime]=useState('20:00');
 if(!open)return <button type="button" className="textButton reminderToggle" onClick={()=>setOpen(true)}><Icon name="calendar" size={15}/>Напоминать в календаре телефона</button>;
 const visit=appointment&&daysUntil(appointment.date)>=0?appointment:null;
 if(every===0&&!visit)return <p className="small muted" style={{marginTop:10}}>Укажите дату приёма в памятке — тогда календарь напомнит об опросе за 3 дня до него.</p>;
 const add=()=>save(every===0?beforeVisitReminder({childId:child.id,childLabel:child.label,appointment:visit!,time,today,telegram:isTelegram()}):checkinReminder({childId:child.id,childLabel:child.label,weekday:day,time,every,today,telegram:isTelegram()}),'Kora-opros.ics');
 return <div className="reminderBox">
  {every===0?<p className="small">Напоминание за 3 дня до приёма.</p>
  :<fieldset className="plainFieldset"><legend className="fieldLabel">{every===14?'День недели (раз в 2 недели)':'День недели'}</legend><div className="pickChips">{WEEKDAYS.map((w,i)=><button type="button" key={w} className="pickChip" aria-pressed={day===i} onClick={()=>setDay(i)}>{w}</button>)}</div></fieldset>}
  <Time id="checkin-reminder-time" value={time} onChange={setTime}/>
  <button type="button" className="btn compact" onClick={add}><Icon name="calendar" size={15}/>Добавить в календарь</button>
  <p className="small muted" style={{marginTop:8}}>{NOTE}{every!==0&&weekdayOf(today)===day?' Первое напоминание — сегодня.':''}</p>
 </div>;
}
/** A daily reminder for the rest of a running mini-plan. */
export function PlanReminder({plan,run}:{plan:PlanContent;run:PlanRun}){
 const [open,setOpen]=useState(false),[time,setTime]=useState('20:00');
 if(!open)return <button type="button" className="textButton reminderToggle" onClick={()=>setOpen(true)}><Icon name="calendar" size={15}/>Напоминать каждый день в календаре</button>;
 return <div className="reminderBox"><Time id="plan-reminder-time" value={time} onChange={setTime}/>
  <button type="button" className="btn compact" onClick={()=>save(planReminder({plan,run,time,today:localDate(),telegram:isTelegram()}),'Kora-plan.ics')}><Icon name="calendar" size={15}/>Добавить в календарь до конца плана</button>
  <p className="small muted" style={{marginTop:8}}>{NOTE}</p></div>;
}
