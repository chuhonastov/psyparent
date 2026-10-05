import {readJSON,writeJSON} from './persist';
import {plural} from './plural';
// Child profiles without personal data: a nickname and the month of birth, kept only in this browser.
// They fill the name and age in tests and diaries and filter the catalogue by age.
export const CHILDREN_KEY='psyparent.children.v1';
const EVENT='psyparent:children-updated';
export const MAX_CHILDREN=8;
export type Child={id:string;label:string;birth:string};
const BIRTH=/^(\d{4})-(0[1-9]|1[0-2])$/;
const monthIndex=(value:string)=>{const m=/^(\d{4})-(\d{2})/.exec(value);return m?Number(m[1])*12+Number(m[2])-1:NaN;};
export const localMonth=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
export function validateChild(input:{label:string;birth:string},today=localMonth()):string[]{
 const errors:string[]=[],label=typeof input.label==='string'?input.label.trim():'';
 if(!label||label.length>30)errors.push('Укажите условное имя до 30 знаков: например, «Старший» или «Маша».');
 if(typeof input.birth!=='string'||!BIRTH.test(input.birth))errors.push('Укажите месяц и год рождения.');
 else{const age=monthIndex(today)-monthIndex(input.birth);if(age<0)errors.push('Месяц рождения не может быть в будущем.');else if(age>25*12)errors.push('Профиль рассчитан на детей и подростков до 25 лет.');}
 return errors;
}
export function normalizeChildren(raw:unknown):Child[]{
 if(!Array.isArray(raw))return [];
 const seen=new Set<string>();
 return raw.filter((c:any)=>c&&typeof c.id==='string'&&c.id&&!seen.has(c.id)&&!validateChild(c).length&&seen.add(c.id)).slice(0,MAX_CHILDREN).map((c:any)=>({id:c.id,label:c.label.trim(),birth:c.birth}));
}
export const getChildren=()=>normalizeChildren(readJSON(CHILDREN_KEY,[]));
/** The profile a record signed with this name belongs to — only when exactly one profile has that name. */
export function childIdForLabel(label:string,children=getChildren()){const l=label.trim().toLocaleLowerCase('ru'),hits=children.filter(c=>c.label.trim().toLocaleLowerCase('ru')===l);return hits.length===1?hits[0].id:undefined;}
const store=(rows:Child[])=>{const ok=writeJSON(CHILDREN_KEY,rows);if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));return ok;};
export function saveChild(input:{id?:string;label:string;birth:string}):Child|null{
 if(validateChild(input).length)return null;
 const rows=getChildren(),old=rows.find(c=>c.id===input.id);
 if(!old&&rows.length>=MAX_CHILDREN)return null;
 const child={id:old?.id||globalThis.crypto?.randomUUID?.()||'child-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),label:input.label.trim(),birth:input.birth};
 return store(old?rows.map(c=>c.id===old.id?child:c):[...rows,child])?child:null;
}
export const removeChild=(id:string)=>store(getChildren().filter(c=>c.id!==id));
// Full months between the birth month and the given date; the day of birth is unknown, so the result can be one month off.
export function childAge(c:Child,onDate:string=localMonth()):{months:number;years:number}{
 const months=Math.max(0,monthIndex(onDate)-monthIndex(c.birth));
 return {months,years:Math.floor(months/12)};
}
export function ageLabel(c:Child,onDate?:string){
 const {months,years}=childAge(c,onDate),rest=months%12;
 if(years<3)return years?`${years} ${plural(years,'год','года','лет')}${rest?' '+rest+' мес.':''}`:`${months} мес.`;
 return `${years} ${plural(years,'год','года','лет')}`;
}
const MONTHS=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
export const birthLabel=(c:Child)=>MONTHS[Number(c.birth.slice(5,7))-1]+' '+c.birth.slice(0,4);
// Catalogue link with the child's age: months under three years (the M-CHAT range), otherwise years.
export const screeningsLink=(c:Child,onDate?:string)=>{const {months,years}=childAge(c,onDate);return years<3?'/screenings?unit=months&age='+months:'/screenings?age='+years;};
export function subscribeChildren(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===CHILDREN_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
