import {readJSON,writeJSON} from './persist';
// A written safety plan for a teenager in crisis (warning signs → what helps → who to call → a safer home),
// filled in advance, ideally together with the teenager and their doctor. Kept with the family's records.
export const SAFETY_KEY='psyparent.safety.v1';
const EVENT='psyparent:safety-updated';
export type Contact={name:string;phone:string};
export type SafetyPlan={warning:string[];coping:string[];distract:string[];people:Contact[];doctor:Contact;places:Contact[];home:string[];reasons:string[];updatedAt:string};
export const emptyPlan=():SafetyPlan=>({warning:[],coping:[],distract:[],people:[],doctor:{name:'',phone:''},places:[],home:[],reasons:[],updatedAt:''});
export const CRISIS=[{name:'Единый номер экстренных служб',phone:'112'},{name:'Скорая помощь',phone:'103'},{name:'Детский телефон доверия — бесплатно, круглосуточно, для детей и родителей',phone:'8-800-2000-122'}];
export const suggestions={
 warning:['Не выходит из комнаты, перестал общаться','Не спит ночами или спит целыми днями','Говорит, что всем будет лучше без него','Раздаёт вещи, прощается','Новые порезы или следы на теле','Внезапное спокойствие после долгого отчаяния','Вспышки ярости, крушит вещи','Странные высказывания, слышит голоса'],
 coping:['Выйти на улицу, пройтись','Музыка в наушниках','Тёплый душ','Холодная вода на лицо и руки','Побыть с питомцем','Посидеть рядом со взрослым','Нарисовать или записать, что происходит'],
 home:['Все лекарства, включая обезболивающие, — под замком, выдаёт взрослый','Ножи и острые предметы убраны','Спиртное убрано из дома','Нет доступа к оружию','Ключи от балкона и крыши — у взрослых','В трудные дни вечером и ночью рядом есть взрослый'],
};
/** What the family does in four situations — from «Когда нельзя ждать» and the chapter on self-harm. */
export const familyActions=[
 {title:'Говорит, что не хочет жить',steps:['Отнеситесь серьёзно к каждому такому слову — сказанному всерьёз, вскользь или в шутку.','Спросите прямо: «Тебе так тяжело, что не хочется жить? Ты думаешь о том, чтобы что-то с собой сделать?» Этот вопрос не наводит на мысли.','Не оставляйте одного, уберите лекарства и опасные предметы.','Сегодня же — к врачу или психологу. Если есть план, намерение или вы не можете обеспечить безопасность — 112 или 103.']},
 {title:'Нанёс себе повреждение',steps:['Не кричите, не ругайте, не стыдите и не требуйте клятв «больше никогда». Испугаться надо не его, а за него.','Обработайте рану. Если она глубокая или кровь не останавливается — 103.','Скажите главное: вы любите, видите, как ему тяжело, не злитесь и найдёте помощь.','В ближайшие дни — к психиатру или психологу. Если вместе с этим звучат мысли о смерти — сегодня.']},
 {title:'Резкое возбуждение, агрессия',steps:['Главное — чтобы никто не пострадал. Уберите опасное, освободите пространство, уведите лишних людей, приглушите шум.','Говорите коротко и спокойно, не вступайте в борьбу и не спорьте.','Не справляйтесь в одиночку: если не удаётся сохранить безопасность — 112.']},
 {title:'Теряет связь с реальностью',steps:['Не спорьте с тем, что для него сейчас реально, и не стыдите.','Говорите спокойно и коротко, будьте рядом.','Это состояние лечится, особенно если действовать быстро: срочно к психиатру или 103.']},
];
const str=(v:unknown,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v:unknown,max=12)=>Array.isArray(v)?[...new Set(v.map(x=>str(x)).filter(Boolean))].slice(0,max):[];
const contact=(v:any):Contact=>({name:str(v?.name,80),phone:str(v?.phone,40)});
const contacts=(v:unknown)=>Array.isArray(v)?v.map(contact).filter(c=>c.name||c.phone).slice(0,8):[];
export function normalizePlan(raw:unknown):SafetyPlan{
 const r=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 return {warning:list(r.warning),coping:list(r.coping),distract:list(r.distract),people:contacts(r.people),doctor:contact(r.doctor),places:contacts(r.places),home:list(r.home),reasons:list(r.reasons),updatedAt:str(r.updatedAt,40)};
}
export const planFilled=(p:SafetyPlan)=>p.warning.length+p.coping.length+p.distract.length+p.people.length+p.places.length+p.home.length+p.reasons.length>0||!!(p.doctor.name||p.doctor.phone);
function all():Record<string,SafetyPlan>{const raw=readJSON<unknown>(SAFETY_KEY,{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?Object.fromEntries(Object.entries(raw as Record<string,unknown>).map(([k,v])=>[k,normalizePlan(v)])):{};}
export const getPlan=(childId:string)=>all()[childId]??emptyPlan();
export function savePlan(childId:string,plan:SafetyPlan,now=new Date()){
 const ok=writeJSON(SAFETY_KEY,{...all(),[childId]:normalizePlan({...plan,updatedAt:now.toISOString()})});
 if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));
 return ok;
}
export function removePlan(childId:string){const rows=all();delete rows[childId];const ok=writeJSON(SAFETY_KEY,rows);if(ok&&typeof window!=='undefined')window.dispatchEvent(new Event(EVENT));return ok;}
export function subscribeSafety(handler:()=>void){
 const storage=(e:StorageEvent)=>{if(!e.key||e.key===SAFETY_KEY)handler();};
 window.addEventListener(EVENT,handler);window.addEventListener('psyparent:all-data-cleared',handler);window.addEventListener('storage',storage);
 return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('psyparent:all-data-cleared',handler);window.removeEventListener('storage',storage);};
}
const lines=(title:string,items:string[])=>items.length?['',title+':',...items.map(x=>'• '+x)]:[];
const phoneLine=(c:Contact)=>[c.name,c.phone].filter(Boolean).join(' — ');
/** Text to keep in the teenager's phone or send to the second adult. */
export function formatPlan(p:SafetyPlan,childLabel:string,meds:string[]=[]){
 return ['ПЛАН БЕЗОПАСНОСТИ · '+childLabel,'Составлен заранее, в спокойную минуту. В кризис — действуем по нему.',
  ...lines('Признаки, что становится хуже',p.warning),...lines('Что помогает справиться самому',p.coping),...lines('Люди и места, которые отвлекают',p.distract),
  ...lines('К кому обратиться',p.people.map(phoneLine)),...lines('Лечащий врач',p.doctor.name||p.doctor.phone?[phoneLine(p.doctor)]:[]),...lines('Куда обратиться рядом',p.places.map(phoneLine)),
  ...lines('Экстренная помощь',CRISIS.map(phoneLine)),...lines('Безопасность дома',p.home),...lines('Лекарства — хранит и выдаёт взрослый',meds),...lines('Что для меня важно',p.reasons),
  '','Составлено в приложении «Кора».'].join('\n');
}
