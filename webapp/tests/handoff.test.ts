import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {encodeHandoff,decodeHandoff,extractCode,answerLink,answerToRecord,saveAnswer,rememberRequest,getRequests,markAnswered,screeningFormFor,HandoffAnswer} from '../src/lib/handoff';
import {getScreenings} from '../src/lib/screenings';
import {getJournals} from '../src/lib/journals';
import {normalizePlan,planFilled,formatPlan,savePlan,getPlan,removePlan,emptyPlan,familyActions} from '../src/lib/safety';
import {getDocuments,validateDocument,DOCUMENTS_KEY} from '../src/lib/documents';
import {navRoutes,navTopicById,routeForDiagnosis} from '../src/lib/navigator';
import {saveChild} from '../src/lib/children';
import {timelineEntries,changeReport,formatChanges} from '../src/lib/route';
import {getProfile} from '../src/lib/profile';
class MemoryStorage{[key:string]:any;getItem(k:string){return Object.hasOwn(this,k)?this[k]:null;}setItem(k:string,v:string){this[k]=String(v);}removeItem(k:string){delete this[k];}}
beforeEach(()=>{Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});Object.defineProperty(globalThis,'window',{value:Object.assign(new EventTarget(),{location:{origin:'https://kora.test'}}),configurable:true});});

test('request and answer codes survive the round trip and stay URL-safe',async()=>{
 const req={k:'q' as const,v:1 as const,id:'abc123def456',f:'vanderbilt2002' as const,c:'Маша',a:9,r:'tg' as const,m:'Здравствуйте! Спасибо.'};
 const code=await encodeHandoff(req);
 assert.match(code,/^[jg][A-Za-z0-9_-]+$/);
 assert.deepEqual(await decodeHandoff(code),req);
 assert.equal(extractCode('https://kora.test/t#'+code),code);
 assert.equal(extractCode('Ответы: https://t.me/psyparent_bot?startapp='+code+' спасибо'),code);
 assert.equal(await decodeHandoff('jбитый'),null);
 assert.equal(await decodeHandoff('x'+code.slice(1)),null);
 const long:HandoffAnswer={k:'a',v:1,id:'abc123def456',f:'school',c:'Маша',d:'2026-10-01',j:{attention:'Отвлекается на шум, на уроке математики сидит у окна и смотрит в окно. '.repeat(20)}};
 const packed=await encodeHandoff(long);
 assert.equal(packed[0],'g','long answers are compressed');
 const back=await decodeHandoff(packed) as HandoffAnswer;
 assert.equal(back.j!.attention,long.j!.attention.trim());
 assert.equal(back.d,'2026-10-01');
 assert.equal(answerLink('jabc','tg'),'https://t.me/psyparent_bot?startapp=jabc');
 assert.equal(answerLink('jabc','web'),'https://kora.test/import#jabc');
 assert.equal(answerLink('j'+'a'.repeat(600),'tg').startsWith('https://kora.test/import#'),true,'too long for a start link');
});

test('teacher answers become a screening result or a school observation',()=>{
 const form=screeningFormFor('snapiv')!;
 const ans:HandoffAnswer={k:'a',v:1,id:'req1abcd',f:'snapiv',c:'Маша',a:9,d:'2026-10-01',o:'Классный руководитель',x:'1'.repeat(form.questions.length)};
 const rec=answerToRecord(ans);
 assert('kind' in rec&&rec.kind==='screening');
 if('kind' in rec&&rec.kind==='screening'){assert.equal(rec.result.respondent,'teacher');assert.equal(rec.result.score.total,form.questions.length);assert.match(rec.result.notes,/Классный руководитель/);}
 assert(saveAnswer(rec,true));
 assert.equal(getScreenings()[0].includeInVisit,true);
 assert.match((answerToRecord({...ans,x:'12'}) as {error:string}).error,/неполные/);
 assert('error' in answerToRecord({...ans,f:'vanderbilt2002',a:15,x:'0'.repeat(43)}),'Vanderbilt is for 6–12 years');
 const school=answerToRecord({k:'a',v:1,id:'req2abcd',f:'school',c:'Маша',a:9,d:'2026-10-01',j:{attention:'Отвлекается'}});
 assert('kind' in school&&school.kind==='journal');
 assert(saveAnswer(school,false));
 assert.equal(getJournals()[0].respondent,'teacher');
 rememberRequest({id:'req1abcd',f:'snapiv',childLabel:'Маша',to:'',sentAt:'2026-09-30T10:00:00Z'});
 markAnswered('req1abcd','2026-10-01T10:00:00Z');
 assert.equal(getRequests()[0].answeredAt,'2026-10-01T10:00:00Z');
});

test('safety plan keeps contacts and lists and formats a card to share',()=>{
 const c=saveChild({label:'Маша',birth:'2011-03'})!;
 assert(!planFilled(emptyPlan()));
 const plan=normalizePlan({warning:['Не спит',' Не спит ',''],people:[{name:'Мама',phone:'+7 900 000-00-00'},{name:'',phone:''}],doctor:{name:'Доктор И.',phone:'8 800'},home:['Лекарства под замком'],reasons:['Собака']});
 assert.deepEqual(plan.warning,['Не спит']);
 assert.equal(plan.people.length,1);
 assert(savePlan(c.id,plan,new Date('2026-10-05T10:00:00Z')));
 assert.equal(getPlan(c.id).updatedAt,'2026-10-05T10:00:00.000Z');
 const text=formatPlan(getPlan(c.id),'Маша, 15 лет',['Сертралин — 50 мг']);
 for(const line of ['ПЛАН БЕЗОПАСНОСТИ · Маша, 15 лет','• Не спит','• Мама — +7 900 000-00-00','• Доктор И. — 8 800','• Детский телефон доверия — бесплатно, круглосуточно, для детей и родителей — 8-800-2000-122','• Сертралин — 50 мг','• Собака'])assert(text.includes(line),line);
 assert.equal(familyActions.length,4);
 assert(removePlan(c.id));
 assert(!planFilled(getPlan(c.id)));
});

test('documents list is validated and shows up in the timeline and the visit summary',()=>{
 const c=saveChild({label:'Маша',birth:'2017-03'})!;
 assert.deepEqual(validateDocument({kind:'eeg',date:'2026-10-01',title:'',note:''},'2026-10-05'),[]);
 assert(validateDocument({kind:'eeg',date:'2026-10-09',title:'',note:''},'2026-10-05').length===1);
 assert(validateDocument({kind:'eeg',date:'2026-10-01',title:'',note:''},'2026-10-05',{size:30*1024*1024,type:'image/jpeg'} as File).some(e=>e.includes('20 МБ')));
 assert(validateDocument({kind:'eeg',date:'2026-10-01',title:'',note:''},'2026-10-05',{size:10,type:'application/zip'} as File).some(e=>e.includes('PDF')));
 localStorage.setItem(DOCUMENTS_KEY,JSON.stringify({version:1,docs:[{id:'d1',childId:c.id,kind:'eeg',title:'',date:'2026-09-20',note:'Эпиактивности нет',createdAt:'2026-09-20T10:00:00Z'},{id:'d2',childId:c.id,kind:'nope',date:'2026-09-20'}]}));
 const docs=getDocuments(c.id);
 assert.deepEqual(docs.map(d=>[d.title,d.kind]),[['ЭЭГ','eeg']]);
 const data={child:c,profile:getProfile(c.id),events:[],checkIns:[],screenings:[],journals:[],appointment:null,memoCount:0,today:'2026-10-05',docs};
 assert(timelineEntries(data).some(e=>e.group==='docs'&&e.title==='ЭЭГ'&&e.text==='Эпиактивности нет'));
 const r=changeReport(data,6);
 assert.match(formatChanges(r,'Маша'),/Документы:\n• 20 сентября — ЭЭГ: Эпиактивности нет/);
});

test('navigator routes cover the main diagnoses and reference real topics',()=>{
 for(const id of ['asd','adhd','intellectual_disability','developmental_delay','speech_language_disorder','depression','gad'])assert(routeForDiagnosis(id),id);
 assert.equal(routeForDiagnosis('enuresis'),undefined);
 for(const r of navRoutes)for(const s of r.steps)for(const t of s.topics||[])assert(navTopicById(t),t);
 assert(navTopicById('pmpk')!.points.some(p=>p.includes('5 рабочих дней')));
 assert(navTopicById('exams')!.points.some(p=>p.includes('1,5 часа')));
});
