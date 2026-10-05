import content from '../content/passport.json';
import {readJSON,writeJSON} from './persist';
import type {Block,Doc} from './pdf/doc';
// «Паспорт для школы»: one page about the child for a teacher, tutor or coach — strengths, what is hard, what helps,
// what to do in a hard minute and whom to call. The parent decides what goes in; the diagnosis is left out unless chosen.
export const PASSPORT_KEY='psyparent.passport.v1';
const EVENT='psyparent:passport-updated';
export type SectionId='strengths'|'hard'|'helps'|'signs'|'upset'|'avoid';
export const SECTIONS=Object.keys(content.sections) as SectionId[];
export const sectionInfo=content.sections as Record<SectionId,{title:string;hint:string;placeholder:string}>;
export type Contact={name:string;phone:string};
export type Passport={name:string;lists:Record<SectionId,string[]>;contacts:Contact[];important:string;showDiagnosis:boolean;updatedAt?:string};
export const emptyPassport=(name=''):Passport=>({name,lists:{strengths:[],hard:[],helps:[],signs:[],upset:[],avoid:[]},contacts:[{name:'',phone:''}],important:'',showDiagnosis:false});
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v:unknown)=>Array.isArray(v)?[...new Set(v.map(x=>text(x,200)).filter(Boolean))].slice(0,12):[];
export function normalizePassport(raw:unknown,name=''):Passport{
 const r=raw&&typeof raw==='object'?raw as Record<string,any>:{},l=r.lists&&typeof r.lists==='object'?r.lists:{};
 const contacts=(Array.isArray(r.contacts)?r.contacts:[]).map((c:any)=>({name:text(c?.name,80),phone:text(c?.phone,40)})).filter((c:Contact)=>c.name||c.phone).slice(0,3);
 return {name:text(r.name,40)||name,lists:Object.fromEntries(SECTIONS.map(s=>[s,list(l[s])])) as Record<SectionId,string[]>,contacts:contacts.length?contacts:[{name:'',phone:''}],important:text(r.important,600),showDiagnosis:r.showDiagnosis===true,...(typeof r.updatedAt==='string'?{updatedAt:r.updatedAt}:{})};
}
const all=():Record<string,unknown>=>{const v=readJSON<Record<string,unknown>>(PASSPORT_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{};};
export const getPassport=(childId:string,name='')=>{const v=all()[childId];return v?normalizePassport(v,name):emptyPassport(name);};
export function savePassport(childId:string,p:Passport){
 const rows=all();rows[childId]={...normalizePassport(p),updatedAt:new Date().toISOString()};
 const ok=writeJSON(PASSPORT_KEY,rows);if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));return ok;
}
export function removePassport(childId:string){const rows=all();delete rows[childId];return writeJSON(PASSPORT_KEY,rows);}
export function subscribePassport(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===PASSPORT_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
export const passportFilled=(p:Passport)=>SECTIONS.some(s=>p.lists[s].length>0);
type Group=Partial<Record<SectionId,string[]>>;
/** Suggestions for each part: general ones plus those for the child's diagnoses (the parent picks). */
export function suggestionsFor(diagnoses:string[]):Record<SectionId,string[]>{
 const groups=content.groups as Record<string,Group>,map=content.map as Record<string,string>;
 const picked=['general',...new Set(diagnoses.map(d=>map[d]).filter(Boolean))];
 return Object.fromEntries(SECTIONS.map(s=>[s,[...new Set(picked.flatMap(g=>groups[g]?.[s]||[]))]])) as Record<SectionId,string[]>;
}
/** Plain text for a messenger. */
export function formatPassport(p:Passport,diagnoses:string[]=[]){
 const L=['ПАСПОРТ ДЛЯ ШКОЛЫ · '+(p.name||'Ребёнок'),'Коротко о ребёнке от родителей — чтобы проще было найти общий язык.'];
 if(p.showDiagnosis&&diagnoses.length)L.push('','Диагноз по заключению врача: '+diagnoses.join(', '));
 for(const s of SECTIONS)if(p.lists[s].length)L.push('',sectionInfo[s].title+':',...p.lists[s].map(x=>'• '+x));
 if(p.important)L.push('','Важно знать: '+p.important);
 const c=p.contacts.filter(x=>x.name||x.phone);
 if(c.length)L.push('','Связаться с родителями:',...c.map(x=>'• '+[x.name,x.phone].filter(Boolean).join(' — ')));
 L.push('','Составлено в приложении «Кора».');
 return L.join('\n');
}
/** One page for a teacher: the parts as short lists, the contact at the end. */
export function passportDoc(p:Passport,diagnoses:string[]=[]):Doc{
 const blocks:Block[]=[{t:'title',kicker:'Кора · паспорт для школы',title:p.name||'Ребёнок',meta:['Коротко о ребёнке от родителей — чтобы проще было найти общий язык.']}];
 if(p.showDiagnosis&&diagnoses.length)blocks.push({t:'facts',items:[{label:'Диагноз по заключению врача',value:diagnoses.join(', ')}]});
 for(const s of SECTIONS)if(p.lists[s].length){
  const tone=s==='avoid'?'danger':s==='upset'||s==='signs'?'warn':'info';
  blocks.push({t:'callout',tone,title:sectionInfo[s].title,items:p.lists[s]});
 }
 if(p.important)blocks.push({t:'callout',tone:'info',title:'Важно знать',items:[p.important]});
 const c=p.contacts.filter(x=>x.name||x.phone);
 if(c.length)blocks.push({t:'h',text:'Связаться с родителями'},{t:'table',head:['Кто','Телефон'],widths:[60,40],rows:c.map(x=>[{text:x.name||'—',bold:true},x.phone])});
 return {title:'Паспорт для школы · '+(p.name||''),running:'Паспорт для школы · '+(p.name||''),footer:'Кора · составлено родителями',blocks};
}
