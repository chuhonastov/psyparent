import WebApp from '@twa-dev/sdk';
import {STORE_PREFIX,Store} from './syncCore';
// Telegram keeps two stores for a mini app: DeviceStorage (on this device, Bot API 9.0) and CloudStorage (the user's
// Telegram cloud, Bot API 6.9). The bundled SDK predates DeviceStorage, so it is called through the same WebView events
// the official telegram-web-app.js uses. Packing and merging live in syncCore.ts.
type WebView={onEvent(type:string,cb:(type:string,data:any)=>void):void;offEvent(type:string,cb:(type:string,data:any)=>void):void;postEvent(type:string,cb:false|((e?:unknown)=>void),data:unknown):void};
const webView=()=>(window as unknown as {Telegram?:{WebView?:WebView}}).Telegram?.WebView;
const inTelegram=()=>{try{return !!WebApp.initData;}catch{return false;}};
const atLeast=(v:string)=>{try{return WebApp.isVersionAtLeast(v);}catch{return false;}};
const DEVICE_EVENTS=['device_storage_key_saved','device_storage_key_received','device_storage_cleared','device_storage_failed'];

function deviceCall(method:string,params:Record<string,unknown>,timeoutMs=5000){
 return new Promise<string|null|true>((resolve,reject)=>{
  const wv=webView();
  if(!wv)return reject(new Error('unavailable'));
  const reqId='kora'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  const done=(error:Error|null,value?:string|null|true)=>{window.clearTimeout(timer);DEVICE_EVENTS.forEach(e=>wv.offEvent(e,handler));error?reject(error):resolve(value as string|null|true);};
  const handler=(type:string,data:any)=>{
   if(!data||data.req_id!==reqId)return;
   if(type==='device_storage_failed')done(new Error(String(data.error||'failed')));
   else done(null,type==='device_storage_key_received'?(typeof data.value==='string'?data.value:null):true);
  };
  const timer=window.setTimeout(()=>done(new Error('timeout')),timeoutMs);
  DEVICE_EVENTS.forEach(e=>wv.onEvent(e,handler));
  try{wv.postEvent(method,false,{req_id:reqId,...params});}catch(e){done(e instanceof Error?e:new Error('post'));}
 });
}
export const deviceStore:Store={name:'device',chunk:16000,maxChunks:300,
 async get(keys){const out:Record<string,string>={};for(const key of keys){const v=await deviceCall('web_app_device_storage_get_key',{key});if(typeof v==='string'&&v)out[key]=v;}return out;},
 async set(key,value){await deviceCall('web_app_device_storage_save_key',{key,value});},
 async remove(keys){for(const key of keys)await deviceCall('web_app_device_storage_save_key',{key,value:null});},
};

function cloudCall<T>(run:(cb:(err:unknown,res?:T)=>void)=>void,timeoutMs=10000){
 return new Promise<T>((resolve,reject)=>{
  const timer=window.setTimeout(()=>reject(new Error('timeout')),timeoutMs);
  try{run((err,res)=>{window.clearTimeout(timer);err?reject(new Error(String(err))):resolve(res as T);});}catch(e){window.clearTimeout(timer);reject(e);}
 });
}
const batches=<T,>(items:T[],size:number)=>{const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out;};
export const cloudStore:Store={name:'cloud',chunk:4000,maxChunks:500,
 async get(keys){const out:Record<string,string>={};for(const part of batches(keys,20)){const res=await cloudCall<Record<string,string>>(cb=>WebApp.CloudStorage.getItems(part,cb as any));for(const [k,v] of Object.entries(res||{}))if(typeof v==='string'&&v)out[k]=v;}return out;},
 async set(key,value){await cloudCall<boolean>(cb=>WebApp.CloudStorage.setItem(key,value,cb as any));},
 async remove(keys){for(const part of batches(keys,20))await cloudCall<boolean>(cb=>WebApp.CloudStorage.removeItems(part,cb as any));},
};
/** All keys the app keeps in the Telegram cloud, to remove the copy completely when sync is switched off. */
export const cloudKeys=()=>cloudCall<string[]>(cb=>WebApp.CloudStorage.getKeys(cb as any)).then(keys=>(keys||[]).filter(k=>k.startsWith(STORE_PREFIX)));
export const hasDeviceStore=()=>inTelegram()&&atLeast('9.0')&&!!webView();
export const hasCloudStore=()=>inTelegram()&&atLeast('6.9');
