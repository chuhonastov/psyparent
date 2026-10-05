import {useEffect} from 'react';
// Forms without a draft register here while they hold unsaved input, so switching the child asks first.
const open=new Set<symbol>();
export function useUnsaved(dirty:boolean){useEffect(()=>{if(!dirty)return;const s=Symbol();open.add(s);return ()=>{open.delete(s);};},[dirty]);}
export const hasUnsaved=()=>open.size>0;
export const confirmLeave=(question='Введённое не сохранено и пропадёт. Переключить ребёнка?')=>!open.size||window.confirm(question);
