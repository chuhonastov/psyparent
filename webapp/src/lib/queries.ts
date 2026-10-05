import raw from '../content/queries.json';
import {normalizeQuery} from './search';
// Everyday words of parents («не спит», «бьёт себя», «как пройти ПМПК») mapped to a short orientation and the right pages,
// so the first result is a calm next step rather than the rarest diagnosis that happens to contain the words.
export type QueryLink={to:string;label:string};
export type QueryAnswer={id:string;title:string;text:string;links:QueryLink[];patterns:string[];urgent?:boolean};
export const queryAnswers=(raw as {items:QueryAnswer[]}).items;
// A pattern word matches a typed word that starts with it; short words (не, рас, огэ) must match exactly.
// While typing, a typed word of 4+ letters also matches the start of a longer pattern word.
const wordMatch=(p:string,w:string)=>p.length<=3?w===p:w.startsWith(p)||(w.length>=4&&p.startsWith(w));
export function matchAnswers(query:string,limit=3):QueryAnswer[]{
 const words=normalizeQuery(query).split(/\s+/).filter(Boolean);
 if(!words.length)return [];
 const scored=queryAnswers.map((a,i)=>{
  let best=0;
  for(const pattern of a.patterns){const pw=normalizeQuery(pattern).split(' ');if(pw.every(p=>words.some(w=>wordMatch(p,w))))best=Math.max(best,pw.length);}
  return {a,score:best,i};
 }).filter(x=>x.score>0);
 return scored.sort((x,y)=>Number(!!y.a.urgent)-Number(!!x.a.urgent)||y.score-x.score||x.i-y.i).slice(0,limit).map(x=>x.a);
}
