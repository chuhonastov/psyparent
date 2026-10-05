// «Отложить» on the Today screen: hidden until the given date, on this device only.
// Keys are per child; a warning is acknowledged for one check-in, so a new alarming answer shows again.
const KEY='kora.snooze.v1',FOREVER='9999-12-31',MAX=300;
const read=():Record<string,string>=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{};}catch{return {};}};
export const snoozeKey=(childId:string,itemId:string)=>childId+':'+itemId;
export const isSnoozed=(id:string,today:string)=>{const until=read()[id];return typeof until==='string'&&until>today;};
export function snooze(id:string,until:string,today:string){
 const all=read();for(const [k,v] of Object.entries(all))if(typeof v!=='string'||v<=today)delete all[k];
 delete all[id];const keys=Object.keys(all);for(const k of keys.slice(0,Math.max(0,keys.length-MAX+1)))delete all[k];
 all[id]=until;try{localStorage.setItem(KEY,JSON.stringify(all));}catch{}
 window.dispatchEvent(new Event('kora:snooze'));
}
/** «Уже связались с врачом»: this warning stays hidden; another one will show. */
export const acknowledge=(id:string,today:string)=>snooze(id,FOREVER,today);
