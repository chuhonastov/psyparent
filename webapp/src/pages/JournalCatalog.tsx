import React from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {journalTemplates} from '../lib/journalContent';
import {useJournals} from '../lib/useJournals';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
export default function JournalCatalog(){
 const [params,setParams]=useSearchParams(),location=useLocation(),records=useJournals(),q=params.get('q')||'',domain=params.get('domain')||'';
 const change=(key:string,value:string)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next,{replace:true});};
 const shown=journalTemplates.filter(t=>(!domain||t.domain===domain)&&[t.title,t.summary,t.domain].join(' ').toLocaleLowerCase('ru').includes(q.trim().toLocaleLowerCase('ru')));
 return <div className="container"><PageHeader title="Дневники и формы" subtitle="Короткие записи о том, что меняется и что стоит обсудить со специалистом." eyebrow="Наблюдения семьи"/>
 <nav className="journalTabs" aria-label="Тесты и дневники"><Link to="/screenings">Тесты и шкалы</Link><Link to="/forms" className="active" aria-current="page">Дневники и формы</Link></nav>
 <Link className="screeningHistoryLink" to="/forms/history"><span className="actionIcon"><Icon name="clock"/></span><span><strong>История дневников</strong><span className="small muted">{records.length?'Записей: '+records.length:'Сохранение, сравнение и выбор для врача'}</span></span><Icon name="arrow" size={18}/></Link>
 <div className="card journalIntro"><h2>Выберите одну актуальную задачу</h2><p>Не нужно заполнять всё каждый день. Частоту наблюдений можно согласовать со специалистом. Эти формы не дают диагностического балла; неизвестное можно оставить пустым.</p></div>
 <section className="card" style={{margin:'18px 0'}}><label className="fieldLabel" htmlFor="journal-search">Найти форму</label><input id="journal-search" className="input" type="search" value={q} onChange={e=>change('q',e.target.value)} placeholder="Сон, настроение, занятия…"/><div className="filterChips"><button className={'chip '+(!domain?'active':'')} aria-pressed={!domain} onClick={()=>change('domain','')}>Все задачи</button>{[...new Set(journalTemplates.map(t=>t.domain))].map(d=><button key={d} className={'chip '+(d===domain?'active':'')} aria-pressed={d===domain} onClick={()=>change('domain',d)}>{d}</button>)}</div></section>
 <div className="sectionHeading"><p className="small muted" role="status">Найдено: {shown.length} из {journalTemplates.length}</p>{(q||domain)&&<button className="textButton" onClick={()=>setParams({},{replace:true})}>Сбросить фильтры</button>}</div>
 <div className="screeningGrid">{shown.map(t=><Link className="screeningCard" key={t.id} to={'/forms/'+t.id} state={{from:location.pathname+location.search}}><span className="tag neutral">{t.domain}</span><h2>{t.title}</h2><p className="small muted">{t.summary}</p><div className="screeningCardFoot"><span>{t.cadence}</span><Icon name="arrow" size={16}/></div></Link>)}</div>
 {!shown.length&&<div className="emptyState"><h2>Такой формы пока нет</h2><p>Измените запрос или используйте форму «Жалобы перед консультацией».</p><Link className="btn secondary" to="/forms/complaints">Записать жалобы</Link></div>}
 <Link className="card journalSnapLink" to="/screenings/snapiv"><strong>Нужна структурированная оценка внимания?</strong><span>SNAP-IV · 26 пунктов для родителя или педагога <Icon name="arrow" size={16}/></span></Link>
 <div className="privacyNote"><Icon name="shield" size={16}/><span>Записи хранятся в этом браузере. Они не отправляются врачу автоматически. Выберите нужные записи и скачайте их перед приёмом.</span></div></div>;
}
