import type {Child} from './children';
import {activeRuns,planById,planDay} from './plans';
import {belongsTo,Profile,GoalMeasure} from './profile';
import {activeCourses,changeLabel,courses,dayNumber,doseDirection as doseDirectionOf,eventKindLabels,inSentence,lastVisit,medLabel,EventKind,TreatmentEvent} from './treatment';
import {checkInPlan,countLabel,itemLabel,missedLabels,monitorNumbers,planIsEmpty,scaleLabels,summarizeCheckIn as summarizeCheckInText,urgentAnswers,CheckIn} from './monitoring';
import type {ScreeningResult} from './screenings';
import type {JournalRecord} from './journals';
import type {Appointment} from './appointment';
import {screenerById,Respondent} from './screeningContent';
const WHO:Record<Respondent,string>={parent:'родитель',teacher:'учитель',self:'сам ребёнок',clinician:'со специалистом'};
import {journalTemplate} from './journalContent';
import {plural} from './plural';
import {docKindLabels,DocMeta} from './documents';
// "Today" and "What changed since the last visit": both are computed from the family's own records, nothing is stored.
export type RouteData={child:Child;profile:Profile;events:TreatmentEvent[];checkIns:CheckIn[];screenings:ScreeningResult[];journals:JournalRecord[];appointment:Appointment|null;memoCount:number;today:string;docs?:DocMeta[]};
export type TodayItem={id:string;tone:'danger'|'warm'|'accent'|'neutral';icon:'alert'|'calendar'|'pill'|'check'|'clock'|'note';title:string;text?:string;to:string;priority:number};
const DAY=86400000;
export const addDays=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*DAY).toISOString().slice(0,10);
export const daysBetween=(from:string,to:string)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/DAY);
const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
export const dayMonth=(date:string)=>Number(date.slice(8,10))+' '+MONTHS[Number(date.slice(5,7))-1];
export const fullDate=(date:string)=>dayMonth(date)+' '+date.slice(0,4);
const ago=(days:number)=>days<=0?'сегодня':days===1?'вчера':days<7?days+' '+plural(days,'день','дня','дней')+' назад':Math.round(days/7)+' '+plural(Math.round(days/7),'неделю','недели','недель')+' назад';
export const childScreenings=(rows:ScreeningResult[],child:Child)=>rows.filter(r=>belongsTo(r,child));
export const childJournals=(rows:JournalRecord[],child:Child)=>rows.filter(r=>belongsTo(r,child));

export function todayItems(d:RouteData):TodayItem[]{
 const out:TodayItem[]=[],current=activeCourses(d.events),plan=checkInPlan(d.profile,current),last=d.checkIns[d.checkIns.length-1];
 if(last&&daysBetween(last.date,d.today)<=3){const urgent=urgentAnswers(last);if(urgent.length)out.push({id:'urgent-'+last.id,tone:'danger',icon:'alert',priority:0,title:'В последнем опросе есть тревожный признак',text:urgent.join(', ')+'. Свяжитесь с врачом, не дожидаясь приёма.',to:'/help'});}
 if(d.appointment){
  const days=daysBetween(d.today,d.appointment.date);
  if(days>=0&&days<=30){
   const when=[d.appointment.time,d.appointment.with].filter(Boolean).join(' · '),memo=d.memoCount?'В памятке '+d.memoCount+' '+plural(d.memoCount,'запись','записи','записей')+'.':'';
   out.push({id:'visit',tone:days<=3?'warm':'neutral',icon:'calendar',priority:days<=3?1:6,title:days===0?'Приём сегодня':days===1?'Приём завтра':'Приём через '+days+' '+plural(days,'день','дня','дней'),text:[when,memo].filter(Boolean).join('. ')||'Посмотрите, что изменилось с прошлого приёма.',to:'/visit'});
  }
 }
 for(const c of courses(d.events).filter(c=>dayNumber(c.since,d.today)<=(c.active?56:14)).slice(0,3)){
  const n=dayNumber(c.since,d.today),what=c.lastKind==='start'?'приёма':c.lastKind==='stop'?'после отмены':({up:'после увеличения дозы',down:'после снижения дозы',same:'после изменения приёма',unknown:'после изменения дозы'} as const)[c.direction];
  out.push({id:'course-'+c.key,tone:'accent',icon:'pill',priority:4,title:n+'-й день '+what,text:c.label+(c.active&&c.dose?': '+c.dose:'')+(c.previousDose?' (было '+c.previousDose+')':''),to:'/child/timeline'});
 }
 if(!planIsEmpty(plan)){
  const lastChange=current.map(c=>c.since).sort().pop(),since=last?daysBetween(last.date,d.today):Infinity,every=activeRuns(d.profile).length?7:d.profile.checkinEvery??7;
  // «Only before a visit» asks in the week before the appointment; a dose change still asks a few days later.
  const visitSoon=!!d.appointment&&daysBetween(d.today,d.appointment.date)>=0&&daysBetween(d.today,d.appointment.date)<=7;
  const changed=!!lastChange&&(!last||last.date<lastChange)&&dayNumber(lastChange,d.today)>=4;
  const due=every===0?(visitSoon&&since>=4)||changed:!last||since>=every||changed;
  const asked=plan.goals.length+plan.items.length+plan.numbers.length+(plan.askMissed?1:0);
  if(due)out.push({id:'checkin',tone:'accent',icon:'check',priority:3,title:'Короткий опрос: как прошла неделя',text:asked+' '+plural(asked,'вопрос','вопроса','вопросов')+', около минуты.'+(last?' Прошлый — '+ago(since)+'.':''),to:'/child/check-in'});
 }
 // A mini-plan: the next step of the current week, and after two weeks — look at the result.
 for(const run of activeRuns(d.profile)){
  const plan=planById(run.planId);if(!plan)continue;
  const {day,week,over}=planDay(run,d.today);
  if(over)out.push({id:'plan-end-'+run.id,tone:'accent',icon:'check',priority:2,title:'Две недели плана «'+plan.title+'» прошли',text:'Посмотрите, что изменилось, и решите: продолжить или завершить.',to:'/plans/'+plan.id});
  else{const next=plan.weeks[week].steps.find(s=>!run.done.includes(s.id));out.push({id:'plan-'+run.id+'-'+week,tone:'neutral',icon:'note',priority:5,title:'План «'+plan.title+'» · день '+day+' из 14',text:next?next.text:'Шаги этой недели отмечены — продолжайте в том же духе.',to:'/plans/'+plan.id});}
 }
 // «А как вы сами?» — any answer worse than «нормально» in the last week's check-in offers support for the parent.
 if(last&&last.parent!==undefined&&last.parent>=1&&daysBetween(last.date,d.today)<=7)out.push(last.parent>=2
  ?{id:'parent-'+last.id,tone:'warm',icon:'note',priority:2,title:'Вам сейчас очень тяжело',text:'Несколько слов о том, как поберечь себя и где искать помощь для себя.',to:'/parent'}
  :{id:'parent-'+last.id,tone:'warm',icon:'note',priority:5,title:'Неделя была непростой',text:'Как поберечь себя, пока не стало совсем тяжело: пара простых шагов.',to:'/parent'});
 for(const id of d.profile.tracking.journals){
  const t=journalTemplate(id);if(!t)continue;
  const rows=childJournals(d.journals,d.child).filter(r=>r.templateId===id),lastDate=rows.map(r=>r.date).sort().pop();
  if(lastDate===d.today)continue;
  out.push({id:'journal-'+id,tone:'neutral',icon:'clock',priority:5,title:t.title,text:lastDate?'Последняя запись — '+ago(daysBetween(lastDate,d.today))+'.':'Записей пока нет.',to:'/forms/'+id});
 }
 // Answers that came back from a teacher in the last three days.
 const fresh=(at:string)=>daysBetween(at.slice(0,10),d.today)<=3;
 const teacher=[...childScreenings(d.screenings,d.child).filter(r=>r.respondent==='teacher'&&fresh(r.createdAt)).map(r=>({id:r.id,title:screenerById(r.screenerId)?.name||'Шкала',to:'/screenings/result/'+r.id})),...childJournals(d.journals,d.child).filter(r=>r.respondent==='teacher'&&fresh(r.createdAt)).map(r=>({id:r.id,title:journalTemplate(r.templateId)?.title||'Наблюдения педагога',to:'/forms/record/'+r.id}))];
 if(teacher.length)out.push({id:'teacher',tone:'accent',icon:'note',priority:2,title:'Новые ответы учителя',text:teacher.map(t=>t.title).join(', ')+(d.memoCount?'. Они могут войти в памятку врачу.':''),to:teacher[0].to});
 if(current.length){
  const latest=new Map<string,ScreeningResult>();
  for(const r of childScreenings(d.screenings,d.child))if(!['mchat','ygtss'].includes(r.screenerId)){const k=r.screenerId+'|'+r.respondent,o=latest.get(k);if(!o||o.completedDate<r.completedDate)latest.set(k,r);}
  const stale=[...latest.values()].filter(r=>daysBetween(r.completedDate,d.today)>=28).sort((a,b)=>a.completedDate.localeCompare(b.completedDate))[0];
  if(stale){const weeks=Math.floor(daysBetween(stale.completedDate,d.today)/7);out.push({id:'screen-'+stale.screenerId,tone:'neutral',icon:'note',priority:7,title:'Повторить '+screenerById(stale.screenerId)!.name,text:'С прошлого раза '+weeks+' '+plural(weeks,'неделя','недели','недель')+' — повтор покажет, как меняется состояние.',to:'/screenings/'+stale.screenerId});}
 }
 return out.sort((a,b)=>a.priority-b.priority);
}

export type Trend={label:string;measure:GoalMeasure;first:number;last:number;n:number};
export type ChangeReport={from:string;to:string;weeks:number;sinceVisit:boolean;
 meds:{date:string;text:string}[];current:{label:string;dose?:string;since:string}[];
 goals:Trend[];effects:{label:string;max:number}[];numbers:{label:string;first:number;last:number;unit:string}[];missed:number|null;
 scales:{name:string;respondent:string;before?:number;after:number;max:number}[];notes:{date:string;kind:EventKind;text:string}[];
 journals:{title:string;count:number}[];checkIns:number;questions:number;docs:{date:string;title:string;note:string}[]};
/** Everything recorded for the child between the last visit (or the chosen number of weeks) and today. */
export function changeReport(d:RouteData,weeks?:number):ChangeReport{
 const visit=lastVisit(d.events,d.today),sinceVisit=!weeks&&!!visit&&daysBetween(visit,d.today)<=183;
 const from=sinceVisit?visit!:addDays(d.today,-7*(weeks||6)),inside=(date:string)=>date>=from&&date<=d.today;
 const all=courses(d.events),meds:ChangeReport['meds']=[];
 for(const c of all)c.history.forEach((e,i)=>{if(!inside(e.date))return;const prev=c.history.slice(0,i).filter(x=>x.kind!=='stop').pop();
  meds.push({date:e.date,text:e.kind==='start'?c.label+' — начат'+(e.dose?', '+e.dose:''):e.kind==='stop'?c.label+' — отменён':c.label+': '+(e.dose||'')+(prev?.dose?' (было '+prev.dose+')':'')});});
 meds.sort((a,b)=>a.date.localeCompare(b.date));
 const checks=d.checkIns.filter(c=>inside(c.date));
 const goals:Trend[]=d.profile.goals.flatMap(g=>{const v=checks.filter(c=>c.goals[g.id]!==undefined).map(c=>c.goals[g.id]);return v.length?[{label:g.text,measure:g.measure,first:v[0],last:v[v.length-1],n:v.length}]:[];});
 const effectMax=new Map<string,number>();
 for(const c of checks)for(const [id,v] of Object.entries(c.items))if(v>0)effectMax.set(id,Math.max(effectMax.get(id)||0,v));
 const numbers=Object.keys(monitorNumbers).flatMap(id=>{const v=checks.filter(c=>c.numbers[id]!==undefined).map(c=>c.numbers[id]);return v.length?[{label:monitorNumbers[id].label,first:v[0],last:v[v.length-1],unit:monitorNumbers[id].unit}]:[];});
 const missed=checks.some(c=>c.missed!==undefined)?Math.max(...checks.map(c=>c.missed??0)):null;
 const results=childScreenings(d.screenings,d.child).slice().sort((a,b)=>a.completedDate.localeCompare(b.completedDate)),groups=new Map<string,ScreeningResult[]>();
 for(const r of results)groups.set(r.screenerId+'|'+r.respondent,[...(groups.get(r.screenerId+'|'+r.respondent)||[]),r]);
 const scales:ChangeReport['scales']=[];
 for(const rows of groups.values()){
  const inPeriod=rows.filter(r=>inside(r.completedDate));if(!inPeriod.length)continue;
  const after=inPeriod[inPeriod.length-1],before=rows.filter(r=>r.completedDate<from).pop()||(inPeriod.length>1?inPeriod[0]:undefined);
  scales.push({name:screenerById(after.screenerId)?.name||after.screenerId,respondent:WHO[after.respondent],before:before?.score.total,after:after.score.total,max:after.score.max});
 }
 const notes=d.events.filter(e=>inside(e.date)&&!['start','dose','stop'].includes(e.kind)&&(e.text||e.kind==='visit')).map(e=>({date:e.date,kind:e.kind,text:e.text||''}));
 const jCount=new Map<string,number>();for(const r of childJournals(d.journals,d.child))if(inside(r.date))jCount.set(r.templateId,(jCount.get(r.templateId)||0)+1);
 return {from,to:d.today,weeks:Math.max(1,Math.round(daysBetween(from,d.today)/7)),sinceVisit,meds,current:activeCourses(d.events).map(c=>({label:c.label,dose:c.dose,since:c.since})),
  goals,effects:[...effectMax.entries()].map(([id,max])=>({label:itemLabel(id,d.profile)||id,max})).sort((a,b)=>b.max-a.max),numbers,missed,scales,notes,
  journals:[...jCount.entries()].map(([id,count])=>({title:journalTemplate(id)?.title||id,count})),checkIns:checks.length,questions:d.memoCount,
  docs:(d.docs||[]).filter(x=>inside(x.date)).map(x=>({date:x.date,title:x.title,note:x.note})).sort((a,b)=>a.date.localeCompare(b.date))};
}
export const reportIsEmpty=(r:ChangeReport)=>!r.docs.length&&!r.meds.length&&!r.goals.length&&!r.effects.length&&!r.numbers.length&&!r.scales.length&&!r.notes.length&&!r.journals.length&&!r.checkIns;
const num=(v:number)=>String(Math.round(v*10)/10).replace('.',',');
export function trendWord(t:Trend){
 if(t.n<2||t.first===t.last)return t.n<2?'':'без изменений';
 return t.last<t.first?'лучше':'хуже';
}
export const trendValue=(t:Trend,v:number)=>t.measure==='count'?String(v):scaleLabels[v].toLocaleLowerCase('ru');
export function formatChanges(r:ChangeReport,childTitle:string){
 const L=[(r.sinceVisit?'ЧТО ИЗМЕНИЛОСЬ С ПРОШЛОГО ПРИЁМА':'ЧТО ИЗМЕНИЛОСЬ ЗА '+r.weeks+' '+plural(r.weeks,'НЕДЕЛЮ','НЕДЕЛИ','НЕДЕЛЬ'))+' · '+childTitle,'Период: '+fullDate(r.from)+' — '+fullDate(r.to)];
 if(r.meds.length){L.push('','Лечение:');r.meds.forEach(m=>L.push('• '+dayMonth(m.date)+': '+m.text));}
 if(r.current.length)L.push((r.meds.length?'':'\n')+'Сейчас: '+r.current.map(c=>c.label+(c.dose?' '+c.dose:'')+' (с '+dayMonth(c.since)+')').join('; '));
 if(r.checkIns){
  L.push('','По еженедельным опросам родителя ('+r.checkIns+'):');
  r.goals.forEach(t=>L.push('• '+t.label+': '+(t.n>1?trendValue(t,t.first)+' → ':'')+trendValue(t,t.last)+(t.measure==='count'?' '+countLabel:'')+(trendWord(t)&&t.measure==='severity'?' ('+trendWord(t)+')':'')));
  if(r.effects.length)L.push('• Отмечались: '+r.effects.map(e=>e.label.toLocaleLowerCase('ru')+' — '+scaleLabels[e.max].toLocaleLowerCase('ru')).join('; '));
  r.numbers.forEach(n=>L.push('• '+n.label+': '+(n.first!==n.last?num(n.first)+' → ':'')+num(n.last)+' '+n.unit));
  if(r.missed!==null)L.push('• Пропуски приёма: '+missedLabels[r.missed].toLocaleLowerCase('ru'));
 }
 if(r.scales.length){L.push('','Шкалы (не диагноз):');r.scales.forEach(s=>L.push('• '+s.name+' ('+s.respondent+'): '+(s.before!==undefined?s.before+' → ':'')+s.after+' из '+s.max));}
 if(r.notes.length){L.push('','Записи в ленте:');r.notes.forEach(n=>L.push('• '+dayMonth(n.date)+' — '+eventKindLabels[n.kind]+(n.text?': '+n.text:'')));}
 if(r.docs.length){L.push('','Документы:');r.docs.forEach(x=>L.push('• '+dayMonth(x.date)+' — '+x.title+(x.note?': '+x.note:'')));}
 if(r.journals.length)L.push('','Дневники: '+r.journals.map(j=>j.title+' — '+j.count+' '+plural(j.count,'запись','записи','записей')).join('; '));
 if(r.questions)L.push('','Вопросов и записей в памятке: '+r.questions);
 return L.join('\n');
}
export {medLabel,changeLabel};

export type EntryGroup='treatment'|'state'|'scales'|'docs';
export type TimelineEntry={key:string;date:string;order:string;group:EntryGroup;tag:string;tone:'accent'|'warm'|'danger'|'neutral';title:string;text?:string;to?:string;eventId?:string;checkInId?:string};
const arrow={up:' ↑',down:' ↓',same:'',unknown:''} as const;
/** Every dated record of the child on one line: medicines, visits, notes, check-ins, scales and diaries. */
export function timelineEntries(d:RouteData):TimelineEntry[]{
 const out:TimelineEntry[]=[];
 for(const c of courses(d.events))c.history.forEach((e,i)=>{
  const prev=c.history.slice(0,i).filter(x=>x.kind!=='stop').pop(),dir=e.kind==='dose'?doseDirectionOf(prev?.dose,e.dose):'unknown';
  out.push({key:e.id,eventId:e.id,date:e.date,order:e.createdAt,group:'treatment',tag:eventKindLabels[e.kind]+(e.kind==='dose'?arrow[dir]:''),tone:e.kind==='stop'?'neutral':'accent',
   title:c.label+(e.kind!=='stop'&&e.dose?' — '+e.dose:''),text:[e.kind==='dose'&&prev?.dose?'Было: '+prev.dose:'',e.text||''].filter(Boolean).join('. ')||undefined});
 });
 for(const e of d.events)if(!['start','dose','stop'].includes(e.kind))out.push({key:e.id,eventId:e.id,date:e.date,order:e.createdAt,group:e.kind==='visit'?'treatment':e.kind==='exam'?'scales':'state',tag:eventKindLabels[e.kind],tone:e.kind==='side'?'warm':e.kind==='visit'?'accent':'neutral',title:e.kind==='visit'?(e.text||'Приём врача'):e.text||''});
 for(const c of d.checkIns){const urgent=urgentAnswers(c);out.push({key:c.id,checkInId:c.id,date:c.date,order:c.createdAt,group:'state',tag:'Опрос за неделю',tone:urgent.length?'danger':'neutral',title:summarizeCheckInText(c,d.profile),text:c.note||undefined});}
 const results=childScreenings(d.screenings,d.child).slice().sort((a,b)=>a.completedDate.localeCompare(b.completedDate));
 results.forEach((r,i)=>{const prev=results.slice(0,i).filter(x=>x.screenerId===r.screenerId&&x.respondent===r.respondent).pop();
  out.push({key:r.id,date:r.completedDate,order:r.createdAt,group:'scales',tag:'Шкала',tone:'neutral',title:(screenerById(r.screenerId)?.name||r.screenerId)+' ('+WHO[r.respondent]+'): '+(prev?prev.score.total+' → ':'')+r.score.total+' из '+r.score.max,text:r.score.label,to:'/screenings/result/'+r.id});});
 for(const doc of d.docs||[])out.push({key:doc.id,date:doc.date,order:doc.createdAt,group:'docs',tag:docKindLabels[doc.kind],tone:'neutral',title:doc.title,text:doc.note||undefined,to:'/child/documents'});
 for(const r of childJournals(d.journals,d.child))out.push({key:r.id,date:r.date,order:r.createdAt,group:'state',tag:'Дневник',tone:'neutral',title:journalTemplate(r.templateId)?.title||'Дневник',to:'/forms/record/'+r.id});
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.order.localeCompare(b.order));
}
export function formatTimeline(entries:TimelineEntry[],childTitle:string){
 const L=['ЛЕНТА ЛЕЧЕНИЯ · '+childTitle,'Записи семьи по датам. Дозы переписаны из назначений врача.'];
 let day='';
 for(const e of entries){if(e.date!==day){day=e.date;L.push('',fullDate(e.date));}L.push('• '+e.tag+': '+e.title+(e.text?' ('+e.text+')':''));}
 L.push('','Составлено в приложении «Кора». Это записи семьи, а не медицинский документ.');
 return L.join('\n');
}
