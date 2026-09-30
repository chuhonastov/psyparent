import {leaves,diagnosisGroups,medications,specialists,nonpharmSupport,diagnosisById,dxName,topicLabel} from './content';
import {screeners} from './screeningContent';
import {journalTemplates} from './journalContent';
import {matchesQuery,normalizeQuery} from './search';
export type SearchHit={id:string;title:string;note:string;label?:string;to:string};
export type SearchGroup={id:'topics'|'medications'|'specialists'|'screenings'|'forms';title:string;hits:SearchHit[];total:number;moreTo:string};
type Entry={hit:SearchHit;names:string[];text:string};
// Aliases of the screening catalog filter (plus «тики»), so both searches find the same instruments.
const screeningAliases:Record<string,string>={snapiv:'снап внимание поведение',assq:'ассq асск аутизм',vanderbilt:'вандербильт сдвг',ygtss:'йельская туретт тики',rcads25:'ркадс тревога депрессия',crafft:'краффт алкоголь наркотики зависимость'};
function rank(query:string,entries:Entry[]){
  const q=normalizeQuery(query);
  return entries.filter(e=>matchesQuery(query,e.names,e.text)).map((e,i)=>{
    const names=e.names.map(normalizeQuery);
    const score=names.includes(q)?3:names.some(n=>n.startsWith(q))?2:names.some(n=>n.split(' ').some(w=>w.startsWith(q)))?1:0;
    return {e,score,i};
  }).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.e.hit);
}
let index:{id:SearchGroup['id'];title:string;entries:Entry[];more:(q:string)=>string}[]|undefined;
function buildIndex(){
  const q=encodeURIComponent;
  return [
    {id:'topics' as const,title:'Диагнозы и темы',more:(s:string)=>'/diagnoses?q='+q(s),entries:[
      ...leaves.map(d=>({hit:{id:d.id,title:dxName(d),note:d.summary,label:topicLabel(d),to:'/diagnoses/'+d.id},names:[d.title,d.shortTitle||'',...(d.aliases||[])],text:d.summary})),
      ...diagnosisGroups.map(g=>({hit:{id:g.id,title:g.title,note:g.summary,label:'Раздел',to:'/diagnoses/group/'+g.id},names:[g.title],text:g.summary}))]},
    {id:'medications' as const,title:'Препараты и памятки',more:(s:string)=>'/medications?q='+q(s),entries:medications.map(m=>({hit:{id:m.id,title:m.name,note:m.class,label:m.noteOnly?'Памятка':undefined,to:'/medications/'+m.id},names:[m.name,...(m.aliases||[]),...(m.searchTerms||[])],text:m.class}))},
    {id:'specialists' as const,title:'Специалисты',more:(s:string)=>'/specialists?q='+q(s),entries:specialists.map(s=>({hit:{id:s.id,title:s.title,note:s.domains.join(' · '),to:'/specialists/'+s.id},names:[s.title,...s.domains],text:s.summary+' '+nonpharmSupport.filter(p=>p.providers.some(x=>x.specialistId===s.id)).map(p=>{const d=diagnosisById(p.diagnosisId);return d?dxName(d):'';}).join(' ')}))},
    {id:'screenings' as const,title:'Тесты и шкалы',more:(s:string)=>'/screenings?q='+q(s),entries:screeners.map(s=>({hit:{id:s.id,title:s.name+' · '+s.title,note:s.ageLabel,to:'/screenings/'+s.id},names:[s.name,s.title],text:s.summary+' '+(screeningAliases[s.id]||'')}))},
    {id:'forms' as const,title:'Дневники и формы',more:(s:string)=>'/forms?q='+q(s),entries:journalTemplates.map(t=>({hit:{id:t.id,title:t.title,note:t.summary,to:'/forms/'+t.id},names:[t.title,t.domain],text:t.summary}))}
  ];
}
/** Searches every section at once; each group keeps its own "show all" link to the section's filtered list. */
export function searchEverything(query:string,limit=5):SearchGroup[]{
  if(!normalizeQuery(query))return [];
  index??=buildIndex();
  return index.map(g=>{const hits=rank(query,g.entries);return {id:g.id,title:g.title,hits:hits.slice(0,limit),total:hits.length,moreTo:g.more(query.trim())};}).filter(g=>g.total>0);
}
