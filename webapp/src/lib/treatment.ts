import {readJSON,writeJSON} from './persist';
import {medicationById} from './content';
import {newId} from './profile';
import {validDate} from './journals';
// The treatment timeline: what was started, changed or stopped and what the family noticed, with dates.
// The parent copies doses from the doctor's notes; the app never suggests or checks a dose.
export const TREATMENT_KEY='psyparent.treatment.v1';
const EVENT='psyparent:treatment-updated';
export type EventKind='start'|'dose'|'stop'|'visit'|'effect'|'side'|'exam'|'event';
export type TreatmentEvent={id:string;childId:string;date:string;kind:EventKind;medId?:string;medName?:string;dose?:string;text?:string;createdAt:string};
export const MED_KINDS:EventKind[]=['start','dose','stop'];
export const eventKindLabels:Record<EventKind,string>={start:'Начат препарат',dose:'Изменена доза',stop:'Препарат отменён',visit:'Приём врача',effect:'Изменение состояния',side:'Нежелательный эффект',exam:'Обследование или анализ',event:'Событие в жизни'};
export const eventKindHints:Partial<Record<EventKind,string>>={effect:'Например: тревога меньше, спит без изменений',side:'Например: тошнота первые 3 дня',exam:'Например: ЭЭГ — без эпиактивности; пролактин в норме',event:'Например: новая школа, болезнь, переезд',visit:'Что решили на приёме'};
const MAX_EVENTS=1000;
export function validateEvent(e:Partial<TreatmentEvent>,today:string):string[]{
 const errors:string[]=[];
 if(!e.kind||!(e.kind in eventKindLabels))errors.push('Выберите, что произошло.');
 if(!validDate(e.date)||e.date!>today)errors.push('Укажите дату не позже сегодняшней.');
 if(e.kind&&MED_KINDS.includes(e.kind)){
  if(!(e.medId&&medicationById(e.medId))&&!e.medName?.trim())errors.push('Выберите препарат или впишите его название.');
  if(e.kind!=='stop'&&!e.dose?.trim())errors.push('Перепишите дозу из назначения врача, например «12,5 мг утром».');
 }else if(e.kind&&e.kind!=='visit'&&!e.text?.trim())errors.push('Опишите коротко, что произошло.');
 if((e.dose?.length||0)>80)errors.push('Доза — до 80 знаков.');
 if((e.text?.length||0)>600)errors.push('Описание — до 600 знаков.');
 if((e.medName?.length||0)>80)errors.push('Название препарата — до 80 знаков.');
 return errors;
}
function normalize(raw:unknown):TreatmentEvent[]{
 const rows=raw&&typeof raw==='object'&&Array.isArray((raw as any).events)?(raw as any).events:[];
 const seen=new Set<string>();
 return rows.flatMap((r:any)=>{
  if(!r||typeof r.id!=='string'||seen.has(r.id)||typeof r.childId!=='string'||!(r.kind in eventKindLabels)||!validDate(r.date))return [];
  seen.add(r.id);
  const e:TreatmentEvent={id:r.id,childId:r.childId,date:r.date,kind:r.kind,createdAt:typeof r.createdAt==='string'?r.createdAt:r.date+'T12:00:00.000Z'};
  if(typeof r.medId==='string'&&medicationById(r.medId))e.medId=r.medId;
  if(typeof r.medName==='string'&&r.medName.trim())e.medName=r.medName.trim().slice(0,80);
  if(typeof r.dose==='string'&&r.dose.trim())e.dose=r.dose.trim().slice(0,80);
  if(typeof r.text==='string'&&r.text.trim())e.text=r.text.trim().slice(0,600);
  if(MED_KINDS.includes(e.kind)&&!e.medId&&!e.medName)return [];
  return [e];
 });
}
const byDate=(a:TreatmentEvent,b:TreatmentEvent)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt);
export const getEvents=(childId?:string)=>normalize(readJSON<unknown>(TREATMENT_KEY,null)).filter(e=>!childId||e.childId===childId).sort(byDate);
const write=(rows:TreatmentEvent[])=>{const ok=writeJSON(TREATMENT_KEY,{version:1,events:rows.slice(-MAX_EVENTS)});if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));return ok;};
export function addEvent(input:Omit<TreatmentEvent,'id'|'createdAt'>,today:string):TreatmentEvent|null{
 if(validateEvent(input,today).length)return null;
 const e=normalize({events:[{...input,id:newId('event'),createdAt:new Date().toISOString()}]})[0];
 return e&&write([...getEvents(),e])?e:null;
}
export function updateEvent(id:string,input:Omit<TreatmentEvent,'id'|'createdAt'|'childId'>,today:string){
 const rows=getEvents(),old=rows.find(e=>e.id===id);
 if(!old||validateEvent(input,today).length)return false;
 const next=normalize({events:[{...old,...input,id,childId:old.childId,createdAt:old.createdAt,medId:input.medId,medName:input.medName,dose:input.dose,text:input.text}]})[0];
 return !!next&&write(rows.map(e=>e.id===id?next:e));
}
export const removeEvent=(id:string)=>write(getEvents().filter(e=>e.id!==id));
export const removeChildEvents=(childId:string)=>write(getEvents().filter(e=>e.childId!==childId));
export function subscribeTreatment(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===TREATMENT_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}

export const medKey=(e:{medId?:string;medName?:string})=>e.medId||'name:'+(e.medName||'').toLocaleLowerCase('ru');
export const medLabel=(e:{medId?:string;medName?:string})=>(e.medId&&medicationById(e.medId)?.name)||e.medName||'Препарат';
/** "12,5 мг утром" → 12.5 мг; doses in different units are not compared. */
export function parseDose(dose?:string){
 const m=/(\d+(?:[.,]\d+)?)\s*(мкг|мг|г|мл|кап\w*|таб\w*|ед\w*|mg|mcg|ml)?/i.exec(dose||'');
 return m?{value:Number(m[1].replace(',','.')),unit:(m[2]||'').toLowerCase().replace(/^кап\w*/,'кап').replace(/^таб\w*/,'таб').replace(/^ед\w*/,'ед')}:null;
}
export type DoseDirection='up'|'down'|'same'|'unknown';
export function doseDirection(before?:string,after?:string):DoseDirection{
 const a=parseDose(before),b=parseDose(after);
 if(!a||!b||a.unit!==b.unit)return 'unknown';
 return b.value>a.value?'up':b.value<a.value?'down':'same';
}
export type Course={key:string;medId?:string;medName?:string;label:string;dose?:string;since:string;started:string;lastKind:EventKind;direction:DoseDirection;previousDose?:string;active:boolean;history:TreatmentEvent[]};
/** One course per medicine: its events in order, the current dose and the date of the last change. */
export function courses(events:TreatmentEvent[]):Course[]{
 const map=new Map<string,TreatmentEvent[]>();
 for(const e of events.filter(e=>MED_KINDS.includes(e.kind)).sort(byDate))map.set(medKey(e),[...(map.get(medKey(e))||[]),e]);
 return [...map.entries()].map(([key,history])=>{
  const last=history[history.length-1],doses=history.filter(e=>e.kind!=='stop'),lastDose=doses[doses.length-1],prev=doses[doses.length-2];
  const startIdx=history.map(e=>e.kind).lastIndexOf('start');
  return {key,medId:history[0].medId,medName:history[0].medName,label:medLabel(history[0]),dose:lastDose?.dose,since:last.date,started:history[Math.max(0,startIdx)].date,lastKind:last.kind,
   direction:last.kind==='dose'?doseDirection(prev?.dose,last.dose):'unknown',previousDose:last.kind==='dose'?prev?.dose:undefined,active:last.kind!=='stop',history};
 }).sort((a,b)=>Number(b.active)-Number(a.active)||b.since.localeCompare(a.since));
}
export const activeCourses=(events:TreatmentEvent[])=>courses(events).filter(c=>c.active);
/** Day number counted from the change: the day of the change is day 1. */
export const dayNumber=(from:string,today:string)=>Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000)+1;
// Catalogue names are generic names and read well in lower case; a trade name typed by the parent keeps its capital.
export const inSentence=(c:{medId?:string;label:string})=>c.medId?c.label.toLocaleLowerCase('ru'):c.label;
export function changeLabel(c:Course){
 if(c.lastKind==='start')return 'начат '+inSentence(c);
 if(c.lastKind==='stop')return 'отменён '+inSentence(c);
 return ({up:'увеличена доза',down:'снижена доза',same:'изменён приём',unknown:'изменена доза'} as const)[c.direction]+': '+inSentence(c);
}
export const lastVisit=(events:TreatmentEvent[],before?:string)=>events.filter(e=>e.kind==='visit'&&(!before||e.date<before)).map(e=>e.date).sort().pop()||null;
