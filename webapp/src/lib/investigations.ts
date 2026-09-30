import investigationsRaw from '../content/investigations.json';
import guidesRaw from '../content/investigation-guides.json';
import {clinicalDiagnoses,Source} from './content';
import {pairContext,prepFor} from './pairs';

// Investigations (EEG, MRI, blood tests, genetics and dubious tests) and «investigation × diagnosis» pairs.
// Written pairs come first; any other pair gets a general review from the card: dubious tests are never
// recommended, clinical ones are «usually not needed» with the situations when they are.
export type InvestigationKind='clinical'|'monitoring'|'dubious';
export type Investigation={id:string;name:string;group:string;kind:InvestigationKind;aliases:string[];summary:string;whenNeeded:string[];whenNot:string[];howItGoes:string;results:string;usual?:string;verdict?:string;sources:Source[];updatedAt:string};
export type ExamRelation='recommended'|'conditional'|'monitoring'|'not_routine'|'not_recommended';
export type InvestigationGuide={diagnosisId:string;investigationId:string;relationKind:ExamRelation;summary:string;sources:Source[];updatedAt:string;composed?:boolean;questions?:string[]};
const data=investigationsRaw as {groups:{id:string;title:string}[];items:Investigation[]};
export const investigationGroups=data.groups;
export const investigations=data.items;
export const investigationGuides=guidesRaw as InvestigationGuide[];
export const investigationById=(id:string)=>investigations.find(x=>x.id===id);
export const examRelationLabels:Record<ExamRelation,string>={recommended:'Обычно нужно',conditional:'По показаниям',monitoring:'Для контроля лечения',not_routine:'Обычно не нужно',not_recommended:'Не рекомендуется'};
export const examRelationOrder:ExamRelation[]=['recommended','monitoring','conditional','not_routine','not_recommended'];
const capital=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
const QUESTIONS:Record<ExamRelation,string[]>={
 recommended:['Что именно мы хотим узнать этим обследованием?','Как результат изменит план помощи?','Где его сделать и нужна ли подготовка?'],
 conditional:['Есть ли у нашего ребёнка признаки, при которых это обследование нужно?','Что изменится в лечении, если результат будет не в норме?','Кто объяснит нам результат?'],
 monitoring:['Как часто повторять и какой результат считается опасным?','Что мы сделаем, если результат изменится?'],
 not_routine:['Какие признаки у нашего ребёнка говорят в пользу этого обследования?','Что изменится в лечении по его результату?','Что будет, если его не делать?'],
 not_recommended:['Какие исследования подтверждают, что этот метод работает?','Какое решение мы примем по его результату?','Какие обследования с доказанной пользой нужны в нашей ситуации?'],
};
export const examQuestions=(g:InvestigationGuide)=>g.questions||QUESTIONS[g.relationKind];
export function composeExamGuide(diagnosisId:string,investigationId:string):InvestigationGuide|undefined{
 const e=investigationById(investigationId);
 if(!e||!pairContext.diagnoses[diagnosisId])return undefined;
 const prep=capital(prepFor(diagnosisId));
 const summary=e.kind==='dubious'?prep+' это обследование не нужно: '+e.verdict+'.':prep+' это обследование обычно не нужно. Оно нужно, '+e.usual+'.';
 return {diagnosisId,investigationId,relationKind:e.kind==='dubious'?'not_recommended':'not_routine',summary,sources:e.sources,updatedAt:e.updatedAt,composed:true};
}
export const reviewExam=(diagnosisId:string,investigationId:string)=>investigationGuides.find(g=>g.diagnosisId===diagnosisId&&g.investigationId===investigationId)||composeExamGuide(diagnosisId,investigationId);
export const examNote=(diagnosisId:string)=>pairContext.diagnoses[diagnosisId]?.exams||'';
/** Written pairs for a diagnosis, grouped in the order parents need them. */
export function examsForDiagnosis(diagnosisId:string){
 const rows=investigationGuides.filter(g=>g.diagnosisId===diagnosisId);
 return examRelationOrder.map(kind=>({kind,items:rows.filter(g=>g.relationKind===kind).map(g=>({guide:g,exam:investigationById(g.investigationId)!})).filter(x=>x.exam)})).filter(g=>g.items.length);
}
/** Diagnoses where an investigation has a written role, grouped by that role. */
export function diagnosesForExam(investigationId:string){
 const rows=investigationGuides.filter(g=>g.investigationId===investigationId);
 return examRelationOrder.map(kind=>({kind,items:rows.filter(g=>g.relationKind===kind).map(g=>clinicalDiagnoses.find(d=>d.id===g.diagnosisId)).filter((d):d is NonNullable<typeof d>=>!!d)})).filter(g=>g.items.length);
}
