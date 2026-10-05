import {useEffect,useRef,useState} from 'react';
// Unfinished long forms are kept on this device (kora.draft.*): not synced, not in backups, removed with all records.
const PREFIX='kora.draft.',MAX_AGE=14*86400000;
type Stored<T>={v:T;at:string};
export function readDraft<T>(key:string):Stored<T>|null{
 try{const raw=JSON.parse(localStorage.getItem(PREFIX+key)||'null');if(!raw||typeof raw.at!=='string'||Date.now()-Date.parse(raw.at)>MAX_AGE)return null;return raw;}catch{return null;}
}
export function writeDraft(key:string,value:unknown){try{localStorage.setItem(PREFIX+key,JSON.stringify({v:value,at:new Date().toISOString()}));}catch{}}
export function clearDraft(key:string){try{localStorage.removeItem(PREFIX+key);}catch{}}
/** Saves the form while it is being filled and offers to continue an earlier draft. */
export function useDraft<T>(key:string|null,value:T,apply:(v:T)=>void){
 const [pending,setPending]=useState<Stored<T>|null>(()=>key?readDraft<T>(key):null);
 const initial=useRef(JSON.stringify(value)),timer=useRef(0);
 useEffect(()=>{
  if(!key||pending)return;
  const text=JSON.stringify(value);
  if(text===initial.current)return;
  window.clearTimeout(timer.current);
  timer.current=window.setTimeout(()=>writeDraft(key,value),400);
  return ()=>window.clearTimeout(timer.current);
 },[key,value,pending]);
 return {
  pending,
  restore:()=>{if(pending){apply(pending.v);initial.current='';setPending(null);}},
  discard:()=>{if(key)clearDraft(key);setPending(null);},
  clear:()=>{window.clearTimeout(timer.current);if(key)clearDraft(key);},
 };
}
