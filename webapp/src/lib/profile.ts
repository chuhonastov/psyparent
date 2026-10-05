import {readJSON,writeJSON} from './persist';
import {getChildren,Child} from './children';
import {normalizeRuns,PlanRun} from './plans';
// The child's route: what the family works on, which diagnoses and specialists are involved and what is tracked.
// Kept apart from children.v1 so the short profile (name and month of birth) stays readable by older versions.
export const PROFILES_KEY='psyparent.profiles.v1';
export const ACTIVE_CHILD_KEY='psyparent.activeChild.v1';
const EVENT='psyparent:profiles-updated';
export type GoalMeasure='severity'|'count';
export type Goal={id:string;text:string;measure:GoalMeasure};
export type CustomItem={id:string;label:string};
export type Tracking={items:string[];custom:CustomItem[];journals:string[];sets:string[]};
export type Doctor={id:string;name:string;role:string;phone:string;place:string};
/** How often the short check-in is offered: every 7 or 14 days, or only in the week before a visit (0). */
export type CheckinEvery=7|14|0;
export type Profile={diagnoses:string[];specialists:string[];goals:Goal[];tracking:Tracking;note:string;doctors:Doctor[];checkinEvery:CheckinEvery;plans:PlanRun[]};
export const MAX_DOCTORS=5;
export const MAX_GOALS=6,MAX_CUSTOM=4;
const emptyTracking=():Tracking=>({items:[],custom:[],journals:[],sets:[]});
export const emptyProfile=():Profile=>({diagnoses:[],specialists:[],goals:[],tracking:emptyTracking(),note:'',doctors:[],checkinEvery:7,plans:[]});
const ids=(v:unknown,max=30)=>Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'&&/^[\w-]{1,80}$/.test(x)))].slice(0,max):[];
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
export const newId=(prefix:string)=>globalThis.crypto?.randomUUID?.()||prefix+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
export function normalizeProfile(raw:unknown):Profile{
 const r=raw&&typeof raw==='object'?raw as Record<string,any>:{},t=r.tracking&&typeof r.tracking==='object'?r.tracking:{};
 const goals=(Array.isArray(r.goals)?r.goals:[]).flatMap((g:any)=>g&&typeof g.id==='string'&&text(g.text,120)?[{id:g.id,text:text(g.text,120),measure:g.measure==='count'?'count':'severity'} as Goal]:[]).slice(0,MAX_GOALS);
 const custom=(Array.isArray(t.custom)?t.custom:[]).flatMap((c:any)=>c&&typeof c.id==='string'&&text(c.label,80)?[{id:c.id,label:text(c.label,80)}]:[]).slice(0,MAX_CUSTOM);
 const doctors=(Array.isArray(r.doctors)?r.doctors:[]).flatMap((x:any)=>x&&typeof x.id==='string'&&(text(x.name,80)||text(x.phone,40))?[{id:x.id,name:text(x.name,80),role:text(x.role,80),phone:text(x.phone,40),place:text(x.place,120)}]:[]).slice(0,MAX_DOCTORS);
 return {diagnoses:ids(r.diagnoses),specialists:ids(r.specialists),goals,tracking:{items:ids(t.items,60),custom,journals:ids(t.journals,13),sets:ids(t.sets)},note:text(r.note,1000),doctors,checkinEvery:r.checkinEvery===14||r.checkinEvery===0?r.checkinEvery:7,plans:normalizeRuns(r.plans)};
}
function all():Record<string,Profile>{
 const raw=readJSON<unknown>(PROFILES_KEY,{});
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(Object.entries(raw as Record<string,unknown>).map(([id,p])=>[id,normalizeProfile(p)]));
}
export const getProfile=(childId:string)=>all()[childId]??emptyProfile();
const notify=()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));};
export function saveProfile(childId:string,patch:Partial<Profile>|((p:Profile)=>Partial<Profile>)){
 const rows=all(),current=rows[childId]??emptyProfile(),next=normalizeProfile({...current,...(typeof patch==='function'?patch(current):patch)});
 const ok=writeJSON(PROFILES_KEY,{...rows,[childId]:next});
 if(ok)notify();
 return ok;
}
export function removeProfile(childId:string){const rows=all();delete rows[childId];const ok=writeJSON(PROFILES_KEY,rows);if(ok)notify();return ok;}
export function addGoal(childId:string,textValue:string,measure:GoalMeasure){
 const t=textValue.trim();if(!t)return false;
 return saveProfile(childId,p=>p.goals.length>=MAX_GOALS?{}:{goals:[...p.goals,{id:newId('goal'),text:t.slice(0,120),measure}]});
}
export const removeGoal=(childId:string,id:string)=>saveProfile(childId,p=>({goals:p.goals.filter(g=>g.id!==id)}));
/** Adds a set's items once; items the parent switched off later stay off. */
export function applyTrackingSet(childId:string,setId:string,items:string[]){
 return saveProfile(childId,p=>p.tracking.sets.includes(setId)?{}:{tracking:{...p.tracking,sets:[...p.tracking.sets,setId],items:[...new Set([...p.tracking.items,...items])]}});
}
export function toggleTracked(childId:string,key:'items'|'journals',id:string,on:boolean){
 return saveProfile(childId,p=>({tracking:{...p.tracking,[key]:on?[...new Set([...p.tracking[key],id])]:p.tracking[key].filter(x=>x!==id)}}));
}
export function addCustomItem(childId:string,label:string){
 const l=label.trim();if(!l)return false;
 return saveProfile(childId,p=>p.tracking.custom.length>=MAX_CUSTOM?{}:{tracking:{...p.tracking,custom:[...p.tracking.custom,{id:'custom-'+newId('c').slice(0,8),label:l.slice(0,80)}]}});
}
export function addDoctor(childId:string,d:Omit<Doctor,'id'>){if(!d.name.trim()&&!d.phone.trim())return false;return saveProfile(childId,p=>p.doctors.length>=MAX_DOCTORS?{}:{doctors:[...p.doctors,{...d,id:newId('doctor')}]});}
export const removeDoctor=(childId:string,id:string)=>saveProfile(childId,p=>({doctors:p.doctors.filter(x=>x.id!==id)}));
export const removeCustomItem=(childId:string,id:string)=>saveProfile(childId,p=>({tracking:{...p.tracking,custom:p.tracking.custom.filter(c=>c.id!==id)}}));

/** The child the route screens show: the chosen one, otherwise the first profile. */
export function getActiveChild(children:Child[]=getChildren()):Child|null{
 const id=readJSON<string|null>(ACTIVE_CHILD_KEY,null);
 return children.find(c=>c.id===id)??children[0]??null;
}
export function setActiveChild(id:string){
 const ok=writeJSON(ACTIVE_CHILD_KEY,id);
 // The memo and the visit date belong to the chosen child, so their screens re-read too.
 if(ok&&typeof window!=='undefined'){notify();window.dispatchEvent(new Event('psyparent:visit-updated'));window.dispatchEvent(new Event('psyparent:appointment-updated'));}
 return ok;
}
/** Results and diaries belong to a profile by id; older records without one, by the name they were signed with. */
export const belongsTo=(r:{childId?:string;childLabel:string},child:Child)=>r.childId?r.childId===child.id:sameChild(r.childLabel,child);
export function subscribeProfiles(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===PROFILES_KEY||e.key===ACTIVE_CHILD_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
/** Screenings and diaries are signed with the child's name; this matches them to a profile. */
export const sameChild=(label:string,child:Child)=>label.trim().toLocaleLowerCase('ru')===child.label.trim().toLocaleLowerCase('ru');
