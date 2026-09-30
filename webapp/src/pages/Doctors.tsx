import React,{useEffect} from 'react';
import {Link,useParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import {clinic,clinicLabel,doctorById,bookingFor,initials,Doctor} from '../lib/clinic';
import {diagnosisById,dxName} from '../lib/content';
import {trackRecent} from '../lib/recent';
const Book=({d,full}:{d?:Doctor;full?:boolean})=><a className={'btn'+(full?' full':'')} href={bookingFor(d)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={17}/>Записаться на сайте клиники<Icon name="external" size={15}/></a>;
function DoctorCard({d}:{d:Doctor}){
 return <Link className="doctorCard" to={'/doctors/'+d.id}>
  {d.photo?<img className="doctorPhoto" src={d.photo} alt="" loading="lazy"/>:<span className="doctorPhoto initials" aria-hidden="true">{initials(d.name)}</span>}
  <div className="listMain"><h3>{d.name}</h3><p>{d.role}</p>{d.ages&&<p className="small muted">{d.ages}</p>}{!!d.specialties?.length&&<div className="chipRow">{d.specialties.slice(0,4).map(s=><span className="tag" key={s}>{s}</span>)}</div>}</div><Icon name="arrow" size={17}/></Link>;
}
export default function Doctors(){
 const list=clinic.doctors;
 return <div className="container"><PageHeader title="Врачи клиники" subtitle="Выберите врача и запишитесь на сайте клиники. Приложение не передаёт туда ваши записи." backTo="/" backLabel="Главная"/>
 <div className="stack">
 <section className="card soft"><div className="eyebrow">{clinicLabel()}</div><h2>Запись к специалисту</h2><p style={{marginTop:10}}>{clinic.summary}</p><div style={{marginTop:16}}><Book full/></div><p className="small muted" style={{marginTop:10}}>Запись, цены и свободное время — на сайте клиники. Возьмите с собой памятку к приёму: <Link to="/visit">открыть памятку</Link>.</p></section>
 {list.length?<><div className="sectionHeading"><h2>Специалисты</h2><span className="small muted">{list.length}</span></div><div className="list">{list.map(d=><DoctorCard key={d.id} d={d}/>)}</div>{clinic.updatedAt&&<p className="small muted">Данные с сайта клиники от {new Date(clinic.updatedAt+'T12:00:00').toLocaleDateString('ru-RU')}. Актуальное расписание смотрите на сайте.</p>}</>
 :<div className="emptyState"><Icon name="user" size={27}/><h3>Список врачей скоро появится</h3><p>Пока выбрать врача и записаться можно на сайте клиники.</p></div>}
 <section className="card"><h2>Как подготовиться к первому приёму</h2><ul><li>Запишите, что беспокоит, с каких пор и где это заметно — дома, в саду, в школе.</li><li>Возьмите прошлые заключения, выписки и список лекарств, которые ребёнок принимает или принимал.</li><li>Если проходили тесты в приложении, добавьте результаты в памятку.</li><li>Спросите врача: «Что вы предполагаете, что собираетесь делать и к какому сроку чего ждать?»</li></ul></section>
 </div></div>;
}
export function DoctorDetail(){
 const {id=''}=useParams(),d=doctorById(id);
 useEffect(()=>{if(d)trackRecent('doc',d.id);},[d]);
 if(!d)return <div className="container"><PageHeader title="Врач не найден" backTo="/doctors" backLabel="Врачи клиники"/><Book/></div>;
 const topics=(d.topics||[]).map(diagnosisById).filter(Boolean);
 return <div className="container"><PageHeader title={d.name} subtitle={d.role} backTo="/doctors" backLabel="Врачи клиники"/>
 <div className="stack">
 <section className="card doctorHero">{d.photo?<img className="doctorPhoto large" src={d.photo} alt={d.name}/>:<span className="doctorPhoto large initials" aria-hidden="true">{initials(d.name)}</span>}<div>{d.experience&&<p><strong>{d.experience}</strong></p>}{d.ages&&<p className="small muted">{d.ages}</p>}{!!d.formats?.length&&<p className="small muted">{d.formats.join(' · ')}</p>}</div></section>
 <Book d={d} full/>
 {d.about&&<section className="card"><h2>О враче</h2><p style={{marginTop:10,whiteSpace:'pre-line'}}>{d.about}</p></section>}
 {!!d.specialties?.length&&<section className="card"><h2>С чем работает</h2><div className="chipRow" style={{marginTop:12}}>{d.specialties.map(s=><span className="tag" key={s}>{s}</span>)}</div></section>}
 {!!topics.length&&<section className="card"><h2>Темы в справочнике</h2><div className="list" style={{marginTop:12}}>{topics.map(t=><Link className="listCard compact" key={t!.id} to={'/diagnoses/'+t!.id}><div className="listMain"><h3>{dxName(t!)}</h3></div><Icon name="arrow" size={17}/></Link>)}</div></section>}
 {d.profileUrl&&<a className="textButton" href={d.profileUrl} target="_blank" rel="noopener noreferrer">Страница врача на сайте клиники <Icon name="external" size={13}/></a>}
 </div></div>;
}
