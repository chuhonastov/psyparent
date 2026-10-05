import {leaves,diagnosisGroups,medications,specialists,nonpharmSupport,diagnosisById,dxName,topicLabel} from './content';
import {screeners} from './screeningContent';
import {journalTemplates} from './journalContent';
import {matchesQuery,normalizeQuery} from './search';
import glossaryRaw from '../content/glossary.json';
import {clinic} from './clinic';
import {investigations} from './investigations';
import {methods,methodVerdictLabels} from './methods';
import {navRoutes,navTopics} from './navigator';
import {matchAnswers,QueryLink} from './queries';
const glossary=glossaryRaw as {term:string;aka:string[];text:string}[];
export type SearchHit={id:string;title:string;note:string;label?:string;to:string;links?:QueryLink[];urgent?:boolean};
export type SearchGroup={id:'answers'|'navigator'|'topics'|'medications'|'specialists'|'exams'|'methods'|'screenings'|'forms'|'doctors'|'glossary';title:string;hits:SearchHit[];total:number;moreTo:string};
type Entry={hit:SearchHit;names:string[];text:string};
// Aliases of the screening catalog filter (plus «тики»), so both searches find the same instruments.
const screeningAliases:Record<string,string>={psc17:'пск эмоции поведение внимание',scared:'скаред тревога страхи',vanderbilt2002:'вандербильт сдвг внимание',snapiv:'снап внимание поведение',assq:'ассq асск аутизм',vanderbilt:'вандербильт сдвг',ygtss:'йельская туретт тики',rcads25:'ркадс тревога депрессия',crafft:'краффт алкоголь наркотики зависимость'};
function rank(query:string,entries:Entry[]){
  const q=normalizeQuery(query);
  return entries.filter(e=>matchesQuery(query,e.names,e.text)).map((e,i)=>{
    const names=e.names.map(normalizeQuery);
    const score=names.includes(q)?3:names.some(n=>n.startsWith(q))?2:names.some(n=>n.split(' ').some(w=>w.startsWith(q)))?1:0;
    return {e,score,i};
  }).sort((a,b)=>b.score-a.score||a.i-b.i);
}
// Words parents use for the navigator topics, which titles alone do not contain.
const NAV_KEYWORDS:Record<string,string[]>={uchet:['учёт','учет','диспансерное наблюдение'],free:['ПНД','диспансер','бесплатно'],pmpk:['ПМПК','комиссия','ОВЗ','адаптированная программа'],pmpk_docs:['ПМПК','документы'],pmpk_prep:['ПМПК'],disability:['инвалидность','МСЭ','ИПРА','пенсия'],school:['школа','адаптации','учитель'],tutor:['тьютор','ассистент'],home:['надомное','обучение на дому','домашнее обучение'],exams:['ОГЭ','ЕГЭ','ГВЭ','экзамены'],refuse:['отказ','жалоба','прокуратура'],adult:['18 лет','опека','дееспособность']};
let index:{id:SearchGroup['id'];title:string;entries:Entry[];more:(q:string)=>string}[]|undefined;
function buildIndex(){
  const q=encodeURIComponent;
  return [
    {id:'topics' as const,title:'Диагнозы и темы',more:(s:string)=>'/diagnoses?q='+q(s),entries:[
      ...leaves.map(d=>({hit:{id:d.id,title:dxName(d),note:d.summary,label:topicLabel(d),to:'/diagnoses/'+d.id},names:[d.title,d.shortTitle||'',...(d.aliases||[])],text:d.summary})),
      ...diagnosisGroups.map(g=>({hit:{id:g.id,title:g.title,note:g.summary,label:'Раздел',to:'/diagnoses/group/'+g.id},names:[g.title],text:g.summary}))]},
    {id:'medications' as const,title:'Препараты и памятки',more:(s:string)=>'/medications?q='+q(s),entries:medications.map(m=>({hit:{id:m.id,title:m.name,note:m.class,label:m.noteOnly?'Памятка':undefined,to:'/medications/'+m.id},names:[m.name,...(m.aliases||[]),...(m.searchTerms||[])],text:m.class}))},
    {id:'specialists' as const,title:'Специалисты',more:(s:string)=>'/specialists?q='+q(s),entries:specialists.map(s=>({hit:{id:s.id,title:s.title,note:s.domains.join(' · '),to:'/specialists/'+s.id},names:[s.title,...s.domains],text:s.summary+' '+nonpharmSupport.filter(p=>p.providers.some(x=>x.specialistId===s.id)).map(p=>{const d=diagnosisById(p.diagnosisId);return d?dxName(d):'';}).join(' ')}))},
    {id:'navigator' as const,title:'Навигатор по России',more:()=>'/navigator',entries:[
      ...navRoutes.map(r=>({hit:{id:'route-'+r.id,title:r.title,note:r.intro,label:'Маршрут',to:'/navigator/'+r.id},names:[r.title],text:r.intro})),
      ...navTopics.map(t=>({hit:{id:'topic-'+t.id,title:t.title,note:t.text,label:'Навигатор',to:'/navigator/topic/'+t.id},names:[t.title,...(NAV_KEYWORDS[t.id]||[])],text:t.text}))]},
    {id:'exams' as const,title:'Обследования',more:(s:string)=>'/exams?q='+q(s),entries:investigations.map(e=>({hit:{id:e.id,title:e.name,note:e.summary,label:e.kind==='dubious'?'Не рекомендуется':undefined,to:'/exams/'+e.id},names:[e.name,...e.aliases],text:e.summary}))},
    {id:'methods' as const,title:'Что не помогает',more:(s:string)=>'/methods?q='+q(s),entries:methods.map(m=>({hit:{id:m.id,title:m.name,note:m.summary,label:methodVerdictLabels[m.verdict],to:'/methods/'+m.id},names:[m.name,...m.aliases],text:m.summary}))},
    {id:'screenings' as const,title:'Тесты и шкалы',more:(s:string)=>'/screenings?q='+q(s),entries:screeners.filter(s=>!s.hidden).map(s=>({hit:{id:s.id,title:s.name+' · '+s.title,note:s.ageLabel,to:'/screenings/'+s.id},names:[s.name,s.title],text:s.summary+' '+(screeningAliases[s.id]||'')}))},
    {id:'doctors' as const,title:'Врачи клиники',more:()=>'/doctors',entries:clinic.doctors.map(d=>({hit:{id:d.id,title:d.name,note:d.role,label:'Запись',to:'/doctors/'+d.id},names:[d.name,d.role,...(d.specialties||[])],text:d.about||''}))},
    {id:'glossary' as const,title:'Словарь',more:(s:string)=>'/glossary?q='+q(s),entries:glossary.map(g=>({hit:{id:g.term,title:g.term,note:g.text,label:'Словарь',to:'/glossary?q='+q(g.term)},names:[g.term,...g.aka],text:g.text}))},
    {id:'forms' as const,title:'Дневники и формы',more:(s:string)=>'/forms?q='+q(s),entries:journalTemplates.map(t=>({hit:{id:t.id,title:t.title,note:t.summary,to:'/forms/'+t.id},names:[t.title,t.domain],text:t.summary}))}
  ];
}
/** Searches every section at once; each group keeps its own "show all" link to the section's filtered list. */
export function searchEverything(query:string,limit=5):SearchGroup[]{
  if(!normalizeQuery(query))return [];
  index??=buildIndex();
  const answers=matchAnswers(query).map(a=>({id:a.id,title:a.title,note:a.text,to:a.links[0].to,links:a.links,urgent:a.urgent}));
  // When an everyday question was recognised, entries that only mention the words in passing are left out:
  // «не спит» should not lead to a rare diagnosis whose description happens to say so.
  const groups=index.map(g=>{const hits=rank(query,g.entries).filter(x=>!answers.length||x.score>0).map(x=>x.e.hit);return {id:g.id,title:g.title,hits:hits.slice(0,limit),total:hits.length,moreTo:g.more(query.trim())};}).filter(g=>g.total>0);
  return answers.length?[{id:'answers' as const,title:'Похоже, вы ищете',hits:answers,total:answers.length,moreTo:''},...groups]:groups;
}
