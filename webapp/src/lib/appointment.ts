import {readJSON,writeJSON} from './persist';
import {getActiveChild} from './profile';
import {plural} from './plural';
export type Appointment={version:1;date:string;time?:string;with?:string};
export const APPOINTMENT_KEY='psyparent.appointment.v1';
// Each child has its own next visit; the plain key is used while there are no child profiles.
export const appointmentKeyFor=(childId:string|null)=>childId?APPOINTMENT_KEY+':'+childId:APPOINTMENT_KEY;
const activeKey=()=>appointmentKeyFor(getActiveChild()?.id||null);
const EVENT='psyparent:appointment-updated';
const isDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const isTime=(v:unknown):v is string=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function normalizeAppointment(raw:unknown):Appointment|null{
  if(!raw||typeof raw!=='object')return null;
  const r=raw as Record<string,unknown>;
  if(r.version!==1||!isDate(r.date))return null;
  const out:Appointment={version:1,date:r.date};
  if(isTime(r.time))out.time=r.time;
  if(typeof r.with==='string'&&r.with.trim())out.with=r.with.slice(0,200);
  return out;
}
export const getAppointmentFor=(childId:string|null)=>normalizeAppointment(readJSON<unknown>(appointmentKeyFor(childId),null));
export const getAppointment=()=>normalizeAppointment(readJSON<unknown>(activeKey(),null));
function write(value:Appointment|null){
  if(!writeJSON(activeKey(),value))return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}
/** Saves the date of the next visit. An empty date removes the whole entry. */
export function setAppointment(patch:{date?:string;time?:string;with?:string}){
  const current=getAppointment();
  const date=patch.date??current?.date??'';
  if(!date)return write(null);
  if(!isDate(date))return false;
  const next:Appointment={version:1,date};
  const time=patch.time??current?.time;
  const person=patch.with??current?.with;
  if(time&&isTime(time))next.time=time;
  if(person?.trim())next.with=person.slice(0,200);
  return write(next);
}
export const clearAppointment=()=>write(null);
/** Whole calendar days from today to the visit; negative when it has passed. */
export function daysUntil(date:string,today=new Date()){
  const [y,m,d]=date.split('-').map(Number);
  return Math.round((Date.UTC(y,m-1,d)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
}
export function countdownLabel(days:number){
  if(days===0)return 'сегодня';
  if(days===1)return 'завтра';
  if(days===2)return 'послезавтра';
  if(days>0)return 'через '+days+' '+plural(days,'день','дня','дней');
  return 'прошёл '+(-days)+' '+plural(-days,'день','дня','дней')+' назад';
}
export function formatAppointment(a:Appointment){
  const date=new Date(a.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',weekday:'long'});
  return date+(a.time?', '+a.time:'')+(a.with?.trim()?' · '+a.with.trim():'');
}
const icsText=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,m=>'\\'+m);
const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
/** A calendar file with a reminder the day before. Times are local ("floating"), as written in the referral. */
export function appointmentIcs(a:Appointment,now=new Date()){
  const day=a.date.replace(/-/g,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Kora//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    'UID:'+day+'-'+now.getTime().toString(36)+'@psyparent',
    'DTSTAMP:'+stamp(now)];
  if(a.time){
    const [h,m]=a.time.split(':').map(Number),end=h*60+m+60;
    const endDay=end>=1440?daysLater(a.date,1):day;
    const endTime=String(Math.floor(end%1440/60)).padStart(2,'0')+String(end%60).padStart(2,'0')+'00';
    lines.push('DTSTART:'+day+'T'+a.time.replace(':','')+'00','DTEND:'+endDay+'T'+endTime);
  } else lines.push('DTSTART;VALUE=DATE:'+day,'DTEND;VALUE=DATE:'+daysLater(a.date,1));
  lines.push('SUMMARY:'+icsText('Приём'+(a.with?.trim()?': '+a.with.trim():' у врача')),
    'DESCRIPTION:'+icsText('Возьмите памятку к приёму из «Коры»: вопросы, наблюдения и назначения.'),
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsText('Завтра приём. Проверьте памятку в «Коре».'),'TRIGGER:'+(a.time?'-P1D':'-PT15H'),'END:VALARM',
    'END:VEVENT','END:VCALENDAR');
  return lines.map(fold).join('\r\n')+'\r\n';
}
// RFC 5545: content lines are folded at 75 octets; Cyrillic letters take two octets each.
function fold(line:string){
  const out:string[]=[];let current='',size=0;
  for(const ch of line){
    const bytes=new TextEncoder().encode(ch).length;
    if(size+bytes>(out.length?74:75)){out.push(current);current='';size=0;}
    current+=ch;size+=bytes;
  }
  out.push(current);
  return out.join('\r\n ');
}
function daysLater(date:string,days:number){
  const [y,m,d]=date.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10).replace(/-/g,'');
}
export function subscribeAppointment(handler:()=>void){
  const storage=(e:StorageEvent)=>{if(!e.key||e.key.startsWith(APPOINTMENT_KEY))handler();};
  window.addEventListener(EVENT,handler);
  window.addEventListener('psyparent:all-data-cleared',handler);
  window.addEventListener('storage',storage);
  return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
