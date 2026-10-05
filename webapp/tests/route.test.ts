import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {saveChild,getChildren} from '../src/lib/children';
import {getProfile,saveProfile,addGoal,applyTrackingSet,toggleTracked,addCustomItem,getActiveChild,setActiveChild,sameChild,normalizeProfile} from '../src/lib/profile';
import {addEvent,getEvents,updateEvent,removeEvent,courses,activeCourses,doseDirection,parseDose,dayNumber,validateEvent,changeLabel,lastVisit} from '../src/lib/treatment';
import {checkInPlan,saveCheckIn,getCheckIns,validateCheckIn,setForMed,urgentAnswers,summarizeCheckIn,monitorSets,monitorItems} from '../src/lib/monitoring';
import {todayItems,changeReport,formatChanges,reportIsEmpty,addDays,RouteData} from '../src/lib/route';
import medications from '../src/content/medications.json';
class MemoryStorage{[key:string]:any;getItem(k:string){return Object.hasOwn(this,k)?this[k]:null;}setItem(k:string,v:string){this[k]=String(v);}removeItem(k:string){delete this[k];}}
beforeEach(()=>{Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});});
const TODAY='2026-10-05';
const child=()=>saveChild({label:'Маша',birth:'2017-03'})!;
const data=(c:ReturnType<typeof child>,extra:Partial<RouteData>={}):RouteData=>({child:c,profile:getProfile(c.id),events:getEvents(c.id),checkIns:getCheckIns(c.id),screenings:[],journals:[],appointment:null,memoCount:0,today:TODAY,...extra});

test('profile keeps goals, tracking and the active child',()=>{
 const a=child(),b=saveChild({label:'Петя',birth:'2014-01'})!;
 assert.equal(getActiveChild()?.id,a.id);
 assert(setActiveChild(b.id));
 assert.equal(getActiveChild()?.id,b.id);
 assert(addGoal(a.id,'  Тревога перед школой ','severity'));
 assert(addGoal(a.id,'Вспышки злости','count'));
 assert(!addGoal(a.id,'   ','severity'));
 assert(applyTrackingSet(a.id,'antidepressant',['stomach','headache']));
 assert(toggleTracked(a.id,'items','headache',false));
 // The set is applied once: an item switched off does not come back.
 applyTrackingSet(a.id,'antidepressant',['stomach','headache']);
 assert(addCustomItem(a.id,'Кусает ногти'));
 const p=getProfile(a.id);
 assert.deepEqual(p.goals.map(g=>[g.text,g.measure]),[['Тревога перед школой','severity'],['Вспышки злости','count']]);
 assert.deepEqual(p.tracking.items,['stomach']);
 assert.equal(p.tracking.custom[0].label,'Кусает ногти');
 assert(saveProfile(a.id,{diagnoses:['gad','gad','bad id!']}));
 assert.deepEqual(getProfile(a.id).diagnoses,['gad']);
 assert.deepEqual(normalizeProfile(null).goals,[]);
 assert(sameChild(' маша ',a));
});

test('dose texts are compared only in the same unit',()=>{
 assert.deepEqual(parseDose('12,5 мг утром'),{value:12.5,unit:'мг'});
 assert.deepEqual(parseDose('1 таблетка'),{value:1,unit:'таб'});
 assert.equal(parseDose('по схеме'),null);
 assert.equal(doseDirection('12,5 мг','25 мг'),'up');
 assert.equal(doseDirection('2 мг','1 мг вечером'),'down');
 assert.equal(doseDirection('2 мг','2 мг вечером'),'same');
 assert.equal(doseDirection('1 таб','25 мг'),'unknown');
 assert.equal(dayNumber('2026-09-22',TODAY),14);
});

test('timeline events build medicine courses with the last change',()=>{
 const c=child();
 assert.deepEqual(validateEvent({kind:'start',date:TODAY},TODAY).length,2);
 assert(validateEvent({kind:'start',date:'2026-10-06',medId:'ssri_sertraline',dose:'25 мг'},TODAY).length===1);
 assert(validateEvent({kind:'effect',date:TODAY,text:''},TODAY).length===1);
 assert(addEvent({childId:c.id,date:'2026-08-12',kind:'start',medId:'ssri_sertraline',dose:'12,5 мг'},TODAY));
 assert(addEvent({childId:c.id,date:'2026-08-26',kind:'dose',medId:'ssri_sertraline',dose:'25 мг'},TODAY));
 assert(addEvent({childId:c.id,date:'2026-09-22',kind:'dose',medId:'guanfacine_xr',dose:'2 мг'},TODAY));
 assert(addEvent({childId:c.id,date:'2026-09-01',kind:'start',medName:'Страттера',dose:'18 мг'},TODAY));
 const stop=addEvent({childId:c.id,date:'2026-09-20',kind:'stop',medName:'страттера'},TODAY)!;
 assert(addEvent({childId:c.id,date:'2026-08-20',kind:'visit',text:'Решили повышать'},TODAY));
 assert.equal(addEvent({childId:c.id,date:TODAY,kind:'dose',medId:'not_a_med',dose:'1 мг'},TODAY),null);
 const list=courses(getEvents(c.id));
 assert.deepEqual(list.map(x=>[x.label,x.active]),[['Гуанфацин (пролонг.)',true],['Сертралин',true],['Страттера',false]]);
 const sert=list.find(x=>x.medId==='ssri_sertraline')!;
 assert.equal(sert.dose,'25 мг');assert.equal(sert.direction,'up');assert.equal(sert.previousDose,'12,5 мг');assert.equal(sert.started,'2026-08-12');
 assert.equal(changeLabel(sert),'увеличена доза: сертралин');
 assert.equal(activeCourses(getEvents(c.id)).length,2);
 assert.equal(lastVisit(getEvents(c.id),TODAY),'2026-08-20');
 assert(updateEvent(stop.id,{date:'2026-09-21',kind:'stop',medName:'Страттера'},TODAY));
 assert(removeEvent(stop.id));
 assert.equal(activeCourses(getEvents(c.id)).length,3);
 assert.equal(getEvents('other').length,0);
});

test('every medication set refers to existing items and the plan asks only what is tracked',()=>{
 const ids=new Set(medications.map(m=>m.id));
 for(const s of monitorSets){for(const m of s.meds)assert(ids.has(m),m);for(const i of s.items)assert(monitorItems[i],i);}
 assert.equal(setForMed('aripiprazole_irritability_note').id,'antipsychotic');
 assert.equal(setForMed('ibuprofen').id,'general');
 const c=child();
 addEvent({childId:c.id,date:'2026-09-01',kind:'start',medId:'aripiprazole_irritability_note',dose:'2,5 мг'},TODAY);
 applyTrackingSet(c.id,'antipsychotic',['appetite_high','sleepy_day','weight']);
 addGoal(c.id,'Агрессия','count');
 const plan=checkInPlan(getProfile(c.id),activeCourses(getEvents(c.id)));
 assert.deepEqual(plan.items.map(i=>i.id),['appetite_high','sleepy_day']);
 assert.deepEqual(plan.numbers.map(n=>n.id),['weight']);
 assert.equal(plan.askMissed,true);
 assert(plan.labs[0].lines.some(l=>l.includes('Сахар')));
 // Urgent signs of the current medicine are always asked.
 addEvent({childId:c.id,date:'2026-09-02',kind:'start',medId:'ssri_sertraline',dose:'25 мг'},TODAY);
 const plan2=checkInPlan(getProfile(c.id),activeCourses(getEvents(c.id)));
 assert(plan2.items.some(i=>i.id==='dark_thoughts'));
 assert(validateCheckIn({childId:c.id,date:TODAY,goals:{},items:{},numbers:{},note:''},plan2,TODAY).length===1);
 assert(validateCheckIn({childId:c.id,date:TODAY,goals:{},items:{},numbers:{weight:900},note:''},plan2,TODAY).some(e=>e.includes('Вес')));
 const saved=saveCheckIn({childId:c.id,date:TODAY,goals:{[getProfile(c.id).goals[0].id]:5},items:{dark_thoughts:1,sleepy_day:0},numbers:{weight:31.5},missed:1,note:''})!;
 assert.deepEqual(urgentAnswers(saved),['Разговоры о смерти, мысли о самоповреждении']);
 assert.match(summarizeCheckIn(saved,getProfile(c.id)),/Агрессия: 5 раз за неделю · Разговоры о смерти.*Вес: 31,5 кг · пропуски приёма: 1–2 раза/);
});

test('today shows the visit, recent dose changes, a due check-in and warnings',()=>{
 const c=child();
 assert.deepEqual(todayItems(data(c)),[]);
 addEvent({childId:c.id,date:'2026-09-08',kind:'start',medId:'guanfacine_xr',dose:'1 мг'},TODAY);
 addEvent({childId:c.id,date:'2026-09-22',kind:'dose',medId:'guanfacine_xr',dose:'2 мг'},TODAY);
 applyTrackingSet(c.id,'alpha2',['sleepy_day','pulse']);
 toggleTracked(c.id,'journals','sleep',true);
 const items=todayItems(data(c,{appointment:{version:1,date:addDays(TODAY,12)},memoCount:3}));
 const by=(id:string)=>items.find(i=>i.id===id||i.id.startsWith(id));
 assert.equal(by('course')?.title,'14-й день после увеличения дозы');
 assert.equal(by('course')?.text,'Гуанфацин (пролонг.): 2 мг (было 1 мг)');
 assert.equal(by('visit')?.title,'Приём через 12 дней');
 assert.equal(by('visit')?.text,'В памятке 3 записи.');
 assert.match(by('checkin')!.title,/Короткий опрос/);
 assert.equal(by('journal-sleep')?.text,'Записей пока нет.');
 assert(items.findIndex(i=>i.id==='checkin')<items.findIndex(i=>i.id==='visit'));
 saveCheckIn({childId:c.id,date:addDays(TODAY,-1),goals:{},items:{fainting:1},numbers:{},note:''});
 const next=todayItems(data(c));
 assert.equal(next[0].id,'urgent');
 assert(!next.some(i=>i.id==='checkin'),'a check-in yesterday is not due again');
});

test('the visit report compares the period with what came before',()=>{
 const c=child();
 addGoal(c.id,'Тревога перед школой','severity');addGoal(c.id,'Вспышки злости','count');
 const [g1,g2]=getProfile(c.id).goals;
 addEvent({childId:c.id,date:'2026-07-01',kind:'start',medId:'ssri_sertraline',dose:'12,5 мг'},TODAY);
 addEvent({childId:c.id,date:'2026-08-20',kind:'visit',text:'Повышаем дозу'},TODAY);
 addEvent({childId:c.id,date:'2026-08-26',kind:'dose',medId:'ssri_sertraline',dose:'25 мг'},TODAY);
 addEvent({childId:c.id,date:'2026-08-27',kind:'side',text:'Тошнота первые 3 дня'},TODAY);
 saveCheckIn({childId:c.id,date:'2026-08-28',goals:{[g1.id]:3,[g2.id]:5},items:{stomach:2,sleepy_day:1},numbers:{weight:31.5},missed:1,note:''});
 saveCheckIn({childId:c.id,date:'2026-09-30',goals:{[g1.id]:1,[g2.id]:2},items:{stomach:0},numbers:{weight:32.4},note:''});
 const scared=(date:string,total:number)=>({id:date,screenerId:'rcads25',childLabel:'Маша',age:9,respondent:'parent',completedDate:date,notes:'',instrumentVersion:'1',translation:'',createdAt:date,includeInVisit:false,score:{total,max:75,label:'',next:'',safety:false,status:'recorded'}}) as any;
 const r=changeReport(data(c,{screenings:[scared('2026-08-01',42),scared('2026-09-15',27)],memoCount:4}));
 assert.equal(r.sinceVisit,true);assert.equal(r.from,'2026-08-20');
 assert.deepEqual(r.meds,[{date:'2026-08-26',text:'Сертралин: 25 мг (было 12,5 мг)'}]);
 assert.deepEqual(r.goals.map(g=>[g.first,g.last]),[[3,1],[5,2]]);
 assert.deepEqual(r.effects,[{label:'Тошнота, боль в животе',max:2},{label:'Сонливость, вялость днём',max:1}]);
 assert.deepEqual(r.scales.map(s=>[s.before,s.after]),[[42,27]]);
 const text=formatChanges(r,'Маша, 9 лет');
 for(const line of ['ЧТО ИЗМЕНИЛОСЬ С ПРОШЛОГО ПРИЁМА · Маша, 9 лет','Период: 20 августа 2026 — 5 октября 2026','• 26 августа: Сертралин: 25 мг (было 12,5 мг)','Сейчас: Сертралин 25 мг (с 26 августа)','• Тревога перед школой: сильно → немного (лучше)','• Вспышки злости: 5 → 2 раз за неделю','• Отмечались: тошнота, боль в животе — заметно; сонливость, вялость днём — немного','• Вес: 31,5 → 32,4 кг','• Пропуски приёма: 1–2 раза','• RCADS-25 (родитель): 42 → 27 из 75','• 27 августа — Нежелательный эффект: Тошнота первые 3 дня','Вопросов и записей в памятке: 4'])
  assert(text.includes(line),line+'\n---\n'+text);
 const six=changeReport(data(c),6);
 assert.equal(six.sinceVisit,false);assert.equal(six.from,addDays(TODAY,-42));
 assert(reportIsEmpty(changeReport(data(child()),2)));
});
