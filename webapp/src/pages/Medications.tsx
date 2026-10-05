import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {medications,medicationCategories} from '../lib/content';
import {matchesQuery} from '../lib/search';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
export default function Medications() {
 const [params,setParams]=useSearchParams(),q=params.get('q')||'',category=params.get('category')||'';
 const set=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const validCategory=medicationCategories.some(c=>c.id===category)?category:'';
 const items=medications.filter(m=>(!validCategory||m.category===validCategory)&&matchesQuery(q,[m.name,...(m.aliases||[]),...(m.searchTerms||[])],m.class)).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const from='/medications'+(params.toString()?'?'+params.toString():'');
 return <div className="container"><PageHeader title="Разобраться в лечении" subtitle="У каждого назначения должна быть понятная цель." backTo="/library" backLabel="Справочник"/>
 <Link to="/review" className="actionCard primary"><span className="actionIcon"><Icon name="pill" size={23}/></span><div className="actionMain"><h3>Разобрать своё назначение</h3><p>Выберите диагноз и препарат, затем сохраните вопросы врачу</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/specialists" className="actionCard" style={{marginTop:14}}><span className="actionIcon"><Icon name="heart" size={23}/></span><div className="actionMain"><h3>Специалисты и занятия</h3><p>Психотерапия, речь, обучение и бытовые навыки: цели, польза и ограничения</p></div><Icon name="arrow" size={18}/></Link>
 <div className="callout" style={{marginTop:14}}><strong>План по вашей ситуации</strong><p>Немедикаментозная помощь и варианты лечения собраны в <Link to="/diagnoses">карточке диагноза</Link>, в разделе «Помощь».</p></div>
 <div className="sectionHeading"><h2>Препараты и памятки</h2></div>
 <div className="searchWrap"><Icon name="search"/><input className="input" type="search" aria-label="Поиск препарата" placeholder="Велаксин или венлафаксин" value={q} onChange={e=>set('q',e.target.value)}/>{q&&<button className="clearSearch" aria-label="Очистить поиск" onClick={()=>set('q','')}><Icon name="close" size={17}/></button>}</div>
 <label className="fieldLabel filterLabel" htmlFor="medication-category">Группа препаратов</label><select id="medication-category" value={validCategory} onChange={e=>set('category',e.target.value)}><option value="">Все группы</option>{medicationCategories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
 <p className="searchMeta" role="status">{q||validCategory?'Найдено: '+items.length:'Карточек: '+medications.length+' · по алфавиту'}</p>
 {items.length?<div className="list">{items.map(m=><Link className="listCard" key={m.id} state={{from}} to={'/medications/'+m.id}><div className="listMain">{m.noteOnly&&<span className="tag warm">Памятка</span>}<h3>{m.name}</h3><p>{q&&m.aliases?.some(a=>matchesQuery(q,[a]))?m.aliases.join(' · '):m.class}</p></div><Icon name="arrow" size={17}/></Link>)}</div>:<div className="emptyState"><Icon name="search" size={28}/><h3>Такой карточки пока нет</h3><p>{validCategory?'Попробуйте поиск во всех группах или другое название.':'Попробуйте действующее вещество с упаковки. Если препарата нет в справочнике, это ничего не говорит о его пользе.'}</p>{validCategory&&<button className="btn secondary" onClick={()=>set('category','')}>Искать во всех группах</button>}<Link className="btn secondary" to="/visit">Записать вопрос врачу</Link></div>}
 </div>;
}
