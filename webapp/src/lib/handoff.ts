import {readJSON,writeJSON} from './persist';
import {formFor,screenerById,ScreeningId} from './screeningContent';
import {createScreening,saveScreening,localDate,ScreeningResult} from './screenings';
import {createJournal,saveJournal,validateJournal,validDate,JournalRecord} from './journals';
import {journalTemplate} from './journalContent';
import meta from '../content/meta.json';
// Forms for a second informant without a server: the parent sends a link with the form and the child's nickname;
// the teacher answers in their own browser and sends back a link with the answers. Nothing is stored on the way.
export type HandoffForm='vanderbilt2002'|'snapiv'|'school';
export const HANDOFF_FORMS:{id:HandoffForm;title:string;note:string;minAge?:number;maxAge?:number}[]=[
 {id:'vanderbilt2002',title:'Vanderbilt — форма учителя',note:'Внимание, поведение, настроение и успеваемость. 43 вопроса, около 10 минут. Для 6–12 лет.',minAge:6,maxAge:12},
 {id:'snapiv',title:'SNAP-IV — форма педагога',note:'Внимание, гиперактивность и оппозиционное поведение. 26 вопросов, около 5 минут. Для 6–17 лет.',minAge:6,maxAge:17},
 {id:'school',title:'Наблюдения педагога',note:'Короткое описание своими словами: внимание, поведение, отношения, учёба, что помогает. Для любого возраста.'},
];
export const handoffTitle=(f:HandoffForm)=>HANDOFF_FORMS.find(x=>x.id===f)?.title||f;
export type HandoffRequest={k:'q';v:1;id:string;f:HandoffForm;c:string;a?:number;r:'tg'|'web';m?:string};
export type HandoffAnswer={k:'a';v:1;id:string;f:HandoffForm;c:string;a?:number;d:string;o?:string;x?:string;j?:Record<string,string>;n?:string};
const BOT=(meta as {telegramBot?:string}).telegramBot||'psyparent_bot';

const toB64url=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const fromB64url=(text:string)=>{let s=text.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
async function pipe(bytes:Uint8Array,stream:CompressionStream|DecompressionStream){
 const out=new Blob([bytes as BlobPart]).stream().pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array,Uint8Array>);
 return new Uint8Array(await new Response(out).arrayBuffer());
}
/** URL-safe code: «j» + plain JSON, or «g» + gzip when that is shorter. Only A–Z, a–z, 0–9, «-» and «_», as Telegram start links require. */
export async function encodeHandoff(obj:HandoffRequest|HandoffAnswer){
 const bytes=new TextEncoder().encode(JSON.stringify(obj)),plain='j'+toB64url(bytes);
 if(typeof CompressionStream!=='function'||bytes.length<200)return plain;
 const packed='g'+toB64url(await pipe(bytes,new CompressionStream('gzip')));
 return packed.length<plain.length?packed:plain;
}
const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
/** Accepts a bare code or any link that carries it (after «#», «startapp=» or «code=»). */
export function extractCode(input:string){
 const t=input.trim(),m=/(?:#|startapp=|code=)([A-Za-z0-9_-]{8,})/.exec(t);
 return m?m[1]:/^[A-Za-z0-9_-]{8,}$/.test(t)?t:'';
}
export async function decodeHandoff(code:string):Promise<HandoffRequest|HandoffAnswer|null>{
 try{
  const kind=code[0],body=fromB64url(code.slice(1));
  const bytes=kind==='g'?await pipe(body,new DecompressionStream('gzip')):kind==='j'?body:null;
  if(!bytes)return null;
  const r=JSON.parse(new TextDecoder().decode(bytes));
  if(!r||r.v!==1||!HANDOFF_FORMS.some(f=>f.id===r.f)||typeof r.id!=='string'||!/^[\w-]{4,40}$/.test(r.id))return null;
  const c=str(r.c,60),a=Number.isInteger(r.a)&&r.a>=0&&r.a<=25?r.a:undefined;
  if(!c)return null;
  if(r.k==='q')return {k:'q',v:1,id:r.id,f:r.f,c,a,r:r.r==='tg'?'tg':'web',m:str(r.m,500)||undefined};
  if(r.k==='a'&&validDate(r.d)){
   const j=r.j&&typeof r.j==='object'&&!Array.isArray(r.j)?Object.fromEntries(Object.entries(r.j).map(([k,v])=>[k,str(v,3000)]).filter(([,v])=>v)):undefined;
   return {k:'a',v:1,id:r.id,f:r.f,c,a,d:r.d,o:str(r.o,60)||undefined,x:typeof r.x==='string'&&/^\d{1,80}$/.test(r.x)?r.x:undefined,j,n:str(r.n,1000)||undefined};
  }
 }catch{}
 return null;
}
export const requestLink=(code:string,origin=window.location.origin)=>origin+'/t#'+code;
/** Back to the parent: into the mini app when the request came from Telegram and the code fits a start link. */
export function answerLink(code:string,mode:'tg'|'web',origin=window.location.origin){
 if(mode==='tg'&&code.length<=512)return 'https://t.me/'+BOT+'?startapp='+code;
 return origin+'/import#'+code;
}
export function newRequestId(){return (globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,12);}

export function screeningFormFor(f:HandoffForm){if(f==='school')return null;const s=screenerById(f as ScreeningId);return s?formFor(s,'teacher'):null;}
/** Teacher's answers become the parent's records: a screening result or a school observation. */
export function answerToRecord(a:HandoffAnswer):{kind:'screening';result:ScreeningResult}|{kind:'journal';record:JournalRecord}|{error:string}{
 const note=['Заполнено учителем по ссылке из «Коры»'+(a.o?': '+a.o:'')+'.',a.n||''].filter(Boolean).join(' ');
 if(a.f==='school'){
  const input={templateId:'school',childLabel:a.c,age:a.a,respondent:'teacher' as const,observerLabel:a.o||'Педагог',date:a.d,treatment:'',values:a.j||{},includeInVisit:true};
  const errors=validateJournal(input);if(errors.length)return {error:errors[0]};
  return {kind:'journal',record:createJournal(input)};
 }
 const form=screeningFormFor(a.f),answers=(a.x||'').split('').map(Number);
 if(!form||answers.length!==form.questions.length)return {error:'Ответы неполные: в ссылке не хватает вопросов.'};
 try{return {kind:'screening',result:createScreening(a.f as ScreeningId,{childLabel:a.c,age:a.a??-1,respondent:'teacher',completedDate:a.d,answers,notes:note})};}
 catch(e){return {error:e instanceof Error?e.message:'Не удалось прочитать ответы.'};}
}
export function saveAnswer(rec:ReturnType<typeof answerToRecord>,includeInVisit:boolean){
 if('error' in rec)return false;
 return rec.kind==='screening'?saveScreening({...rec.result,includeInVisit}):saveJournal({...rec.record,includeInVisit});
}

export const REQUESTS_KEY='psyparent.requests.v1';
export type SentRequest={id:string;f:HandoffForm;childLabel:string;to:string;sentAt:string;answeredAt?:string};
export function getRequests():SentRequest[]{
 const raw=readJSON<any>(REQUESTS_KEY,null),rows=raw&&Array.isArray(raw.items)?raw.items:[];
 return rows.filter((r:any)=>r&&typeof r.id==='string'&&HANDOFF_FORMS.some(f=>f.id===r.f)&&typeof r.childLabel==='string'&&typeof r.sentAt==='string').map((r:any)=>({id:r.id,f:r.f,childLabel:r.childLabel,to:str(r.to,80),sentAt:r.sentAt,answeredAt:typeof r.answeredAt==='string'?r.answeredAt:undefined})).slice(-30);
}
const writeRequests=(items:SentRequest[])=>{const ok=writeJSON(REQUESTS_KEY,{version:1,items:items.slice(-30)});if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event('psyparent:requests-updated'));return ok;};
export const rememberRequest=(r:SentRequest)=>writeRequests([...getRequests().filter(x=>x.id!==r.id),r]);
export const markAnswered=(id:string,at=new Date().toISOString())=>writeRequests(getRequests().map(r=>r.id===id?{...r,answeredAt:at}:r));
export const forgetRequest=(id:string)=>writeRequests(getRequests().filter(r=>r.id!==id));
export {localDate};
