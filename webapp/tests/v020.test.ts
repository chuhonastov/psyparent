import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {resetEnv} from './env020';
beforeEach(resetEnv);
import {acknowledge,isSnoozed,snooze,snoozeKey} from '../src/lib/snooze';
import {importFiles,referencedFiles,DOCUMENTS_KEY} from '../src/lib/documents';
import {packJSON,unpackJSON} from '../src/lib/pack';
import {readSaveLink,saveLink} from '../src/lib/files';
import {classify,cleanText,makePdf} from '../src/lib/pdf/makePdf';
import {childReportDoc,memoDoc,timelineDoc} from '../src/lib/reports';
import {cleanDoc} from '../src/lib/pdf/doc';
import {renderDoc} from '../src/lib/pdf/makePdf';
import {saveChild} from '../src/lib/children';
import {addDoctor,addGoal,getProfile} from '../src/lib/profile';
import {addEvent,getEvents} from '../src/lib/treatment';
import {saveCheckIn} from '../src/lib/monitoring';
import {todayItems,RouteData} from '../src/lib/route';
import {channelMessagesLink} from '../src/pages/Feedback';

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

test('the report for a specialist: key facts, what changed, weekly grid, tables',async()=>{
 const today='2026-10-05',c=saveChild({label:'Маша',birth:'2017-03'})!;
 addDoctor(c.id,{name:'Иванова И. И.',role:'детский психиатр',phone:'+7 900 000-00-00',place:''});
 addGoal(c.id,'Тревога перед школой','severity');
 addEvent({childId:c.id,date:'2026-09-01',kind:'start',medId:'atomoxetine',dose:'10 мг'},today);
 const goal=getProfile(c.id).goals[0].id;
 saveCheckIn({childId:c.id,date:'2026-09-20',goals:{[goal]:3},items:{appetite_low:1},numbers:{},note:''});
 saveCheckIn({childId:c.id,date:'2026-10-01',goals:{[goal]:1},items:{appetite_low:0,dark_thoughts:1},numbers:{},note:''});
 const data:RouteData={child:c,profile:getProfile(c.id),events:getEvents(c.id),checkIns:(await import('../src/lib/monitoring')).getCheckIns(c.id),screenings:[],journals:[],appointment:null,memoCount:0,today};
 const doc=childReportDoc(data),kinds=doc.blocks.map(b=>b.t);
 assert.equal(kinds[0],'title');assert.equal(kinds[1],'facts');
 const urgent=doc.blocks.find(b=>b.t==='callout') as any;
 assert.equal(urgent.tone,'danger');assert.match(urgent.items[0],/^01\.10: /);
 const main=doc.blocks.find(b=>b.t==='table') as any;
 assert.deepEqual(main.head,['Показатель','Было','Стало','Изменение']);
 assert.deepEqual(main.rows[0].map((c:any)=>typeof c==='string'?c:c.text),['Тревога перед школой','сильно','немного','лучше']);
 const grid=doc.blocks.find(b=>b.t==='table'&&(b as any).head[1]==='20.09') as any;
 assert(grid,'weekly grid by date');
 assert.equal(grid.rows[0][1].tone,'sev3');
 assert(doc.blocks.some(b=>b.t==='table'&&(b as any).head.includes('Препарат')),'treatment table');
 // The document survives the trip through a link and draws as a PDF.
 const back=cleanDoc(JSON.parse(JSON.stringify(doc)))!;
 assert.equal(back.blocks.length,doc.blocks.length);
 assert.equal(cleanDoc({blocks:[{t:'script',x:1},{t:'text',text:5}]})!.blocks.length,1);
 const head=new TextDecoder().decode(new Uint8Array(await renderDoc(doc).arrayBuffer()).slice(0,5));
 assert.equal(head,'%PDF-');
 assert.equal(timelineDoc(data).blocks[1].t,'table');
 const memo=memoDoc({visit:{version:2,questions:['Когда повышать дозу?'],meds:[],medDetails:{},checklists:{}},results:[],journals:[],appointment:null,route:data,childTitle:'Маша, 9 лет',today});
 const qi=memo.blocks.findIndex(b=>b.t==='list'),di=memo.blocks.findIndex(b=>b.t==='table');
 assert(qi>0&&qi<di,'questions come before the tables in the memo');
});

test('feedback goes to the direct messages of the author channel, nothing is sent by the app',()=>{
 assert.equal(channelMessagesLink,'https://t.me/doc_kras?direct');
});
