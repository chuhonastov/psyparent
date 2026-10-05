import content from '../content/plans.json';
import {addGoal,getProfile,newId,saveProfile,Profile} from './profile';
import type {GoalMeasure} from './profile';
import type {CheckIn} from './monitoring';
// Mini-plans: two weeks on one difficulty (mornings, falling asleep, homework, outbursts, fears, screens).
// Starting a plan adds its goal to the weekly check-in, so «было → стало» comes from the parent's own answers.
export type PlanStep={id:string;text:string};
export type PlanContent={id:string;title:string;short:string;ages:string;why:string;goal:{text:string;measure:GoalMeasure};editGoal?:boolean;weeks:{title:string;steps:PlanStep[]}[];doctor:string[];diagnoses:string[]};
export type PlanRun={id:string;planId:string;goalId:string;startedAt:string;until:string;done:string[];status:'active'|'done'|'stopped';endedAt?:string};
export const plans=content.plans as PlanContent[];
export const plansSource=content.source,plansNote=content.note;
export const planById=(id:string)=>plans.find(p=>p.id===id);
export const PLAN_DAYS=14;
const addDays=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
export const MAX_RUNS=12;
export function normalizeRuns(v:unknown):PlanRun[]{
 const date=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
 return (Array.isArray(v)?v:[]).flatMap((r:any)=>r&&typeof r.id==='string'&&planById(r.planId)&&typeof r.goalId==='string'&&date(r.startedAt)&&date(r.until)?[{id:r.id,planId:r.planId,goalId:r.goalId,startedAt:r.startedAt,until:r.until,done:Array.isArray(r.done)?r.done.filter((x:unknown)=>typeof x==='string').slice(0,40):[],status:r.status==='done'||r.status==='stopped'?r.status:'active',...(date(r.endedAt)?{endedAt:r.endedAt}:{})} as PlanRun]:[]).slice(-MAX_RUNS);
}
export const activeRuns=(p:Profile)=>p.plans.filter(r=>r.status==='active');
export const runFor=(p:Profile,planId:string)=>p.plans.filter(r=>r.planId===planId).pop();
/** Day of the plan (1…14, then more if it runs late) and which week's steps are current. */
export function planDay(run:PlanRun,today:string){const day=daysBetween(run.startedAt,today)+1;return {day,week:day>7?1:0,over:today>=run.until};}
/** Starts a plan for the child: adds its goal (or reuses one with the same text) and remembers the run. */
export function startPlan(childId:string,planId:string,today:string,goalText?:string):PlanRun|null{
 const plan=planById(planId);if(!plan)return null;
 const text=(goalText||plan.goal.text).trim().slice(0,120)||plan.goal.text;
 let goal=getProfile(childId).goals.find(g=>g.text.toLocaleLowerCase('ru')===text.toLocaleLowerCase('ru'));
 if(!goal){if(!addGoal(childId,text,plan.goal.measure))return null;goal=getProfile(childId).goals.find(g=>g.text===text);}
 if(!goal)return null;
 const run:PlanRun={id:newId('plan'),planId,goalId:goal.id,startedAt:today,until:addDays(today,PLAN_DAYS),done:[],status:'active'};
 return saveProfile(childId,p=>({plans:[...p.plans.map(r=>r.planId===planId&&r.status==='active'?{...r,status:'stopped' as const,endedAt:today}:r),run].slice(-MAX_RUNS)}))?run:null;
}
const updateRun=(childId:string,runId:string,patch:(r:PlanRun)=>Partial<PlanRun>)=>saveProfile(childId,p=>({plans:p.plans.map(r=>r.id===runId?{...r,...patch(r)}:r)}));
export const toggleStep=(childId:string,runId:string,stepId:string)=>updateRun(childId,runId,r=>({done:r.done.includes(stepId)?r.done.filter(x=>x!==stepId):[...r.done,stepId]}));
export const extendPlan=(childId:string,runId:string,today:string)=>updateRun(childId,runId,()=>({until:addDays(today,PLAN_DAYS),status:'active'}));
export const finishPlan=(childId:string,runId:string,today:string,status:'done'|'stopped'='done')=>updateRun(childId,runId,()=>({status,endedAt:today}));
/** The plan's goal in the weekly check-ins since it started: first and last answer. */
export function planTrend(run:PlanRun,checkIns:CheckIn[]){
 const values=checkIns.filter(c=>c.date>=run.startedAt&&c.goals[run.goalId]!==undefined).sort((a,b)=>a.date.localeCompare(b.date)).map(c=>c.goals[run.goalId]);
 // The answer just before the start is the baseline, when there is one.
 const before=checkIns.filter(c=>c.date<run.startedAt&&c.goals[run.goalId]!==undefined).sort((a,b)=>a.date.localeCompare(b.date)).pop()?.goals[run.goalId];
 const first=before??values[0];
 return {first,last:values[values.length-1],answers:values.length+(before!==undefined?1:0)};
}
/** Plans that fit the child's diagnoses come first. */
export function plansFor(diagnoses:string[]){
 const score=(p:PlanContent)=>p.diagnoses.some(d=>diagnoses.includes(d))?0:1;
 return plans.slice().sort((a,b)=>score(a)-score(b));
}
