import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {resetEnv} from './env020';
beforeEach(resetEnv);
import {acknowledge,isSnoozed,snooze,snoozeKey} from '../src/lib/snooze';
import {importFiles,referencedFiles,DOCUMENTS_KEY} from '../src/lib/documents';
import {packJSON,unpackJSON} from '../src/lib/pack';
import {readSaveLink,saveLink} from '../src/lib/files';
import {classify,cleanText,makePdf} from '../src/lib/pdf/makePdf';
import {formatChildReport} from '../src/lib/childReport';
import {saveChild} from '../src/lib/children';
import {addDoctor,addGoal,getProfile} from '../src/lib/profile';
import {addEvent,getEvents} from '../src/lib/treatment';
import {saveCheckIn} from '../src/lib/monitoring';
import {todayItems,RouteData} from '../src/lib/route';
import {detectSource,flush,isoWeek,pendingEvents,setStatsConsent,statsConsent,track,trackError,trackOpen} from '../src/lib/analytics';
import {countersFor,isoWeek as serverWeek,record} from '../api/stats';
import {mailFor,parseFeedback} from '../api/feedback';

test('«later» and «already called the doctor» belong to one child and one alarming answer',()=>{
 const today='2026-10-05';
 snooze(snoozeKey('masha','checkin'),'2026-10-06',today);
 assert(isSnoozed(snoozeKey('masha','checkin'),today));
 assert(!isSnoozed(snoozeKey('petya','checkin'),today),'the other child still sees it');
 acknowledge(snoozeKey('masha','urgent-c1'),today);
 assert(isSnoozed(snoozeKey('masha','urgent-c1'),'2027-05-01'),'acknowledged for good');
 assert(!isSnoozed(snoozeKey('masha','urgent-c2'),today),'a new alarming answer shows again');
 assert(!isSnoozed(snoozeKey('petya','urgent-c1'),today));
 // The Today item of a warning is tied to its check-in.
 const c=saveChild({label:'Маша',birth:'2012-03'})!;
 addEvent({childId:c.id,date:'2026-09-01',kind:'start',medId:'ssri_sertraline',dose:'25 мг'},today);
 const rec=saveCheckIn({childId:c.id,date:today,goals:{},items:{dark_thoughts:2},numbers:{},note:''})!;
 const data:RouteData={child:c,profile:getProfile(c.id),events:getEvents(c.id),checkIns:[rec],screenings:[],journals:[],appointment:null,memoCount:0,today};
 const urgent=todayItems(data).find(i=>i.tone==='danger');
 assert.equal(urgent?.id,'urgent-'+rec.id);
});

test('restoring files reports restored, failed and missing ones separately',async()=>{
 // No IndexedDB here: every write fails, as when the browser refuses the space.
 const r=await importFiles({f1:{name:'eeg.png',type:'image/png',data:'iVBORw0KGgo='},f2:{name:'mri.pdf',type:'application/pdf',data:'%%%'}},['f1','f2','f3']);
 assert.equal(r.restored,0);
 assert.deepEqual(r.failed.sort(),['eeg.png','mri.pdf']);
 assert.equal(r.absent,1,'f3 is described but its file is not in the copy');
 assert.deepEqual(referencedFiles({[DOCUMENTS_KEY]:JSON.stringify({version:1,docs:[{file:{id:'a'}},{},{file:{id:'b'}}]})}),['a','b']);
 assert.deepEqual(await importFiles(undefined,[]),{restored:0,failed:[],absent:0});
});

test('files travel to the phone browser inside the link after «#» and are checked there',()=>{
 const value={kind:'pdf',name:'Kora-lenta.pdf',text:'ЛЕНТА ЛЕЧЕНИЯ · Маша\n• Начат препарат'};
 assert.deepEqual(unpackJSON(packJSON(value)),value);
 assert.equal(unpackJSON('zinvalid!'),null);
 const link=saveLink(value as any,'https://psyparent.vercel.app');
 assert.match(link,/^https:\/\/psyparent\.vercel\.app\/save#z[A-Za-z0-9_-]+$/);
 assert.deepEqual(readSaveLink(link.split('#')[1]),value);
 assert.equal(readSaveLink(packJSON({...value,name:'../evil.pdf'})),null);
 assert.equal(readSaveLink(packJSON({kind:'file',name:'x.html',type:'text/html',content:'<script>'})),null);
 assert.equal(readSaveLink(packJSON({kind:'file',name:'kopiya.json',type:'application/json',content:'{}'}))?.kind,'file');
});

test('PDF: headings, lists and only drawable characters',async()=>{
 assert.equal(cleanText('Нон‑стоп 🙂 ≥ 2'),'Нон-стоп  ≥ 2');
 const kinds=classify(['ЛЕНТА ЛЕЧЕНИЯ · Маша, 9 лет','Записи семьи по датам.','','1 сентября 2026','• Начат препарат: Атомоксетин','','ЧТО ИЗМЕНИЛОСЬ ЗА 6 НЕДЕЛЬ · Маша','Лечение:','1. Вопрос врачу','Составлено в приложении «Кора».']).map(x=>x.kind);
 assert.deepEqual(kinds,['title','subtitle','blank','sub','bullet','blank','section','sub','number','footer']);
 const blob=makePdf('ПАМЯТКА К ПРИЁМУ\nТест\n\nВОПРОСЫ\n1. Как понять, что лечение помогает?');
 const head=new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0,5));
 assert.equal(head,'%PDF-');
});

test('«Всё о ребёнке» collects the profile, the changes and the timeline',()=>{
 const today='2026-10-05',c=saveChild({label:'Маша',birth:'2017-03'})!;
 addDoctor(c.id,{name:'Иванова И. И.',role:'детский психиатр',phone:'+7 900 000-00-00',place:''});
 addGoal(c.id,'Тревога перед школой','severity');
 addEvent({childId:c.id,date:'2026-09-20',kind:'start',medId:'atomoxetine',dose:'10 мг'},today);
 const text=formatChildReport({child:c,profile:getProfile(c.id),events:getEvents(c.id),checkIns:[],screenings:[],journals:[],appointment:null,memoCount:0,today});
 assert.match(text,/^ВСЁ О РЕБЁНКЕ · Маша, 9 лет/);
 for(const part of ['Месяц рождения: март 2017','Иванова И. И., детский психиатр','• Тревога перед школой','ЛЕНТА ЛЕЧЕНИЯ','Атомоксетин'])assert(text.includes(part),part);
 assert.equal(text.split('\n').filter(l=>l.startsWith('Составлено')).length,1);
});

test('statistics: nothing before consent, then counters only, each once',async()=>{
 assert.equal(isoWeek('2026-10-05'),'2026-W41');assert.equal(isoWeek('2021-01-03'),'2020-W53');assert.equal(isoWeek('2024-12-30'),'2025-W01');
 assert.equal(serverWeek('2026-10-05'),'2026-W41');
 trackOpen('2026-10-05');track('checkin','2026-10-05');trackError('save','2026-10-05');
 assert.equal(statsConsent(),undefined);
 assert.equal(pendingEvents().length,0,'nothing is queued without consent');
 setStatsConsent('yes','2026-10-05');
 const first=pendingEvents().map(e=>e.t);
 assert.deepEqual(first,['join','day','week','month','first'],'a check-in made before consent still counts as the first record');
 const day=pendingEvents().find(e=>e.t==='day')!;
 assert.equal(day.n,1);assert.equal(day.s,'direct');assert.equal(day.p,'web');
 trackOpen('2026-10-05');
 assert.equal(pendingEvents().length,5,'opened again the same day: nothing new');
 track('checkin','2026-10-05');track('journal','2026-10-05');
 assert.deepEqual(pendingEvents().slice(5).map(e=>e.t+':'+(e.a||e.m)),['act:checkin','task:2026-10','act:journal'],'the monthly «useful action» is counted once');
 const ids=new Set(pendingEvents().map(e=>e.i));assert.equal(ids.size,pendingEvents().length);
 // Nothing personal in the queue.
 assert.doesNotMatch(JSON.stringify(pendingEvents()),/Маша|сертралин|psyparent\./i);
 const sent:any[]=[];
 await flush((async(_u:string,init:any)=>{sent.push(JSON.parse(init.body));return {ok:false,status:503};}) as any);
 assert.equal(pendingEvents().length,8,'kept after a failed delivery');
 await flush((async(_u:string,init:any)=>{sent.push(JSON.parse(init.body));return {ok:true,status:204};}) as any);
 assert.equal(pendingEvents().length,0);
 assert.deepEqual(Object.keys(sent[1]).sort(),['e','v']);
 setStatsConsent('no');trackOpen('2026-10-06');assert.equal(pendingEvents().length,0);
});

test('statistics source: campaign tag, referrer or direct',()=>{
 assert.equal(detectSource('?utm_source=VK_post','',null),'vk_post');
 assert.equal(detectSource('','https://away.vk.com/x?to=1',null),'vk.com');
 assert.equal(detectSource('','',  'src_tg-channel'),'tg-channel');
 assert.equal(detectSource('','https://psyparent.vercel.app/child',null),'direct');
});

test('the statistics server keeps only known counters and counts a repeated delivery once',async()=>{
 const today='2026-10-05';
 assert.deepEqual(countersFor({i:'abcdefgh1',t:'day',d:today,p:'tg',n:1,s:'vk.com'},today),[['d:'+today,'visits'],['d:'+today,'visits:tg'],['d:'+today,'new'],['d:'+today,'new:tg'],['d:'+today,'src:vk.com']]);
 assert.equal(countersFor({i:'abcdefgh1',t:'act',d:today,a:'diagnosis_adhd'},today),null,'unknown action');
 assert.equal(countersFor({i:'abcdefgh1',t:'act',d:'2026-09-01',a:'checkin'},today),null,'old date');
 assert.equal(countersFor({i:'x',t:'act',d:today,a:'checkin'},today),null,'bad id');
 assert.equal(countersFor({i:'abcdefgh1',t:'day',d:today,p:'tg',n:1,s:'<script>'},today)!.length,4,'odd source dropped');
 assert.deepEqual(countersFor({i:'abcdefgh1',t:'week',w:'2026-W41',c:'2026-W38'},today),[['w:2026-W41','active'],['w:2026-W41','c:2026-W38']]);
 assert.equal(countersFor({i:'abcdefgh1',t:'week',w:'2026-W41',c:'2026-W43'},today),null,'cohort after the week');
 // Fake Upstash: SET NX remembers ids, HINCRBY adds.
 const ids=new Set<string>(),counts=new Map<string,number>();
 const fetcher=async(_url:string,init:{body:string})=>({ok:true,json:async()=>JSON.parse(init.body).map((c:any[])=>{if(c[0]==='SET'){if(ids.has(c[1]))return {result:null};ids.add(c[1]);return {result:'OK'};}if(c[0]==='HINCRBY'){const k=c[1]+'|'+c[2];counts.set(k,(counts.get(k)||0)+1);return {result:counts.get(k)};}return {result:1};})});
 Object.assign(process.env,{KV_REST_API_URL:'https://example.upstash.io',KV_REST_API_TOKEN:'t'});
 const batch=[{i:'evt000001',t:'act',d:today,a:'checkin'},{i:'evt000002',t:'act',d:today,a:'checkin'},{i:'evt000003',t:'act',d:today,a:'weird'}];
 assert.equal((await record(batch,fetcher as any,today)).counted,2);
 assert.equal((await record(batch,fetcher as any,today)).counted,0,'the same events again add nothing');
 assert.equal(counts.get('kora:d:'+today+'|a:checkin'),2);
 delete process.env.KV_REST_API_URL;delete process.env.KV_REST_API_TOKEN;
 assert.deepEqual(await record(batch,fetcher as any,today),{stored:false,counted:0});
});

test('feedback: spam traps, length and a reply address',()=>{
 assert.deepEqual(parseFeedback({message:'Привет, нашёл ошибку',website:'x',elapsed:9000}),{error:'spam'});
 assert.deepEqual(parseFeedback({message:'Привет, нашёл ошибку',elapsed:200}),{error:'spam'});
 assert.deepEqual(parseFeedback({message:'ок',elapsed:9000}),{error:'length'});
 const f=parseFeedback({message:'  В карточке опечатка  ',contact:'mama@example.ru',platform:'tg',app:'0.20.0',elapsed:9000});
 assert(!('error' in f));
 const mail=mailFor(f as any);
 assert.equal(mail.replyTo,'mama@example.ru');
 assert.match(mail.text,/^В карточке опечатка\n/);
 assert.match(mail.text,/Открыто: Telegram, сборка 0\.20\.0/);
 assert.equal(mailFor({...(f as any),contact:'@mama'}).replyTo,undefined);
});
