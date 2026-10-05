import type {Block,Cell,Doc,Tone} from './pdf/doc';
import {RouteData,changeReport,ChangeReport,childJournals,childScreenings,fullDate,timelineEntries,Trend} from './route';
import {activeCourses,courses,dayNumber,eventKindLabels} from './treatment';
import {itemLabel,missedLabels,monitorNumbers,scaleLabels,urgentAnswers,CheckIn} from './monitoring';
import {ageLabel} from './children';
import {diagnosisById,dxName,medicationById,specialists} from './content';
import {screenerById} from './screeningContent';
import {formatAppointment,daysUntil,Appointment} from './appointment';
import {journalTemplate,journalValueLabel} from './journalContent';
import {docKindLabels} from './documents';
import {getVisitFor,VisitState} from './visit';
import type {ScreeningResult} from './screenings';
import type {JournalRecord} from './journals';
// PDFs for specialists: the main numbers first (what changed, warning signs), details in tables below.
const MONTHS=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const FOOTER='Кора · записи семьи, не медицинский документ';
const SEV:Tone[]=['sev0','sev1','sev2','sev3'];
const WHO:Record<string,string>={parent:'родитель',teacher:'учитель',self:'сам ребёнок',clinician:'специалист'};
export const dm=(date:string)=>date.slice(8,10)+'.'+date.slice(5,7);
export const dmy=(date:string)=>dm(date)+'.'+date.slice(0,4);
const num=(v:number)=>String(Math.round(v*10)/10).replace('.',',');
const sevCell=(v:number|undefined):Cell=>v===undefined||!scaleLabels[v]?'':{text:scaleLabels[v].toLocaleLowerCase('ru'),tone:SEV[v]};
const legend=():Block=>({t:'legend',items:scaleLabels.map((label,i)=>({tone:SEV[i],label}))});
const title=(c:RouteData['child'])=>c.label+', '+ageLabel(c);
const periodText=(r:ChangeReport)=>(r.sinceVisit?'С прошлого приёма: ':'Период: ')+fullDate(r.from)+' — '+fullDate(r.to)+(r.sinceVisit?'':' ('+r.weeks+' нед.)');

/** Better or worse: for goals, symptoms and scales a lower value is better. */
function change(first:number|undefined,last:number,n=2):Cell{
 if(first===undefined||n<2)return {text:'одна отметка',tone:'muted'};
 if(last===first)return {text:'без изменений',tone:'muted'};
 return last<first?{text:'лучше',tone:'good'}:{text:'хуже',tone:'bad'};
}
const goalValue=(t:Trend,v:number)=>t.measure==='count'?v+' за нед.':(scaleLabels[v]||'').toLocaleLowerCase('ru');

function facts(d:RouteData,withVisit=true):Block{
 const p=d.profile,dx=p.diagnoses.map(diagnosisById).filter((x):x is NonNullable<typeof x>=>!!x).map(dxName);
 const current=activeCourses(d.events),sp=p.specialists.map(id=>specialists.find(s=>s.id===id)?.shortTitle).filter(Boolean);
 const items:{label:string;value:string;tone?:'danger'}[]=[
  {label:'Диагнозы из заключения',value:dx.join(', ')||'не указаны'},
  {label:'Лечение сейчас',value:current.length?current.map(c=>c.label+(c.dose?' — '+c.dose:'')+', '+dayNumber(c.since,d.today)+'-й день').join('\n'):'препараты не отмечены'},
 ];
 if(sp.length)items.push({label:'Занятия',value:sp.join(', ')});
 const visit=d.appointment&&daysUntil(d.appointment.date)>=0?formatAppointment(d.appointment):'';
 if(visit&&withVisit)items.push({label:'Следующий приём',value:visit});
 return {t:'facts',items};
}
function urgentBlock(d:RouteData,from:string):Block|null{
 const rows=d.checkIns.filter(c=>c.date>=from).flatMap(c=>urgentAnswers(c).length?[dm(c.date)+': '+urgentAnswers(c).join(', ').toLocaleLowerCase('ru')]:[]);
 return rows.length?{t:'callout',tone:'danger',title:'Тревожные признаки в опросах родителя',items:rows}:null;
}
function dynamics(r:ChangeReport):Block[]{
 const rows:Cell[][]=[
  ...r.goals.map(t=>[{text:t.label,bold:true},t.n>1?goalValue(t,t.first):'—',goalValue(t,t.last),change(t.first,t.last,t.n)] as Cell[]),
  ...r.scales.map(s=>[{text:s.name+' ('+s.respondent+')',bold:true},s.before!==undefined?s.before+' из '+s.max:'—',s.after+' из '+s.max,change(s.before,s.after)] as Cell[]),
  ...r.numbers.map(n=>[{text:n.label,bold:true},n.first!==n.last?num(n.first)+' '+n.unit:'—',num(n.last)+' '+n.unit,n.first===n.last?{text:'без изменений',tone:'muted'}:{text:(n.last>n.first?'+':'−')+num(Math.abs(n.last-n.first))+' '+n.unit,tone:'muted'}] as Cell[]),
 ];
 const out:Block[]=[];
 if(rows.length)out.push({t:'h',text:'Главное за период',note:'Цели семьи — по еженедельным опросам родителя; шкалы — не диагноз. Для целей и шкал меньше — лучше.'},{t:'table',head:['Показатель','Было','Стало','Изменение'],widths:[46,20,20,16],rows});
 if(r.effects.length||r.missed!==null){
  const er:Cell[][]=r.effects.filter(e=>!/^[a-z0-9_-]+$/.test(e.label)).map(e=>[e.label,sevCell(e.max)]);
  if(r.missed!==null)er.push(['Пропуски приёма лекарств (максимум за неделю)',{text:missedLabels[r.missed].toLocaleLowerCase('ru'),tone:r.missed?'warn':'sev0'}]);
  out.push({t:'h',text:'Что отмечалось на лечении',note:'Самая сильная отметка за период.'},{t:'table',head:['Признак','Максимум'],widths:[70,30],rows:er});
 }
 return out;
}
/** Weekly check-ins as a grid: one row per goal or sign, one column per check-in, coloured by severity. */
function matrix(d:RouteData,from:string,max=8):Block[]{
 const all=d.checkIns.filter(c=>c.date>=from).sort((a,b)=>a.date.localeCompare(b.date)),shown=all.slice(-max);
 if(!shown.length)return [];
 const rows:Cell[][]=[];
 for(const g of d.profile.goals){if(!shown.some(c=>c.goals[g.id]!==undefined))continue;rows.push([{text:g.text,bold:true},...shown.map(c=>c.goals[g.id]===undefined?'':g.measure==='count'?{text:String(c.goals[g.id]),bold:true}:sevCell(c.goals[g.id]))]);}
 const items=[...new Set(shown.flatMap(c=>Object.keys(c.items)))];
 for(const id of items){const label=itemLabel(id,d.profile);if(label)rows.push([label,...shown.map(c=>sevCell(c.items[id]))]);}
 for(const id of Object.keys(monitorNumbers))if(shown.some(c=>c.numbers[id]!==undefined))rows.push([monitorNumbers[id].label+', '+monitorNumbers[id].unit,...shown.map(c=>c.numbers[id]===undefined?'':num(c.numbers[id]))]);
 if(shown.some(c=>c.missed!==undefined))rows.push(['Пропуски приёма',...shown.map((c:CheckIn)=>c.missed===undefined?'':{text:missedLabels[c.missed].toLocaleLowerCase('ru'),tone:c.missed?'warn':'sev0'} as Cell)]);
 if(!rows.length)return [];
 return [{t:'h',text:'Еженедельные опросы',note:(all.length>shown.length?'Последние '+shown.length+' из '+all.length+'. ':'')+'Пустая клетка — вопрос пропущен (это не «нет»). Числа у целей — сколько раз за неделю.'},
  legend(),{t:'table',head:['',...shown.map(c=>dm(c.date))],widths:[46,...shown.map(()=>Math.max(12,(132-46)/Math.max(shown.length,4)))],rows}];
}
function treatment(d:RouteData,from?:string):Block[]{
 const rows:Cell[][]=[];
 for(const c of courses(d.events))c.history.forEach((e,i)=>{if(from&&e.date<from)return;const prev=c.history.slice(0,i).filter(x=>x.kind!=='stop').pop();
  rows.push([dmy(e.date),{text:eventKindLabels[e.kind],tone:e.kind==='stop'?'muted':'accent'},{text:c.label,bold:true},e.kind==='stop'?'—':(e.dose||'')+(e.kind==='dose'&&prev?.dose?' (было '+prev.dose+')':''),e.text||'']);});
 rows.sort((a,b)=>String(a[0]).split('.').reverse().join('').localeCompare(String(b[0]).split('.').reverse().join('')));
 return rows.length?[{t:'h',text:from?'Изменения лечения за период':'Лечение по датам',note:'Дозы переписаны родителями из назначений врача.'},{t:'table',head:['Дата','Событие','Препарат','Доза','Заметка'],widths:[17,22,26,22,30],rows}]:[];
}
function events(d:RouteData,from?:string):Block[]{
 const rows:Cell[][]=d.events.filter(e=>!['start','dose','stop'].includes(e.kind)&&(!from||e.date>=from)).sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[dmy(e.date),{text:eventKindLabels[e.kind],tone:e.kind==='side'?'warn':undefined},e.text||'']);
 return rows.length?[{t:'h',text:'Записи семьи'},{t:'table',head:['Дата','Что','Описание'],widths:[17,26,74],rows}]:[];
}
const statusTone=(s:ScreeningResult['score']['status']):Tone|undefined=>s==='priority'?'bad':s==='discuss'||s==='followup'?'warn':s==='low'?'good':undefined;
function scales(rows:ScreeningResult[],titleText='Тесты и шкалы'):Block[]{
 const sorted=rows.slice().sort((a,b)=>b.completedDate.localeCompare(a.completedDate)).slice(0,15);
 return sorted.length?[{t:'h',text:titleText,note:'Скрининг и шкалы помогают разговору с врачом, но не ставят диагноз.'},{t:'table',head:['Шкала','Кто заполнял','Дата','Балл','Что значит'],widths:[24,18,15,13,40],rows:sorted.map(r=>[{text:screenerById(r.screenerId)?.name||r.screenerId,bold:true},WHO[r.respondent]||r.respondent,dmy(r.completedDate),r.score.total+' из '+r.score.max,{text:r.score.label,tone:statusTone(r.score.status)}])}]:[];
}
function documents(d:RouteData,from?:string):Block[]{
 const rows=(d.docs||[]).filter(x=>!from||x.date>=from).sort((a,b)=>b.date.localeCompare(a.date)).map(x=>[dmy(x.date),docKindLabels[x.kind],{text:x.title,bold:true},x.note||''] as Cell[]);
 return rows.length?[{t:'h',text:'Документы'},{t:'table',head:['Дата','Тип','Название','Главное'],widths:[17,24,30,46],rows}]:[];
}
function diaries(d:RouteData,from:string):Block[]{
 const counts=new Map<string,{n:number;last:string}>();
 for(const r of childJournals(d.journals,d.child))if(r.date>=from){const o=counts.get(r.templateId);counts.set(r.templateId,{n:(o?.n||0)+1,last:!o||o.last<r.date?r.date:o.last});}
 return counts.size?[{t:'h',text:'Дневники наблюдений'},{t:'table',head:['Дневник','Записей за период','Последняя'],widths:[50,25,25],rows:[...counts].map(([id,v])=>[journalTemplate(id)?.title||id,String(v.n),dmy(v.last)])}]:[];
}
function contacts(d:RouteData):Block[]{
 const docs=d.profile.doctors;
 return docs.length?[{t:'h',text:'Специалисты семьи'},{t:'table',head:['Кто','Роль','Телефон','Где принимает'],widths:[28,26,22,30],rows:docs.map(x=>[{text:x.name||'—',bold:true},x.role,x.phone,x.place])}]:[];
}
const questions=(list:string[]):Block[]=>list.length?[{t:'h',text:'Вопросы семьи к приёму'},{t:'list',numbered:true,items:list}]:[];

/** «Всё о ребёнке»: profile, the period since the last visit in numbers, then the whole history in tables. */
export function childReportDoc(d:RouteData):Doc{
 const r=changeReport(d),c=d.child,[y,m]=c.birth.split('-');
 const blocks:Block[]=[{t:'title',kicker:'Кора · сводка для специалиста',title:title(c),meta:['Месяц рождения: '+(MONTHS[Number(m)-1]||'')+' '+y+'. Составлено '+fullDate(d.today)+' по записям семьи.',periodText(r)+(r.checkIns?' · опросов: '+r.checkIns:'')]},facts(d)];
 const urgent=urgentBlock(d,r.from);if(urgent)blocks.push(urgent);
 blocks.push(...dynamics(r),...matrix(d,r.from),...questions(getVisitFor(c.id).questions),...treatment(d),...events(d,r.from),...scales(childScreenings(d.screenings,c)),...documents(d),...diaries(d,r.from),...contacts(d));
 if(blocks.length<=3)blocks.push({t:'text',text:'Пока записей мало: добавьте лечение, цели и короткие опросы — сводка заполнится сама.',muted:true});
 return {title:'Сводка для специалиста · '+title(c),running:title(c)+' · сводка для специалиста · '+fullDate(d.today),footer:FOOTER,blocks};
}
/** «Что изменилось с прошлого приёма». */
export function changesDoc(d:RouteData,weeks?:number):Doc{
 const r=changeReport(d,weeks);
 const blocks:Block[]=[{t:'title',kicker:'Кора · что изменилось',title:title(d.child),meta:[periodText(r)+(r.checkIns?' · опросов: '+r.checkIns:''),'Составлено '+fullDate(d.today)+' по записям семьи.']},facts(d)];
 const urgent=urgentBlock(d,r.from);if(urgent)blocks.push(urgent);
 blocks.push(...dynamics(r),...matrix(d,r.from),...treatment(d,r.from),...events(d,r.from),...documents(d,r.from),...diaries(d,r.from));
 return {title:'Что изменилось · '+title(d.child),running:title(d.child)+' · что изменилось · '+fullDate(d.today),footer:FOOTER,blocks};
}
/** The timeline as one table, newest at the bottom; the date is printed once per day. */
export function timelineDoc(d:RouteData):Doc{
 const entries=timelineEntries(d);let day='';
 const rows:Cell[][]=entries.map(e=>{const first=e.date!==day;day=e.date;return [first?{text:dmy(e.date),bold:true}:'',{text:e.tag,tone:e.tone==='danger'?'bad':e.tone==='warm'?'warn':e.tone==='accent'?'accent':undefined},e.title+(e.text?' — '+e.text:'')];});
 return {title:'Лента лечения · '+title(d.child),running:title(d.child)+' · лента лечения',footer:FOOTER,blocks:[
  {t:'title',kicker:'Кора · лента лечения',title:title(d.child),meta:['Записи семьи по датам: лечение, приёмы, самочувствие, тесты, документы. Составлено '+fullDate(d.today)+'.']},
  ...(rows.length?[{t:'table',head:['Дата','Что','Запись'],widths:[17,28,72],rows} as Block]:[{t:'text',text:'Записей пока нет.',muted:true} as Block])]};
}
type MedDetail=VisitState['medDetails'][string];
/** «Памятка к приёму»: questions first, then what changed, prescriptions, observations and results. */
export function memoDoc(o:{visit:VisitState;results:ScreeningResult[];journals:JournalRecord[];appointment:Appointment|null;route:RouteData|null;childTitle?:string;today:string}):Doc{
 const who=o.childTitle||'';
 const blocks:Block[]=[{t:'title',kicker:'Кора · памятка к приёму',title:who||'Памятка к приёму',meta:[...(o.appointment?['Приём: '+formatAppointment(o.appointment)]:[]),'Составлено '+fullDate(o.today)+'. Записи семьи для обсуждения с врачом; не назначение лечения.']}];
 if(o.route){const r=changeReport(o.route);blocks.push(facts(o.route,false));const u=urgentBlock(o.route,r.from);if(u)blocks.push(u);}
 blocks.push(...questions(o.visit.questions));
 if(o.route){const r=changeReport(o.route);blocks.push(...dynamics(r),...matrix(o.route,r.from,6),...treatment(o.route,r.from));}
 if(o.visit.meds.length){
  const f=(x:MedDetail|undefined,k:keyof MedDetail)=>(x?.[k]||'').trim();
  blocks.push({t:'h',text:'Назначения со слов родителя'},{t:'table',head:['Препарат','Доза','Как принимать','Цель','Что отслеживать','Заметка'],widths:[22,16,20,20,20,20],rows:o.visit.meds.map(id=>{const x=o.visit.medDetails[id];return [{text:medicationById(id)?.name||id,bold:true},f(x,'dose'),f(x,'schedule'),f(x,'goal'),f(x,'monitoring'),[f(x,'warnings'),f(x,'note')].filter(Boolean).join('. ')] as Cell[];})});
 }
 const snaps=Object.values(o.visit.checklists);
 if(snaps.length){blocks.push({t:'h',text:'Наблюдения семьи'});for(const s of snaps)blocks.push({t:'text',text:s.title+(s.updatedAt?' · '+new Date(s.updatedAt).toLocaleDateString('ru-RU'):'')},{t:'list',items:s.lines});}
 blocks.push(...scales(o.results,'Скрининги и шкалы'));
 if(o.journals.length)blocks.push({t:'h',text:'Дневники и формы — наблюдения семьи'},{t:'table',head:['Дата','Форма','Кто заполнял','Главное'],widths:[16,24,18,58],rows:o.journals.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{const t=journalTemplate(r.templateId);const main=t?t.fields.filter(fl=>r.values[fl.id]!==undefined&&r.values[fl.id]!=='').slice(0,4).map(fl=>fl.label+': '+journalValueLabel(fl,String(r.values[fl.id]))).join('; '):'';return [dmy(r.date),{text:t?.title||r.templateId,bold:true},WHO[r.respondent]||r.respondent,main.slice(0,400)] as Cell[];})});
 if(blocks.length<=2)blocks.push({t:'text',text:'Памятка пока пустая: добавьте вопросы врачу, назначения или наблюдения.',muted:true});
 return {title:'Памятка к приёму'+(who?' · '+who:''),running:'Памятка к приёму'+(who?' · '+who:''),footer:FOOTER,blocks};
}
