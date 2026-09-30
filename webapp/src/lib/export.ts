import {getJournals,formatJournal,JournalRecord} from './journals';
import {medicationById} from './content';
import type {VisitState} from './visit';
import {getScreenings,formatScreening,ScreeningResult} from './screenings';
export function formatVisit(v:VisitState,results:ScreeningResult[]=getScreenings().filter(r=>r.includeInVisit),journals:JournalRecord[]=getJournals().filter(r=>r.includeInVisit)) {
  const lines=['Памятка к приёму · PsyParent','Записи семьи и результаты скринингов для обсуждения с врачом'];
  const snapshots=Object.values(v.checklists);
  if(snapshots.length) {
    lines.push('\nНАБЛЮДЕНИЯ');
    snapshots.forEach(c=>{lines.push('\n'+c.title+(c.updatedAt?' · '+new Date(c.updatedAt).toLocaleDateString('ru-RU'):''));c.lines.forEach(l=>lines.push('• '+l));});
  }
  if(v.questions.length) {lines.push('\nВОПРОСЫ');v.questions.forEach((q,i)=>lines.push((i+1)+'. '+q));}
  if(v.meds.length) {
    lines.push('\nНАЗНАЧЕНИЯ СО СЛОВ РОДИТЕЛЯ');
    const labels={dose:'Доза',schedule:'Как принимать',goal:'Цель',monitoring:'Что отслеживать',warnings:'Важно',note:'Заметка'};
    v.meds.forEach(id=>{
      lines.push('\n'+(medicationById(id)?.name || id));
      const d=v.medDetails[id]||{};
      for(const [key,label] of Object.entries(labels)) {const value=d[key as keyof typeof d];if(value?.trim())lines.push(label+': '+value.trim());}
    });
  }
  if(results.length){lines.push('\nСКРИНИНГИ — НЕ ДИАГНОЗ');results.forEach(r=>lines.push('\n'+formatScreening(r)));}
  if(journals.length){lines.push('\nДНЕВНИКИ И ФОРМЫ — НАБЛЮДЕНИЯ СЕМЬИ');journals.slice().sort((a,b)=>a.childLabel.localeCompare(b.childLabel)||a.date.localeCompare(b.date)).forEach(r=>lines.push('\n'+formatJournal(r)));}
  lines.push('\nСоставлено в PsyParent. Эта памятка не является назначением лечения.');
  return lines.join('\n');
}
export async function copyText(text:string) {
  try {await navigator.clipboard.writeText(text);return true;} catch {
    const area=document.createElement('textarea');
    area.value=text;area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();
    try {return document.execCommand('copy');} catch {return false;} finally {area.remove();}
  }
}
export function downloadText(text:string,filename='PsyParent-pamyatka.txt') {
  const url=URL.createObjectURL(new Blob(['﻿'+text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
