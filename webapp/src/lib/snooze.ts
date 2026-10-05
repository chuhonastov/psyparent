// «Отложить» on the Today screen: hidden until the given date, on this device only.
const KEY='kora.snooze.v1';
const read=():Record<string,string>=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{};}catch{return {};}};
export const isSnoozed=(id:string,today:string)=>{const until=read()[id];return typeof until==='string'&&until>today;};
export function snooze(id:string,until:string,today:string){
 const all=read();for(const [k,v] of Object.entries(all))if(typeof v!=='string'||v<=today)delete all[k];
 all[id]=until;try{localStorage.setItem(KEY,JSON.stringify(all));}catch{}
 window.dispatchEvent(new Event('kora:snooze'));
}
