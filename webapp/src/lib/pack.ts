import {deflateSync,inflateSync,strFromU8,strToU8} from 'fflate';
// Synchronous, URL-safe packing of JSON for links (A–Z, a–z, 0–9, «-», «_»). Synchronous on purpose:
// Telegram opens links only in direct response to a tap, so nothing may be awaited between the tap and openLink.
export const toB64url=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
export const fromB64url=(text:string)=>{let s=text.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
/** «z» + deflate of the JSON. */
export const packJSON=(value:unknown)=>'z'+toB64url(deflateSync(strToU8(JSON.stringify(value)),{level:9}));
export function unpackJSON<T=unknown>(code:string):T|null{
 try{if(code[0]!=='z'||!/^[A-Za-z0-9_-]+$/.test(code.slice(1)))return null;return JSON.parse(strFromU8(inflateSync(fromB64url(code.slice(1)))));}catch{return null;}
}
