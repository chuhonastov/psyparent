import {readJSON,writeJSON} from './persist';
import {newId} from './profile';
import {validDate} from './journals';
// The child's documents: conclusions, PMPK, EEG/MRI, lab results, discharge notes. The list lives with the other records
// (backup and Telegram sync carry it); the files themselves stay in this browser's IndexedDB — they are too big to sync.
export const DOCUMENTS_KEY='psyparent.documents.v1';
const EVENT='psyparent:documents-updated';
export type DocKind='conclusion'|'pmpk'|'psych'|'eeg'|'mri'|'labs'|'discharge'|'prescription'|'disability'|'school'|'other';
export const docKindLabels:Record<DocKind,string>={conclusion:'Заключение врача',pmpk:'Заключение ПМПК',psych:'Психологическое заключение',eeg:'ЭЭГ',mri:'МРТ или КТ',labs:'Анализы',discharge:'Выписка из больницы',prescription:'Назначение',disability:'Справка МСЭ и ИПРА',school:'Характеристика из школы',other:'Другое'};
export type DocFile={id:string;name:string;type:string;size:number};
export type DocMeta={id:string;childId:string;kind:DocKind;title:string;date:string;note:string;file?:DocFile;createdAt:string};
export const MAX_FILE=20*1024*1024;
const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
function normalize(raw:unknown):DocMeta[]{
 const rows=raw&&typeof raw==='object'&&Array.isArray((raw as any).docs)?(raw as any).docs:[],seen=new Set<string>();
 return rows.flatMap((r:any)=>{
  if(!r||typeof r.id!=='string'||seen.has(r.id)||typeof r.childId!=='string'||!(r.kind in docKindLabels)||!validDate(r.date))return [];
  seen.add(r.id);
  const d:DocMeta={id:r.id,childId:r.childId,kind:r.kind,title:str(r.title,120)||docKindLabels[r.kind as DocKind],date:r.date,note:str(r.note,1000),createdAt:typeof r.createdAt==='string'?r.createdAt:r.date};
  const f=r.file;if(f&&typeof f.id==='string'&&typeof f.name==='string'&&Number.isFinite(f.size))d.file={id:f.id,name:str(f.name,160),type:str(f.type,100),size:f.size};
  return [d];
 }).sort((a:DocMeta,b:DocMeta)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
}
export const getDocuments=(childId?:string)=>normalize(readJSON<unknown>(DOCUMENTS_KEY,null)).filter(d=>!childId||d.childId===childId);
const write=(rows:DocMeta[])=>{const ok=writeJSON(DOCUMENTS_KEY,{version:1,docs:rows.slice(0,500)});if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));return ok;};
export function subscribeDocuments(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===DOCUMENTS_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}

const DB='kora-files',STORE='files';
function db():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('unavailable'));
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function tx<T>(mode:IDBTransactionMode,run:(s:IDBObjectStore)=>IDBRequest<T>|void):Promise<T|undefined>{
 const d=await db();
 return new Promise((resolve,reject)=>{const t=d.transaction(STORE,mode),req=run(t.objectStore(STORE));t.oncomplete=()=>{d.close();resolve(req?req.result:undefined);};t.onerror=()=>{d.close();reject(t.error);};t.onabort=()=>{d.close();reject(t.error);};});
}
export const readFile=(id:string)=>tx<Blob>('readonly',s=>s.get(id)).then(b=>b instanceof Blob?b:null).catch(()=>null);
export const deleteFile=(id:string)=>tx('readwrite',s=>{s.delete(id);}).catch(()=>undefined);
/** Removes every stored file (used by «Удалить все мои записи»). */
export const clearFiles=()=>tx('readwrite',s=>{s.clear();}).then(()=>true).catch(()=>false);

export function validateDocument(input:{kind:DocKind;date:string;title:string;note:string},today:string,file?:File|null){
 const errors:string[]=[];
 if(!(input.kind in docKindLabels))errors.push('Выберите тип документа.');
 if(!validDate(input.date)||input.date>today)errors.push('Укажите дату документа не позже сегодняшней.');
 if(input.title.length>120)errors.push('Название — до 120 знаков.');
 if(file&&file.size>MAX_FILE)errors.push('Файл больше 20 МБ. Сожмите фото или сохраните только нужные страницы.');
 if(file&&!/^(image\/|application\/pdf)/.test(file.type||''))errors.push('Можно прикрепить фото или PDF.');
 return errors;
}
export async function addDocument(input:{childId:string;kind:DocKind;date:string;title:string;note:string},file?:File|null):Promise<DocMeta|null>{
 const doc:DocMeta={id:newId('doc'),childId:input.childId,kind:input.kind,title:input.title.trim()||docKindLabels[input.kind],date:input.date,note:input.note.trim(),createdAt:new Date().toISOString()};
 if(file){
  const id=newId('file');
  try{await tx('readwrite',s=>{s.put(file,id);});}catch{return null;}
  doc.file={id,name:file.name.slice(0,160),type:file.type,size:file.size};
 }
 return write([doc,...getDocuments()])?doc:null;
}
export async function removeDocument(id:string){
 const rows=getDocuments(),doc=rows.find(d=>d.id===id);
 if(doc?.file)await deleteFile(doc.file.id);
 return write(rows.filter(d=>d.id!==id));
}
export async function removeChildDocuments(childId:string){
 const rows=getDocuments();
 for(const d of rows)if(d.childId===childId&&d.file)await deleteFile(d.file.id);
 return write(rows.filter(d=>d.childId!==childId));
}
export const sizeLabel=(n:number)=>n<1024*1024?Math.max(1,Math.round(n/1024))+' КБ':(n/1024/1024).toFixed(1).replace('.',',')+' МБ';

export type BackupFiles=Record<string,{name:string;type:string;data:string}>;
const toBase64=async(blob:Blob)=>{const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);};
/** Files of all documents on this device, for a full backup. Missing files (added on another device) are skipped. */
export async function exportFiles():Promise<{files:BackupFiles;missing:number}>{
 const files:BackupFiles={};let missing=0;
 for(const d of getDocuments())if(d.file){const blob=await readFile(d.file.id);if(blob)files[d.file.id]={name:d.file.name,type:d.file.type,data:await toBase64(blob)};else missing++;}
 return {files,missing};
}
export type FileRestore={restored:number;failed:string[];absent:number};
/**
 * Puts files from a full backup back into this browser and reports each outcome honestly:
 * restored, failed (unreadable data or the browser refused the space) and absent (the copy had no file for a document).
 */
export async function importFiles(files:BackupFiles={},referenced:string[]=[]):Promise<FileRestore>{
 let restored=0;const failed:string[]=[];
 for(const [id,f] of Object.entries(files)){
  try{const bin=atob(f.data),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);await tx('readwrite',s=>{s.put(new Blob([bytes],{type:f.type}),id);});restored++;}catch{failed.push(f.name||id);}
 }
 return {restored,failed,absent:referenced.filter(id=>!files[id]).length};
}
/** File ids the documents in a backup refer to. */
export function referencedFiles(data:Record<string,string>):string[]{
 try{const v=JSON.parse(data[DOCUMENTS_KEY]||'null');return Array.isArray(v?.docs)?v.docs.map((d:any)=>d?.file?.id).filter((x:unknown):x is string=>typeof x==='string'):[];}catch{return [];}
}
export const filesSize=()=>getDocuments().reduce((n,d)=>n+(d.file?.size||0),0);

