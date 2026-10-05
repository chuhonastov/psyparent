// «Написать автору»: the message from the app goes to the author's e-mail and is not stored anywhere else.
// Setup (Vercel → Settings → Environment Variables): FEEDBACK_SMTP_USER — the Yandex mailbox, FEEDBACK_SMTP_PASS — an app
// password for it (id.yandex.ru → Безопасность → Пароли приложений → Почта); optional FEEDBACK_TO (default below),
// FEEDBACK_SMTP_HOST (smtp.yandex.ru) and FEEDBACK_SMTP_PORT (465). Without them the app offers to write by e-mail.
import nodemailer from 'nodemailer';
declare const process:{env:Record<string,string|undefined>};
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(code:number):Res;setHeader(name:string,value:string):void;json(body:unknown):void;end():void};

export const FEEDBACK_TO='chuhonastov@yandex.ru';
const PLATFORM:Record<string,string>={tg:'Telegram',web:'браузер',pwa:'браузер, экран «Домой»'};
export type Feedback={message:string;contact:string;platform:string;app:string;section:string};
/** Checks the form: returns the cleaned message or the reason it is refused. Bots fill the hidden field or send instantly. */
export function parseFeedback(body:any):Feedback|{error:string}{
 if(!body||typeof body!=='object')return {error:'bad_request'};
 if(typeof body.website==='string'&&body.website.trim())return {error:'spam'};
 if(typeof body.elapsed!=='number'||body.elapsed<1500)return {error:'spam'};
 const message=typeof body.message==='string'?body.message.trim():'';
 if(message.length<5||message.length>3000)return {error:'length'};
 const contact=typeof body.contact==='string'?body.contact.trim().slice(0,120):'';
 const platform=PLATFORM[body.platform]?body.platform:'web';
 const app=typeof body.app==='string'&&/^\d+\.\d+\.\d+$/.test(body.app)?body.app:'';
 const section=typeof body.section==='string'&&/^[a-z-]{0,20}$/.test(body.section)?body.section:'';
 return {message,contact,platform,app,section};
}
export function mailFor(f:Feedback){
 const lines=[f.message,'','—',f.contact?'Как ответить: '+f.contact:'Контакт для ответа не указан.','Открыто: '+PLATFORM[f.platform]+(f.app?', сборка '+f.app:'')+(f.section?', раздел /'+f.section:'')];
 const email=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(f.contact)?f.contact:undefined;
 return {subject:'Кора: сообщение из приложения',text:lines.join('\n'),replyTo:email};
}
// Best effort only (each server instance counts on its own): a few messages per address per 10 minutes.
const recent=new Map<string,number[]>();
function limited(ip:string,now=Date.now()){
 const list=(recent.get(ip)||[]).filter(t=>now-t<600000);list.push(now);recent.set(ip,list);
 if(recent.size>5000)recent.clear();
 return list.length>5;
}
const header=(req:Req,name:string)=>{const v=req.headers[name];return Array.isArray(v)?v[0]:v;};

export default async function handler(req:Req,res:Res){
 if(req.method!=='POST'){res.status(405).end();return;}
 let body:any=req.body;if(typeof body==='string'){try{body=JSON.parse(body);}catch{body=null;}}
 const f=parseFeedback(body);
 if('error' in f){res.status(f.error==='spam'?202:400).json({error:f.error});return;}
 // The address is used for this check only and is not written anywhere.
 if(limited((header(req,'x-forwarded-for')||'').split(',')[0].trim()||'unknown')){res.status(429).json({error:'too_many'});return;}
 const user=process.env.FEEDBACK_SMTP_USER,pass=process.env.FEEDBACK_SMTP_PASS;
 if(!user||!pass){res.status(503).json({error:'not_configured'});return;}
 try{
  const port=Number(process.env.FEEDBACK_SMTP_PORT||465);
  const transport=nodemailer.createTransport({host:process.env.FEEDBACK_SMTP_HOST||'smtp.yandex.ru',port,secure:port===465,auth:{user,pass}});
  await transport.sendMail({from:{name:'Кора — обратная связь',address:user},to:process.env.FEEDBACK_TO||FEEDBACK_TO,...mailFor(f)});
  res.status(200).json({ok:true});
 }catch{res.status(502).json({error:'send_failed'});}
}
