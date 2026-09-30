import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashString,signature,scan,merge,unionById,splitChunks,encodeSnapshot,decodeSnapshot,parseManifest,readManifest,readSnapshot,writeSnapshot,LEGACY_TIME,Snapshot,Store,TooLargeError} from '../src/lib/syncCore';
import {replyText} from '../api/telegram';

const snap=(data:Record<string,string>,t:number,first=false):Snapshot=>({entries:scan({},data,t,first).entries,data});
function memoryStore(chunk=50,maxChunks=20){
 const map=new Map<string,string>();
 const store:Store={name:'cloud',chunk,maxChunks,
  async get(keys){const out:Record<string,string>={};for(const k of keys)if(map.has(k))out[k]=map.get(k)!;return out;},
  async set(k,v){map.set(k,v);},
  async remove(keys){keys.forEach(k=>map.delete(k));}};
 return {store,map};
}

test('hashes values and fingerprints the whole state',()=>{
 assert.equal(hashString('Кора'),hashString('Кора'));
 assert.notEqual(hashString('Кора'),hashString('Корa'));
 const a=snap({'psyparent.a':'1','psyparent.b':'2'},10);
 assert.equal(signature(a.entries),signature({...a.entries}));
 assert.notEqual(signature(a.entries),signature(snap({'psyparent.a':'1'},10).entries));
});

test('scan marks new, changed and deleted records and keeps unchanged times',()=>{
 const first=scan({},{'psyparent.a':'1'},100,true);
 assert.equal(first.entries['psyparent.a'].t,LEGACY_TIME);
 const same=scan(first.entries,{'psyparent.a':'1'},200);
 assert.equal(same.changed,false);
 assert.equal(same.entries['psyparent.a'].t,LEGACY_TIME);
 const edited=scan(same.entries,{'psyparent.a':'2','psyparent.b':'x'},300);
 assert.equal(edited.changed,true);
 assert.deepEqual([edited.entries['psyparent.a'].t,edited.entries['psyparent.b'].t],[300,300]);
 const removed=scan(edited.entries,{'psyparent.b':'x'},400);
 assert.deepEqual(removed.entries['psyparent.a'],{h:'',t:400,d:1});
 assert.equal(scan(removed.entries,{'psyparent.b':'x'},500).changed,false);
});

test('merge keeps the newer change of every record',()=>{
 const local=snap({'psyparent.a':'local','psyparent.b':'only here'},200);
 const remote=snap({'psyparent.a':'remote','psyparent.c':'only there'},100);
 const r=merge(local,remote,300);
 assert.deepEqual(r.snapshot.data,{'psyparent.a':'local','psyparent.b':'only here','psyparent.c':'only there'});
 assert.deepEqual(r.changedLocal,['psyparent.c']);
 const newer=merge(local,snap({'psyparent.a':'remote'},250),300);
 assert.equal(newer.snapshot.data['psyparent.a'],'remote');
 assert.deepEqual(newer.changedLocal,['psyparent.a']);
 // Equal time: the value on this device stays.
 assert.equal(merge(local,snap({'psyparent.a':'remote'},200),300).snapshot.data['psyparent.a'],'local');
});

test('a newer deletion removes the record and an older one does not',()=>{
 const local=snap({'psyparent.a':'1'},100);
 const deleted:Snapshot={entries:{'psyparent.a':{h:'',t:200,d:1}},data:{}};
 const r=merge(local,deleted,300);
 assert.equal(r.snapshot.data['psyparent.a'],undefined);
 assert.deepEqual(r.changedLocal,['psyparent.a']);
 const old:Snapshot={entries:{'psyparent.a':{h:'',t:50,d:1}},data:{}};
 assert.equal(merge(local,old,300).snapshot.data['psyparent.a'],'1');
 // After «Удалить все мои записи» the device keeps deletion marks, so an older copy in Telegram does not bring records back.
 const wiped={entries:scan(local.entries,{},400).entries,data:{}};
 assert.deepEqual(merge(wiped,local,500).snapshot.data,{});
});

test('restores everything into an empty window and skips damaged remote records',()=>{
 const device=snap({'psyparent.visit.v2':'{"questions":["Сон?"]}','psyparent.settings.v1':'{}'},100);
 const empty={entries:scan({},{},200,true).entries,data:{}};
 const r=merge(empty,device,300);
 assert.deepEqual(r.snapshot.data,device.data);
 assert.deepEqual(r.changedLocal.sort(),Object.keys(device.data).sort());
 const broken:Snapshot={entries:{'psyparent.x':{h:'h',t:900}},data:{}};
 assert.deepEqual(merge(empty,broken,300).snapshot.data,{});
});

test('records from two never-synced devices are joined by id instead of replaced',()=>{
 const joined=unionById('[{"id":"b","v":1},{"id":"c"}]','[{"id":"a"},{"id":"b","v":2}]');
 assert.equal(joined,'[{"id":"a"},{"id":"b","v":2},{"id":"c"}]');
 assert.equal(unionById('{"x":1}','[{"id":"a"}]'),null);
 const local=snap({'psyparent.screenings.v1':'[{"id":"mine"}]','psyparent.settings.v1':'{"textSize":"large"}'},100,true);
 const remote=snap({'psyparent.screenings.v1':'[{"id":"theirs"}]','psyparent.settings.v1':'{"textSize":"normal"}'},200);
 const r=merge(local,remote,300);
 assert.equal(r.snapshot.data['psyparent.screenings.v1'],'[{"id":"theirs"},{"id":"mine"}]');
 assert.equal(r.snapshot.entries['psyparent.screenings.v1'].t,300);
 assert.equal(r.snapshot.data['psyparent.settings.v1'],'{"textSize":"normal"}');
});

test('packs a copy into ASCII chunks with and without compression',async()=>{
 const s=snap({'psyparent.journals.v1':JSON.stringify([{id:'1',text:'Плохо спал, проснулся в 3 часа ночи 😴'.repeat(40)}])},100);
 const packed=await encodeSnapshot(s);
 assert.equal(packed.z,1);
 assert.match(packed.text,/^[A-Za-z0-9+/=]+$/);
 assert.deepEqual(await decodeSnapshot(packed.text,packed.z),s);
 const saved=globalThis.CompressionStream;
 try{
  (globalThis as any).CompressionStream=undefined;
  const plain=await encodeSnapshot(s);
  assert.equal(plain.z,0);
  assert.deepEqual(await decodeSnapshot(plain.text,0),s);
  assert(plain.text.length>packed.text.length);
 }finally{(globalThis as any).CompressionStream=saved;}
 assert.deepEqual(splitChunks('abcdefg',3),['abc','def','g']);
 assert.deepEqual(splitChunks('',3),['']);
 await assert.rejects(decodeSnapshot(btoa('{"v":2}'),0));
});

test('writes into the free slot, points the manifest at it and cleans old chunks',async()=>{
 const {store,map}=memoryStore(40);
 assert.equal(await readManifest(store),null);
 const big=snap({'psyparent.a':'x'.repeat(3000)+Math.random()},100);
 const m1=await writeSnapshot(store,big,null);
 assert.equal(m1.s,'a');
 assert(m1.n>1);
 assert.deepEqual(await readManifest(store),m1);
 assert.deepEqual(await readSnapshot(store,m1),big);
 const small=snap({'psyparent.a':'y'},200);
 const m2=await writeSnapshot(store,small,m1);
 assert.equal(m2.s,'b');
 assert.deepEqual(await readSnapshot(store,m2),small);
 const m3=await writeSnapshot(store,small,m2);
 assert.equal(m3.s,'a');
 assert.equal(m3.c.a,m3.n);
 assert.equal([...map.keys()].filter(k=>k.startsWith('kora_a')).length,m3.n);
 map.set('kora_a0',map.get('kora_a0')!+'x');
 await assert.rejects(readSnapshot(store,m3),/corrupt/);
 const tiny=memoryStore(10,1);
 await assert.rejects(writeSnapshot(tiny.store,big,null),TooLargeError);
});

test('two devices end up with the same records',async()=>{
 const {store}=memoryStore(4000,500);
 // Phone: records from before sync, then sync is switched on (old records become the phone's).
 let phone=snap({'psyparent.visit.v2':'{"questions":["Сон"]}'},0,true);
 phone={...phone,entries:Object.fromEntries(Object.entries(phone.entries).map(([k,e])=>[k,{...e,t:1000}]))};
 let m=await writeSnapshot(store,phone,null);
 // Desktop has its own old answers and joins later.
 const desktop=snap({'psyparent.visit.v2':'{"questions":[]}','psyparent.screenings.v1':'[{"id":"s1"}]'},0,true);
 const joined=merge(desktop,await readSnapshot(store,m),2000).snapshot;
 assert.equal(joined.data['psyparent.visit.v2'],'{"questions":["Сон"]}');
 assert.equal(joined.data['psyparent.screenings.v1'],'[{"id":"s1"}]');
 m=await writeSnapshot(store,joined,m);
 // Phone edits later; desktop picks it up on the next round.
 const phoneData={...joined.data,'psyparent.visit.v2':'{"questions":["Сон","Аппетит"]}'};
 phone={entries:scan(joined.entries,phoneData,3000).entries,data:phoneData};
 m=await writeSnapshot(store,merge(phone,await readSnapshot(store,m),3000).snapshot,m);
 const desktopNext=merge(joined,await readSnapshot(store,m),4000);
 assert.deepEqual(desktopNext.snapshot.data,phoneData);
 assert.deepEqual(desktopNext.changedLocal,['psyparent.visit.v2']);
 assert.equal(signature(desktopNext.snapshot.entries),m.sig);
});

test('rejects damaged manifests',()=>{
 assert.equal(parseManifest(null),null);
 assert.equal(parseManifest('{'),null);
 assert.equal(parseManifest('{"v":1,"s":"c","n":1,"h":"x","sig":"y","z":0}'),null);
 assert.equal(parseManifest('{"v":1,"s":"a","n":0,"h":"x","sig":"y","z":0}'),null);
 assert.deepEqual(parseManifest('{"v":1,"s":"a","n":2,"h":"x","sig":"y","z":1,"t":5}'),{v:1,s:'a',n:2,h:'x',sig:'y',z:1,t:5,c:{a:0,b:0}});
});

test('the bot answers commands and plain messages',()=>{
 assert.match(replyText('/start'),/помогает разобраться/);
 assert.match(replyText('/start@psyparent_bot'),/помогает разобраться/);
 assert.match(replyText('/help'),/Бот не проводит консультации/);
 assert.equal(replyText('/app'),'Ваша памятка и справочник:');
 assert.match(replyText('у ребёнка сыпь'),/не читает и не хранит/);
 assert.match(replyText(undefined),/не читает и не хранит/);
});
