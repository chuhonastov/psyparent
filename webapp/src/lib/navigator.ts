import raw from '../content/navigator.json';
import type {Source} from './content';
// Russian routes after a diagnosis: specialists, PMPK, schooling, disability, documents — situations, not a legal encyclopedia.
export type NavVerdict='yes'|'often'|'situational'|'rare';
export type NavTopic={id:string;title:string;text:string;points:string[];sources:string[]};
export type NavStep={title:string;text?:string;verdict?:NavVerdict;topics?:string[];links?:{to:string;label:string}[];list?:string[]};
export type NavRoute={id:string;title:string;diagnoses:string[];intro:string;steps:NavStep[]};
const data=raw as unknown as {updatedAt:string;verdicts:Record<NavVerdict,string>;sources:Record<string,Source>;topics:NavTopic[];routes:NavRoute[]};
export const navRoutes=data.routes,navTopics=data.topics,navVerdicts=data.verdicts,navUpdatedAt=data.updatedAt;
export const navRouteById=(id:string)=>navRoutes.find(r=>r.id===id);
export const navTopicById=(id:string)=>navTopics.find(t=>t.id===id);
export const navSources=(ids:string[])=>ids.map(id=>data.sources[id]).filter(Boolean);
export const routeForDiagnosis=(id:string)=>navRoutes.find(r=>r.diagnoses.includes(id));
export const verdictTone=(v:NavVerdict)=>v==='yes'||v==='often'?'':v==='situational'?'warm':'neutral';
