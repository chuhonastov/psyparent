import meta from '../content/meta.json';
import {isTelegram,getStartParam} from './twa';
import {isStandalone} from './device';
import {localDate} from './screenings';
// Anonymous usage statistics — only after the parent agrees (kora.stats.v1, this device only).
// Sent: counters of what happened (opened today, saved a check-in, exported a memo, an error of a kind) with the day,
// the week and month of the first use, Telegram or browser, and the first source of the visit.
// Never sent: names, records, diagnoses, medicines, test answers, search queries, page addresses, device identifiers.
// Each event has a random one-off id so a repeated delivery is not counted twice; it does not link events together.
const KEY='kora.stats.v1',ENDPOINT='/api/stats',MAX_QUEUE=60,BATCH=20;
export type Consent='yes'|'no';
export type Action='checkin'|'journal'|'screening'|'event'|'doc'|'question'|'profile'|'memo_export'|'report_export'|'teacher_sent'|'teacher_saved'|'safety_plan'|'backup'|'feedback'|'edit';
export type ErrorKind='save'|'restore'|'files'|'export'|'sync';
type Ev={i:string;t:'day'|'week'|'month'|'join'|'act'|'first'|'task'|'err';d?:string;w?:string;m?:string;c?:string;p?:string;n?:1;s?:string;a?:string;k?:string};
type State={consent?:Consent;decidedAt?:string;first:string;src:string;sent:{d?:string;w?:string;m?:string;task?:string};joined?:boolean;firstRecord?:string;firstSent?:boolean;queue:Ev[]};
/** New records the parent made (not edits, not restored copies). */
const RECORDS=new Set<Action>(['checkin','journal','screening','event','doc']);
/** «Did something useful this month»: saved an observation or prepared the memo for the doctor. */
const TASKS=new Set<Action>(['checkin','journal','screening','event','memo_export']);

export function isoWeek(date:string){
 const d=new Date(date+'T12:00:00Z'),day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day+3);
 const year=d.getUTCFullYear(),jan4=new Date(Date.UTC(year,0,4)),week=1+Math.round(((d.getTime()-jan4.getTime())/86400000-3+((jan4.getUTCDay()+6)%7))/7);
 return year+'-W'+String(week).padStart(2,'0');
}
const month=(date:string)=>date.slice(0,7);
const randomId=()=>{try{const b=new Uint8Array(9);crypto.getRandomValues(b);return Array.from(b,x=>(x%36).toString(36)).join('');}catch{return Math.random().toString(36).slice(2,11);}};
const platform=()=>isTelegram()?'tg':isStandalone()?'pwa':'web';
const clean=(s:string)=>s.toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,30);
/** Where the first visit came from: a campaign tag (?utm_source=…, t.me/<bot>?startapp=src_…), the referring site or «direct». */
export function detectSource(search=typeof location!=='undefined'?location.search:'',referrer=typeof document!=='undefined'?document.referrer:'',start=getStartParam()){
 if(start&&/^src_[A-Za-z0-9_-]{1,30}$/.test(start))return clean(start.slice(4));
 const utm=new URLSearchParams(search).get('utm_source');if(utm&&clean(utm))return clean(utm);
 if(isTelegram())return 'telegram';
 try{if(referrer){const host=new URL(referrer).hostname.replace(/^(www|m|l|away)\./,'');if(host&&host!==(typeof window!=='undefined'?window.location.hostname:''))return clean(host);}}catch{}
 return 'direct';
}
const offline=()=>typeof window==='undefined'||window.location.protocol==='file:'||!!window.__PSYPARENT_OFFLINE__;
function read():State{
 try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&typeof s.first==='string'&&Array.isArray(s.queue))return {...s,sent:s.sent||{}};}catch{}
 const fresh:State={first:localDate(),src:detectSource(),sent:{},queue:[]};write(fresh);return fresh;
}
function write(s:State){try{s.queue=s.queue.slice(-MAX_QUEUE);localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
export const statsConsent=():Consent|undefined=>read().consent;
const listeners=new Set<()=>void>();
export const subscribeStats=(h:()=>void)=>{listeners.add(h);return ()=>{listeners.delete(h);};};

let timer=0,sending=false;
function schedule(){if(offline()||typeof window==='undefined')return;window.clearTimeout(timer);timer=window.setTimeout(()=>{void flush();},2500);}
/** Sends queued events; whatever fails stays queued for the next time. Statistics never get in the way of the app. */
export async function flush(fetcher:typeof fetch|undefined=typeof fetch==='function'?fetch:undefined){
 if(sending||!fetcher||offline())return;
 const s=read();if(s.consent!=='yes'||!s.queue.length)return;
 const batch=s.queue.slice(0,BATCH);sending=true;
 try{const res=await fetcher(ENDPOINT,{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({v:meta.appVersion,e:batch})});
  if(res.ok||res.status===400){const now=read(),sent=new Set(batch.map(e=>e.i));now.queue=now.queue.filter(e=>!sent.has(e.i));write(now);if(now.queue.length)schedule();}
 }catch{}finally{sending=false;}
}
function push(s:State,e:Omit<Ev,'i'>){s.queue.push({i:randomId(),...e} as Ev);}
/** Once a day, once a week and once a month: «this device opened Кора», with its first week and month. */
function visits(s:State,today=localDate()){
 if(!s.joined){push(s,{t:'join',w:isoWeek(s.first),m:month(s.first)});s.joined=true;}
 if(s.sent.d!==today){push(s,{t:'day',d:today,p:platform(),...(s.first===today?{n:1,s:s.src}:{})});s.sent.d=today;}
 const w=isoWeek(today),m=month(today);
 if(s.sent.w!==w){push(s,{t:'week',w,c:isoWeek(s.first)});s.sent.w=w;}
 if(s.sent.m!==m){push(s,{t:'month',m,c:month(s.first)});s.sent.m=m;}
 if(s.firstRecord&&!s.firstSent){push(s,{t:'first',c:isoWeek(s.first)});s.firstSent=true;}
}
export function trackOpen(today=localDate()){
 const s=read();if(s.consent!=='yes')return;visits(s,today);write(s);schedule();
}
export function setStatsConsent(consent:Consent,today=localDate()){
 const s=read();s.consent=consent;s.decidedAt=new Date().toISOString();
 if(consent==='yes')visits(s,today);else s.queue=[];
 write(s);if(consent==='yes')schedule();listeners.forEach(h=>h());
}
export function track(action:Action,today=localDate()){
 const s=read();
 if(RECORDS.has(action)&&!s.firstRecord)s.firstRecord=today;
 if(s.consent==='yes'){
  push(s,{t:'act',d:today,a:action});
  if(TASKS.has(action)&&s.sent.task!==month(today)){push(s,{t:'task',m:month(today)});s.sent.task=month(today);}
  if(s.firstRecord&&!s.firstSent){push(s,{t:'first',c:isoWeek(s.first)});s.firstSent=true;}
  schedule();
 }
 write(s);
}
export function trackError(kind:ErrorKind,today=localDate()){const s=read();if(s.consent!=='yes')return;push(s,{t:'err',d:today,k:kind});write(s);schedule();}
/** Queued events, for the «what is sent» view and tests. */
export const pendingEvents=()=>read().queue;
