import React,{useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import {ContactsEditor,ListEditor} from '../components/ListEditor';
import {useActiveChild,useEvents} from '../lib/useRoute';
import {activeCourses} from '../lib/treatment';
import {CRISIS,emptyPlan,familyActions,formatPlan,getPlan,planFilled,savePlan,subscribeSafety,suggestions,Contact,SafetyPlan as Plan} from '../lib/safety';
import {ageLabel} from '../lib/children';
import {getProfile} from '../lib/profile';
import {copyText,shareText} from '../lib/export';
import {shareToTelegram} from '../lib/twa';
import {toast} from '../lib/toast';
import {useUnsaved} from '../lib/unsaved';
import {savePdf} from '../lib/files';
type ListKey='warning'|'coping'|'distract'|'home'|'reasons';
const tel=(phone:string)=>'tel:'+phone.replace(/[^\d+]/g,'');

export default function SafetyPlan(){
 const child=useActiveChild(),events=useEvents(child?.id||''),[plan,setPlan]=useState<Plan>(()=>child?getPlan(child.id):emptyPlan()),[editing,setEditing]=useState(false);
 useUnsaved(editing);
 useEffect(()=>{if(!child)return;setPlan(getPlan(child.id));return subscribeSafety(()=>setPlan(getPlan(child.id)));},[child?.id]);
 const meds=useMemo(()=>activeCourses(events).map(c=>c.label+(c.dose?' — '+c.dose:'')),[events]);
 if(!child)return <div className="container"><PageHeader title="План безопасности" backTo="/child" backLabel="Ребёнок"/><div className="emptyState"><h3>Сначала добавьте ребёнка</h3><Link className="btn" to="/child">Добавить ребёнка</Link></div></div>;
 const filled=planFilled(plan),title=child.label+', '+ageLabel(child);
 const text=()=>formatPlan(plan,title,meds);
 const share=async()=>{const t=text();if(await shareText(t,'План безопасности')!=='unavailable'||shareToTelegram(t))return;const ok=await copyText(t);toast(ok?'План скопирован':'Не удалось отправить',{variant:ok?'info':'error'});};
 const save=()=>{if(savePlan(child.id,plan)){toast('План сохранён');setEditing(false);window.scrollTo(0,0);}else toast('Не удалось сохранить',{variant:'error'});};
 const setList=(k:ListKey)=>(v:string[])=>setPlan({...plan,[k]:v});
 const header=<PageHeader title="План безопасности" subtitle="Что делать, если подростку станет очень плохо: признаки, кто поможет, куда звонить и как сделать дом безопаснее." eyebrow={title} backTo="/child" backLabel="Ребёнок"/>;
 if(editing)return <div className="container">{header}
  <div className="callout"><strong>Заполняйте вместе</strong><p>Лучше всего — с подростком и его врачом или психологом, в спокойную минуту. Своими словами подростка: этот план для него.</p></div>
  <div className="stack" style={{marginTop:14}}>
  <section className="card"><h2>1. Признаки, что становится хуже</h2><ListEditor label="Ранние признаки" hint="Что вы или подросток замечаете перед тем, как становится совсем плохо." value={plan.warning} onChange={setList('warning')} suggest={suggestions.warning} placeholder="Свой признак"/></section>
  <section className="card"><h2>2. Что помогает справиться</h2><ListEditor label="Что я могу сделать сам" value={plan.coping} onChange={setList('coping')} suggest={suggestions.coping} placeholder="Например: включить любимый сериал"/><ListEditor label="Люди и места, которые отвлекают" value={plan.distract} onChange={setList('distract')} placeholder="Например: кафе у дома, двоюродный брат"/></section>
  <section className="card"><h2>3. Кто поможет</h2><ContactsEditor label="Близкие, которым можно позвонить" value={plan.people} onChange={people=>setPlan({...plan,people})}/>
   <fieldset className="plainFieldset safetyField"><legend className="fieldLabel">Лечащий врач</legend><div className="contactRow"><input className="input" aria-label="Врач" placeholder="Имя врача" maxLength={80} value={plan.doctor.name} onChange={e=>setPlan({...plan,doctor:{...plan.doctor,name:e.target.value}})}/><input className="input" aria-label="Телефон врача" placeholder="Телефон" inputMode="tel" maxLength={40} value={plan.doctor.phone} onChange={e=>setPlan({...plan,doctor:{...plan.doctor,phone:e.target.value}})}/></div></fieldset>
   <ContactsEditor label="Куда обратиться рядом: диспансер, больница, кризисная служба региона" value={plan.places} onChange={places=>setPlan({...plan,places})} max={4}/>
   <p className="small muted" style={{marginTop:10}}>112, 103 и детский телефон доверия 8-800-2000-122 в плане уже есть.</p></section>
  <section className="card"><h2>4. Безопасный дом</h2><ListEditor label="Что сделали" hint="Ограничить доступ к средствам — одно из самых действенных простых действий." value={plan.home} onChange={setList('home')} suggest={suggestions.home} placeholder="Своё"/></section>
  <section className="card"><h2>5. Что для меня важно</h2><ListEditor label="Ради чего жить, что держит" hint="Пишет сам подросток — если хочет." value={plan.reasons} onChange={setList('reasons')} placeholder="Например: собака, концерт в мае, младшая сестра"/></section>
  <div className="buttonRow"><button className="btn" onClick={save}>Сохранить план</button><button className="btn secondary" onClick={()=>{setPlan(getPlan(child.id));setEditing(false);}}>Отмена</button></div>
  </div></div>;
 const Section=({title,items}:{title:string;items:string[]})=>items.length?<section className="card"><h2>{title}</h2><ul>{items.map(x=><li key={x}>{x}</li>)}</ul></section>:null;
 const Phones=({title,items}:{title:string;items:Contact[]})=>items.some(c=>c.name||c.phone)?<section className="card"><h2>{title}</h2><ul className="plainList">{items.filter(c=>c.name||c.phone).map((c,i)=><li key={i}><span>{c.name||'Телефон'}</span>{c.phone&&<a className="btn secondary compact" href={tel(c.phone)}><Icon name="phone" size={15}/>{c.phone}</a>}</li>)}</ul></section>:null;
 return <div className="container">{header}<ChildSwitcher active={child} manage={false}/>
 <section className="card soft"><h2>Если опасность прямо сейчас</h2><div className="buttonRow" style={{marginTop:12}}><a href="tel:112" className="btn"><Icon name="phone"/>112</a><a href="tel:103" className="btn secondary">Скорая 103</a></div><p style={{marginTop:12}}><a href="tel:88002000122"><strong>8-800-2000-122</strong></a> — детский телефон доверия: бесплатно, круглосуточно, для детей и родителей.</p></section>
 {!filled?<div className="stack" style={{marginTop:14}}><div className="callout"><strong>Зачем писать план заранее</strong><p>В кризис трудно думать. Письменный план — не формальность, а конкретный порядок действий: признаки, что помогает, кому звонить, что убрать из доступа. Его составляют при любом уровне риска — лучше вместе с подростком и врачом.</p></div><button className="btn full" onClick={()=>{const doc=getProfile(child.id).doctors[0];if(doc&&!plan.doctor.name&&!plan.doctor.phone)setPlan({...plan,doctor:{name:[doc.name,doc.role].filter(Boolean).join(', '),phone:doc.phone}});setEditing(true);}}><Icon name="plus" size={17}/>Составить план</button></div>
 :<div className="stack" style={{marginTop:14}}>
  <Section title="Признаки, что становится хуже" items={plan.warning}/>
  <Section title="Что помогает справиться самому" items={plan.coping}/>
  <Section title="Люди и места, которые отвлекают" items={plan.distract}/>
  <Phones title="К кому обратиться" items={plan.people}/>
  <Phones title="Лечащий врач" items={[plan.doctor]}/>
  <Phones title="Куда обратиться рядом" items={plan.places}/>
  <Section title="Безопасность дома" items={plan.home}/>
  {meds.length>0&&<Section title="Лекарства — хранит и выдаёт взрослый" items={meds}/>}
  <Section title="Что для меня важно" items={plan.reasons}/>
  <div className="buttonRow"><button className="btn" onClick={share}><Icon name="share" size={17}/>Отправить</button><button className="btn secondary" onClick={()=>savePdf(text(),'Kora-plan-bezopasnosti.pdf','План безопасности')}><Icon name="download" size={17}/>PDF</button><button className="btn secondary" onClick={()=>setEditing(true)}>Изменить</button></div>
  <p className="small muted">Отправьте план подростку и второму взрослому, чтобы он был под рукой. {plan.updatedAt&&'Обновлён '+new Date(plan.updatedAt).toLocaleDateString('ru-RU')+'.'}</p>
 </div>}
 <div className="sectionHeading"><h2>Что делает семья</h2></div>
 <div className="stack">{familyActions.map(a=><section className="card" key={a.title}><h2>{a.title}</h2><ol>{a.steps.map(s=><li key={s}>{s}</li>)}</ol></section>)}</div>
 <Link className="btn secondary full" style={{marginTop:16}} to="/help">Когда нельзя ждать</Link>
 </div>;
}
