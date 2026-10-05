import {readJSON,writeJSON} from './persist';
import {childIdForLabel} from './children';
import {journalTemplate,JournalTemplate,journalValueLabel} from './journalContent';
import {localDate} from './screenings';
import {Respondent,respondentLabels} from './screeningContent';
export const JOURNAL_KEY='psyparent.journals.v1';
const EVENT='psyparent:journals-updated';
export type JournalInput={templateId:string;childId?:string;childLabel:string;age?:number;respondent:Respondent;observerLabel:string;date:string;periodStart?:string;treatment:string;values:Record<string,string>;includeInVisit:boolean};
export type JournalRecord=JournalInput&{id:string;templateVersion:number;createdAt:string;updatedAt:string};
export const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
function validDateTime(value:string){return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)&&validDate(value.slice(0,10))&&Number(value.slice(11,13))<24&&Number(value.slice(14,16))<60;}
// Use nominal local clock times. This is an approximate diary, not a sleep study or a DST correction.
const clockMinutes=(v:string)=>Date.parse(v+'Z')/60000;
export function validateJournal(input:JournalInput):string[]{
 const t=journalTemplate(input.templateId),errors:string[]=[];
 if(!t)return ['Эта форма не найдена.'];
 if(typeof input.childLabel!=='string'||!input.childLabel.trim()||input.childLabel.length>60)errors.push('Укажите имя или короткое обозначение ребёнка (до 60 символов).');
 if(input.age!==undefined&&(!Number.isInteger(input.age)||input.age<0||input.age>17))errors.push('Возраст укажите целым числом от 0 до 17 лет или оставьте пустым.');
 if(!t.respondents.includes(input.respondent))errors.push('Выберите подходящего отвечающего.');
 if(typeof input.observerLabel!=='string'||input.observerLabel.length>60)errors.push('Обозначение наблюдателя — до 60 символов.');
 if(!validDate(input.date)||input.date>localDate())errors.push('Укажите существующую дату записи, не позднее сегодняшней.');
 if(input.periodStart!==undefined&&(!validDate(input.periodStart)||input.periodStart>input.date))errors.push('Начало периода должно быть существующей датой не позже его конца.');
 if(typeof input.treatment!=='string'||input.treatment.length>1000)errors.push('Сведения о лечении или занятиях — до 1000 символов.');
 if(typeof input.includeInVisit!=='boolean')errors.push('Проверьте выбор включения в памятку.');
 const values=input.values;
 if(!values||typeof values!=='object'||Array.isArray(values))return [...errors,'Проверьте ответы формы.'];
 if(Object.keys(values).some(k=>!t.fields.some(f=>f.id===k)))errors.push('В записи есть неизвестное поле.');
 for(const f of t.fields){const v=values[f.id];
  if(v===undefined||v===''){if(f.required)errors.push('Заполните: '+f.label+'.');continue;}
  if(typeof v!=='string'||v.length>3000){errors.push(f.label+': используйте текст до 3000 символов.');continue;}
  if(f.required&&!v.trim())errors.push('Заполните: '+f.label+'.');
  if(f.type==='select'&&!f.options?.some(o=>o.value===v))errors.push('Выберите вариант: '+f.label+'.');
  if(f.type==='number'&&(!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)<(f.min??0)||Number(v)>(f.max??100000)||((f.step??1)===1&&!Number.isInteger(Number(v)))))errors.push(f.label+': проверьте число и диапазон.');
  if(f.type==='datetime-local'&&(!validDateTime(v)||v.slice(0,10)>input.date))errors.push(f.label+': укажите существующие дату и время не позже даты записи.');
 }
 if(!Object.values(values).some(v=>typeof v==='string'&&v.trim()))errors.push('Добавьте хотя бы одно наблюдение. Пустой ответ не считается нулём.');
 if(t.id==='sleep'&&Object.entries(values).filter(([k,v])=>['bedAt','asleepAt','wakeAt'].includes(k)&&v).every(([,v])=>validDateTime(v))){
  if(values.bedAt&&values.asleepAt&&values.bedAt>values.asleepAt)errors.push('Проверьте даты: засыпание не может быть раньше укладывания.');
  if(values.asleepAt&&values.wakeAt){const period=clockMinutes(values.wakeAt)-clockMinutes(values.asleepAt);if(period<0||period>2880)errors.push('Проверьте даты: пробуждение должно следовать за засыпанием, интервал — не более двух суток.');if(values.awakeMinutes!==undefined&&values.awakeMinutes!==''&&Number(values.awakeMinutes)>period)errors.push('Ночное бодрствование не может превышать весь записанный интервал.');}
 }
 if(['anxiety','mood'].includes(t.id)){const key=t.id==='anxiety'?'missedDays':'participationDays',days=(Date.parse(input.date)-Date.parse(input.periodStart||input.date))/86400000+1;if(values[key]!==undefined&&values[key]!==''&&Number(values[key])>days)errors.push('Число дней не может превышать выбранный период. Для нескольких дней укажите начало периода.');}
 if(t.id==='behavior'&&values.dayType==='calm'&&values.duration!==undefined&&values.duration!==''&&Number(values.duration)>0)errors.push('Для спокойного дня уберите длительность эпизода или выберите запись эпизода.');
 return errors;
}
export function normalizeJournals(raw:unknown):JournalRecord[]{
 if(!raw||typeof raw!=='object'||(raw as any).version!==1||!Array.isArray((raw as any).records))return [];
 const ids=new Set<string>();
 return (raw as any).records.flatMap((r:any)=>{
  if(!r||typeof r!=='object'||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt)))return [];
  const t=journalTemplate(r.templateId);if(!t||r.templateVersion!==t.version||validateJournal(r).length)return [];
  ids.add(r.id);
  return [{...(typeof r.childId==='string'&&r.childId?{childId:r.childId}:{}),id:r.id,templateId:t.id,templateVersion:t.version,childLabel:r.childLabel.trim(),age:r.age,respondent:r.respondent,observerLabel:r.observerLabel.trim(),date:r.date,periodStart:r.periodStart,treatment:r.treatment,values:Object.fromEntries(Object.entries(r.values).filter(([,v])=>typeof v==='string'&&v.trim())),includeInVisit:r.includeInVisit,createdAt:r.createdAt,updatedAt:r.updatedAt} as JournalRecord];
 }).sort((a:JournalRecord,b:JournalRecord)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
}
export const getJournals=()=>normalizeJournals(readJSON<unknown>(JOURNAL_KEY,null));
const write=(records:JournalRecord[])=>{if(!writeJSON(JOURNAL_KEY,{version:1,records}))return false;window.dispatchEvent(new Event(EVENT));return true;};
export function createJournal(input:JournalInput):JournalRecord{const errors=validateJournal(input);if(errors.length)throw new Error(errors.join(' '));const now=new Date().toISOString();return {...input,childId:input.childId||childIdForLabel(input.childLabel),childLabel:input.childLabel.trim(),observerLabel:input.observerLabel.trim(),id:globalThis.crypto?.randomUUID?.()||'journal-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),templateVersion:journalTemplate(input.templateId)!.version,createdAt:now,updatedAt:now};}
export function saveJournal(record:JournalRecord){const valid=normalizeJournals({version:1,records:[record]});if(valid.length!==1)return false;const rows=getJournals();if(rows.some(r=>r.id===record.id))return false;return write([valid[0],...rows]);}
export function updateJournal(id:string,input:JournalInput){const rows=getJournals(),old=rows.find(r=>r.id===id);if(!old||old.templateId!==input.templateId||validateJournal(input).length)return false;return write(rows.map(r=>r.id===id?{...input,childId:input.childId||childIdForLabel(input.childLabel)||(r.childLabel===input.childLabel.trim()?r.childId:undefined),childLabel:input.childLabel.trim(),observerLabel:input.observerLabel.trim(),id,templateVersion:old.templateVersion,createdAt:old.createdAt,updatedAt:new Date().toISOString()}:r));}
/** Rewrites stored records, e.g. to link them to a profile after a rename. */
export function updateJournals(map:(r:JournalRecord)=>JournalRecord){const rows=getJournals(),next=rows.map(map);return JSON.stringify(next)===JSON.stringify(rows)?true:write(next);}
export const removeJournal=(id:string)=>write(getJournals().filter(r=>r.id!==id));
export const includeJournals=(ids:string[],includeInVisit:boolean)=>write(getJournals().map(r=>ids.includes(r.id)?{...r,includeInVisit}:r));
export function subscribeJournals(handler:()=>void){const storage=(e:StorageEvent)=>{if(!e.key||e.key===JOURNAL_KEY)handler();};window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};}
export function journalAlerts(r:JournalInput):string[]{
 const alerts:string[]=[];
 if(r.templateId==='mood'&&r.values.safety==='yes')alerts.push('Если есть мысли о смерти или самоповреждение, свяжитесь с безопасным взрослым и специалистом сегодня. При непосредственной опасности не оставляйте ребёнка одного и обращайтесь за экстренной помощью: в России 112, в другой стране — местный номер. Запись не заменяет помощь.');
 if(r.templateId==='mood'&&r.values.activation==='yes')alerts.push('Заметное уменьшение сна вместе с необычной активностью обсудите с врачом без ожидания планового приёма, особенно после изменения лечения. Эта отметка не устанавливает диагноз.');
 if(r.templateId==='tolerability'&&r.values.concern==='sooner')alerts.push('Выраженное или быстро нарастающее ухудшение обсудите с лечащим врачом раньше. При нарушении дыхания, потере сознания или непосредственной угрозе безопасности нужна экстренная помощь.');
 if(r.templateId==='communication'&&r.values.loss==='yes')alerts.push('Заметную утрату ранее освоенных навыков обсудите с врачом в ближайшее время. При резком ухудшении состояния или других острых симптомах обращайтесь за срочной помощью.');
 return alerts;
}
export function sleepMetrics(r:JournalInput):{label:string;minutes:number}[]{
 if(r.templateId!=='sleep')return [];
 const v=r.values,out:{label:string;minutes:number}[]=[];
 if(v.bedAt&&v.asleepAt&&validDateTime(v.bedAt)&&validDateTime(v.asleepAt)){const delay=clockMinutes(v.asleepAt)-clockMinutes(v.bedAt);if(delay>=0)out.push({label:'От укладывания до засыпания',minutes:delay});}
 if(v.asleepAt&&v.wakeAt&&validDateTime(v.asleepAt)&&validDateTime(v.wakeAt)){const interval=clockMinutes(v.wakeAt)-clockMinutes(v.asleepAt);if(interval>=0&&interval<=2880){out.push({label:'От засыпания до окончательного пробуждения',minutes:interval});if(v.awakeMinutes!==undefined&&v.awakeMinutes!==''&&Number.isFinite(Number(v.awakeMinutes))&&Number(v.awakeMinutes)<=interval)out.push({label:'Примерное время сна без ночного бодрствования',minutes:interval-Number(v.awakeMinutes)});}}
 return out;
}
export const journalPeriod=(r:JournalInput)=>r.periodStart&&r.periodStart!==r.date?r.periodStart+' — '+r.date:r.date;
export function formatJournal(r:JournalRecord){const t=journalTemplate(r.templateId)!;return [t.title+' · дневник наблюдений',`Ребёнок: ${r.childLabel}${r.age!==undefined?' · '+r.age+' лет':''}`,`Дата / период: ${journalPeriod(r)}`,`Кто заполнял: ${respondentLabels[r.respondent]}${r.observerLabel?' · '+r.observerLabel:''}`,`Версия формы: ${r.templateVersion}`,...(r.treatment?['Лечение / занятия со слов заполняющего: '+r.treatment]:[]),...journalAlerts(r),...t.fields.filter(f=>r.values[f.id]!==undefined&&r.values[f.id]!=='').map(f=>f.label+': '+journalValueLabel(f,r.values[f.id])),...sleepMetrics(r).map(m=>m.label+': '+m.minutes+' мин (по внесённым данным)'),...(t.id==='sleep'?['Время приблизительное, по местным часам; переход часов автоматически не учитывается. Дневной сон не входит в расчёт ночного.']:[]),'Это форма наблюдений без диагностического балла; она не является назначением лечения.','Источники общих принципов наблюдения, не валидизация этой формы:',...t.sources.map(s=>s.label+': '+s.url)].join('\n');}
export const formatJournals=(records:JournalRecord[])=>['Дневники и формы · Кора',...records.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)).map(r=>'\n'+formatJournal(r))].join('\n');
export type JournalFilters={child?:string;template?:string;respondent?:string;observer?:string;from?:string;to?:string};
export const filterJournals=(records:JournalRecord[],f:JournalFilters)=>records.filter(r=>(!f.child||r.childLabel===f.child)&&(!f.template||r.templateId===f.template)&&(!f.respondent||r.respondent===f.respondent)&&(!f.observer||r.observerLabel===f.observer)&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to));
// Compare rows only within the same child, informant, form and defined target. Do not infer treatment effects.
export function canCompareJournals(rows:JournalRecord[],t:JournalTemplate){if(rows.length<2||!rows[0].observerLabel.trim())return false;const first=rows[0],duration=(r:JournalRecord)=>Date.parse(r.date)-Date.parse(r.periodStart||r.date),same=(r:JournalRecord)=>r.childLabel===first.childLabel&&r.templateId===t.id&&r.respondent===first.respondent&&r.observerLabel===first.observerLabel&&duration(r)===duration(first)&&t.compareKeys.every(k=>(r.values[k]||'').trim()===(first.values[k]||'').trim());return rows.every(same);}
