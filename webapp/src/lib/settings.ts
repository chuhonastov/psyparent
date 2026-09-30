import {readJSON,writeJSON} from './persist';
export type TextSize='normal'|'large'|'xlarge';
export type ThemeChoice='auto'|'light'|'dark';
export type Settings={version:1;textSize:TextSize;theme:ThemeChoice};
export const SETTINGS_KEY='psyparent.settings.v1';
const EVENT='psyparent:settings-updated';
export const textSizeLabels:Record<TextSize,string>={normal:'Обычный',large:'Крупнее',xlarge:'Самый крупный'};
export const themeLabels:Record<ThemeChoice,string>={auto:'Как в системе',light:'Светлая',dark:'Тёмная'};
// Inside Telegram "auto" follows the Telegram theme; twa.ts registers it without making this module depend on the SDK.
let hostScheme:()=>'light'|'dark'|undefined=()=>undefined;
export function setHostScheme(fn:()=>'light'|'dark'|undefined){hostScheme=fn;}
export function normalizeSettings(raw:unknown):Settings{
  const obj=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
  const textSize=obj.textSize==='large'||obj.textSize==='xlarge'?obj.textSize:'normal';
  const theme=obj.theme==='light'||obj.theme==='dark'?obj.theme:'auto';
  return {version:1,textSize,theme};
}
export const getSettings=()=>normalizeSettings(readJSON<unknown>(SETTINGS_KEY,null));
export function saveSettings(patch:Partial<Omit<Settings,'version'>>){
  const next=normalizeSettings({...getSettings(),...patch});
  const ok=writeJSON(SETTINGS_KEY,next);
  applySettings(next);
  window.dispatchEvent(new Event(EVENT));
  return ok;
}
/** Applies text size and theme to <html>. */
export function applySettings(settings=getSettings()){
  const root=document.documentElement;
  if(settings.textSize==='normal')delete root.dataset.textSize;else root.dataset.textSize=settings.textSize;
  const theme=settings.theme==='auto'?hostScheme():settings.theme;
  if(theme)root.dataset.theme=theme;else delete root.dataset.theme;
  window.dispatchEvent(new Event('psyparent:theme-applied'));
}
export function subscribeSettings(handler:()=>void){
  window.addEventListener(EVENT,handler);
  window.addEventListener('psyparent:all-data-cleared',handler);
  return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);};
}
