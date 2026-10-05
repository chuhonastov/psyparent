import meta from '../content/meta.json';
import {daysLater,fold,icsText,stamp} from './appointment';
import type {Appointment} from './appointment';
import type {PlanContent,PlanRun} from './plans';
// Reminders without a server: a calendar file (.ics) the parent adds to the phone's calendar. The calendar reminds
// at the chosen time; the link in the event opens the right screen of Кора. Nothing about the family is stored anywhere else.
const BOT=(meta as {telegramBot?:string}).telegramBot||'psyparent_bot';
export const WEEKDAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const BYDAY=['MO','TU','WE','TH','FR','SA','SU'];
/** Monday = 0 … Sunday = 6. */
export const weekdayOf=(date:string)=>(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
/** The first date from today that falls on the weekday. */
export function nextWeekday(today:string,weekday:number){const shift=(weekday-weekdayOf(today)+7)%7;return daysLater(today,shift).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');}
/** Where the event link leads: into the mini app in Telegram (t.me/<bot>?startapp=…), otherwise to the page. */
export function reminderLink(target:{kind:'checkin';childId:string}|{kind:'plan';planId:string},telegram:boolean,origin=typeof window!=='undefined'?window.location.origin:'https://psyparent.vercel.app'){
 const param=target.kind==='checkin'?'checkin_'+target.childId:'plan_'+target.planId;
 if(telegram&&param.length<=512&&/^[\w-]+$/.test(param))return 'https://t.me/'+BOT+'?startapp='+param;
 return target.kind==='checkin'?origin+'/child/check-in?child='+encodeURIComponent(target.childId):origin+'/plans/'+target.planId;
}
/** Start parameters of reminder links; anything else is a teacher's answer. */
export function parseStartParam(p:string):{kind:'checkin';childId:string}|{kind:'plan';planId:string}|null{
 let m=/^checkin_([\w-]{1,80})$/.exec(p);if(m)return {kind:'checkin',childId:m[1]};
 m=/^plan_([a-z]{1,30})$/.exec(p);if(m)return {kind:'plan',planId:m[1]};
 return null;
}
type Event={uid:string;title:string;description:string;url:string;date:string;time:string;rrule?:string};
export function reminderIcs(events:Event[],now=new Date()){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Kora//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const e of events){
  const start=e.date.replace(/-/g,'')+'T'+e.time.replace(':','')+'00';
  lines.push('BEGIN:VEVENT','UID:'+e.uid+'@psyparent','DTSTAMP:'+stamp(now),'DTSTART:'+start,'DURATION:PT10M',
   ...(e.rrule?['RRULE:'+e.rrule]:[]),'SUMMARY:'+icsText(e.title),'DESCRIPTION:'+icsText(e.description+'\n'+e.url),'URL:'+e.url,
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsText(e.title),'TRIGGER:PT0M','END:VALARM','END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return lines.map(fold).join('\r\n')+'\r\n';
}
/** Weekly (or every two weeks) check-in on the chosen day and time. */
export function checkinReminder(o:{childId:string;childLabel:string;weekday:number;time:string;every:7|14;today:string;telegram:boolean}){
 const url=reminderLink({kind:'checkin',childId:o.childId},o.telegram);
 return reminderIcs([{uid:'checkin-'+o.childId+'-'+o.today.replace(/-/g,''),title:'Кора: короткий опрос — '+o.childLabel,description:'Как прошла неделя — около минуты. Открыть опрос:',url,date:nextWeekday(o.today,o.weekday),time:o.time,rrule:'FREQ=WEEKLY;INTERVAL='+(o.every===14?2:1)+';BYDAY='+BYDAY[o.weekday]}]);
}
/** «Only before a visit»: one reminder three days before the appointment (or tomorrow if that day has passed). */
export function beforeVisitReminder(o:{childId:string;childLabel:string;appointment:Appointment;time:string;today:string;telegram:boolean}){
 let date=daysLater(o.appointment.date,-3).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');
 if(date<=o.today)date=daysLater(o.today,1).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');
 const url=reminderLink({kind:'checkin',childId:o.childId},o.telegram);
 return reminderIcs([{uid:'visit-checkin-'+o.childId+'-'+o.appointment.date.replace(/-/g,''),title:'Кора: опрос перед приёмом — '+o.childLabel,description:'Скоро приём. Ответьте на короткий опрос — изменения соберутся в сводку для врача:',url,date,time:o.time}]);
}
/** A daily reminder for the rest of a mini-plan. */
export function planReminder(o:{plan:PlanContent;run:PlanRun;time:string;today:string;telegram:boolean}){
 const start=o.today>o.run.startedAt?o.today:o.run.startedAt;
 const left=Math.max(1,Math.round((Date.parse(o.run.until+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000));
 const url=reminderLink({kind:'plan',planId:o.plan.id},o.telegram);
 return reminderIcs([{uid:'plan-'+o.run.id,title:'Кора: план «'+o.plan.title+'»',description:'Шаг на сегодня и отметки — в плане:',url,date:start,time:o.time,rrule:'FREQ=DAILY;COUNT='+left}]);
}
