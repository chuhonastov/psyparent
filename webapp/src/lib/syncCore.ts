// Pure part of the Telegram copy and sync: which records changed, how two copies merge and how a copy is packed into
// the small values Telegram storage accepts. No DOM or Telegram calls here, so everything is covered by unit tests.

/** Every stored key carries a hash of its value and the time of its last change; a deleted key keeps a mark. */
export type Entry={h:string;t:number;d?:1};
export type Snapshot={entries:Record<string,Entry>;data:Record<string,string>};
export type Manifest={v:1;s:'a'|'b';n:number;h:string;sig:string;z:0|1;t:number;c:{a:number;b:number}};
/** Records that existed before the first sync get this time: a copy that was already synced wins over them. */
export const LEGACY_TIME=1;

export function hashString(text:string){
 let h=0x811c9dc5;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}
 return text.length.toString(36)+'.'+(h>>>0).toString(36);
}
/** Short fingerprint of the whole state: equal fingerprints mean there is nothing to write. */
export const signature=(entries:Record<string,Entry>)=>hashString(Object.keys(entries).sort().map(k=>k+'='+entries[k].h+(entries[k].d?'!':'')).join('\n'));

/** Compares the records with the last known entries. The first scan on a device marks existing records as never synced. */
export function scan(previous:Record<string,Entry>,data:Record<string,string>,now:number,first=false){
 const entries:Record<string,Entry>={...previous};let changed=false;
 for(const [key,value] of Object.entries(data)){
  const h=hashString(value),e=entries[key];
  if(!e||e.d||e.h!==h){entries[key]={h,t:first?LEGACY_TIME:now};changed=true;}
 }
 for(const [key,e] of Object.entries(entries))if(!(key in data)&&!e.d){entries[key]={h:'',t:now,d:1};changed=true;}
 return {entries,changed};
}

/** Lists of records with an id from two devices that were never synced are joined instead of one replacing the other. */
export function unionById(local:string,remote:string){
 let a:unknown,b:unknown;
 try{a=JSON.parse(local);b=JSON.parse(remote);}catch{return null;}
 const listed=(x:unknown):x is {id:string}[]=>Array.isArray(x)&&x.every(i=>i&&typeof i==='object'&&typeof (i as any).id==='string');
 if(!listed(a)||!listed(b))return null;
 const ids=new Set(b.map(i=>i.id)),extra=a.filter(i=>!ids.has(i.id));
 return extra.length?JSON.stringify([...b,...extra]):remote;
}

/** Newer change wins for every key; on equal time the local value stays. Returns the merged copy and the keys to rewrite locally. */
export function merge(local:Snapshot,remote:Snapshot,now:number){
 const entries:Record<string,Entry>={},data:Record<string,string>={},changedLocal:string[]=[];
 for(const key of new Set([...Object.keys(local.entries),...Object.keys(remote.entries)])){
  const a=local.entries[key],b=remote.entries[key];
  let win:'a'|'b'=!a?'b':!b?'a':b.t>a.t?'b':'a';
  if(win==='b'&&!b.d&&remote.data[key]===undefined)win=a?'a':'b';
  if(win==='b'&&!b.d&&remote.data[key]===undefined)continue;
  if(a&&b&&win==='b'&&a.t===LEGACY_TIME&&!a.d&&!b.d&&local.data[key]!==undefined){
   const joined=unionById(local.data[key],remote.data[key]);
   if(joined!==null&&joined!==remote.data[key]){entries[key]={h:hashString(joined),t:now};data[key]=joined;changedLocal.push(key);continue;}
  }
  const e=win==='a'?a:b,value=win==='a'?local.data[key]:remote.data[key];
  entries[key]=e;
  if(!e.d&&value!==undefined)data[key]=value;
  if(win==='b'&&(e.d?local.data[key]!==undefined:local.data[key]!==value))changedLocal.push(key);
 }
 return {snapshot:{entries,data} as Snapshot,changedLocal};
}

export function splitChunks(text:string,size:number){
 const out:string[]=[];
 for(let i=0;i<text.length;i+=size)out.push(text.slice(i,i+size));
 return out.length?out:[''];
}

const toBase64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);};
const fromBase64=(text:string)=>{const s=atob(text),bytes=new Uint8Array(s.length);for(let i=0;i<s.length;i++)bytes[i]=s.charCodeAt(i);return bytes;};
async function pipe(bytes:Uint8Array,stream:CompressionStream|DecompressionStream){
 const out=new Blob([bytes as BlobPart]).stream().pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array,Uint8Array>);
 return new Uint8Array(await new Response(out).arrayBuffer());
}
/** Packs a copy into ASCII (Telegram limits values by characters) and compresses it where the browser can. */
export async function encodeSnapshot(snapshot:Snapshot){
 const bytes=new TextEncoder().encode(JSON.stringify({v:1,...snapshot}));
 if(typeof CompressionStream==='function')return {text:toBase64(await pipe(bytes,new CompressionStream('gzip'))),z:1 as const};
 return {text:toBase64(bytes),z:0 as const};
}
export async function decodeSnapshot(text:string,z:0|1):Promise<Snapshot>{
 let bytes=fromBase64(text);
 if(z){if(typeof DecompressionStream!=='function')throw new Error('unsupported');bytes=await pipe(bytes,new DecompressionStream('gzip'));}
 const raw=JSON.parse(new TextDecoder().decode(bytes));
 if(!raw||raw.v!==1||typeof raw.entries!=='object'||typeof raw.data!=='object')throw new Error('corrupt');
 const entries:Record<string,Entry>={},data:Record<string,string>={};
 for(const [key,e] of Object.entries(raw.entries as Record<string,any>)){
  if(!e||typeof e.h!=='string'||typeof e.t!=='number')continue;
  entries[key]=e.d?{h:'',t:e.t,d:1}:{h:e.h,t:e.t};
  if(!e.d&&typeof raw.data[key]==='string')data[key]=raw.data[key];
 }
 return {entries,data};
}

export function parseManifest(text:string|null|undefined):Manifest|null{
 if(!text)return null;
 try{
  const m=JSON.parse(text);
  if(m&&m.v===1&&(m.s==='a'||m.s==='b')&&Number.isInteger(m.n)&&m.n>0&&typeof m.h==='string'&&typeof m.sig==='string'&&(m.z===0||m.z===1))
   return {v:1,s:m.s,n:m.n,h:m.h,sig:m.sig,z:m.z,t:Number(m.t)||0,c:{a:Number(m.c?.a)||0,b:Number(m.c?.b)||0}};
 }catch{}
 return null;
}

/** A key-value store of Telegram (or a test double). Values are limited in length, so a copy is split into chunks. */
export type Store={name:'device'|'cloud';chunk:number;maxChunks:number;get(keys:string[]):Promise<Record<string,string>>;set(key:string,value:string):Promise<void>;remove(keys:string[]):Promise<void>};
export const STORE_PREFIX='kora_';
const MANIFEST=STORE_PREFIX+'m';
const chunkKey=(slot:'a'|'b',i:number)=>STORE_PREFIX+slot+i;
export class TooLargeError extends Error{constructor(){super('too_large');}}

export async function readManifest(store:Store){return parseManifest((await store.get([MANIFEST]))[MANIFEST]);}
export async function readSnapshot(store:Store,m:Manifest):Promise<Snapshot>{
 const keys=Array.from({length:m.n},(_,i)=>chunkKey(m.s,i));
 const values=await store.get(keys),text=keys.map(k=>values[k]??'').join('');
 if(hashString(text)!==m.h)throw new Error('corrupt');
 return decodeSnapshot(text,m.z);
}
/** Writes the copy into the slot that is not in use and only then points the manifest at it, so a reader never sees half a copy. */
export async function writeSnapshot(store:Store,snapshot:Snapshot,previous:Manifest|null):Promise<Manifest>{
 const {text,z}=await encodeSnapshot(snapshot),chunks=splitChunks(text,store.chunk);
 if(chunks.length>store.maxChunks)throw new TooLargeError();
 const slot=previous?.s==='a'?'b':'a',counts={a:previous?.c.a??0,b:previous?.c.b??0};
 for(let i=0;i<chunks.length;i+=4)await Promise.all(chunks.slice(i,i+4).map((c,j)=>store.set(chunkKey(slot,i+j),c)));
 const stale=Array.from({length:Math.max(0,counts[slot]-chunks.length)},(_,i)=>chunkKey(slot,chunks.length+i));
 counts[slot]=chunks.length;
 const m:Manifest={v:1,s:slot,n:chunks.length,h:hashString(text),sig:signature(snapshot.entries),z,t:Date.now(),c:counts};
 await store.set(MANIFEST,JSON.stringify(m));
 if(stale.length)await store.remove(stale).catch(()=>{});
 return m;
}
