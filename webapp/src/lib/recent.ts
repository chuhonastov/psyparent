import {doctorById} from './clinic';
import {navRouteById} from './navigator';
import {readJSON,writeJSON} from './persist';
import {diagnosisById,dxName,medicationById,specialistById,topicLabel} from './content';
import {screenerById} from './screeningContent';
import {journalTemplate} from './journalContent';
import {investigationById} from './investigations';
import {methodById} from './methods';
export type RecentKind='dx'|'med'|'spec'|'scr'|'form'|'doc'|'exam'|'method'|'nav';
export type RecentEntry={kind:RecentKind;id:string;at:string};
export type RecentItem=RecentEntry&{title:string;label:string;to:string};
export const RECENT_KEY='psyparent.recent.v1';
const EVENT='psyparent:recent-updated';
const LIMIT=6;
const kinds:RecentKind[]=['dx','med','spec','scr','form','doc','exam','method','nav'];
export function normalizeRecent(raw:unknown):RecentEntry[]{
  if(!raw||typeof raw!=='object'||(raw as any).version!==1||!Array.isArray((raw as any).items))return [];
  const seen=new Set<string>();
  return (raw as any).items.flatMap((r:any)=>{
    if(!r||!kinds.includes(r.kind)||typeof r.id!=='string'||!r.id||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at)))return [];
    const key=r.kind+':'+r.id;
    if(seen.has(key))return [];
    seen.add(key);
    return [{kind:r.kind,id:r.id,at:r.at}];
  }).slice(0,LIMIT);
}
export const getRecent=()=>normalizeRecent(readJSON<unknown>(RECENT_KEY,null));
/** Remembers an opened card on this device. Unknown ids are skipped when shown, not stored forever. */
export function trackRecent(kind:RecentKind,id:string,now=new Date()){
  const items=[{kind,id,at:now.toISOString()},...getRecent().filter(r=>!(r.kind===kind&&r.id===id))].slice(0,LIMIT);
  if(!writeJSON(RECENT_KEY,{version:1,items}))return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}
export function clearRecent(){
  if(!writeJSON(RECENT_KEY,{version:1,items:[]}))return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}
export function resolveRecent(entry:RecentEntry):RecentItem|null{
  if(entry.kind==='dx'){const d=diagnosisById(entry.id);return d&&d.kind!=='group'?{...entry,title:dxName(d),label:topicLabel(d),to:'/diagnoses/'+d.id}:null;}
  if(entry.kind==='med'){const m=medicationById(entry.id);return m?{...entry,title:m.name,label:m.noteOnly?'Памятка':'Препарат',to:'/medications/'+m.id}:null;}
  if(entry.kind==='doc'){const d=doctorById(entry.id);return d?{...entry,title:d.name,label:'Врач клиники',to:'/doctors/'+d.id}:null;}
  if(entry.kind==='spec'){const s=specialistById(entry.id);return s?{...entry,title:s.title,label:'Специалист',to:'/specialists/'+s.id}:null;}
  if(entry.kind==='nav'){const r=navRouteById(entry.id);return r?{...entry,title:r.title,label:'Маршрут в России',to:'/navigator/'+r.id}:null;}
  if(entry.kind==='method'){const m=methodById(entry.id);return m?{...entry,title:m.name,label:'Сомнительный метод',to:'/methods/'+m.id}:null;}
  if(entry.kind==='exam'){const e=investigationById(entry.id);return e?{...entry,title:e.name,label:'Обследование',to:'/exams/'+e.id}:null;}
  if(entry.kind==='scr'){const s=screenerById(entry.id);return s?{...entry,title:s.name+' · '+s.title,label:'Тест',to:'/screenings/'+s.id}:null;}
  const t=journalTemplate(entry.id);
  return t?{...entry,title:t.title,label:'Дневник',to:'/forms/'+t.id}:null;
}
export function subscribeRecent(handler:()=>void){
  const storage=(e:StorageEvent)=>{if(!e.key||e.key===RECENT_KEY)handler();};
  window.addEventListener(EVENT,handler);
  window.addEventListener('psyparent:all-data-cleared',handler);
  window.addEventListener('storage',storage);
  return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
