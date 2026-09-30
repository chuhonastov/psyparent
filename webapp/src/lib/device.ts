import {lastBackupAt} from './backup';
// Where the records live outside Telegram and how likely the browser is to lose them.
const ua=()=>typeof navigator==='undefined'?'':navigator.userAgent||'';
/** iPhone and iPad, including iPadOS that introduces itself as a Mac. Every browser there runs on Safari's engine. */
export const isIOS=()=>/iPad|iPhone|iPod/.test(ua())||(typeof navigator!=='undefined'&&navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
/** Opened from the home screen icon rather than in a browser tab. */
export const isStandalone=()=>{try{return window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;}catch{return false;}};
/** Asks the browser not to evict the records under storage pressure. Firefox would show a prompt, so it is skipped there. */
export function askPersistentStorage(){
 try{
  const storage=navigator.storage;
  if(!storage?.persist||/firefox/i.test(ua()))return;
  storage.persisted().then(done=>{if(!done)storage.persist().catch(()=>{});}).catch(()=>{});
 }catch{}
}
const DISMISS_KEY='kora.backupHint.v1';
const DAY=86_400_000;
/** The reminder shows when there are records, the last copy is older than 30 days and it was not put off in the last 14 days. */
export function backupReminderDue(hasRecords:boolean,now=Date.now()){
 if(!hasRecords)return false;
 const last=lastBackupAt();
 if(last&&now-last.getTime()<30*DAY)return false;
 try{const d=Number(localStorage.getItem(DISMISS_KEY));if(d&&now-d<14*DAY)return false;}catch{}
 return true;
}
export function postponeBackupReminder(now=Date.now()){try{localStorage.setItem(DISMISS_KEY,String(now));}catch{}}
