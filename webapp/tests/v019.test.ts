import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {searchEverything} from '../src/lib/globalSearch';
import {matchAnswers} from '../src/lib/queries';
import {saveChild,getChildren} from '../src/lib/children';
import {setActiveChild,getProfile,saveProfile,addDoctor,belongsTo} from '../src/lib/profile';
import {addVisitQuestion,getVisit,getVisitFor,VISIT_KEY} from '../src/lib/visit';
import {setAppointment,getAppointment} from '../src/lib/appointment';
import {createScreening,saveScreening,getScreenings} from '../src/lib/screenings';
import {createJournal,saveJournal,getJournals} from '../src/lib/journals';
import {renameChildRecords,migrateChildData,removeChildMemo} from '../src/lib/childLinks';
import {readDraft,writeDraft,clearDraft} from '../src/lib/drafts';
import {summarizeCheckIn,checkInPlan,CheckIn} from '../src/lib/monitoring';
import {parseBackup,createBackup,summarizeBackup} from '../src/lib/backup';
import {todayItems,addDays,RouteData} from '../src/lib/route';
import {getEvents} from '../src/lib/treatment';
import {methodVerdictLabels,methodById} from '../src/lib/methods';
class MemoryStorage{[key:string]:any;getItem(k:string){return Object.hasOwn(this,k)?this[k]:null;}setItem(k:string,v:string){this[k]=String(v);}removeItem(k:string){delete this[k];}}
beforeEach(()=>{Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});});

test('everyday questions get a calm first step before any diagnosis',()=>{
 const first=(q:string)=>searchEverything(q)[0];
 for(const [q,title] of [['не спит','Трудности со сном'],['не говорит','Речь развивается медленно'],['бьет себя','Ребёнок причиняет себе вред'],['бьёт себя','Ребёнок причиняет себе вред'],['инвалидность','Инвалидность и ИПРА'],['как пройти ПМПК','ПМПК: как пройти и зачем'],['кусается','Агрессия и вспышки злости'],['боится школы','Не хочет или боится ходить в школу'],['назначили ноотроп','Назначили ноотропы'],['писается','Ночное недержание и туалет']] as const){
  assert.equal(first(q).id,'answers',q);assert.equal(first(q).hits[0].title,title,q);
 }
 // A recognised question hides entries that mention the words only in passing.
 assert(!searchEverything('не спит').some(g=>g.hits.some(h=>h.title.includes('Биполяр'))));
 // Urgent answers come first even when the query also fits another one.
 assert.equal(matchAnswers('ребенок не хочет жить и не спит')[0].id,'suicide');
 // Trade names and the navigator still work.
 assert.equal(searchEverything('Минирин').find(g=>g.id==='medications')?.hits[0].id,'desmopressin');
 assert(searchEverything('тьютор').some(g=>g.id==='navigator'));
 assert.deepEqual(searchEverything('  '),[]);
});

test('each child has its own memo and visit date; records follow the child after a rename',()=>{
 addVisitQuestion('Общий вопрос до профилей');
 setAppointment({date:'2026-10-20'});
 const a=saveChild({label:'Маша',birth:'2017-03'})!,b=saveChild({label:'Петя',birth:'2014-01'})!;
 migrateChildData();
 assert.deepEqual(getVisit().questions,['Общий вопрос до профилей'],'the memo made before profiles moves to the first child');
 assert.equal(getAppointment()?.date,'2026-10-20');
 assert.deepEqual(getVisitFor(null).questions,[]);
 setActiveChild(b.id);
 assert.deepEqual(getVisit().questions,[]);
 assert.equal(getAppointment(),null);
 addVisitQuestion('Вопрос про Петю');setAppointment({date:'2026-11-02'});
 setActiveChild(a.id);
 assert.deepEqual(getVisit().questions,['Общий вопрос до профилей']);
 assert.equal(getAppointment()?.date,'2026-10-20');
 const r=createScreening('psc17',{childLabel:'маша',age:9,respondent:'parent',completedDate:'2026-10-01',answers:Array(17).fill(0),notes:''});
 assert.equal(r.childId,a.id,'a result signed with the name gets the profile id');
 assert(saveScreening(r));
 const j=createJournal({templateId:'sleep',childLabel:'Петя',respondent:'parent',observerLabel:'',date:'2026-10-01',treatment:'',values:{notes:'Спал хорошо'},includeInVisit:false});
 assert.equal(j.childId,b.id);
 assert(saveJournal(j));
 saveChild({id:a.id,label:'Мария',birth:'2017-03'});renameChildRecords(a.id,'Маша','Мария');
 const renamed=getChildren().find(c=>c.id===a.id)!;
 assert(belongsTo(getScreenings()[0],renamed));
 assert.equal(getScreenings()[0].childLabel,'Мария');
 assert(!belongsTo(getJournals()[0],renamed));
 removeChildMemo(b.id);
 assert.equal(localStorage.getItem(VISIT_KEY+':'+b.id),null);
 const backup=createBackup();
 assert.equal(summarizeBackup(backup.data).questions,1);
});

test('drafts are kept for two weeks and cleared on demand',()=>{
 writeDraft('checkin.x',{note:'черновик'});
 assert.equal(readDraft<{note:string}>('checkin.x')?.v.note,'черновик');
 clearDraft('checkin.x');
 assert.equal(readDraft('checkin.x'),null);
 localStorage.setItem('kora.draft.old',JSON.stringify({v:1,at:'2020-01-01T00:00:00Z'}));
 assert.equal(readDraft('kora.old'),null);
 assert.equal(readDraft('old'),null);
});

test('a partly answered check-in does not read as «без жалоб»',()=>{
 const c=saveChild({label:'Маша',birth:'2017-03'})!;
 saveProfile(c.id,{tracking:{items:[],journals:[],sets:[],custom:[{id:'custom-a',label:'Кусает ногти'},{id:'custom-b',label:'Грызёт ручки'}]}});
 const p=getProfile(c.id),plan=checkInPlan(p,[]);
 const none:CheckIn={id:'1',childId:c.id,date:'2026-10-01',goals:{},items:{},numbers:{},note:'',createdAt:'x'};
 assert.equal(summarizeCheckIn(none,p),'Только заметка, без ответов на вопросы');
 const zero={...none,items:{'custom-a':0}};
 assert.equal(summarizeCheckIn(zero,p,plan),'Трудностей не отмечено (ответов: 1). Без ответа: 1 из 2.');
 assert.doesNotMatch(summarizeCheckIn(zero,p,plan),/Без жалоб/);
 assert.equal(summarizeCheckIn({...none,items:{'custom-a':2}},p,plan),'Кусает ногти: заметно · без ответа: 1 из 2');
});

test('check-in only before a visit and saved doctors',()=>{
 const c=saveChild({label:'Маша',birth:'2017-03'})!,today='2026-10-05';
 saveProfile(c.id,{goals:[{id:'g1',text:'Тревога',measure:'severity'}],checkinEvery:0});
 assert(addDoctor(c.id,{name:'Иванова И. И.',role:'детский психиатр',phone:'+7 900 000-00-00',place:'ПНД'}));
 assert.equal(getProfile(c.id).doctors[0].role,'детский психиатр');
 const data=(appointment:string|null):RouteData=>({child:c,profile:getProfile(c.id),events:getEvents(c.id),checkIns:[],screenings:[],journals:[],appointment:appointment?{version:1,date:appointment}:null,memoCount:0,today});
 assert(!todayItems(data(null)).some(i=>i.id==='checkin'),'not asked without a visit');
 assert(todayItems(data(addDays(today,5))).some(i=>i.id==='checkin'),'asked in the week before a visit');
 saveProfile(c.id,{checkinEvery:14});
 assert(todayItems(data(null)).some(i=>i.id==='checkin'),'never answered: asked');
});

test('full backup carries document files and rejects foreign ones',()=>{
 const base=createBackup();
 const ok=parseBackup(JSON.stringify({...base,files:{f1:{name:'eeg.png',type:'image/png',data:'iVBORw0KGgo='}}}));
 assert(ok.ok&&ok.files&&ok.files.f1.name==='eeg.png');
 const bad=parseBackup(JSON.stringify({...base,files:{f1:{name:'x.exe',type:'application/x-msdownload',data:'AA=='}}}));
 assert(!bad.ok);
 assert(parseBackup(JSON.stringify(base)).ok);
});

test('method verdicts say three different things and TMS is precise about depression',()=>{
 assert.deepEqual(Object.values(methodVerdictLabels),['Есть серьёзные риски','Пользы не показано','Только как дополнение']);
 const tms=methodById('tms')!;
 assert(!tms.offeredFor.includes('depression'));
 assert.match(tms.evidence,/15–21/);
 assert(tms.sources.some(s=>s.url.includes('K231926')));
});
