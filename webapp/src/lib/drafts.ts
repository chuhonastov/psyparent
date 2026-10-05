import {useEffect,useRef,useState} from 'react';
import {toast} from './toast';
// Unfinished long forms are kept on this device (kora.draft.*): not synced, not in backups, removed with all records.
const PREFIX='kora.draft.',MAX_AGE=14*86400000;
type Stored<T>={v:T;at:string};
export function readDraft<T>(key:string):Stored<T>|null{
 try{const raw=JSON.parse(localStorage.getItem(PREFIX+key)||'null');if(!raw||typeof raw.at!=='string'||Date.now()-Date.parse(raw.at)>MAX_AGE)return null;return raw;}catch{return null;}
}
export function writeDraft(key:string,value:unknown){try{localStorage.setItem(PREFIX+key,JSON.stringify({v:value,at:new Date().toISOString()}));}catch{}}
export function clearDraft(key:string){try{localStorage.removeItem(PREFIX+key);}catch{}}
/**
 * Saves the form while it is being filled and offers to continue an earlier draft.
 * The draft belongs to the key the form was opened with (pages remount per child), so answers never move to another child.
 * After clear() — a successful save — nothing is written again, even if the form state changes afterwards.
 */
export function useDraft<T>(key:string|null,value:T,apply:(v:T)=>void,leaveNote?:string){
 const bound=useRef(key),[pending,setPending]=useState<Stored<T>|null>(()=>key?readDraft<T>(key):null);
 const initial=useRef(JSON.stringify(value)),timer=useRef(0),stopped=useRef(false),unsaved=useRef<{v:T}|null>(null),written=useRef(false);
 const flush=()=>{window.clearTimeout(timer.current);const u=unsaved.current;unsaved.current=null;if(u&&!stopped.current&&bound.current){writeDraft(bound.current,u.v);written.current=true;}};
 useEffect(()=>{
  if(!key||key!==bound.current||pending||stopped.current)return;
  if(JSON.stringify(value)===initial.current)return;
  unsaved.current={v:value};window.clearTimeout(timer.current);timer.current=window.setTimeout(flush,400);
 },[key,value,pending]);
 // Leaving the page (or switching the child) keeps the last answers.
 useEffect(()=>()=>{flush();if(written.current&&!stopped.current&&leaveNote)toast(leaveNote);},[]);
 return {
  pending,
  restore:()=>{if(pending){apply(pending.v);initial.current='';setPending(null);}},
  discard:()=>{if(bound.current)clearDraft(bound.current);setPending(null);},
  clear:()=>{stopped.current=true;unsaved.current=null;window.clearTimeout(timer.current);if(bound.current)clearDraft(bound.current);},
 };
}
