import WebApp from '@twa-dev/sdk';
import {applySettings,setHostScheme} from './settings';
export function isTelegram() { return !!WebApp.initData; }
// Registered on import, so the first applySettings() in main.tsx already follows the Telegram theme.
if(isTelegram()) setHostScheme(()=>WebApp.colorScheme);
// Paint Telegram's header and background with the app paper colour so the mini app does not sit in a foreign frame.
function syncChrome() {
  try {
    const bg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() as `#${string}`;
    if(!/^#[0-9a-f]{6}$/i.test(bg)) return;
    if(WebApp.isVersionAtLeast('6.9')) WebApp.setHeaderColor(bg);
    if(WebApp.isVersionAtLeast('6.1')) WebApp.setBackgroundColor(bg);
    if(WebApp.isVersionAtLeast('7.10')) WebApp.setBottomBarColor(bg);
  } catch {}
}
export function initTwa() {
  if(!isTelegram()) return () => {};
  const theme=()=>applySettings();
  try {WebApp.ready();WebApp.expand();theme();syncChrome();WebApp.onEvent('themeChanged',theme);} catch {}
  window.addEventListener('psyparent:theme-applied',syncChrome);
  return ()=>{try{WebApp.offEvent('themeChanged',theme);}catch{}window.removeEventListener('psyparent:theme-applied',syncChrome);};
}
export function setTelegramBack(visible:boolean,handler:()=>void) {
  if(!isTelegram()) return ()=>{};
  try {visible?WebApp.BackButton.show():WebApp.BackButton.hide();WebApp.BackButton.onClick(handler);}catch{}
  return ()=>{try{WebApp.BackButton.offClick(handler);}catch{}};
}
/** Opens Telegram's own "send to chat" sheet. Returns false when it is unavailable or the text is too long for a link. */
export function shareToTelegram(text:string) {
  if(!isTelegram()) return false;
  const link='https://t.me/share/url?url='+encodeURIComponent(text);
  if(link.length>8000) return false;
  try {WebApp.openTelegramLink(link);return true;} catch {return false;}
}
export function getTgUserFirstName():string|null {return WebApp.initDataUnsafe?.user?.first_name ?? null;}
