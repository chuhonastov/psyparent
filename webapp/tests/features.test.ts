import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {searchEverything} from '../src/lib/globalSearch';
import {trackRecent,getRecent,clearRecent,resolveRecent,RECENT_KEY} from '../src/lib/recent';
import {setAppointment,getAppointment,clearAppointment,daysUntil,countdownLabel,appointmentIcs,APPOINTMENT_KEY} from '../src/lib/appointment';
import {getSettings,saveSettings,normalizeSettings,SETTINGS_KEY} from '../src/lib/settings';
import {createBackup,parseBackup,restoreBackup,summarizeBackup,describeSummary} from '../src/lib/backup';
import {addVisitQuestion,addVisitMedication,getVisit,VISIT_KEY} from '../src/lib/visit';
import {formatVisit} from '../src/lib/export';
import {deleteLocalData} from '../src/lib/persist';
import {plural} from '../src/lib/plural';
import {CHILDREN_KEY,MAX_CHILDREN,ageLabel,childAge,getChildren,normalizeChildren,removeChild,saveChild,screeningsLink,validateChild} from '../src/lib/children';
class MemoryStorage {
 [key:string]:any;
 getItem(key:string){return Object.hasOwn(this,key)?this[key]:null;}
 setItem(key:string,value:string){this[key]=String(value);}
 removeItem(key:string){delete this[key];}
}
beforeEach(()=>{
 Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});
 Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});
 Object.defineProperty(globalThis,'document',{value:{documentElement:{dataset:{}}},configurable:true});
});
test('searches every section and ranks exact names first',()=>{
 assert.deepEqual(searchEverything('  '),[]);
 const trade=searchEverything('Минирин');
 assert.equal(trade.find(g=>g.id==='medications')?.hits[0].id,'desmopressin');
 const adhd=searchEverything('СДВГ');
 assert.equal(adhd[0].id,'topics');
 assert.equal(adhd[0].hits[0].id,'adhd');
 assert.equal(adhd[0].moreTo,'/diagnoses?q=%D0%A1%D0%94%D0%92%D0%93');
 const phq=searchEverything('PHQ');
 assert.equal(phq.find(g=>g.id==='screenings')?.hits[0].id,'phq9');
 const speech=searchEverything('логопед');
 assert(speech.some(g=>g.id==='specialists'&&g.hits.length>0));
 for(const g of searchEverything('расстройство'))assert(g.hits.length<=5&&g.total>=g.hits.length);
});
test('keeps the six latest cards without duplicates and skips removed ones',()=>{
 assert(trackRecent('dx','adhd',new Date('2026-09-01T10:00:00Z')));
 trackRecent('med','atomoxetine');trackRecent('dx','adhd');
 assert.deepEqual(getRecent().map(r=>r.kind+':'+r.id),['dx:adhd','med:atomoxetine']);
 for(const id of ['phq9','gad7','snapiv','mchat','sdq'])trackRecent('scr',id);
 assert.equal(getRecent().length,6);
 assert.equal(getRecent()[0].id,'sdq');
 assert.equal(resolveRecent({kind:'dx',id:'no-such-topic',at:new Date().toISOString()}),null);
 assert.equal(resolveRecent({kind:'dx',id:'anxiety',at:new Date().toISOString()}),null,'groups are not shown as recent cards');
 assert.equal(resolveRecent({kind:'med',id:'atomoxetine',at:new Date().toISOString()})?.to,'/medications/atomoxetine');
 localStorage.setItem(RECENT_KEY,JSON.stringify({version:1,items:[{kind:'bad',id:'x',at:'x'},{kind:'form',id:'sleep',at:'2026-09-01T00:00:00Z'}]}));
 assert.deepEqual(getRecent().map(r=>r.id),['sleep']);
 assert(clearRecent());assert.deepEqual(getRecent(),[]);
});
test('stores the next visit, counts days and exports it',()=>{
 assert.equal(setAppointment({date:'2026-02-30'}),false);
 assert(setAppointment({date:'2026-10-05'}));
 assert(setAppointment({time:'10:30',with:'Детский психиатр '}));
 assert.deepEqual(getAppointment(),{version:1,date:'2026-10-05',time:'10:30',with:'Детский психиатр '});
 assert(setAppointment({time:''}));assert.equal(getAppointment()?.time,undefined);
 assert.match(formatVisit(getVisit()),/Приём: .*5 октября 2026.*Детский психиатр\n/);
 assert(setAppointment({date:''}));assert.equal(getAppointment(),null);
 assert(setAppointment({date:'2026-10-05'}));assert(clearAppointment());assert.equal(localStorage.getItem(APPOINTMENT_KEY),'null');
 const today=new Date(2026,8,30,23,30);
 assert.equal(daysUntil('2026-09-30',today),0);
 assert.equal(daysUntil('2026-10-05',today),5);
 assert.equal(daysUntil('2026-09-28',today),-2);
 assert.deepEqual([0,1,2,5,21,22,-1,-11].map(countdownLabel),['сегодня','завтра','послезавтра','через 5 дней','через 21 день','через 22 дня','прошёл 1 день назад','прошёл 11 дней назад']);
 assert.equal(plural(111,'день','дня','дней'),'дней');
});
test('writes a valid calendar file with a reminder',()=>{
 const now=new Date('2026-09-30T08:00:00Z');
 const timed=appointmentIcs({version:1,date:'2026-12-31',time:'23:30',with:'Невролог; повторный приём'},now);
 assert.match(timed,/DTSTART:20261231T233000\r\n/);
 assert.match(timed,/DTEND:20270101T003000\r\n/);
 assert.match(timed,/SUMMARY:Приём: Невролог\\; повторный приём/);
 assert.match(timed,/TRIGGER:-P1D/);
 for(const line of timed.split('\r\n'))assert(new TextEncoder().encode(line).length<=75,line);
 const allDay=appointmentIcs({version:1,date:'2026-10-05'},now);
 assert.match(allDay,/DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261006/);
 assert.match(allDay,/SUMMARY:Приём у врача/);
});
test('reading settings fall back to defaults and apply to the page',()=>{
 assert.deepEqual(getSettings(),{version:1,textSize:'normal',theme:'auto'});
 assert.deepEqual(normalizeSettings({textSize:'huge',theme:'blue'}),{version:1,textSize:'normal',theme:'auto'});
 assert(saveSettings({textSize:'large',theme:'dark'}));
 assert.deepEqual(JSON.parse(localStorage.getItem(SETTINGS_KEY)),{version:1,textSize:'large',theme:'dark'});
 assert.equal(document.documentElement.dataset.textSize,'large');
 assert.equal(document.documentElement.dataset.theme,'dark');
 saveSettings({textSize:'normal',theme:'auto'});
 assert.equal(document.documentElement.dataset.textSize,undefined);
 assert.equal(document.documentElement.dataset.theme,undefined);
});
test('backs up and restores all records, rejecting foreign files',()=>{
 addVisitQuestion('Как оценить эффект?');addVisitMedication('atomoxetine');setAppointment({date:'2026-10-05'});trackRecent('dx','adhd');
 localStorage.setItem('unrelated.site.key','keep');
 const backup=createBackup(new Date('2026-09-30T08:00:00Z'));
 assert.equal(backup.app,'Kora');
 assert.equal(parseBackup(JSON.stringify({...backup,app:'PsyParent'})).ok,true);
 assert(!('unrelated.site.key' in backup.data));
 const text=JSON.stringify(backup);
 const parsed=parseBackup(text);
 assert(parsed.ok);
 if(!parsed.ok)return;
 assert.deepEqual(summarizeBackup(parsed.data),{questions:1,meds:1,observations:0,screenings:0,journals:0,children:0,other:2});
 assert.equal(describeSummary(summarizeBackup(parsed.data)),'вопросов: 1, назначений: 1');
 deleteLocalData();
 assert.equal(getAppointment(),null);assert.deepEqual(getRecent(),[]);assert.equal(localStorage.getItem('unrelated.site.key'),'keep');
 addVisitQuestion('Вопрос, который заменит копия');
 assert(restoreBackup(parsed.data));
 assert.deepEqual(getVisit().questions,['Как оценить эффект?']);
 assert.equal(getAppointment()?.date,'2026-10-05');
 assert.equal(getRecent()[0].id,'adhd');
 assert.equal(localStorage.getItem('unrelated.site.key'),'keep');
 assert.equal(parseBackup('не json').ok,false);
 assert.equal(parseBackup(JSON.stringify({app:'Other',format:1,data:{}})).ok,false);
 assert.equal(parseBackup(JSON.stringify({app:'PsyParent',format:2,data:{}})).ok,false);
 assert.equal(parseBackup(JSON.stringify({app:'PsyParent',format:1,data:{'evil.key':'x'}})).ok,false);
 assert.equal(parseBackup(JSON.stringify({app:'PsyParent',format:1,data:{[VISIT_KEY]:{}}})).ok,false);
});
test('backs up records that exist only in the first-version format',()=>{
 localStorage.setItem('parentguide.visit.v1',JSON.stringify({questions:['Старый вопрос'],meds:[]}));
 const backup=createBackup();
 assert.deepEqual(JSON.parse(backup.data[VISIT_KEY]).questions,['Старый вопрос']);
 assert.equal(backup.data['parentguide.visit.v1'],localStorage.getItem('parentguide.visit.v1'));
});
test('restoring keeps previous records when storage fails',()=>{
 addVisitQuestion('Остаётся');
 const storage=localStorage as unknown as MemoryStorage;
 const original=storage.setItem.bind(storage);
 let calls=0;
 storage.setItem=(key:string,value:string)=>{calls++;if(calls===1)throw new Error('quota');original(key,value);};
 assert.equal(restoreBackup({[VISIT_KEY]:JSON.stringify({version:2,questions:['Новый'],meds:[],medDetails:{},checklists:{}})}),false);
 assert.deepEqual(getVisit().questions,['Остаётся']);
});
test('clinic data validates doctor ids, links and topics',async()=>{
 const {validateClinic,clinic,bookingFor,initials}=await import('../src/lib/clinic');
 assert.deepEqual(validateClinic(clinic,['sleep_disorders']),[]);
 const bad={...clinic,doctors:[{id:'Bad id',name:'',role:'',photo:'http://x',branches:['nowhere'],topics:['nope']}]};
 assert.equal(validateClinic(bad as any,['adhd']).length,5);
 assert.equal(bookingFor(),clinic.bookingUrl);assert.equal(bookingFor({id:'a',name:'А Б',role:'r',profileUrl:'https://x.ru/a'}),'https://x.ru/a');
 assert.equal(initials('Анна Петровна Иванова'),'АП');
});

test('glossary and clinic entries are searchable from the home search',()=>{
 const g=searchEverything('СИОЗС').find(x=>x.id==='glossary');assert(g&&g.hits[0].title==='СИОЗС');
 const ppc=searchEverything('ППЦНС').find(x=>x.id==='glossary');assert(ppc);
});

test('doctor filters by city, age and online visits',async()=>{
 const {filterDoctors,seesAge}=await import('../src/lib/clinic');
 const list=[{id:'a',name:'А',role:'Детский психиатр',ageFrom:2,ageTo:18,online:true,branches:['vo']},{id:'b',name:'Б',role:'Психиатр',ageFrom:15,branches:['taganka']}] as any;
 assert.equal(seesAge(list[0],1),false);assert.equal(seesAge(list[1],40),true);
 assert.deepEqual(filterDoctors(list,{age:16}).map((d:any)=>d.id),['a','b']);
 assert.deepEqual(filterDoctors(list,{age:5}).map((d:any)=>d.id),['a']);
 assert.deepEqual(filterDoctors(list,{online:true}).map((d:any)=>d.id),['a']);
});

test('every specialist can be found through a task chip',async()=>{
 const {specialists,specialistTasks}=await import('../src/lib/content');
 const covered=new Set(specialistTasks.flatMap(t=>t.domains));
 for(const s of specialists)for(const d of s.domains)assert.ok(covered.has(d),s.id+': '+d);
 assert.equal(new Set(specialistTasks.map(t=>t.id)).size,specialistTasks.length);
});

test('child profiles keep only a nickname and birth month and give the age on a date',()=>{
 assert.deepEqual(validateChild({label:'Маша',birth:'2019-03'},'2026-09'),[]);
 assert.equal(validateChild({label:' ',birth:'2019-03'},'2026-09').length,1);
 assert.equal(validateChild({label:'Маша',birth:'2019-13'},'2026-09').length,1);
 assert.equal(validateChild({label:'Маша',birth:'2027-01'},'2026-09').length,1);
 const masha=saveChild({label:'  Маша ',birth:'2019-03'})!;
 assert.equal(masha.label,'Маша');
 assert.deepEqual(childAge(masha,'2026-09-30'),{months:90,years:7});
 assert.deepEqual(childAge(masha,'2019-01-10'),{months:0,years:0});
 assert.equal(ageLabel(masha,'2026-09-30'),'7 лет');
 const baby=saveChild({label:'Младший',birth:'2024-07'})!;
 assert.equal(ageLabel(baby,'2026-09-15'),'2 года 2 мес.');
 assert.equal(ageLabel(baby,'2025-01-15'),'6 мес.');
 assert.equal(screeningsLink(baby,'2026-09-15'),'/screenings?unit=months&age=26');
 assert.equal(screeningsLink(masha,'2026-09-15'),'/screenings?age=7');
 assert(saveChild({id:masha.id,label:'Старшая',birth:'2019-04'}));
 assert.deepEqual(getChildren().map(c=>c.label),['Старшая','Младший']);
 assert.equal(saveChild({label:'',birth:'2020-01'}),null);
 assert(removeChild(baby.id));
 assert.deepEqual(getChildren().map(c=>c.id),[masha.id]);
 localStorage.setItem(CHILDREN_KEY,JSON.stringify([{id:'a',label:'A',birth:'2020-01'},{id:'a',label:'B',birth:'2020-01'},{id:'b',label:'',birth:'2020-01'},{id:'c',label:'C',birth:'1800-01'},null]));
 assert.deepEqual(getChildren().map(c=>c.label),['A']);
 assert.equal(normalizeChildren(Array.from({length:12},(_,i)=>({id:'x'+i,label:'Ребёнок '+i,birth:'2020-01'}))).length,MAX_CHILDREN);
});
