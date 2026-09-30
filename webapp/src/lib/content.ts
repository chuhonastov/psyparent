import diagnosesRaw from '../content/diagnoses.json';
import medicationsRaw from '../content/medications.json';
import guidesRaw from '../content/treatment-guides.json';
import medicationCategoriesRaw from '../content/medication-categories.json';
import specialistsRaw from '../content/specialists.json';
import supportRaw from '../content/nonpharm-support.json';
export type Source = {label: string; url?: string};
export type Observation = {id: string; text: string};
export type Diagnosis = {
  id: string; title: string; shortTitle?: string; aliases?: string[]; summary: string;
  kind?: 'group'; topicKind?: 'diagnosis'|'overview'|'guide'; children?: string[]; relatedTopics?: string[]; simplifiedCriteria?: string[];
  fullCriteriaChecklist?: {title?: string; items: Observation[]};
  questionsToDoctor?: string[]; effectiveMeds?: string[]; evidenceApproaches?: string[];
  ineffectivePharm?: string[]; redFlags?: string[]; sources?: Source[];
  updatedAt?: string; introductionTitle?: string; observationTitle?: string; introduction?: string[]; takeaways?: {title: string; text: string}[];
  diagnosticNotes?: string[]; homeHelp?: {title: string; text: string}[];
  ageGuidance?: string; evidenceNote?: string; screeningIds?: string[];
};
export type Medication = {
  id: string; name: string; class: string; category?: string; aliases?: string[]; searchTerms?: string[]; whenDiscussed: string[];
  monitoring: string[]; warnings: string[]; sources: Source[]; noteOnly?: boolean;
  plainSummary?: string; availabilityNote?: string; evidenceNote?: string; updatedAt?: string;
};
export const diagnoses = diagnosesRaw as Diagnosis[];
export const medications = medicationsRaw as Medication[];
export const diagnosisById = (id: string) => diagnoses.find(d => d.id === id);
export const medicationById = (id: string) => medications.find(m => m.id === id);
export const leaves = diagnoses.filter(d => d.kind !== 'group');
export const diagnosisGroups = diagnoses.filter(d => d.kind === 'group');
export const clinicalDiagnoses = leaves.filter(d => !d.topicKind || d.topicKind === 'diagnosis');
export const medicationCategories = medicationCategoriesRaw as {id:string;title:string}[];
export const topicLabel = (d: Diagnosis) => d.topicKind === 'overview' ? 'Обзор темы' : d.topicKind === 'guide' ? 'Памятка' : 'О диагнозе';
export const parentGroup = (id: string) => diagnoses.find(d => d.children?.includes(id));
export const dxName = (d: Diagnosis) => d.shortTitle || d.title;

export type TreatmentRelation = 'condition'|'specialist'|'cooccurring'|'limited'|'not_recommended'|'safety';
export const treatmentRelationLabels:Record<TreatmentRelation,string>={
 condition:'Помогает при этом состоянии',
 specialist:'По особым показаниям',
 cooccurring:'При сопутствующей проблеме',
 limited:'Польза не доказана',
 not_recommended:'Не рекомендуется',
 safety:'Для побочных эффектов и безопасности'
};
export type TreatmentGuide = {diagnosisId:string; medicationId:string; relationKind:TreatmentRelation; summary:string; context:string; goals:string[]; questions?:string[]; sources:Source[]; updatedAt?:string};
export const treatmentGuides=guidesRaw as TreatmentGuide[];
export const treatmentGuideFor=(diagnosisId:string,medicationId:string)=>treatmentGuides.find(g=>g.diagnosisId===diagnosisId&&g.medicationId===medicationId);
export const treatmentGuidesForDiagnosis=(diagnosisId:string)=>treatmentGuides.filter(g=>g.diagnosisId===diagnosisId);
export const treatmentGuidesForMedication=(medicationId:string)=>treatmentGuides.filter(g=>g.medicationId===medicationId);

export type Limitation = {kind:'not_indicated'|'limited'|'harmful'|'adjunct';text:string};
export const limitationLabels:Record<Limitation['kind'],string>={not_indicated:'Не решает эту задачу',limited:'Данных недостаточно',harmful:'Может навредить',adjunct:'Нужна другая помощь вместе с этой'};
export type Specialist = {id:string;title:string;summary:string;domains:string[];helps:{situation:string;method:string;result:string}[];limitations:Limitation[];whatToCheck:string[];questions:string[];sources:Source[];updatedAt:string};
export type SupportProvider = {specialistId:string;goal:string;method:string;role:'core'|'conditional'};
export type NonpharmSupport = {diagnosisId:string;intro:string;priority?:string;providers:SupportProvider[];limitations:Limitation[];progress:string[];sources:Source[];updatedAt:string};
export const specialists=specialistsRaw as Specialist[];
// Parent-level filters on the specialists page; every specialist domain must belong to one of them (see tests).
export const specialistTasks:{id:string;title:string;domains:string[]}[]=[
 {id:'speech',title:'Речь и общение',domains:['Речь','Язык','Коммуникация','Общение']},
 {id:'school',title:'Учёба',domains:['Обучение','Школа','Чтение и письмо','Память','Планирование']},
 {id:'behavior',title:'Поведение',domains:['Поведение','Семья','Тики и привычки','Травля']},
 {id:'emotions',title:'Эмоции и тревога',domains:['Эмоции','Тревога','Настроение','Травма','Навязчивости','Самоповреждения']},
 {id:'development',title:'Развитие',domains:['Оценка развития','Развитие','Игра']},
 {id:'daily',title:'Движение и быт',domains:['Моторика','Движение','Координация','Реабилитация','Самостоятельность','Быт','Среда']},
 {id:'food',title:'Питание',domains:['Питание','Рост','РПП']}
];
export const nonpharmSupport=supportRaw as NonpharmSupport[];
export const specialistById=(id:string)=>specialists.find(s=>s.id===id);
export const supportForDiagnosis=(id:string)=>nonpharmSupport.find(s=>s.diagnosisId===id);
