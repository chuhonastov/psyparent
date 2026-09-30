import React,{useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import {clinic,clinicLabel,doctorById,bookingFor,initials,photoUrl,branchById,doctorCities,clinicCities,filterDoctors,Doctor} from '../lib/clinic';
import {diagnosisById,dxName} from '../lib/content';
import {trackRecent} from '../lib/recent';
import {count} from '../lib/plural';
const Book=({d,full}:{d?:Doctor;full?:boolean})=><a className={'btn'+(full?' full':'')} href={bookingFor(d)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={17}/>{d?'Записаться к врачу':'Записаться на сайте клиники'}<Icon name="external" size={15}/></a>;
function Photo({d,large}:{d:Doctor;large?:boolean}){
 const [failed,setFailed]=useState(false),src=photoUrl(d);
 return src&&!failed?<img className={'doctorPhoto'+(large?' large':'')} src={src} alt={large?d.name:''} loading="lazy" onError={()=>setFailed(true)}/>:<span className={'doctorPhoto initials'+(large?' large':'')} aria-hidden="true">{initials(d.name)}</span>;
}
function DoctorCard({d}:{d:Doctor}){
 const cities=doctorCities(d);
 return <Link className="doctorCard" to={'/doctors/'+d.id}><Photo d={d}/>
  <div className="listMain"><h3>{d.name}</h3><p>{d.role}</p><p className="small muted">{[d.ages,cities.join(', '),d.online?'есть онлайн':''].filter(Boolean).join(' · ')}</p>{d.bookingNote&&/ожидани/i.test(d.bookingNote)&&<span className="tag warm">{d.bookingNote.match(/(лист ожидания|ожидание)[^.]*/i)?.[0]}</span>}</div><Icon name="arrow" size={17}/></Link>;
}
export default function Doctors(){
 const [params,setParams]=useSearchParams(),city=params.get('city')||'',ageText=params.get('age')||'',online=params.get('online')==='1';
 const set=(k:string,v:string)=>{const n=new URLSearchParams(params);v?n.set(k,v):n.delete(k);setParams(n,{replace:true});};
 const age=ageText!==''&&Number.isFinite(Number(ageText))?Number(ageText):undefined;
 const list=filterDoctors(clinic.doctors,{city:city||undefined,age,online}),cities=clinicCities();
 return <div className="container"><PageHeader title="Врачи клиники" subtitle={clinicLabel()+' — детские и подростковые специалисты. Запись на сайте клиники.'} backTo="/" backLabel="Главная"/>
 <div className="stack">
 {clinic.doctors.length>0&&<section className="card doctorFilters">
  {cities.length>1&&<div className="chipRow" role="group" aria-label="Город">{['',...cities].map(c=><button type="button" key={c||'all'} className={'chip'+(city===c?' active':'')} aria-pressed={city===c} onClick={()=>set('city',c)}>{c||'Все города'}</button>)}</div>}
  <div className="doctorFilterRow"><label className="fieldLabel" htmlFor="doc-age">Возраст ребёнка</label><input id="doc-age" className="input" type="number" inputMode="numeric" min="0" max="17" placeholder="лет" value={ageText} onChange={e=>set('age',e.target.value)}/>
  <label className="selectionCheck"><input type="checkbox" checked={online} onChange={e=>set('online',e.target.checked?'1':'')}/><span>Принимает онлайн</span></label></div>
 </section>}
 {clinic.doctors.length?<>
  <p className="searchMeta" role="status">{list.length?count(list.length,'специалист','специалиста','специалистов'):'Никого не нашлось — измените фильтры'}</p>
  <div className="list">{list.map(d=><DoctorCard key={d.id} d={d}/>)}</div>
  {clinic.updatedAt&&<p className="small muted">Данные с сайта клиники от {new Date(clinic.updatedAt+'T12:00:00').toLocaleDateString('ru-RU')}. Цены, свободное время и актуальное расписание — на сайте.</p>}</>
 :<div className="emptyState"><Icon name="user" size={27}/><h3>Список врачей скоро появится</h3><p>Пока выбрать врача и записаться можно на сайте клиники.</p><Book/></div>}
 {!!clinic.branches?.length&&<section className="card"><h2>Филиалы</h2><div className="branchList">{clinic.branches.map(b=><div key={b.id}><strong>{b.city}</strong><p className="small">{b.address}</p>{b.phone&&<a className="textButton" href={'tel:'+b.phone.replace(/[^+\d]/g,'')}><Icon name="phone" size={14}/> {b.phone}</a>}</div>)}</div></section>}
 <section className="card"><h2>Как подготовиться к первому приёму</h2><ul><li>Запишите, что беспокоит, с каких пор и где это заметно — дома, в саду, в школе.</li><li>Возьмите прошлые заключения, выписки и список лекарств, которые ребёнок принимает или принимал.</li><li>Если проходили тесты в приложении, добавьте результаты в <Link to="/visit">памятку</Link>.</li><li>Спросите врача: «Что вы предполагаете, что собираетесь делать и к какому сроку чего ждать?»</li></ul></section>
 </div></div>;
}
export function DoctorDetail(){
 const {id=''}=useParams(),d=doctorById(id);
 useEffect(()=>{if(d)trackRecent('doc',d.id);},[d]);
 if(!d)return <div className="container"><PageHeader title="Врач не найден" backTo="/doctors" backLabel="Врачи клиники"/><Book/></div>;
 const topics=(d.topics||[]).map(diagnosisById).filter(Boolean),branches=(d.branches||[]).map(branchById).filter(Boolean);
 return <div className="container"><PageHeader title={d.name} subtitle={d.role} backTo="/doctors" backLabel="Врачи клиники"/>
 <div className="stack">
 <section className="card doctorHero"><Photo d={d} large/><div>{d.ages&&<p><strong>{d.ages}</strong></p>}<p className="small muted">{['Очно',d.online?'онлайн':''].filter(Boolean).join(' и ')}</p>{branches.map(b=><p className="small muted" key={b!.id}>{b!.city}: {b!.address}</p>)}</div></section>
 {d.bookingNote&&<div className="callout warn"><p style={{whiteSpace:'pre-line'}}>{d.bookingNote}</p></div>}
 <Book d={d} full/>
 {branches.filter(b=>b!.phone).slice(0,1).map(b=><a key={b!.id} className="btn secondary full" href={'tel:'+b!.phone.replace(/[^+\d]/g,'')}><Icon name="phone" size={17}/>Позвонить в клинику: {b!.phone}</a>)}
 {d.about&&<section className="card"><h2>О враче</h2><p style={{marginTop:10,whiteSpace:'pre-line'}}>{d.about}</p></section>}
 {!!d.specialties?.length&&<section className="card"><h2>Специальности</h2><div className="chipRow" style={{marginTop:12}}>{d.specialties.map(s=><span className="tag" key={s}>{s}</span>)}</div></section>}
 {!!topics.length&&<section className="card"><h2>Темы в справочнике</h2><div className="list" style={{marginTop:12}}>{topics.map(t=><Link className="listCard compact" key={t!.id} to={'/diagnoses/'+t!.id}><div className="listMain"><h3>{dxName(t!)}</h3></div><Icon name="arrow" size={17}/></Link>)}</div></section>}
 <p className="small muted">Сведения взяты с сайта клиники. Перед записью проверьте их на странице врача.</p>
 </div></div>;
}
