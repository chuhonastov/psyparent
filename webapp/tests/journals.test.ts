import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {JOURNAL_KEY,JournalInput,canCompareJournals,createJournal,filterJournals,formatJournal,getJournals,includeJournals,journalAlerts,normalizeJournals,removeJournal,saveJournal,sleepMetrics,subscribeJournals,updateJournal,validateJournal} from '../src/lib/journals';
import {journalTemplate,journalTemplates,journalTemplatesForDiagnosis} from '../src/lib/journalContent';
import {formatVisit} from '../src/lib/export';
import {getVisit,clearVisit} from '../src/lib/visit';
import {deleteLocalData} from '../src/lib/persist';
import {createScreening,saveScreening,getScreenings} from '../src/lib/screenings';
class MemoryStorage{[key:string]:any;getItem(k:string){return Object.hasOwn(this,k)?this[k]:null;}setItem(k:string,v:string){this[k]=v;}removeItem(k:string){delete this[k];}}
beforeEach(()=>{Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});});
const input=(extra:Partial<JournalInput>={}):JournalInput=>({templateId:'sleep',childLabel:'Старший',respondent:'parent',observerLabel:'Мама',date:'2026-09-20',treatment:'По согласованному плану',values:{notes:'Засыпание стало спокойнее'},includeInVisit:false,...extra});
test('all 13 forms accept a meaningful observation; every topic has relevant or general forms',async()=>{
 assert.equal(journalTemplates.length,13);
 for(const t of journalTemplates){const values=Object.fromEntries(t.fields.filter(f=>f.required).map(f=>[f.id,f.type==='select'?f.options![0].value:'Наблюдение']));if(!Object.keys(values).length){const field=t.fields.find(f=>f.type==='text'||f.type==='textarea')!;values[field.id]='Наблюдение';}const r=createJournal(input({templateId:t.id,respondent:t.respondents[0],values}));assert(saveJournal(r),t.id);assert(formatJournal(r).includes('не является назначением'));}
 assert.equal(getJournals().length,13);
 const {leaves}=await import('../src/lib/content');for(const d of leaves)assert(journalTemplatesForDiagnosis(d.id).length>=3,d.id);
 assert(journalTemplatesForDiagnosis('specific_learning_disorder').some(t=>t.id==='school'));
});
test('journal validation rejects unknown, empty, malformed, out-of-range and impossible records',()=>{
 for(const x of [{childLabel:' '},{age:18},{age:0.5},{date:'2026-02-30'},{date:'2099-01-01'},{periodStart:'2026-09-21'},{values:{}},{values:{notes:' '}},{values:{unknown:'x'}},{values:{awakenings:'-1'}},{values:{awakenings:'0.5'}},{values:{napMinutes:'1441'}},{values:{dayImpact:'madeup'}},{values:{wakeAt:'2026-09-20T25:00'}},{values:{bedAt:'2026-09-21T20:00'}}])assert(validateJournal(input(x)).length,JSON.stringify(x));
 assert(validateJournal(input({templateId:'school',respondent:'parent',values:{strengths:'Пение'}})).length);
 assert.equal(validateJournal(input({age:0,values:{awakenings:'0'}})).length,0);
 assert.equal(validateJournal(input({templateId:'complaints',values:{main:'Устаёт после школы'}})).length,0);
 assert(validateJournal(input({templateId:'complaints',values:{onset:'Неделю'}})).length);
});
test('sleep diary crosses midnight correctly and missing awake duration is not silently zero',()=>{
 const i=input({values:{bedAt:'2026-09-19T21:30',asleepAt:'2026-09-19T22:00',wakeAt:'2026-09-20T07:00',napMinutes:'90'}});
 assert.equal(validateJournal(i).length,0);assert.deepEqual(sleepMetrics(i).map(m=>m.minutes),[30,540]);
 assert.deepEqual(sleepMetrics({...i,values:{...i.values,awakeMinutes:'40'}}).map(m=>m.minutes),[30,540,500]);
 assert.deepEqual(sleepMetrics({...i,values:{...i.values,awakeMinutes:'0'}}).map(m=>m.minutes),[30,540,540]);
 assert.deepEqual(sleepMetrics(input({values:{notes:'Время неизвестно'}})),[]);
 for(const values of [{...i.values,awakeMinutes:'541'},{...i.values,asleepAt:'2026-09-19T21:00'},{...i.values,wakeAt:'2026-09-19T20:00'}])assert(validateJournal({...i,values}).length);
 assert(validateJournal(input({templateId:'behavior',values:{dayType:'calm',duration:'20'}})).length);
});
test('saving and editing preserve identity, separate children, and survive reload without duplicated records',()=>{
 const r=createJournal(input());assert(saveJournal(r));assert.equal(saveJournal(r),false);assert(saveJournal(createJournal(input({childLabel:'Младший'}))));
 assert(updateJournal(r.id,input({values:{notes:'Уточнённое наблюдение'},includeInVisit:true})));
 const edited=getJournals().find(x=>x.id===r.id)!;assert.equal(edited.createdAt,r.createdAt);assert.equal(edited.values.notes,'Уточнённое наблюдение');assert.equal(edited.includeInVisit,true);assert.equal(getJournals().length,2);
 assert.equal(updateJournal(r.id,input({templateId:'mood'})),false);assert.equal(updateJournal('missing',input()),false);
 assert(removeJournal(r.id));assert.equal(getJournals()[0].childLabel,'Младший');
});
test('storage failure is atomic and valid exported observations remain available',()=>{
 const r=createJournal(input());assert(saveJournal(r));localStorage.setItem=()=>{throw new Error('quota');};
 assert.equal(saveJournal(createJournal(input())),false);assert.equal(updateJournal(r.id,input({childLabel:'Изменён'})),false);assert.equal(includeJournals([r.id],true),false);assert.equal(removeJournal(r.id),false);
 assert.equal(getJournals()[0].childLabel,'Старший');assert.equal(getJournals()[0].includeInVisit,false);assert(formatJournal(r).includes('Засыпание стало спокойнее'));
});
test('only selected diaries enter the visit; clearing visit preserves diary and older screening history',()=>{
 const r=createJournal(input());assert(saveJournal(r));saveScreening(createScreening('phq9',{childLabel:'Подросток',age:14,respondent:'self',completedDate:'2026-09-20',notes:'',answers:Array(9).fill(0)}));
 assert(!formatVisit(getVisit()).includes('Засыпание стало спокойнее'));assert(includeJournals([r.id],true));assert(formatVisit(getVisit()).includes('Засыпание стало спокойнее'));
 clearVisit();assert.equal(getJournals().length,1);assert.equal(getScreenings().length,1);assert(formatVisit(getVisit()).includes('Засыпание стало спокойнее'));
 assert(includeJournals([r.id],false));assert(!formatVisit(getVisit()).includes('Засыпание стало спокойнее'));
});
test('delete-all removes diaries and updates subscribers without deleting unrelated browser data',()=>{
 saveJournal(createJournal(input()));localStorage.setItem('other.app','keep');let events=0;const off=subscribeJournals(()=>events++);
 assert(deleteLocalData());assert.equal(events,1);assert.deepEqual(getJournals(),[]);assert.equal(localStorage.getItem('other.app'),'keep');off();
});
test('corrupt, unknown-version and duplicate diary records do not break history or expose unknown fields',()=>{
 const r=createJournal(input());const bad=[null,{...r,id:'future',templateVersion:9},{...r,id:'bad-value',values:{notes:{x:'bad'}}},{...r,id:'bad-fields',values:[]},{...r,id:'bad-kind',templateId:'unknown'},{...r,id:'bad-time',createdAt:'wrong'},r,r];
 assert.deepEqual(normalizeJournals({version:1,records:bad}).map(x=>x.id),[r.id]);assert.deepEqual(normalizeJournals({version:2,records:[r]}),[]);
 localStorage.setItem(JOURNAL_KEY,'{bad');assert.deepEqual(getJournals(),[]);
});
test('comparison keeps child, observer, role, period length and goal units distinct',()=>{
 const t=journalTemplate('goals')!,i=input({templateId:'goals',values:{goal:'Участвовать в занятии',measure:'Длительность',unit:'минуты',value:'5'}}),a=createJournal(i),b=createJournal({...i,date:'2026-09-21',values:{...i.values,value:'8'}});
 assert(canCompareJournals([a,b],t));
 for(const x of [{childLabel:'Другой'},{observerLabel:'Папа'},{respondent:'self' as const},{periodStart:'2026-09-18'},{values:{...b.values,unit:'часы'}}])assert(!canCompareJournals([a,{...b,...x}],t));
 assert(!canCompareJournals([{...a,observerLabel:''},{...b,observerLabel:''}],t));
 assert.equal(filterJournals([a,b],{child:'Старший',template:'goals',observer:'Мама',from:'2026-09-21'}).length,1);
 assert.equal(filterJournals([a,b],{child:'Другой'}).length,0);
});
test('safety signals remain in saved records and exports without negative reassurance or diagnostic scores',()=>{
 const r=createJournal(input({templateId:'mood',values:{safety:'yes',activation:'yes'}}));assert.equal(journalAlerts(r).length,2);assert.match(formatJournal(r),/112/);assert.match(formatJournal(r),/не устанавливает диагноз/);
 assert.equal(journalAlerts(input({templateId:'mood',values:{safety:'noKnown'}})).length,0);
 assert.equal(journalAlerts(input({templateId:'communication',values:{skill:'Просьба',loss:'yes'}})).length,1);
 assert.equal(journalAlerts(input({templateId:'tolerability',values:{regimen:'Запись',concern:'sooner'}})).length,1);
});

test('day counts cannot exceed the explicitly selected observation period',()=>{
 assert(validateJournal(input({templateId:'anxiety',values:{situation:'Школа',missedDays:'2'}})).length);
 assert.equal(validateJournal(input({templateId:'anxiety',periodStart:'2026-09-14',values:{situation:'Школа',missedDays:'7'}})).length,0);
 assert(validateJournal(input({templateId:'mood',periodStart:'2026-09-14',values:{participationDays:'8'}})).length);
});
