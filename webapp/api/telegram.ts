// Webhook of @psyparent_bot on Vercel. The reply goes back in the webhook response itself, so this function needs no
// bot token and keeps nothing: messages are not stored or logged. Setup is described in README, «Бот».
declare const process:{env:Record<string,string|undefined>};
type Req={method?:string;url?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(code:number):Res;setHeader(name:string,value:string):void;json(body:unknown):void;send(body:string):void;end():void};
type Message={chat?:{id?:number;type?:string};text?:string};

const START='«Кора» помогает разобраться в диагнозе и назначениях, а затем собрать вопросы врачу.\n\nЗаписи сохраняются внутри приложения. Не отправляйте сюда медицинские документы и персональные данные ребёнка.';
const HELP='Нажмите кнопку «Открыть „Кору“». В приложении есть диагнозы, разбор лекарств, обследований и специалистов, тесты, дневники и памятка к приёму. Бот не проводит консультации.';
const OTHER='Откройте приложение кнопкой ниже. Этот бот не читает и не хранит сообщения.';
export function replyText(text:string|undefined){
 const command=(text||'').trim().split(/[\s@]/)[0].toLowerCase();
 return command==='/start'?START:command==='/help'?HELP:command==='/app'?'Ваша памятка и справочник:':OTHER;
}
const header=(req:Req,name:string)=>{const v=req.headers[name];return Array.isArray(v)?v[0]:v;};

export default function handler(req:Req,res:Res){
 if(req.method!=='POST'){res.status(200);res.setHeader('content-type','text/plain; charset=utf-8');res.send('Кора: вебхук бота работает.');return;}
 const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
 if(secret&&header(req,'x-telegram-bot-api-secret-token')!==secret){res.status(403);res.end();return;}
 let update:any=req.body;
 if(typeof update==='string'){try{update=JSON.parse(update);}catch{update=null;}}
 const message:Message|undefined=update?.message;
 const chatId=message?.chat?.id;
 // Groups and channels are ignored: the bot only greets a parent in a private chat.
 if(typeof chatId!=='number'||message?.chat?.type!=='private'){res.status(200).json({});return;}
 const host=header(req,'x-forwarded-host')||header(req,'host')||'psyparent.vercel.app';
 const url=process.env.WEBAPP_URL||'https://'+host+'/';
 res.status(200).json({method:'sendMessage',chat_id:chatId,text:replyText(message?.text),reply_markup:{inline_keyboard:[[{text:'Открыть «Кору»',web_app:{url}}]]}});
}
