import {normalizeVisit,VISIT_KEY,getVisit} from './visit';
import {normalizeScreenings,SCREENING_KEY} from './screenings';
import {normalizeJournals,JOURNAL_KEY} from './journals';
import {normalizeChildren,CHILDREN_KEY} from './children';
import meta from '../content/meta.json';
import {dataChanged} from './persist';
// Backups move a family's records between browsers and devices. Every value is checked again by its own reader after restore.
export const BACKUP_FORMAT=1;
const MAX_BYTES=5_000_000;
const ownKey=(key:string)=>key.startsWith('psyparent.')||key.startsWith('parentguide.');
// Files made before the rename carry app:'PsyParent' and are still accepted.
const APP_IDS=['Kora','PsyParent'];
export type BackupFile={app:'Kora';format:1;appVersion:string;createdAt:string;data:Record<string,string>};
export type BackupSummary={questions:number;meds:number;observations:number;screenings:number;journals:number;children:number;other:number};
const appKeys=()=>Object.keys(localStorage).filter(ownKey).sort();
export function createBackup(now=new Date()):BackupFile{
  const data:Record<string,string>={};
  for(const key of appKeys()){const value=localStorage.getItem(key);if(value!==null)data[key]=value;}
  // Records from the first versions are stored in the current format so the copy does not depend on the migration code.
  if(!data[VISIT_KEY])data[VISIT_KEY]=JSON.stringify(getVisit());
  return {app:'Kora',format:BACKUP_FORMAT,appVersion:meta.appVersion,createdAt:now.toISOString(),data};
}
export const backupFileName=(now=new Date())=>'Kora-kopiya-'+now.toISOString().slice(0,10)+'.json';
export function parseBackup(text:string):{ok:true;data:Record<string,string>}|{ok:false;error:string}{
  if(new Blob([text]).size>MAX_BYTES)return {ok:false,error:'Файл слишком большой для резервной копии «Коры».'};
  let raw:any;
  try{raw=JSON.parse(text);}catch{return {ok:false,error:'Это не резервная копия «Коры»: не удалось прочитать JSON.'};}
  if(!raw||typeof raw!=='object'||!APP_IDS.includes(raw.app))return {ok:false,error:'Это не резервная копия «Коры».'};
  if(raw.format!==BACKUP_FORMAT)return {ok:false,error:'Копия создана в другой версии формата. Обновите приложение.'};
  if(!raw.data||typeof raw.data!=='object'||Array.isArray(raw.data))return {ok:false,error:'В копии нет записей.'};
  const data:Record<string,string>={};
  for(const [key,value] of Object.entries(raw.data)){
    if(!ownKey(key)||key.length>200||typeof value!=='string')return {ok:false,error:'Копия повреждена или содержит посторонние данные.'};
    data[key]=value;
  }
  return {ok:true,data};
}
const parsed=(value:string|undefined)=>{if(value===undefined)return null;try{return JSON.parse(value);}catch{return null;}};
export function summarizeBackup(data:Record<string,string>):BackupSummary{
  const visit=normalizeVisit(parsed(data[VISIT_KEY]));
  const known=new Set([VISIT_KEY,SCREENING_KEY,JOURNAL_KEY,CHILDREN_KEY]);
  return {
    questions:visit.questions.length,meds:visit.meds.length,observations:Object.keys(visit.checklists).length,
    screenings:normalizeScreenings(parsed(data[SCREENING_KEY])).length,
    journals:normalizeJournals(parsed(data[JOURNAL_KEY])).length,
    children:normalizeChildren(parsed(data[CHILDREN_KEY])).length,
    other:Object.keys(data).filter(k=>!known.has(k)).length
  };
}
export function describeSummary(s:BackupSummary){
  const parts=[['вопросов',s.questions],['назначений',s.meds],['наблюдений',s.observations],['результатов тестов',s.screenings],['записей дневников',s.journals],['профилей детей',s.children]] as const;
  const text=parts.filter(([,n])=>n>0).map(([label,n])=>label+': '+n).join(', ');
  return text||'основных записей нет, только отметки и настройки';
}
/** Replaces all app records on this device with the copy. On a storage error the previous records are put back. */
export function restoreBackup(data:Record<string,string>){
  const previous:Record<string,string>={};
  for(const key of appKeys()){const value=localStorage.getItem(key);if(value!==null)previous[key]=value;}
  try{
    Object.keys(previous).forEach(k=>localStorage.removeItem(k));
    for(const [key,value] of Object.entries(data))localStorage.setItem(key,value);
  }catch{
    try{appKeys().forEach(k=>localStorage.removeItem(k));for(const [key,value] of Object.entries(previous))localStorage.setItem(key,value);}catch{}
    return false;
  }
  window.dispatchEvent(new Event('psyparent:visit-updated'));
  window.dispatchEvent(new Event('psyparent:all-data-cleared'));
  dataChanged();
  return true;
}
// The date of the last downloaded copy lives outside the records, so it is not copied into the backup itself.
const BACKUP_DATE_KEY='kora.backup.v1';
export function markBackupDone(now=new Date()){try{localStorage.setItem(BACKUP_DATE_KEY,now.toISOString());}catch{}}
export function lastBackupAt(){try{const v=localStorage.getItem(BACKUP_DATE_KEY);const d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}catch{return null;}}
