import pairContextRaw from '../content/pair-context.json';
import {clinicalDiagnoses,medicationById,specialistById,supportForDiagnosis,treatmentGuideFor,treatmentGuides,Medication,Source,TreatmentGuide,TreatmentRelation} from './content';

// Pairs "diagnosis × medication" and "diagnosis × specialist".
// Written reviews come first; for every other pair a general review is put together from
// what the drug is usually prescribed for and what helps with the diagnosis (content/pair-context.json).
type Rule={kind:TreatmentRelation;ids:string[];text:string;stop?:boolean};
type PairContext={diagnoses:Record<string,{prep:string;helps:string;exams?:string}>;medicationRules:Rule[];usual:Record<string,string>;purpose:Record<string,string>;names:Record<string,string>;updatedAt:string};
export const pairContext=pairContextRaw as PairContext;
export const prepFor=(diagnosisId:string)=>pairContext.diagnoses[diagnosisId]?.prep||'при этом состоянии';
const capital=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
const lower=(s:string)=>s.charAt(0).toLowerCase()+s.slice(1);
export const medShortName=(m:Medication)=>pairContext.names[m.id]||m.name.split(' (')[0];
const joinRu=(items:string[])=>items.length>1?items.slice(0,-1).join(', ')+' и '+items[items.length-1]:items[0]||'';
/** Where a drug is usually prescribed: the author's wording, else the diagnoses of its written reviews. */
export function usualFor(medicationId:string){
 if(pairContext.usual[medicationId])return pairContext.usual[medicationId];
 const rows=treatmentGuides.filter(g=>g.medicationId===medicationId&&(g.relationKind==='condition'||g.relationKind==='specialist')).sort((a,b)=>(a.relationKind==='condition'?0:1)-(b.relationKind==='condition'?0:1));
 const places=[...new Set(rows.map(g=>pairContext.diagnoses[g.diagnosisId]?.prep.replace(/^при /,'')).filter((x):x is string=>!!x))].slice(0,3);
 return places.length?'при '+joinRu(places):'';
}
export type ReviewGuide=TreatmentGuide&{composed?:boolean;stop?:boolean};
const STOP='Не прекращайте приём резко сами: спросите врача, как безопасно заменить или отменить препарат.';
export function composeTreatmentGuide(diagnosisId:string,medicationId:string):ReviewGuide|undefined{
 const d=pairContext.diagnoses[diagnosisId],m=medicationById(medicationId);
 if(!d||!m||m.noteOnly)return undefined;
 const rule=pairContext.medicationRules.find(r=>r.ids.includes(medicationId));
 if(!rule)return undefined;
 const summary=rule.text.replace('{name}',medShortName(m)).replace('{prep}',d.prep).replace('{usual}',usualFor(medicationId)).replace('{purpose}',pairContext.purpose[medicationId]||'');
 const goals=rule.kind==='offlabel'?['Какую трудность должен уменьшить препарат — само состояние или сопутствующую проблему?','Что известно о пользе этого лекарства '+d.prep+'?','Когда и по каким признакам вы оцените результат?']
  :rule.kind==='other'?['Какую отдельную проблему решает это лекарство?','Как оно сочетается с остальными лекарствами ребёнка?','Какие признаки требуют срочного звонка врачу?']
  :['Какую конкретную трудность должен уменьшить препарат и как вы поймёте, что он помогает?','Начата ли помощь с доказанной пользой?',rule.stop?STOP:'Когда вы вместе с врачом пересмотрите это назначение?'];
 return {diagnosisId,medicationId,relationKind:rule.kind,summary,context:d.helps,goals,sources:m.sources.slice(0,3),updatedAt:pairContext.updatedAt,composed:true,stop:rule.stop};
}
export const reviewGuide=(diagnosisId:string,medicationId:string):ReviewGuide|undefined=>treatmentGuideFor(diagnosisId,medicationId)||composeTreatmentGuide(diagnosisId,medicationId);

export type SpecialistPairKind='core'|'conditional'|'limited'|'not_needed';
export const specialistPairLabels:Record<SpecialistPairKind,string>={core:'Основная помощь',conditional:'При отдельной задаче',limited:'Польза не доказана',not_needed:'Обычно не нужен'};
export type SpecialistPair={diagnosisId:string;specialistId:string;kind:SpecialistPairKind;goal?:string;method?:string;avoid?:string;summary:string;context:string;progress:string[];questions:string[];sources:Source[];updatedAt?:string;composed?:boolean};
/** Main helpers for a diagnosis, in the plan's order, e.g. "поведенческий терапевт, логопед и дефектолог". */
export function mainHelp(diagnosisId:string){
 const plan=supportForDiagnosis(diagnosisId);
 return joinRu((plan?.providers||[]).filter(p=>p.role==='core').map(p=>specialistById(p.specialistId)?.shortTitle).filter((x):x is string=>!!x).map(lower));
}
export function specialistPair(diagnosisId:string,specialistId:string):SpecialistPair|undefined{
 const s=specialistById(specialistId),plan=supportForDiagnosis(diagnosisId);
 if(!s||!plan)return undefined;
 const prep=prepFor(diagnosisId),main=mainHelp(diagnosisId),mainLine=main?'Основная помощь: '+main+'.':'';
 const base={diagnosisId,specialistId,sources:plan.sources,updatedAt:plan.updatedAt,progress:plan.progress};
 const provider=plan.providers.find(p=>p.specialistId===specialistId);
 if(provider)return {...base,kind:provider.role,goal:provider.goal,method:provider.method,avoid:provider.avoid,summary:provider.goal+'.',context:plan.intro,
  questions:[...new Set(['Какую цель мы ставим на ближайшие 2–3 месяца?','Как мы поймём, что занятия помогают, — дома, в саду или в школе?','Что нам делать дома между занятиями?',...s.questions.slice(0,2)])]};
 const note=plan.notFor?.find(n=>n.specialistId===specialistId);
 const context=[mainLine,pairContext.diagnoses[diagnosisId]?.helps||plan.intro].filter(Boolean).join(' ');
 if(note)return {...base,kind:note.kind,summary:note.text,context,progress:[],
  questions:note.kind==='limited'?['Какие исследования показали пользу этого метода '+prep+'?','Какую конкретную цель решают занятия и когда мы оценим результат?','Какая помощь с доказанной пользой идёт параллельно?']:['Какую отдельную задачу решит этот специалист у нашего ребёнка?','Кто главный специалист '+prep+' и начата ли его помощь?']};
 return {...base,kind:'not_needed',summary:capital(prep)+' '+lower(s.shortTitle)+' не входит в основную помощь. '+s.whenNeeded,context,progress:[],composed:true,
  questions:['Какую отдельную задачу решит этот специалист у нашего ребёнка?','Кто главный специалист '+prep+' и начата ли его помощь?']};
}
/** All clinical diagnoses where a specialist helps or is often offered without proven benefit. */
export function diagnosesForSpecialist(specialistId:string){
 const rows=clinicalDiagnoses.map(d=>({d,pair:specialistPair(d.id,specialistId)})).filter((x):x is {d:typeof x.d;pair:SpecialistPair}=>!!x.pair&&x.pair.kind!=='not_needed');
 return (['core','conditional','limited'] as const).map(kind=>({kind,items:rows.filter(r=>r.pair.kind===kind).map(r=>r.d)})).filter(g=>g.items.length);
}
