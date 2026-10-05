import raw from '../content/monitoring.json';
import {readJSON,writeJSON} from './persist';
import {newId,Profile} from './profile';
import {validDate} from './journals';
import type {Course} from './treatment';
// A short weekly check-in instead of a medical checklist: the family's own goals, the few effects the doctor asked to watch
// for the current medicines, a couple of numbers and missed doses. Answers stay in the family's records.
export type MonitorItem={label:string;hint?:string;urgentAt?:number};
export type MonitorNumber={label:string;unit:string;min:number;max:number;step:number};
export type MonitorSet={id:string;title:string;meds:string[];items:string[];numbers:string[];labs:string[];urgent:string[]};
const data=raw as {scale:string[];countLabel:string;missed:string[];items:Record<string,MonitorItem>;numbers:Record<string,MonitorNumber>;sets:MonitorSet[]};
export const scaleLabels=data.scale,missedLabels=data.missed,monitorItems=data.items,monitorNumbers=data.numbers,monitorSets=data.sets;
export const setForMed=(medId?:string)=>monitorSets.find(s=>medId&&s.meds.includes(medId))??monitorSets.find(s=>s.id==='general')!;
export const CHECKINS_KEY='psyparent.checkins.v1';
const EVENT='psyparent:checkins-updated';
/** parent: «а как вы сами» — 0 справляюсь, 1 тяжеловато, 2 очень тяжело. Only for the parent: never in exports for the doctor. */
export type CheckIn={id:string;childId:string;date:string;goals:Record<string,number>;items:Record<string,number>;numbers:Record<string,number>;missed?:number;parent?:number;note:string;createdAt:string};

/** What the check-in asks for this child now. */
export type CheckInPlan={goals:Profile['goals'];items:{id:string;label:string;hint?:string;urgentAt?:number}[];numbers:{id:string;label:string;unit:string;min:number;max:number;step:number}[];askMissed:boolean;urgent:string[];labs:{title:string;lines:string[]}[]};
export function checkInPlan(profile:Profile,current:Course[]):CheckInPlan{
 const sets=[...new Map(current.map(c=>{const s=setForMed(c.medId);return [s.id,s] as const;})).values()];
 const tracked=new Set(profile.tracking.items);
 const items=[...new Set(sets.flatMap(s=>s.items))].filter(id=>tracked.has(id)&&monitorItems[id]).map(id=>({id,...monitorItems[id]}));
 // Urgent warning signs of a current medicine are always asked, even if switched off.
 for(const s of sets)for(const id of s.items)if(monitorItems[id]?.urgentAt&&!items.some(i=>i.id===id))items.push({id,...monitorItems[id]});
 items.push(...profile.tracking.custom.map(c=>({id:c.id,label:c.label})));
 const numbers=[...new Set(sets.flatMap(s=>s.numbers))].filter(id=>tracked.has(id)&&monitorNumbers[id]).map(id=>({id,...monitorNumbers[id]}));
 return {goals:profile.goals,items,numbers,askMissed:current.length>0,urgent:[...new Set(sets.flatMap(s=>s.urgent))],labs:sets.filter(s=>s.labs.length).map(s=>({title:s.title,lines:s.labs}))};
}
export const planIsEmpty=(p:CheckInPlan)=>!p.goals.length&&!p.items.length&&!p.numbers.length&&!p.askMissed;
/** Items from the latest check-in that crossed their warning threshold. */
export function urgentAnswers(c:CheckIn){return Object.entries(c.items).filter(([id,v])=>{const t=monitorItems[id]?.urgentAt;return t!==undefined&&v>=t;}).map(([id])=>monitorItems[id].label);}

const int=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
function clean(rec:Record<string,unknown>|undefined,ok:(id:string,v:unknown)=>boolean){const out:Record<string,number>={};for(const [k,v] of Object.entries(rec||{}))if(/^[\w-]{1,80}$/.test(k)&&ok(k,v))out[k]=v as number;return out;}
function normalize(raw:unknown):CheckIn[]{
 const rows=raw&&typeof raw==='object'&&Array.isArray((raw as any).records)?(raw as any).records:[];
 const seen=new Set<string>();
 return rows.flatMap((r:any)=>{
  if(!r||typeof r.id!=='string'||seen.has(r.id)||typeof r.childId!=='string'||!validDate(r.date))return [];
  seen.add(r.id);
  const c:CheckIn={id:r.id,childId:r.childId,date:r.date,createdAt:typeof r.createdAt==='string'?r.createdAt:r.date+'T12:00:00.000Z',
   goals:clean(r.goals,(_,v)=>int(v,0,999)),items:clean(r.items,(_,v)=>int(v,0,3)),
   numbers:clean(r.numbers,(k,v)=>typeof v==='number'&&Number.isFinite(v)&&(!monitorNumbers[k]||(v>=monitorNumbers[k].min&&v<=monitorNumbers[k].max))),note:typeof r.note==='string'?r.note.slice(0,1000):''};
  if(int(r.missed,0,2))c.missed=r.missed;
  if(int(r.parent,0,2))c.parent=r.parent;
  return [c];
 }).sort((a:CheckIn,b:CheckIn)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt));
}
export const getCheckIns=(childId?:string)=>normalize(readJSON<unknown>(CHECKINS_KEY,null)).filter(c=>!childId||c.childId===childId);
const write=(rows:CheckIn[])=>{const ok=writeJSON(CHECKINS_KEY,{version:1,records:rows.slice(-500)});if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));return ok;};
export function validateCheckIn(input:Omit<CheckIn,'id'|'createdAt'>,plan:CheckInPlan,today:string){
 const errors:string[]=[];
 if(!validDate(input.date)||input.date>today)errors.push('Укажите дату не позже сегодняшней.');
 const answered=Object.keys(input.goals).length+Object.keys(input.items).length+Object.keys(input.numbers).length+(input.missed!==undefined?1:0)+(input.parent!==undefined?1:0)+(input.note.trim()?1:0);
 if(!answered)errors.push('Ответьте хотя бы на один вопрос. Пропущенный вопрос не считается ответом «нет».');
 for(const n of plan.numbers){const v=input.numbers[n.id];if(v!==undefined&&(!Number.isFinite(v)||v<n.min||v>n.max))errors.push(n.label+': число от '+n.min+' до '+n.max+'.');}
 for(const g of plan.goals){const v=input.goals[g.id];if(v!==undefined&&!int(v,0,g.measure==='count'?999:3))errors.push(g.text+': проверьте ответ.');}
 return errors;
}
export function saveCheckIn(input:Omit<CheckIn,'id'|'createdAt'>):CheckIn|null{
 const c=normalize({records:[{...input,id:newId('checkin'),createdAt:new Date().toISOString()}]})[0];
 return c&&write([...getCheckIns(),c])?c:null;
}
export const removeCheckIn=(id:string)=>write(getCheckIns().filter(c=>c.id!==id));
export const removeChildCheckIns=(childId:string)=>write(getCheckIns().filter(c=>c.childId!==childId));
export function subscribeCheckIns(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===CHECKINS_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
/** Short line for the timeline: goals first, then noticeable effects. */
export function summarizeCheckIn(c:CheckIn,profile:Profile,plan?:CheckInPlan){
 const parts:string[]=[];
 for(const g of profile.goals)if(c.goals[g.id]!==undefined)parts.push(g.text+': '+(g.measure==='count'?c.goals[g.id]+' '+data.countLabel:scaleLabels[c.goals[g.id]].toLocaleLowerCase('ru')));
 for(const [id,v] of Object.entries(c.items))if(v>0)parts.push((monitorItems[id]?.label||profile.tracking.custom.find(x=>x.id===id)?.label||id)+': '+scaleLabels[v].toLocaleLowerCase('ru'));
 for(const [id,v] of Object.entries(c.numbers))if(monitorNumbers[id])parts.push(monitorNumbers[id].label+': '+String(v).replace('.',',')+' '+monitorNumbers[id].unit);
 if(c.missed)parts.push('пропуски приёма: '+missedLabels[c.missed].toLocaleLowerCase('ru'));
 // Say what was answered rather than «без жалоб»: an unanswered question is not a «no».
 const answered=Object.keys(c.goals).length+Object.keys(c.items).length+Object.keys(c.numbers).length+(c.missed!==undefined?1:0);
 const asked=plan?plan.goals.length+plan.items.length+plan.numbers.length+(plan.askMissed?1:0):0;
 const gap=plan&&asked>answered?' Без ответа: '+(asked-answered)+' из '+asked+'.':'';
 if(parts.length)return parts.join(' · ')+(gap?' ·'+gap.toLocaleLowerCase('ru').replace(/\.$/,''):'');
 if(!answered)return c.note?c.note.slice(0,120):'Только заметка, без ответов на вопросы';
 return 'Трудностей не отмечено (ответов: '+answered+').'+gap;
}
export const countLabel=data.countLabel;
export const itemLabel=(id:string,profile:Profile)=>monitorItems[id]?.label||profile.tracking.custom.find(x=>x.id===id)?.label||'';
