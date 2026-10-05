import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import {ContactsEditor,ListEditor} from '../components/ListEditor';
import {useActiveChild} from '../lib/useRoute';
import {getProfile} from '../lib/profile';
import {diagnosisById,dxName} from '../lib/content';
import {ageLabel} from '../lib/children';
import {formatPassport,getPassport,passportDoc,passportFilled,savePassport,sectionInfo,SECTIONS,subscribePassport,suggestionsFor,Passport as PassportData} from '../lib/passport';
import {copyText,shareText} from '../lib/export';
import {shareToTelegram} from '../lib/twa';
import {saveDoc} from '../lib/files';
import {useUnsaved} from '../lib/unsaved';
import {toast} from '../lib/toast';
/** «Паспорт для школы»: one page about the child for a teacher, a tutor or a coach. */
export default function Passport(){
 const child=useActiveChild(),[p,setP]=useState<PassportData|null>(()=>child?getPassport(child.id,child.label):null),[editing,setEditing]=useState(()=>!!child&&!passportFilled(getPassport(child.id,child.label)));
 useEffect(()=>{if(!child)return;setP(getPassport(child.id,child.label));return subscribePassport(()=>setP(getPassport(child.id,child.label)));},[child?.id]);
 const stored=child?passportFilled(getPassport(child.id,child.label)):false;
 useUnsaved(editing&&(stored||(!!p&&passportFilled(p))));
 if(!child||!p)return <div className="container"><PageHeader title="Паспорт для школы" backTo="/child" backLabel="Ребёнок"/><div className="emptyState"><h3>Сначала добавьте ребёнка</h3><Link className="btn" to="/child">Добавить ребёнка</Link></div></div>;
 const profile=getProfile(child.id),dx=profile.diagnoses.map(diagnosisById).filter((x):x is NonNullable<typeof x>=>!!x).map(dxName),suggest=suggestionsFor(profile.diagnoses);
 const header=<PageHeader title="Паспорт для школы" subtitle="Одна страница о ребёнке для учителя, тьютора, тренера или вожатого: что получается, что трудно, что помогает и что делать в трудную минуту." eyebrow={child.label+', '+ageLabel(child)} backTo="/child" backLabel="Ребёнок"/>;
 const save=()=>{if(savePassport(child.id,p)){toast('Паспорт сохранён');setEditing(false);window.scrollTo(0,0);}else toast('Не удалось сохранить',{variant:'error'});};
 const text=()=>formatPassport(p,dx);
 const share=async()=>{const t=text();if(await shareText(t,'Паспорт для школы')!=='unavailable'||shareToTelegram(t))return;const ok=await copyText(t);toast(ok?'Текст скопирован':'Не удалось отправить',{variant:ok?'info':'error'});};
 if(editing||!stored)return <div className="container">{header}<ChildSwitcher active={child} manage={false}/>
  {!stored&&<div className="callout" style={{marginBottom:14}}><strong>Зачем это нужно</strong><p>Новому учителю или тренеру трудно сразу понять, что за поведением ребёнка стоит трудность, а не вредность. Короткая страница от родителей помогает начать с понимания. Диагноз указывать не обязательно — важнее, что помогает.</p></div>}
  <div className="stack">
   <section className="card"><div className="formField"><label className="fieldLabel" htmlFor="pp-name">Как обращаться к ребёнку</label><input className="input" id="pp-name" maxLength={40} value={p.name} onChange={e=>setP({...p,name:e.target.value})}/></div>
    {dx.length>0&&<label className="selectionCheck" style={{marginTop:6}}><input type="checkbox" checked={p.showDiagnosis} onChange={e=>setP({...p,showDiagnosis:e.target.checked})}/><span>Указать диагноз ({dx.join(', ')})<span className="small muted"> — по умолчанию не указывается: решите сами, нужно ли это школе</span></span></label>}
   </section>
   {SECTIONS.map(s=><section className="card" key={s}><ListEditor label={sectionInfo[s].title} hint={sectionInfo[s].hint} value={p.lists[s]} onChange={v=>setP({...p,lists:{...p.lists,[s]:v}})} suggest={suggest[s]} placeholder={sectionInfo[s].placeholder}/></section>)}
   <section className="card"><div className="formField"><label className="fieldLabel" htmlFor="pp-important">Важно знать (необязательно)</label><textarea id="pp-important" maxLength={600} placeholder="Например: аллергия на орехи; в пятницу забирает бабушка" value={p.important} onChange={e=>setP({...p,important:e.target.value})}/></div>
    <ContactsEditor label="Связаться с родителями" value={p.contacts} onChange={contacts=>setP({...p,contacts})} max={3}/></section>
   <div className="buttonRow"><button className="btn" onClick={save}>Сохранить паспорт</button>{stored&&<button className="btn secondary" onClick={()=>{setP(getPassport(child.id,child.label));setEditing(false);}}>Отмена</button>}</div>
  </div></div>;
 return <div className="container">{header}<ChildSwitcher active={child} manage={false}/>
  <div className="stack">
   <section className="card passportView"><h2>{p.name}</h2>{p.showDiagnosis&&dx.length>0&&<p className="small muted">Диагноз по заключению: {dx.join(', ')}</p>}
    {SECTIONS.filter(s=>p.lists[s].length).map(s=><div key={s} className={'passportPart '+s}><h3>{sectionInfo[s].title}</h3><ul>{p.lists[s].map(x=><li key={x}>{x}</li>)}</ul></div>)}
    {p.important&&<div className="passportPart"><h3>Важно знать</h3><p>{p.important}</p></div>}
    {p.contacts.some(c=>c.name||c.phone)&&<div className="passportPart"><h3>Связаться с родителями</h3><ul>{p.contacts.filter(c=>c.name||c.phone).map((c,i)=><li key={i}>{[c.name,c.phone].filter(Boolean).join(' — ')}</li>)}</ul></div>}
   </section>
   <div className="buttonRow"><button className="btn" onClick={share}><Icon name="share" size={17}/>Отправить</button><button className="btn secondary" onClick={()=>saveDoc(passportDoc(p,dx),'Kora-pasport.pdf')}><Icon name="download" size={17}/>PDF</button><button className="btn secondary" onClick={()=>setEditing(true)}><Icon name="edit" size={16}/>Изменить</button></div>
   <p className="small muted">Отправьте учителю или распечатайте. Паспорт хранится на вашем устройстве и входит в резервную копию. {p.updatedAt&&'Обновлён '+new Date(p.updatedAt).toLocaleDateString('ru-RU')+'.'} Что школа может сделать по закону — <Link to="/navigator/topic/school">в навигаторе</Link>.</p>
  </div></div>;
}
