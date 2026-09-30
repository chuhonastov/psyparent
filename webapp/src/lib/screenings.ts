import {ticItemById} from './ygtss';
import {extraIds,validateExtra,scoreExtra} from './extraScreeningScoring';
import {readJSON,writeJSON} from './persist';
import {impactOptions,respondentLabels,screeners,screenerById,screeningSafety,sdqFields,scaleFields,ScreeningId,Respondent} from './screeningContent';
export const SCREENING_KEY='psyparent.screenings.v1';
const EVENT='psyparent:screenings-updated';
export type ScreeningInput={childLabel:string;age:number;respondent:Respondent;completedDate:string;answers?:number[];impact?:number;total?:number;followUpDone?:boolean;followUpScore?:number;subscales?:Record<string,number>;notes:string;measurements?:Record<string,number>;sourceForm?:string;clinicianConfirmed?:boolean;ticInventory?:string[]};
export type ScreeningScore={total:number;max:number;label:string;next:string;safety:boolean;metrics?:{label:string;value:number;max:number}[];status:'low'|'discuss'|'followup'|'priority'|'recorded'};
export type ScreeningResult=ScreeningInput&{id:string;screenerId:ScreeningId;instrumentVersion:string;translation:string;createdAt:string;includeInVisit:boolean;score:ScreeningScore};
export function localDate(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
export function validateScreening(id:string,input:ScreeningInput):string[]{
 const s=screenerById(id),errors:string[]=[];
 if(!s)return ['Неизвестный опросник.'];
 if(typeof input.childLabel!=='string'||!input.childLabel.trim()||input.childLabel.length>60)errors.push('Укажите имя или короткое обозначение ребёнка (до 60 символов).');
 if(!integer(input.age,s.ageMin,s.ageMax))errors.push(`Этот вариант рассчитан на возраст ${s.ageLabel}. Выберите другой инструмент со специалистом.`);
 if(!s.respondents.includes(input.respondent))errors.push('Выберите, кто заполнил опросник.');
 if(id==='sdq'&&input.respondent==='self'&&input.age<11)errors.push('Самоотчёт SDQ предназначен для возраста 11–17 лет. Для младшего ребёнка выберите бланк родителя или учителя.');
 if(typeof input.completedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.completedDate)||!Number.isFinite(Date.parse(input.completedDate))||new Date(input.completedDate+'T12:00:00Z').toISOString().slice(0,10)!==input.completedDate||input.completedDate>localDate())errors.push('Укажите действительную дату прохождения, не позднее сегодняшней.');
 if(typeof input.notes!=='string'||input.notes.length>3000)errors.push('Заметка должна быть не длиннее 3000 символов.');
 if(id==='ygtss'&&input.ticInventory!==undefined&&(!Array.isArray(input.ticInventory)||input.ticInventory.length>80||input.ticInventory.some(x=>typeof x!=='string'||!ticItemById(x))))errors.push('Проверьте перечень тиков.');
 if(s.mode==='embedded'){
  if(!Array.isArray(input.answers)||input.answers.length!==s.questions!.length||!input.answers.every(x=>integer(x,0,3)))errors.push('Ответьте на все вопросы: пропуск не равен нулю.');
  if(input.impact!==undefined&&!integer(input.impact,0,3))errors.push('Проверьте ответ о влиянии трудностей на жизнь.');
 }else if(id==='mchat'){
  if(!integer(input.total,0,20))errors.push('Исходный балл M-CHAT-R должен быть целым числом от 0 до 20.');
  if(integer(input.total,3,7)){
   if(typeof input.followUpDone!=='boolean')errors.push('Укажите, проведено ли уточняющее интервью Follow-Up.');
   if(input.followUpDone&&!integer(input.followUpScore,0,input.total))errors.push('После Follow-Up укажите число оставшихся пунктов риска: от 0 до исходного балла.');
   if(!input.followUpDone&&input.followUpScore!==undefined)errors.push('Баллы Follow-Up можно внести только после проведённого интервью.');
  }else if(input.followUpDone||input.followUpScore!==undefined)errors.push('При этом исходном балле Follow-Up не требуется по алгоритму; уберите данные второго этапа.');
 }else if(extraIds.includes(s.id)){errors.push(...validateExtra(s.id,input));
 }else{
  if(!integer(input.total,0,40))errors.push('Общий балл трудностей SDQ должен быть целым числом от 0 до 40.');
  const subs=input.subscales||{};
  for(const [key,value] of Object.entries(subs))if(!sdqFields.some(f=>f.id===key)||!integer(value,0,10))errors.push('Каждая субшкала SDQ должна быть целым числом от 0 до 10.');
  const keys=sdqFields.slice(0,4).map(f=>f.id);
  if(keys.every(k=>subs[k]!==undefined)&&keys.reduce((sum,k)=>sum+subs[k],0)!==input.total)errors.push('Общий балл SDQ должен совпадать с суммой первых четырёх субшкал. Просоциальное поведение в него не входит.');
 }
 return errors;
}
export function scoreScreening(id:ScreeningId,input:ScreeningInput):ScreeningScore{
 const errors=validateScreening(id,input);if(errors.length)throw new Error(errors.join(' '));
 if(extraIds.includes(id))return scoreExtra(id,input);
 if(id==='snapiv'){
  const answers=input.answers!,parts=[[0,9,'Невнимательность'],[9,18,'Гиперактивность / импульсивность'],[18,26,'Оппозиционные проявления']] as const;
  return {total:answers.reduce((a,b)=>a+b,0),max:78,status:'recorded',safety:false,label:'Оценки SNAP-IV для обсуждения',next:'Сопоставьте эти наблюдения с повседневными трудностями и отдельной формой другого отвечающего. Суммы и средние не подтверждают диагноз; зарубежные пороги не применяются автоматически.',metrics:parts.flatMap(([from,to,label])=>{const a=answers.slice(from,to),sum=a.reduce((x,y)=>x+y,0);return [{label:label+' · сумма',value:sum,max:a.length*3},{label:label+' · среднее',value:Math.round(sum/a.length*100)/100,max:3},{label:label+' · ответов 2 / 3',value:a.filter(x=>x>=2).length,max:a.length}];})};
 }

 if(id==='mchat'){
  const total=input.total!;
  if(total>=8)return {total,max:20,status:'priority',label:'Скрининг положительный по исходному баллу',next:'Обратитесь за оценкой развития и ранней помощью. Уточняющий этап для направления не требуется; не ждите нового теста.',safety:false};
  if(total>=3){
   if(!input.followUpDone)return {total,max:20,status:'followup',label:'Нужен уточняющий этап Follow-Up',next:'Результат пока не завершён. Организуйте уточняющее интервью по официальным вопросам с подготовленным специалистом; при беспокойстве помощь можно искать уже сейчас.',safety:false};
   if(input.followUpScore!>=2)return {total,max:20,status:'priority',label:'Скрининг положительный после Follow-Up',next:'Обратитесь за оценкой развития и ранней помощью. Положительный скрининг не означает установленный РАС.',safety:false};
   return {total,max:20,status:'low',label:'Скрининг отрицательный после Follow-Up',next:'Продолжайте наблюдать развитие. Если есть трудности или утрата навыков, обсудите их с врачом независимо от результата.',safety:false};
  }
  return {total,max:20,status:'low',label:'Низкая вероятность по скринингу',next:'При возрасте младше 24 месяцев повторите скрининг в 24 месяца. При беспокойстве о развитии или утрате навыков обратитесь к врачу независимо от балла.',safety:false};
 }
 if(id==='sdq')return {total:input.total!,max:40,status:'recorded',label:'Баллы записаны для обсуждения',next:'Покажите результат и заполненный исходный бланк специалисту. Он учтёт возраст, версию, влияние трудностей на жизнь и наблюдения разных людей. Автоматическая категория риска здесь не присваивается.',safety:false};
 const total=input.answers!.reduce((a,b)=>a+b,0),safety=id==='phq9'&&input.answers![8]>0;
 const bands=id==='phq9'?['Минимальная выраженность симптомов','Небольшая выраженность симптомов','Умеренная выраженность симптомов','Выраженные симптомы','Значительно выраженные симптомы']:['Минимальная выраженность симптомов','Небольшая выраженность симптомов','Умеренная выраженность симптомов','Выраженные симптомы'];
 const index=id==='phq9'?Math.min(4,Math.floor(total/5)):Math.min(3,Math.floor(total/5));
 return {total,max:id==='phq9'?27:21,label:bands[index],status:safety?'priority':total>=10?'discuss':'low',safety,next:safety?screeningSafety:total>=10?'Обсудите результат со специалистом. Балл показывает выраженность симптомов по стандартным диапазонам, но не устанавливает диагноз. У подростков интерпретация требует беседы.':'Если симптомы мешают, сохраняются или вызывают беспокойство, обсудите их со специалистом даже при небольшом балле. Низкая сумма не исключает расстройство и не оценивает безопасность.'};
}
export function normalizeScreenings(raw:unknown):ScreeningResult[]{
 if(!raw||typeof raw!=='object'||(raw as any).version!==1||!Array.isArray((raw as any).results))return [];
 const seen=new Set<string>();
 return (raw as any).results.flatMap((r:any)=>{
  if(!r||typeof r!=='object'||typeof r.id!=='string'||!r.id||seen.has(r.id)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))return [];
  const s=screenerById(r.screenerId);
  if(!s||r.instrumentVersion!==s.version||validateScreening(s.id,r).length)return [];
  seen.add(r.id);
  const result:ScreeningResult={id:r.id,screenerId:s.id,instrumentVersion:s.version,translation:s.translation,createdAt:r.createdAt,includeInVisit:r.includeInVisit===true,childLabel:r.childLabel.trim(),age:r.age,respondent:r.respondent,completedDate:r.completedDate,notes:r.notes,score:scoreScreening(s.id,r)};
  if(s.mode==='embedded'){result.answers=[...r.answers];if(r.impact!==undefined)result.impact=r.impact;}
  if(s.mode==='external')result.total=r.total;
  if(extraIds.includes(s.id)){result.measurements={...r.measurements};result.sourceForm=r.sourceForm;if(s.id==='ygtss'){result.clinicianConfirmed=r.clinicianConfirmed;if(r.ticInventory)result.ticInventory=[...new Set<string>(r.ticInventory)];}}
  if(s.id==='mchat'&&integer(r.total,3,7)){result.followUpDone=r.followUpDone;if(r.followUpDone)result.followUpScore=r.followUpScore;}
  if(s.id==='sdq')result.subscales={...r.subscales};
  return [result];
 });
}
export const getScreenings=()=>normalizeScreenings(readJSON<unknown>(SCREENING_KEY,null));
function write(results:ScreeningResult[]){if(!writeJSON(SCREENING_KEY,{version:1,results}))return false;window.dispatchEvent(new Event(EVENT));return true;}
export function createScreening(id:ScreeningId,input:ScreeningInput):ScreeningResult{
 const s=screenerById(id)!;
 return {...input,childLabel:input.childLabel.trim(),id:globalThis.crypto?.randomUUID?.()||'screen-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),screenerId:id,instrumentVersion:s.version,translation:s.translation,createdAt:new Date().toISOString(),includeInVisit:id!=='crafft',score:scoreScreening(id,input)};
}
export function saveScreening(result:ScreeningResult){
 const normalized=normalizeScreenings({version:1,results:[result]});if(normalized.length!==1)return false;
 const rows=getScreenings();if(rows.some(r=>r.id===result.id))return true;
 return write([normalized[0],...rows]);
}
export function removeScreening(id:string){return write(getScreenings().filter(r=>r.id!==id));}
export function includeScreening(id:string,includeInVisit:boolean){return write(getScreenings().map(r=>r.id===id?{...r,includeInVisit}:r));}
export function subscribeScreenings(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===SCREENING_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
export function formatScreening(r:ScreeningResult){
 const s=screenerById(r.screenerId)!;
 const lines=[`${s.name} · ${s.title}`,`Ребёнок: ${r.childLabel}`,`Возраст на дату прохождения: ${r.age} ${s.ageUnit==='months'?'мес.':'лет'}`,`Дата прохождения: ${r.completedDate}`,`Кто отвечал: ${respondentLabels[r.respondent]}`,`Способ: ${s.mode==='clinical'?'баллы клинической оценки со специалистом':s.mode==='external'?'результат внесён вручную из внешнего бланка / теста':'самостоятельное заполнение в приложении'}`,`Версия: ${r.instrumentVersion}`,`Форма и язык: ${r.translation}`,`${s.totalLabel||'Баллы'}: ${r.score.total} / ${r.score.max}`,`Интерпретация: ${r.score.label}`,r.score.next];
 if(r.screenerId==='mchat'&&r.total!>=3&&r.total!<=7)lines.push(r.followUpDone?`Follow-Up проведён; осталось пунктов риска: ${r.followUpScore}`:'Follow-Up не проведён — скрининг не завершён.');
 if(r.screenerId==='snapiv')lines.push('Период наблюдения: последний месяц.');
 if(r.ticInventory?.length)lines.push('Тики, отмеченные за последнюю неделю:',...r.ticInventory.map(id=>'• '+ticItemById(id)));
 if(r.sourceForm)lines.push('Исходный бланк / перевод: '+r.sourceForm);
 if(r.clinicianConfirmed)lines.push('Оценки выставлены со специалистом по критериям бланка. Период: последняя неделя.');
 if(r.measurements)for(const f of scaleFields(r.screenerId,r.respondent))if(r.measurements[f.id]!==undefined)lines.push(f.label+': '+r.measurements[f.id]+' / '+f.max);
 if(r.score.metrics)for(const metric of r.score.metrics)lines.push(metric.label+': '+metric.value+' / '+metric.max);
 if(r.answers)r.answers.forEach((value,i)=>lines.push(`${i+1}. ${s.questions![i]} — ${s.options![value]} (${value})`));
 if(r.impact!==undefined)lines.push(`Влияние на повседневную жизнь (не входит в сумму): ${impactOptions[r.impact]}`);
 if(r.subscales)for(const f of sdqFields)if(r.subscales[f.id]!==undefined)lines.push(`${f.label}: ${r.subscales[f.id]} / 10`);
 if(r.score.safety)lines.push('Важно: ответ на пункт 9 PHQ-9 выше нуля. Нужна отдельная оценка безопасности; сумма баллов не заменяет её.');
 if(r.notes.trim())lines.push('Заметка: '+r.notes.trim());
 lines.push('Ограничения: '+s.limitations,'Скрининг не является диагнозом или назначением лечения.',...s.sources.map(x=>`${x.label}: ${x.url}`));
 return lines.join('\n');
}
export function screeningCounts(){const results=getScreenings();return {all:results.length,inVisit:results.filter(r=>r.includeInVisit).length};}
