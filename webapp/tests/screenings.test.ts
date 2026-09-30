import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {SCREENING_KEY,createScreening,formatScreening,getScreenings,includeScreening,localDate,normalizeScreenings,removeScreening,saveScreening,scoreScreening,subscribeScreenings,validateScreening,ScreeningInput} from '../src/lib/screenings';
import {screeners,ScreeningId,Screener,scaleFields,matchesScreeningAge} from '../src/lib/screeningContent';
import {formatVisit} from '../src/lib/export';
import {getVisit,addVisitQuestion,clearVisit} from '../src/lib/visit';
import {deleteLocalData} from '../src/lib/persist';
class MemoryStorage{[key:string]:any;getItem(k:string){return Object.hasOwn(this,k)?this[k]:null;}setItem(k:string,v:string){this[k]=v;}removeItem(k:string){delete this[k];}}
beforeEach(()=>{Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});});
const base=(extra:Partial<ScreeningInput>={}):ScreeningInput=>({childLabel:'Старший',age:14,respondent:'self',completedDate:localDate(),notes:'',answers:Array(9).fill(0),...extra});
const mchat=(total:number,extra:Partial<ScreeningInput>={})=>base({age:24,respondent:'parent',answers:undefined,total,...extra});
function extraInput(id:ScreeningId,extra:Partial<ScreeningInput>={}):ScreeningInput{
 const s=screeners.find(s=>s.id===id)!;
 const measurements=Object.fromEntries(scaleFields(id,s.respondents[0]).filter(f=>!f.optional).map(f=>[f.id,0]));
 return base({age:s.ageMin,respondent:s.respondents[0],answers:undefined,total:id==='ygtss'?undefined:0,measurements,sourceForm:s.translation,clinicianConfirmed:id==='ygtss'?true:undefined,...extra});
}
function validInput(s:Screener):ScreeningInput{
 if(s.mode==='embedded')return base({age:s.ageMin,respondent:s.respondents[0],answers:Array(s.questions!.length).fill(0)});
 if(s.id==='mchat')return mchat(2);
 if(s.id==='sdq')return base({respondent:'parent',total:0,answers:undefined});
 return extraInput(s.id);
}
function answersFor(total:number,count:number){const a=Array(count).fill(0);for(let i=0;i<count;i++){a[i]=Math.min(3,total);total-=a[i];}return a;}
test('all PHQ-9 and GAD-7 totals follow the documented bands without treating missing answers as zero',()=>{
 for(const [id,count,max,bands] of [['phq9',9,27,[0,5,10,15,20]],['gad7',7,21,[0,5,10,15]]] as const){
  for(let total=0;total<=max;total++){
   const r=scoreScreening(id,base({answers:answersFor(total,count)}));
   assert.equal(r.total,total);assert.equal(r.max,max);
   const band=bands.filter(b=>total>=b).length-1;
   const labels=id==='phq9'?['Минимальная','Небольшая','Умеренная','Выраженные','Значительно']:['Минимальная','Небольшая','Умеренная','Выраженные'];
   assert(r.label.startsWith(labels[band]));
  }
  assert.throws(()=>scoreScreening(id,base({answers:[]})));
  assert.throws(()=>scoreScreening(id,base({answers:Array(count).fill(-1)})));
  assert.throws(()=>scoreScreening(id,base({answers:Array(count).fill('0' as any)})));
  assert.throws(()=>scoreScreening(id,base({answers:[...Array(count-1).fill(0),0.5]})));
 }
});
test('PHQ-9 safety handling overrides even a total of 1; impact is not added to the sum',()=>{
 const a=Array(9).fill(0);a[8]=1;
 const r=scoreScreening('phq9',base({answers:a,impact:3}));
 assert.equal(r.total,1);assert.equal(r.safety,true);assert.equal(r.status,'priority');assert.match(r.next,/сегодня/);assert.match(r.next,/112/);
 const zero=scoreScreening('phq9',base());assert.equal(zero.safety,false);assert.match(zero.next,/не оценивает безопасность/);
});
test('M-CHAT separates all initial-score boundaries and both follow-up outcomes',()=>{
 for(let total=0;total<=20;total++){
  const input=mchat(total,total>=3&&total<=7?{followUpDone:false}:{}),r=scoreScreening('mchat',input);
  assert.equal(r.status,total<=2?'low':total<=7?'followup':'priority');
  if(total>=3&&total<=7){
   for(let followUpScore=0;followUpScore<=total;followUpScore++)assert.equal(scoreScreening('mchat',mchat(total,{followUpDone:true,followUpScore})).status,followUpScore<2?'low':'priority');
  }
 }
 assert.throws(()=>scoreScreening('mchat',mchat(3)));
 assert.throws(()=>scoreScreening('mchat',mchat(3,{followUpDone:true,followUpScore:4})));
 assert.throws(()=>scoreScreening('mchat',mchat(3,{followUpDone:false,followUpScore:0})));
 assert.throws(()=>scoreScreening('mchat',mchat(8,{followUpDone:true,followUpScore:0})));
 assert.throws(()=>scoreScreening('mchat',mchat(-1)));assert.throws(()=>scoreScreening('mchat',mchat(21)));
});
test('screeners reject wrong ages, respondents, impossible dates and unlabelled children',()=>{
 for(const s of screeners){
  const input=validInput(s);
  for(const age of [s.ageMin-1,s.ageMax+1,NaN,14.5])assert(validateScreening(s.id,{...input,age}).length);
  for(const age of [s.ageMin,s.ageMax])assert.equal(validateScreening(s.id,{...input,age}).length,0);
  assert(validateScreening(s.id,{...input,childLabel:' '}).length);
  assert(validateScreening(s.id,{...input,completedDate:'2026-02-30'}).length);
  assert(validateScreening(s.id,{...input,completedDate:'2099-01-01'}).length);
 }
 assert(validateScreening('sdq',base({age:10,total:0,answers:undefined})).length);
 assert(validateScreening('phq9',base({respondent:'parent'})).length);
});
test('SDQ stores raw scores without a risk diagnosis and excludes prosocial score from the total',()=>{
 const input=base({respondent:'parent',age:8,answers:undefined,total:10,subscales:{emotional:1,conduct:2,hyperactivity:3,peer:4,prosocial:10}});
 assert.equal(scoreScreening('sdq',input).status,'recorded');
 assert.throws(()=>scoreScreening('sdq',{...input,total:20}));
 assert.throws(()=>scoreScreening('sdq',{...input,subscales:{emotional:11}}));
 assert.throws(()=>scoreScreening('sdq',{...input,total:41}));
 assert.equal(validateScreening('sdq',{...input,subscales:{emotional:1}}).length,0);
});
test('history preserves repeated measures and multiple children; only selected records enter visit export',()=>{
 const first=createScreening('phq9',base({notes:'Первый результат'})),second=createScreening('mchat',mchat(5,{childLabel:'Младший',followUpDone:false,notes:'Ждём интервью'}));
 assert(saveScreening(first));assert(saveScreening(first));assert(saveScreening(second));assert.equal(getScreenings().length,2);
 const reloaded=getScreenings();assert.equal(reloaded.find(r=>r.id===first.id)!.score.total,0);
 addVisitQuestion('Важный вопрос');
 let text=formatVisit(getVisit());assert.match(text,/Важный вопрос/);assert.match(text,/Старший/);assert.match(text,/Младший/);assert.match(text,/Follow-Up не проведён/);assert.match(text,/1\. Вам не хотелось/);
 includeScreening(first.id,false);text=formatVisit(getVisit());assert(!text.includes('Старший'));assert(text.includes('Младший'));
 clearVisit();assert.equal(getScreenings().length,2);assert.match(formatVisit(getVisit()),/Младший/);
 removeScreening(second.id);assert.equal(getScreenings().length,1);assert(!formatVisit(getVisit()).includes('Младший'));
});
test('saved score is recalculated from answers and corrupt records cannot break history',()=>{
 const r=createScreening('gad7',base({answers:[1,1,1,1,1,1,1]}));
 const rows=normalizeScreenings({version:1,results:[null,{...r,score:{total:999,label:'Диагноз'}},r,{...r,id:'bad',answers:[3]}]});
 assert.equal(rows.length,1);assert.equal(rows[0].score.total,7);
 assert.deepEqual(normalizeScreenings({version:2,results:[r]}),[]);
 localStorage.setItem(SCREENING_KEY,'{bad json');assert.deepEqual(getScreenings(),[]);
});
test('exports include instrument, version, respondent, age, source and item-level safety signal',()=>{
 const answers=Array(9).fill(0);answers[8]=1;
 const text=formatScreening(createScreening('phq9',base({answers,impact:2,notes:'Просьба обсудить'})));
 for(const part of ['PHQ-9','phq9-ru-1','Сам ребёнок / подросток','14 лет','https://','пункт 9 PHQ-9 выше нуля','Очень трудно','Просьба обсудить'])assert(text.includes(part),part);
});
test('storage failure never reports success or modifies the existing history',()=>{
 const first=createScreening('phq9',base());saveScreening(first);
 localStorage.setItem=()=>{throw new Error('quota');};
 assert.equal(saveScreening(createScreening('phq9',base())),false);
 assert.equal(includeScreening(first.id,false),false);assert.equal(removeScreening(first.id),false);
 assert.equal(getScreenings().length,1);assert.equal(getScreenings()[0].includeInVisit,true);
});
test('delete-all clears screening history and refreshes subscribers while preserving other app data',()=>{
 saveScreening(createScreening('phq9',base()));localStorage.setItem('other.app','keep');let changes=0;const off=subscribeScreenings(()=>changes++);
 assert(deleteLocalData());assert.equal(changes,1);assert.deepEqual(getScreenings(),[]);assert.equal(localStorage.getItem('other.app'),'keep');off();
});

test('all ten instruments have valid topic links and correct age filters in years / months',async()=>{
 const {leaves}=await import('../src/lib/content');
 assert.equal(screeners.length,10);assert.equal(new Set(screeners.map(s=>s.id)).size,10);
 for(const s of screeners){for(const id of s.related)assert(leaves.some(d=>d.id===id),s.id+' points to '+id);assert.equal(validateScreening(s.id,validInput(s)).length,0);}
 const m=screeners.find(s=>s.id==='mchat')!,v=screeners.find(s=>s.id==='vanderbilt')!;
 assert(!matchesScreeningAge(m,15,'months'));assert(matchesScreeningAge(m,16,'months'));assert(matchesScreeningAge(m,30,'months'));assert(!matchesScreeningAge(m,31,'months'));
 assert(matchesScreeningAge(m,2,'years'));assert(!matchesScreeningAge(v,71,'months'));assert(matchesScreeningAge(v,72,'months'));assert(matchesScreeningAge(v,155,'months'));assert(!matchesScreeningAge(v,156,'months'));
});
test('ASSQ accepts 0–54 without inventing a universal threshold and retains the actual form',()=>{
 for(let total=0;total<=54;total++){const r=scoreScreening('assq',extraInput('assq',{total}));assert.equal(r.total,total);assert.equal(r.status,'recorded');}
 for(const total of [-1,55,0.5,NaN])assert.throws(()=>scoreScreening('assq',extraInput('assq',{total})));
 assert.throws(()=>scoreScreening('assq',extraInput('assq',{sourceForm:''})));
});
test('Vanderbilt needs symptom and performance thresholds; parent / teacher comorbid rules stay distinct',()=>{
 const input=extraInput('vanderbilt',{total:12,measurements:{inattention:6,hyperactivity:0,performance:1}});
 assert.equal(scoreScreening('vanderbilt',input).status,'discuss');
 assert.equal(scoreScreening('vanderbilt',{...input,measurements:{...input.measurements,performance:0}}).status,'recorded');
 assert.equal(scoreScreening('vanderbilt',{...input,measurements:{inattention:5,hyperactivity:0,performance:1}}).status,'recorded');
 const hyper={...input,measurements:{inattention:0,hyperactivity:6,performance:1}};assert.equal(scoreScreening('vanderbilt',hyper).status,'discuss');
 const parent=extraInput('vanderbilt',{measurements:{inattention:0,hyperactivity:0,performance:1,opposition:4,conduct:3,anxietyDepression:3}});
 for(const part of ['оппозиционные','поведение','тревога'])assert(scoreScreening('vanderbilt',parent).next.includes(part));
 assert.equal(scoreScreening('vanderbilt',{...parent,measurements:{...parent.measurements,performance:0}}).status,'recorded');
 const teacher=extraInput('vanderbilt',{respondent:'teacher',measurements:{inattention:0,hyperactivity:0,performance:1,oppositionConduct:3,anxietyDepression:3}});
 assert.equal(scoreScreening('vanderbilt',teacher).status,'discuss');
 assert.throws(()=>scoreScreening('vanderbilt',{...teacher,measurements:{...teacher.measurements,opposition:4}}));
});
test('Vanderbilt rejects totals inconsistent with all possible counts of positive symptom items',()=>{
 for(let a=0;a<=9;a++)for(let h=0;h<=9;h++){
  const m={inattention:a,hyperactivity:h,performance:0},min=2*(a+h),max=18+2*(a+h);
  assert.equal(validateScreening('vanderbilt',extraInput('vanderbilt',{total:min,measurements:m})).length,0);
  assert.equal(validateScreening('vanderbilt',extraInput('vanderbilt',{total:max,measurements:m})).length,0);
  if(min>0)assert(validateScreening('vanderbilt',extraInput('vanderbilt',{total:min-1,measurements:m})).length);
  if(max<54)assert(validateScreening('vanderbilt',extraInput('vanderbilt',{total:max+1,measurements:m})).length);
 }
 assert.throws(()=>scoreScreening('vanderbilt',extraInput('vanderbilt',{measurements:{inattention:0,hyperactivity:0}})));
});
test('YGTSS-R keeps tic totals, impairment and global scores separate and requires the clinical procedure',()=>{
 const m=Object.fromEntries(scaleFields('ygtss','clinician').map(f=>[f.id,f.max]));
 const r=scoreScreening('ygtss',extraInput('ygtss',{measurements:m}));
 assert.equal(r.total,50);assert.equal(r.max,50);assert.deepEqual(r.metrics!.map(m=>m.value),[25,25,50,100]);assert.equal(r.status,'recorded');
 assert.equal(scoreScreening('ygtss',extraInput('ygtss')).total,0);
 assert.throws(()=>scoreScreening('ygtss',extraInput('ygtss',{clinicianConfirmed:false})));
 assert.throws(()=>scoreScreening('ygtss',extraInput('ygtss',{respondent:'parent'})));
 for(const impairment of [1,15,49,51])assert.throws(()=>scoreScreening('ygtss',extraInput('ygtss',{measurements:{...m,impairment}})));
 assert.throws(()=>scoreScreening('ygtss',extraInput('ygtss',{measurements:{...m,motor0:0}})));
 const missing={...m};delete missing.vocal2;assert.throws(()=>scoreScreening('ygtss',extraInput('ygtss',{measurements:missing})));
});
test('RCADS-25 checks raw total and optional subscales without foreign T-score categories',()=>{
 const i=extraInput('rcads25',{total:30,measurements:{anxiety:20,depression:10}});
 assert.equal(scoreScreening('rcads25',i).status,'recorded');assert.equal(scoreScreening('rcads25',i).max,75);
 assert.equal(validateScreening('rcads25',{...i,measurements:{anxiety:20}}).length,0);
 for(const measurements of [{anxiety:21,depression:10},{anxiety:31},{depression:31},{anxiety:46}])assert.throws(()=>scoreScreening('rcads25',{...i,measurements}));
 assert.throws(()=>scoreScreening('rcads25',{...i,total:75,measurements:{anxiety:0}}));
 assert.equal(validateScreening('rcads25',{...i,total:75,measurements:{anxiety:45,depression:30}}).length,0);
});
test('CRAFFT retains the CAR signal at low totals and excludes new records from the visit by default',()=>{
 for(const [total,car,status] of [[0,0,'recorded'],[1,1,'recorded'],[2,0,'discuss'],[6,1,'discuss']] as const)assert.equal(scoreScreening('crafft',extraInput('crafft',{total,measurements:{car}})).status,status);
 const row=createScreening('crafft',extraInput('crafft',{total:1,measurements:{car:1},childLabel:'Конфиденциально'}));
 assert.match(row.score.next,/безопасный транспорт/);assert.equal(row.includeInVisit,false);assert(saveScreening(row));assert(!formatVisit(getVisit()).includes('Конфиденциально'));
 assert(includeScreening(row.id,true));assert(formatVisit(getVisit()).includes('Конфиденциально'));
 for(const [total,car] of [[0,1],[6,0]])assert.throws(()=>scoreScreening('crafft',extraInput('crafft',{total,measurements:{car}})));
});
test('new forms round-trip complete measurements and export alongside unchanged earlier instrument versions',()=>{
 for(const s of screeners){const row=createScreening(s.id,validInput(s));assert(saveScreening(row));const loaded=getScreenings().find(r=>r.id===row.id)!;assert.equal(loaded.score.total,row.score.total);assert.equal(loaded.instrumentVersion,row.instrumentVersion);assert.deepEqual(loaded.measurements,row.measurements);const text=formatScreening(loaded);assert(text.includes(s.version));if(row.sourceForm)assert(text.includes(row.sourceForm));}
 assert.equal(getScreenings().length,10);
 const oldVersions=['phq9-ru-1','gad7-ru-1','mchat-rf-record-1','sdq-record-1'];for(const v of oldVersions)assert(getScreenings().some(r=>r.instrumentVersion===v));
 const y=getScreenings().find(r=>r.screenerId==='ygtss')!;assert.match(formatScreening(y),/Глобальный балл: 0 \/ 100/);assert.match(formatScreening(y),/последняя неделя/);
});
test('malformed extra-form metadata cannot crash or erase valid history',()=>{
 const valid=createScreening('assq',extraInput('assq'));
 const rows=normalizeScreenings({version:1,results:[{...valid,id:'bad-source',sourceForm:15},{...valid,id:'bad-metrics',measurements:'wrong'},{...valid,id:'bad-answer',total:55},valid]});
 assert.equal(rows.length,1);assert.equal(rows[0].id,valid.id);
});

test('SNAP-IV separates the 9/9/8 blocks, means and 2/3 counts without importing thresholds',()=>{
 const input=base({respondent:'parent',age:9,answers:[1,2,3,0,0,0,0,0,0,...Array(9).fill(2),...Array(8).fill(3)]});
 const r=scoreScreening('snapiv',input);assert.equal(r.total,48);assert.equal(r.max,78);assert.equal(r.status,'recorded');
 assert.deepEqual(r.metrics!.map(m=>m.value),[6,0.67,2,18,2,9,24,3,8]);
 for(const respondent of ['parent','teacher'] as const)for(const value of [0,3]){const s=scoreScreening('snapiv',{...input,respondent,answers:Array(26).fill(value)});assert.equal(s.total,26*value);assert.equal(s.status,'recorded');}
 for(const answers of [Array(25).fill(0),[...Array(25).fill(0),-1],[...Array(25).fill(0),undefined]])assert.throws(()=>scoreScreening('snapiv',{...input,answers:answers as number[]}));
 assert.throws(()=>scoreScreening('snapiv',{...input,respondent:'self'}));
 const row=createScreening('snapiv',input);assert(saveScreening(row));assert.deepEqual(getScreenings()[0].answers,input.answers);
 const text=formatScreening(getScreenings()[0]);for(const v of ['последний месяц','1. Не удерживает внимание','26. Злопамятен','Невнимательность · среднее: 0.67','snapiv26-ru-working-1'])assert(text.includes(v),v);
});
test('YGTSS optional checklist preserves labels and legacy records while rejecting unknown items',async()=>{
 const {ticGroups,ticCriteria}=await import('../src/lib/ygtss');const item=ticGroups[0].items[0];
 assert.equal(ticGroups.flatMap(g=>g.items).length,57);assert.deepEqual(ticCriteria.map(x=>x.length),Array(6).fill(6));
 const record=createScreening('ygtss',extraInput('ygtss',{ticInventory:[item.id,item.id]}));assert(saveScreening(record));assert.deepEqual(getScreenings()[0].ticInventory,[item.id]);assert(formatScreening(getScreenings()[0]).includes(item.label));
 assert.equal(normalizeScreenings({version:1,results:[{...record,ticInventory:undefined}]}).length,1);
 assert.throws(()=>createScreening('ygtss',extraInput('ygtss',{ticInventory:['not-a-tic']})));
});
