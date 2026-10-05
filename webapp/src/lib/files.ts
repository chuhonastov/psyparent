import WebApp from '@twa-dev/sdk';
import {isTelegram} from './twa';
import {packJSON,unpackJSON} from './pack';
import {downloadBlob,downloadFile} from './export';
import {toast} from './toast';
import {cleanDoc,Doc} from './pdf/doc';
// Saving files. In a browser the file is made on the device and downloaded. Telegram does not let mini apps download
// files they make, so there the data goes to the phone's browser inside the link after «#»: that part of a link
// is never sent to a server, and the /save page makes the file there and saves nothing.
export type SaveRequest={kind:'pdf';name:string;text:string;title?:string}|{kind:'doc';name:string;doc:Doc}|{kind:'file';name:string;type:string;content:string};
export type SaveOutcome='downloaded'|'browser'|'too-large'|'failed';
const TYPES=['application/json','text/calendar','text/plain;charset=utf-8'],MAX_LINK=1_500_000,MAX_TEXT=3_000_000;
export const saveLink=(r:SaveRequest,origin=window.location.origin)=>origin+'/save#'+packJSON(r);
export function readSaveLink(code:string):SaveRequest|null{
 const r=unpackJSON<any>(code);
 if(!r||typeof r.name!=='string'||!/^[\w.-]{1,100}$/.test(r.name))return null;
 if(r.kind==='pdf'&&typeof r.text==='string'&&r.text.length<MAX_TEXT&&r.name.endsWith('.pdf'))return {kind:'pdf',name:r.name,text:r.text,...(typeof r.title==='string'?{title:r.title.slice(0,200)}:{})};
 if(r.kind==='doc'&&r.name.endsWith('.pdf')){const doc=cleanDoc(r.doc);return doc?{kind:'doc',name:r.name,doc}:null;}
 if(r.kind==='file'&&TYPES.includes(r.type)&&typeof r.content==='string'&&r.content.length<MAX_TEXT)return {kind:'file',name:r.name,type:r.type,content:r.content};
 return null;
}
/** Makes the file here and starts the download (browser, offline copy, the /save page). */
export async function downloadNow(r:SaveRequest){
 if(r.kind==='pdf'){const {makePdf}=await import('./pdf/makePdf');downloadBlob(makePdf(r.text,{title:r.title}),r.name);}
 else if(r.kind==='doc'){const {renderDoc}=await import('./pdf/makePdf');downloadBlob(renderDoc(r.doc),r.name);}
 else downloadFile(r.content,r.name,r.type);
}
export async function saveFile(r:SaveRequest):Promise<SaveOutcome>{
 // Nothing is awaited before openLink: Telegram opens links only right after a tap.
 if(isTelegram()){
  const link=saveLink(r);if(link.length>MAX_LINK)return 'too-large';
  try{WebApp.openLink(link);return 'browser';}catch{return 'failed';}
 }
 try{await downloadNow(r);return 'downloaded';}catch{return 'failed';}
}
/** saveFile with a short explanation of what happened. */
export async function saveWithNotice(r:SaveRequest,done=r.kind==='file'?'Файл сохранён':'PDF сохранён'){
 const outcome=await saveFile(r);
 if(outcome==='downloaded')toast(done);
 else if(outcome==='browser')toast('Открываем браузер телефона: файл сохранится там',{durationMs:5000});
 else if(outcome==='too-large')toast('Файл слишком большой, чтобы передать его из Telegram. Откройте «Кору» в браузере или скопируйте текст.',{variant:'error',durationMs:6000});
 else toast('Не удалось сохранить файл',{variant:'error'});
 return outcome;
}
export const savePdf=(text:string,name:string,title?:string)=>saveWithNotice({kind:'pdf',name,text,title});
/** A structured PDF for specialists (lib/reports.ts). */
export const saveDoc=(doc:Doc,name:string)=>saveWithNotice({kind:'doc',name,doc});
