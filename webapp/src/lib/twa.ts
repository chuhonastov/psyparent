import WebApp from '@twa-dev/sdk';
export function isTelegram() { return !!WebApp.initData; }
export function initTwa() {
  if(!isTelegram()) return () => {};
  const theme=()=>{document.documentElement.dataset.theme=WebApp.colorScheme;};
  try {WebApp.ready();WebApp.expand();theme();WebApp.onEvent('themeChanged',theme);} catch {}
  return ()=>{try{WebApp.offEvent('themeChanged',theme);}catch{}};
}
export function setTelegramBack(visible:boolean,handler:()=>void) {
  if(!isTelegram()) return ()=>{};
  try {visible?WebApp.BackButton.show():WebApp.BackButton.hide();WebApp.BackButton.onClick(handler);}catch{}
  return ()=>{try{WebApp.BackButton.offClick(handler);}catch{}};
}
export function getTgUserFirstName():string|null {return WebApp.initDataUnsafe?.user?.first_name ?? null;}
