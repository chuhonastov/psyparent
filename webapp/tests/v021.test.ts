import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {resetEnv} from './env020';
beforeEach(resetEnv);
import {saveChild} from '../src/lib/children';
import {getProfile,saveProfile,addGoal} from '../src/lib/profile';
import {saveCheckIn,getCheckIns} from '../src/lib/monitoring';
import {getEvents} from '../src/lib/treatment';
import {todayItems,RouteData} from '../src/lib/route';
import {startPlan,toggleStep,planDay,planTrend,extendPlan,finishPlan,plans,plansFor,activeRuns} from '../src/lib/plans';
import {formatPassport,getPassport,normalizePassport,passportDoc,savePassport,suggestionsFor,emptyPassport} from '../src/lib/passport';
import {childReportDoc} from '../src/lib/reports';
import {formatChanges,changeReport} from '../src/lib/route';
const data=(childId:string,today:string):RouteData=>{const c=getProfile(childId);return {child:{id:childId,label:'Маша',birth:'2016-03'},profile:c,events:getEvents(childId),checkIns:getCheckIns(childId),screenings:[],journals:[],appointment:null,memoCount:0,today};};

test('a mini-plan adds its goal to the check-in, shows the next step and sums up after two weeks',()=>{
 const c=saveChild({label:'Маша',birth:'2016-03'})!;
 saveProfile(c.id,{checkinEvery:0,diagnoses:['adhd']});
 assert.equal(plansFor(['gaming_disorder'])[0].id,'screens','plans for the child’s diagnoses come first');
 const run=startPlan(c.id,'morning','2026-10-01')!;
 assert(run&&run.until==='2026-10-15');
 const goal=getProfile(c.id).goals.find(g=>g.id===run.goalId)!;
 assert.equal(goal.text,'Утренние скандалы и крики');assert.equal(goal.measure,'count');
 let items=todayItems(data(c.id,'2026-10-03'));
 const step=items.find(i=>i.id.startsWith('plan-'))!;
 assert.equal(step.title,'План «Утро без скандала» · день 3 из 14');
 assert.match(step.text!,/Вечером вместе соберите рюкзак/);
 assert(items.some(i=>i.id==='checkin'),'a running plan asks the check-in weekly even when «only before a visit» is chosen');
 toggleStep(c.id,run.id,'m1');
 assert.match(todayItems(data(c.id,'2026-10-03')).find(i=>i.id.startsWith('plan-'))!.text!,/расписание утра/);
 assert.equal(planDay(run,'2026-10-09').week,1);
 saveCheckIn({childId:c.id,date:'2026-09-30',goals:{[goal.id]:6},items:{},numbers:{},note:''});
 saveCheckIn({childId:c.id,date:'2026-10-08',goals:{[goal.id]:4},items:{},numbers:{},note:''});
 saveCheckIn({childId:c.id,date:'2026-10-14',goals:{[goal.id]:2},items:{},numbers:{},note:''});
 assert.deepEqual(planTrend(getProfile(c.id).plans[0],getCheckIns(c.id)),{first:6,last:2,answers:3},'the answer before the start is the baseline');
 items=todayItems(data(c.id,'2026-10-15'));
 assert(items.some(i=>i.id==='plan-end-'+run.id&&i.title.includes('Две недели')));
 extendPlan(c.id,run.id,'2026-10-15');
 assert.equal(getProfile(c.id).plans[0].until,'2026-10-29');
 finishPlan(c.id,run.id,'2026-10-20');
 assert.equal(activeRuns(getProfile(c.id)).length,0);
 // Starting the same plan again stops nothing twice and reuses the goal.
 const again=startPlan(c.id,'morning','2026-11-01')!;
 assert.equal(again.goalId,run.goalId);
 assert.equal(getProfile(c.id).goals.filter(g=>g.text==='Утренние скандалы и крики').length,1);
});

test('the fear ladder takes the parent’s own goal; a full profile refuses politely',()=>{
 const c=saveChild({label:'Петя',birth:'2014-05'})!;
 const run=startPlan(c.id,'fear','2026-10-05','Страх спать одному')!;
 assert.equal(getProfile(c.id).goals.find(g=>g.id===run.goalId)!.text,'Страх спать одному');
 for(const t of ['a1','a2','a3','a4','a5'])addGoal(c.id,'Цель '+t,'severity');
 assert.equal(startPlan(c.id,'sleep','2026-10-05'),null,'six goals already');
});

test('school passport: suggestions by diagnosis, diagnosis left out unless chosen',()=>{
 const s=suggestionsFor(['adhd','gad']);
 assert(s.helps.includes('Место ближе к учителю, подальше от окна и двери'));
 assert(s.helps.includes('Короткие понятные инструкции — по одной'),'general suggestions always');
 assert(s.avoid.includes('Высмеивать страх или говорить «не выдумывай»'));
 assert(!s.helps.some(x=>x.includes('картинках')),'no autism suggestions without the diagnosis');
 const c=saveChild({label:'Маша',birth:'2016-03'})!;
 const p={...emptyPassport('Маша'),lists:{...emptyPassport().lists,strengths:['Рисует комиксы'],helps:['Место ближе к учителю, подальше от окна и двери']},contacts:[{name:'Мама',phone:'+7 900 000-00-00'}]};
 assert(savePassport(c.id,p));
 const back=getPassport(c.id);
 assert.deepEqual(back.lists.strengths,['Рисует комиксы']);
 const text=formatPassport(back,['СДВГ']);
 assert.doesNotMatch(text,/СДВГ/,'the diagnosis is not shown by default');
 assert.match(formatPassport({...back,showDiagnosis:true},['СДВГ']),/Диагноз по заключению врача: СДВГ/);
 assert.match(text,/Связаться с родителями:\n• Мама — \+7 900 000-00-00/);
 const doc=passportDoc(back);
 assert.equal(doc.blocks[0].t,'title');
 assert(doc.blocks.some(b=>b.t==='callout'&&b.title==='Что у меня получается'));
 assert.equal(normalizePassport({lists:{helps:Array(30).fill(0).map((_,i)=>'п'+i)}}).lists.helps.length,12);
});

test('«А как вы сами?» is for the parent only: support on Today, nothing in the doctor’s documents',()=>{
 const c=saveChild({label:'Маша',birth:'2016-03'})!;
 addGoal(c.id,'Тревога','severity');
 const g=getProfile(c.id).goals[0].id;
 const rec=saveCheckIn({childId:c.id,date:'2026-10-04',goals:{[g]:2},items:{},numbers:{},parent:2,note:''})!;
 assert.equal(rec.parent,2);
 const d=data(c.id,'2026-10-05');
 const item=todayItems(d).find(i=>i.id==='parent-'+rec.id);
 assert(item&&item.to==='/parent');
 const report=JSON.stringify(childReportDoc(d))+formatChanges(changeReport(d),'Маша');
 assert.doesNotMatch(report,/тяжело|Справляюсь|как вы сами/i);
 assert.equal(saveCheckIn({childId:c.id,date:'2026-10-05',goals:{},items:{},numbers:{},parent:0,note:''})!.parent,0,'a parent answer alone is enough to save');
 // «Нормально» brings no reminder; «тяжеловато» brings a softer one.
 assert(!todayItems(data(c.id,'2026-10-05')).some(i=>i.to==='/parent'),'no reminder after «нормально»');
 const hard=saveCheckIn({childId:c.id,date:'2026-10-05',goals:{},items:{},numbers:{},parent:1,note:''})!;
 const soft=todayItems(data(c.id,'2026-10-05')).find(i=>i.id==='parent-'+hard.id)!;
 assert.equal(soft.title,'Неделя была непростой');assert.equal(soft.to,'/parent');
});
