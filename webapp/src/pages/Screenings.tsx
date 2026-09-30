import React from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {catalogScreeners as screeners,screeningDomains,screeningModeLabel,matchesScreeningAge} from '../lib/screeningContent';
import {useScreenings} from '../lib/useScreenings';
import {useChildren} from '../lib/useChildren';
import {childAge} from '../lib/children';
import {count} from '../lib/plural';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
export default function Screenings(){
 const results=useScreenings(),children=useChildren(),[params,setParams]=useSearchParams(),location=useLocation();
 const query=params.get('q')||'',domain=params.get('domain')||'',mode=params.get('mode')||'',age=params.get('age')||'',unit=params.get('unit')==='months'?'months':'years';
 const change=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const domains=[...new Set(Object.values(screeningDomains).flat())];
 const validAge=age===''||(Number.isInteger(Number(age))&&Number(age)>=0&&Number(age)<=(unit==='months'?216:18));
 const aliases:Record<string,string>={snapiv:'снап внимание поведение',assq:'ассq асск аутизм',vanderbilt:'вандербильт сдвг',ygtss:'йельская туретт',rcads25:'ркадс тревога депрессия',crafft:'краффт алкоголь наркотики зависимость'};
 const shown=screeners.filter(s=>(!domain||screeningDomains[s.id].includes(domain))&&(!mode||s.mode===mode)&&(!age||(validAge&&matchesScreeningAge(s,Number(age),unit)))&&[s.name,s.title,s.summary,aliases[s.id]||''].join(' ').toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
 const hasFilters=Boolean(query||domain||mode||age);
 return <div className="container"><PageHeader title="Тесты и шкалы" subtitle="Найти подходящий инструмент и сохранить результат для разговора со специалистом." eyebrow="Сначала — возраст и задача"/>
 <nav className="journalTabs" aria-label="Тесты и дневники"><Link to="/screenings" className="active" aria-current="page">Тесты и шкалы</Link><Link to="/forms">Дневники и формы</Link></nav>
 <Link to="/screenings/history" className="screeningHistoryLink"><span className="actionIcon"><Icon name="clock"/></span><span><strong>Мои результаты</strong><span className="small muted">{results.length?'Сохранено: '+results.length:'История появится после сохранения'}</span></span><Icon name="arrow" size={18}/></Link>
 <section className="card screeningFilters" aria-label="Выбор теста"><div className="searchField"><Icon name="search"/><input className="input" type="search" aria-label="Найти тест или сферу" placeholder="Название или трудность" value={query} onChange={e=>change('q',e.target.value)}/></div>
 {children.length>0&&<div className="childPick"><p className="small muted pickHint">Подобрать по возрасту ребёнка:</p><div className="pickChips">{children.map(c=>{const {months,years}=childAge(c),u=years<3?'months':'years',value=String(u==='months'?months:years),on=age===value&&unit===u;return <button type="button" className="pickChip" key={c.id} aria-pressed={on} onClick={()=>{const next=new URLSearchParams(params);if(on)next.delete('age');else{next.set('age',value);u==='months'?next.set('unit','months'):next.delete('unit');}setParams(next,{replace:true});}}>{c.label} · {u==='months'?months+' мес.':count(years,'год','года','лет')}</button>;})}</div></div>}
 <div className="screeningFilterGrid"><div><label className="fieldLabel" htmlFor="filter-age">Возраст ребёнка</label><div className="ageFilter"><input className="input" id="filter-age" type="number" min="0" max={unit==='months'?216:18} step="1" value={age} placeholder="Любой" onChange={e=>change('age',e.target.value)}/><select aria-label="Единица возраста" value={unit} onChange={e=>{const next=new URLSearchParams(params);next.set('unit',e.target.value);next.delete('age');setParams(next,{replace:true});}}><option value="years">лет</option><option value="months">месяцев</option></select></div></div>
 <div><label className="fieldLabel" htmlFor="filter-mode">Как пройти</label><select id="filter-mode" value={mode} onChange={e=>change('mode',e.target.value)}><option value="">Все варианты</option><option value="embedded">В приложении</option><option value="external">Внешняя форма</option><option value="clinical">Со специалистом</option></select></div></div>
 {!validAge&&<p className="small danger" role="alert">Укажите целый возраст: 0–18 лет или 0–216 месяцев.</p>}
 <div className="filterChips" aria-label="Сфера трудностей"><button type="button" className={'chip '+(!domain?'active':'')} aria-pressed={!domain} onClick={()=>change('domain','')}>Все сферы</button>{domains.map(d=><button type="button" key={d} className={'chip '+(d===domain?'active':'')} aria-pressed={d===domain} onClick={()=>change('domain',d)}>{d}</button>)}</div>
 </section>
 <div className="sectionHeading"><p className="small muted" role="status">Найдено: {shown.length} из {screeners.length}</p>{hasFilters&&<button className="textButton" onClick={()=>setParams({},{replace:true})}>Сбросить фильтры</button>}</div>
 {shown.length?<div className="screeningGrid">{shown.map(s=><Link className={'screeningCard '+(s.mode==='clinical'?'clinical':'')} key={s.id} to={'/screenings/'+s.id} state={{from:location.pathname+location.search}}><div className="screeningCardTop"><span className={'tag '+(s.mode==='external'?'neutral':s.mode==='clinical'?'violet':'')}>{screeningModeLabel(s)}</span><Icon name={s.mode==='clinical'?'heart':s.mode==='embedded'?'check':'external'} size={18}/></div><p className="screeningName">{s.name}</p><h2>{s.title}</h2><p className="small muted">{s.summary}</p><div className="screeningCardFoot"><strong>{s.ageLabel}</strong><Icon name="arrow" size={17}/></div>{s.id==='vanderbilt'&&<p className="small muted">Официальный бланк на английском</p>}</Link>)}</div>:<div className="emptyState"><Icon name="search" size={28}/><h2>Подходящего инструмента в каталоге нет</h2><p>Попробуйте другую сферу или сбросьте фильтры. Не проходите шкалу за пределами её возраста; обсудите выбор со специалистом.</p></div>}
 <div className="callout" style={{marginTop:24}}><strong>Скрининг помогает начать разговор</strong><p>Он не ставит диагноз. YGTSS-R оценивает выраженность тиков вместе со специалистом. При беспокойстве обратиться можно без теста.</p></div>
 <div className="privacyNote"><Icon name="shield" size={16}/><span>Записи остаются в этом браузере. На общем устройстве их могут увидеть другие. Обсудите с ребёнком, что сохранять и передавать врачу.</span></div>
 <Link to="/help" className="textButton">Когда нужна срочная помощь</Link></div>;
}
