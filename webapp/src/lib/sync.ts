import {merge,scan,signature,readManifest,readSnapshot,writeSnapshot,Entry,Manifest,Snapshot,Store,TooLargeError,LEGACY_TIME} from './syncCore';
import {cloudKeys,cloudStore,deviceStore,hasCloudStore,hasDeviceStore} from './tgStorage';
// Inside Telegram the records are copied to Telegram's storage on this device, and — when the parent switches it on —
// to their Telegram cloud to appear on other devices. Records stay in localStorage; this module only mirrors and merges.
const META_KEY='kora.sync.v1';
type Meta={entries:Record<string,Entry>;cloud?:boolean;cloudSig?:string;lastSync?:number};
export type SyncView={telegram:boolean;device:boolean;cloudAvailable:boolean;cloud:boolean;busy:boolean;lastSync:number|null;error:string|null};
const ownKey=(key:string)=>key.startsWith('psyparent.')||key.startsWith('parentguide.');
const STATE_EVENT='kora:sync-state';
let view:SyncView={telegram:false,device:false,cloudAvailable:false,cloud:false,busy:false,lastSync:null,error:null};
let deviceManifest:Manifest|null|undefined,cloudManifest:Manifest|null|undefined,queue:Promise<unknown>=Promise.resolve(),timer=0,started=false;

const setView=(patch:Partial<SyncView>)=>{view={...view,...patch};window.dispatchEvent(new Event(STATE_EVENT));};
export const getSyncView=()=>view;
export function subscribeSync(handler:()=>void){window.addEventListener(STATE_EVENT,handler);return ()=>window.removeEventListener(STATE_EVENT,handler);}

function readMeta():Meta|null{
 try{const raw=JSON.parse(localStorage.getItem(META_KEY)||'null');return raw&&typeof raw.entries==='object'?raw as Meta:null;}catch{return null;}
}
const writeMeta=(meta:Meta)=>{try{localStorage.setItem(META_KEY,JSON.stringify(meta));}catch{}};
function localData(){
 const data:Record<string,string>={};
 for(const key of Object.keys(localStorage).filter(ownKey)){const value=localStorage.getItem(key);if(value!==null)data[key]=value;}
 return data;
}
/** Writes merged values back to this browser and tells every screen to re-read its records. */
function applyLocal(snapshot:Snapshot,keys:string[]){
 if(!keys.length)return;
 for(const key of keys){try{snapshot.data[key]===undefined?localStorage.removeItem(key):localStorage.setItem(key,snapshot.data[key]);}catch{}}
 window.dispatchEvent(new Event('psyparent:visit-updated'));
 window.dispatchEvent(new Event('psyparent:all-data-cleared'));
}
const errorText=(e:unknown)=>e instanceof TooLargeError?'Записей слишком много для облака Telegram. Сохраните резервную копию файлом.':'Не удалось связаться с хранилищем Telegram. Попробуем ещё раз при следующем открытии.';

type Mode='boot'|'push'|'pull'|'enable';
async function pullFrom(store:Store,m:Manifest,snap:Snapshot,now:number){
 const remote=await readSnapshot(store,m),{snapshot,changedLocal}=merge(snap,remote,now);
 applyLocal(snapshot,changedLocal);
 return snapshot;
}
/** One round: read what changed here, take newer records from Telegram, write the result back where it differs. Returns whether the cloud was checked. */
async function run(mode:Mode){
 const now=Date.now(),stored=readMeta(),meta:Meta=stored??{entries:{}},data=localData();
 let snap:Snapshot={entries:scan(meta.entries,data,now,!stored).entries,data};
 if(view.device){
  try{
   if(deviceManifest===undefined)deviceManifest=await readManifest(deviceStore);
   // The device copy only restores records this window lost; afterwards it just follows the local state.
   if(mode==='boot'&&deviceManifest&&deviceManifest.sig!==signature(snap.entries))snap=await pullFrom(deviceStore,deviceManifest,snap,now);
  }catch{deviceManifest=undefined;}
 }
 // On start the cloud is awaited only when sync is on or this window is empty; otherwise it is checked after the first render.
 const checkCloud=view.cloudAvailable&&(mode==='boot'?!!meta.cloud||!Object.keys(data).length:mode==='push'?!!meta.cloud:true);
 let cloudError:unknown=null;
 if(checkCloud){
  try{
   cloudManifest=await readManifest(cloudStore);
   if(cloudManifest){meta.cloud=true;if(cloudManifest.sig!==meta.cloudSig&&cloudManifest.sig!==signature(snap.entries))snap=await pullFrom(cloudStore,cloudManifest,snap,now);}
   // The first device to switch sync on owns its old records, so a device joining later does not override them.
   else if(mode==='enable')snap={...snap,entries:Object.fromEntries(Object.entries(snap.entries).map(([k,e])=>[k,e.t===LEGACY_TIME?{...e,t:now}:e]))};
   else meta.cloud=false;
  }catch(e){cloudError=e;}
 }
 meta.entries=snap.entries;writeMeta(meta);
 const sig=signature(snap.entries);
 if(view.device&&deviceManifest!==undefined&&sig!==deviceManifest?.sig){try{deviceManifest=await writeSnapshot(deviceStore,snap,deviceManifest);}catch{deviceManifest=undefined;}}
 if(checkCloud&&!cloudError&&(meta.cloud||mode==='enable')){
  try{
   if(!cloudManifest||cloudManifest.sig!==sig)cloudManifest=await writeSnapshot(cloudStore,snap,cloudManifest??null);
   meta.cloud=true;meta.cloudSig=sig;meta.lastSync=now;
  }catch(e){cloudError=e;}
 }
 writeMeta(meta);
 setView({cloud:!!meta.cloud,lastSync:meta.lastSync??null,error:cloudError?errorText(cloudError):null});
 if(cloudError&&mode==='enable')throw cloudError;
 return checkCloud;
}
function enqueue(mode:Mode){
 const job=queue.then(async()=>{setView({busy:true});try{return await run(mode);}finally{setView({busy:false});}});
 queue=job.catch(e=>{if(mode!=='enable')setView({error:errorText(e)});});
 return job;
}

/** Called before the first render: in Telegram waits a moment for the copies so the screens open with the records. */
export function bootSync(waitMs=1500){
 const telegram=hasCloudStore()||hasDeviceStore();
 if(!telegram||started)return Promise.resolve();
 started=true;
 const meta=readMeta();
 setView({telegram:true,device:hasDeviceStore(),cloudAvailable:hasCloudStore(),cloud:!!meta?.cloud,lastSync:meta?.lastSync??null});
 const schedule=()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>enqueue('push'),1500);};
 window.addEventListener('psyparent:data-changed',schedule);
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){window.clearTimeout(timer);enqueue('push');}
  else if(readMeta()?.cloud)enqueue('pull');
 });
 const job=enqueue('boot').then(checked=>{if(!checked&&view.cloudAvailable)enqueue('pull').catch(()=>{});}).catch(()=>{});
 return Promise.race([job,new Promise<void>(r=>window.setTimeout(r,waitMs))]);
}
export const syncNow=()=>enqueue('pull').then(()=>view.error===null);
export async function enableCloudSync(){await enqueue('enable');}
/** Removes every record of the app from the Telegram cloud. Records on this device stay. */
export async function disableCloudSync(){
 const job=queue.then(async()=>{
  setView({busy:true});
  try{
   const keys=await cloudKeys();
   if(keys.length)await cloudStore.remove(keys);
   const meta=readMeta()??{entries:{}};delete meta.cloud;delete meta.cloudSig;delete meta.lastSync;writeMeta(meta);
   cloudManifest=null;setView({cloud:false,lastSync:null,error:null});
  }finally{setView({busy:false});}
 });
 queue=job.catch(()=>{});
 return job;
}
