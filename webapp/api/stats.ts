// Anonymous usage statistics of «Кора» (see src/lib/analytics.ts). Only counters are stored: «on 5 October: 120 opened,
// 14 new, 30 check-ins saved». No IP address, browser details, device identifiers or record contents are kept.
// Storage: Upstash Redis through its REST API (Vercel → Storage → Upstash). Without it events are accepted and dropped.
// GET shows the report, protected by the STATS_PASSWORD environment variable (any user name).
declare const process:{env:Record<string,string|undefined>};
declare const Buffer:{from(s:string,enc:string):{toString(enc:string):string}};
type Req={method?:string;url?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(code:number):Res;setHeader(name:string,value:string):void;json(body:unknown):void;send(body:string):void;end():void};

export const ACTIONS=['checkin','journal','screening','event','doc','question','profile','memo_export','report_export','teacher_sent','teacher_saved','safety_plan','backup','feedback','edit'];
export const ERRORS=['save','restore','files','export','sync'];
const ACTION_LABELS:Record<string,string>={checkin:'Короткий опрос',journal:'Запись дневника',screening:'Результат теста',event:'Запись в ленте',doc:'Документ',question:'Вопрос в памятку',profile:'Профиль ребёнка',memo_export:'Памятка выгружена или отправлена',report_export:'Сводка или лента выгружена',teacher_sent:'Ссылка для учителя создана',teacher_saved:'Ответ учителя сохранён',safety_plan:'План безопасности',backup:'Резервная копия',feedback:'Обратная связь',edit:'Исправление записи'};
const ERROR_LABELS:Record<string,string>={save:'Сохранение',restore:'Восстановление копии',files:'Файлы документов при восстановлении',export:'Сохранение файла',sync:'Синхронизация Telegram'};
const PLATFORMS=['tg','web','pwa'];
const DAY=/^\d{4}-\d{2}-\d{2}$/,WEEK=/^\d{4}-W\d{2}$/,MONTH=/^\d{4}-\d{2}$/,ID=/^[a-z0-9]{8,24}$/,SRC=/^[a-z0-9._-]{1,30}$/;
const KEEP_EVENT_IDS=7*86400,KEEP_COUNTERS=800*86400,PREFIX='kora:';

const iso=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d);};
export function isoWeek(date:string){
 const d=new Date(date+'T12:00:00Z'),day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day+3);
 const year=d.getUTCFullYear(),jan4=new Date(Date.UTC(year,0,4)),week=1+Math.round(((d.getTime()-jan4.getTime())/86400000-3+((jan4.getUTCDay()+6)%7))/7);
 return year+'-W'+String(week).padStart(2,'0');
}
const monthOf=(date:string)=>date.slice(0,7);

/**
 * Counters an event adds, as [key, field] pairs, or null for anything unexpected.
 * Dates must be close to the server date (devices live in different time zones, so ±2 days);
 * the first week or month of use may lie up to three years back.
 */
export function countersFor(e:any,today=iso(new Date())):[string,string][]|null{
 if(!e||typeof e!=='object'||typeof e.i!=='string'||!ID.test(e.i))return null;
 const near=(d:unknown)=>typeof d==='string'&&DAY.test(d)&&d>=addDays(today,-2)&&d<=addDays(today,2);
 const weeks=new Set([isoWeek(addDays(today,-9)),isoWeek(addDays(today,-2)),isoWeek(today),isoWeek(addDays(today,2))]);
 const months=new Set([monthOf(addDays(today,-2)),monthOf(today),monthOf(addDays(today,2))]);
 const oldest=addDays(today,-3*366);
 const cohortWeek=(c:unknown)=>typeof c==='string'&&WEEK.test(c)&&c>=isoWeek(oldest)&&c<=isoWeek(addDays(today,2));
 const cohortMonth=(c:unknown)=>typeof c==='string'&&MONTH.test(c)&&c>=monthOf(oldest)&&c<=monthOf(addDays(today,2));
 switch(e.t){
  case 'day':{
   if(!near(e.d)||!PLATFORMS.includes(e.p))return null;
   const out:[string,string][]=[['d:'+e.d,'visits'],['d:'+e.d,'visits:'+e.p]];
   if(e.n===1){out.push(['d:'+e.d,'new'],['d:'+e.d,'new:'+e.p]);if(typeof e.s==='string'&&SRC.test(e.s))out.push(['d:'+e.d,'src:'+e.s]);}
   return out;
  }
  case 'join':return cohortWeek(e.w)&&cohortMonth(e.m)?[['cw:'+e.w,'joined'],['cm:'+e.m,'joined']]:null;
  case 'week':return weeks.has(e.w)&&cohortWeek(e.c)&&e.c<=e.w?[['w:'+e.w,'active'],['w:'+e.w,'c:'+e.c]]:null;
  case 'month':return months.has(e.m)&&cohortMonth(e.c)&&e.c<=e.m?[['m:'+e.m,'active'],['m:'+e.m,'c:'+e.c]]:null;
  case 'act':return near(e.d)&&ACTIONS.includes(e.a)?[['d:'+e.d,'a:'+e.a]]:null;
  case 'first':return cohortWeek(e.c)?[['cw:'+e.c,'first_record']]:null;
  case 'task':return months.has(e.m)?[['m:'+e.m,'task']]:null;
  case 'err':return near(e.d)&&ERRORS.includes(e.k)?[['d:'+e.d,'e:'+e.k]]:null;
  default:return null;
 }
}

type Fetch=(url:string,init:{method:string;headers:Record<string,string>;body:string})=>Promise<{ok:boolean;json():Promise<any>}>;
function redis(fetcher:Fetch){
 const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)return null;
 return async(commands:(string|number)[][]):Promise<any[]>=>{
  if(!commands.length)return [];
  const res=await fetcher(url.replace(/\/$/,'')+'/pipeline',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(commands)});
  if(!res.ok)throw new Error('storage');
  return (await res.json()).map((r:any)=>r?.result);
 };
}
/** Counts a batch; an event id seen in the last 7 days is skipped, so a repeated delivery adds nothing. */
export async function record(events:unknown[],fetcher:Fetch,today=iso(new Date())){
 const run=redis(fetcher);if(!run)return {stored:false,counted:0};
 const valid=events.slice(0,25).map(e=>({e:e as any,c:countersFor(e,today)})).filter((x):x is {e:any;c:[string,string][]}=>!!x.c);
 const fresh=await run(valid.map(x=>['SET',PREFIX+'e:'+x.e.i,'1','NX','EX',KEEP_EVENT_IDS]));
 const counters=valid.filter((_,i)=>fresh[i]==='OK').flatMap(x=>x.c),keys=[...new Set(counters.map(([k])=>k))];
 await run([...counters.map(([k,f])=>['HINCRBY',PREFIX+k,f,1]),...keys.map(k=>['EXPIRE',PREFIX+k,KEEP_COUNTERS])]);
 return {stored:true,counted:valid.filter((_,i)=>fresh[i]==='OK').length};
}

const header=(req:Req,name:string)=>{const v=req.headers[name];return Array.isArray(v)?v[0]:v;};
function authorized(req:Req){
 const pass=process.env.STATS_PASSWORD;if(!pass)return false;
 const auth=header(req,'authorization')||'';if(!auth.startsWith('Basic '))return false;
 let given='';try{given=Buffer.from(auth.slice(6),'base64').toString('utf8').split(':').slice(1).join(':');}catch{return false;}
 if(given.length!==pass.length)return false;
 let diff=0;for(let i=0;i<pass.length;i++)diff|=given.charCodeAt(i)^pass.charCodeAt(i);
 return diff===0;
}
const esc=(s:unknown)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
const n=(h:Record<string,string>|null|undefined,f:string)=>Number(h?.[f]||0);
const pct=(a:number,b:number)=>b?Math.round(a*100/b)+'%':'—';
const prevMonth=(m:string)=>{const [y,mm]=m.split('-').map(Number);return mm===1?(y-1)+'-12':y+'-'+String(mm-1).padStart(2,'0');};
const nextMonth=(m:string)=>{const [y,mm]=m.split('-').map(Number);return mm===12?(y+1)+'-01':y+'-'+String(mm+1).padStart(2,'0');};
const hashes=(rows:any[])=>rows.map(r=>{if(!Array.isArray(r))return {} as Record<string,string>;const o:Record<string,string>={};for(let i=0;i<r.length;i+=2)o[r[i]]=r[i+1];return o;});

/** The report page: plain tables, readable on a phone. */
export async function report(fetcher:Fetch,today=iso(new Date())){
 const run=redis(fetcher);if(!run)return '<p>Хранилище статистики не подключено (Vercel → Storage → Upstash Redis).</p>';
 const days=Array.from({length:30},(_,i)=>addDays(today,-i));
 const weeks=Array.from({length:10},(_,i)=>isoWeek(addDays(today,-7*i)));
 const months:string[]=[monthOf(today)];for(let i=1;i<6;i++)months.push(prevMonth(months[i-1]));
 const [d,w,cw,m,cm]=await Promise.all([days.map(x=>'d:'+x),weeks.map(x=>'w:'+x),weeks.map(x=>'cw:'+x),months.map(x=>'m:'+x),months.map(x=>'cm:'+x)].map(keys=>run(keys.map(k=>['HGETALL',PREFIX+k])).then(hashes)));
 const sum=(rows:Record<string,string>[],f:string)=>rows.reduce((a,r)=>a+n(r,f),0);
 const fields=(rows:Record<string,string>[],prefix:string)=>{const t:Record<string,number>={};rows.forEach(r=>Object.entries(r).forEach(([k,v])=>{if(k.startsWith(prefix))t[k.slice(prefix.length)]=(t[k.slice(prefix.length)]||0)+Number(v);}));return Object.entries(t).sort((a,b)=>b[1]-a[1]);};
 const table=(head:string[],rows:(string|number)[][])=>'<table><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table>';
 const weekIndex=(x:string)=>weeks.indexOf(x);
 const out:string[]=[];
 out.push('<h2>Главное</h2>'+table(['Месяц','Открывали «Кору»','Сохранили наблюдение или выгрузили памятку','Доля'],months.slice(0,3).map((x,i)=>[x,n(m[i],'active'),n(m[i],'task'),pct(n(m[i],'task'),n(m[i],'active'))])));
 out.push('<h2>За 30 дней</h2>'+table(['','Всего'],[['Посещений (устройство в день)',sum(d,'visits')],['Из них в Telegram',sum(d,'visits:tg')],['В браузере',sum(d,'visits:web')],['С экрана «Домой»',sum(d,'visits:pwa')],['Новых устройств',sum(d,'new')]]));
 out.push('<h2>По дням</h2>'+table(['День','Посещений','Новых','Telegram','Действий','Ошибок'],days.map((x,i)=>[x,n(d[i],'visits'),n(d[i],'new'),n(d[i],'visits:tg'),fields([d[i]],'a:').reduce((a,[,v])=>a+v,0),fields([d[i]],'e:').reduce((a,[,v])=>a+v,0)])));
 out.push('<h2>Откуда пришли новые (30 дней)</h2>'+table(['Источник','Новых'],fields(d,'src:')));
 out.push('<h2>Что делали (30 дней)</h2>'+table(['Действие','Раз'],fields(d,'a:').map(([k,v])=>[ACTION_LABELS[k]||k,v])));
 out.push('<h2>Ошибки (30 дней)</h2>'+table(['Где','Раз'],fields(d,'e:').map(([k,v])=>[ERROR_LABELS[k]||k,v])));
 out.push('<h2>Возвращаются ли (по неделе первого использования)</h2>'+table(['Неделя начала','Устройств','Сохранили первую запись','Через неделю','Через 2 недели','Через 4 недели'],weeks.map((x,i)=>{const joined=n(cw[i],'joined'),back=(k:number)=>{const j=weekIndex(x)-k;return j>=0?pct(n(w[j],'c:'+x),joined):'—';};return [x,joined,pct(n(cw[i],'first_record'),joined),back(1),back(2),back(4)];})));
 out.push('<h2>По месяцам</h2>'+table(['Месяц начала','Устройств','Вернулись в следующем месяце'],months.map((x,i)=>{const j=months.indexOf(nextMonth(x));return [x,n(cm[i],'joined'),j>=0?pct(n(m[j],'c:'+x),n(cm[i],'joined')):'—'];})));
 return out.join('\n');
}

export default async function handler(req:Req,res:Res){
 const fetcher=fetch as unknown as Fetch;
 if(req.method==='POST'){
  let body:any=req.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch{body=null;}}
  if(!body||!Array.isArray(body.e)){res.status(400).json({error:'bad_request'});return;}
  try{await record(body.e,fetcher);}catch{res.status(503).json({error:'storage'});return;}
  res.status(204).end();return;
 }
 if(req.method!=='GET'){res.status(405).end();return;}
 res.setHeader('cache-control','no-store');res.setHeader('x-robots-tag','noindex');
 if(!process.env.STATS_PASSWORD){res.status(404).send('Not found');return;}
 if(!authorized(req)){res.status(401);res.setHeader('www-authenticate','Basic realm="Kora stats", charset="UTF-8"');res.send('Нужен пароль');return;}
 let body='';try{body=await report(fetcher);}catch{body='<p>Не удалось прочитать хранилище статистики.</p>';}
 res.status(200);res.setHeader('content-type','text/html; charset=utf-8');
 res.send('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Кора · статистика</title><style>body{font:15px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;margin:0 auto;max-width:900px;padding:16px;color:#20332e;background:#f6f7f2}h1{font-size:22px}h2{font-size:17px;margin-top:28px}table{border-collapse:collapse;width:100%;background:#fff;font-size:14px}th,td{border:1px solid #dfe6df;padding:6px 8px;text-align:left}th{background:#eaf3eb}p{color:#5c6e68}</style></head><body><h1>Кора · статистика</h1><p>Только те, кто разрешил статистику. Устройство — не человек: один родитель с двух устройств считается дважды, профиль — не обязательно отдельный ребёнок. Сохранённая запись не означает, что ребёнку стало лучше.</p>'+body+'</body></html>');
}
