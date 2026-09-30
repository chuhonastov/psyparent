import React,{useEffect} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {medicationById,diagnosisById,dxName,treatmentGuidesForMedication,treatmentRelationLabels} from '../lib/content';
import {useVisit} from '../lib/useVisit';
import {addVisitMedication} from '../lib/visit';
import {toast} from '../lib/toast';
import PageHeader from '../components/PageHeader';
import QuestionButton from '../components/QuestionButton';
import Sources from '../components/Sources';
import Disclosure from '../components/Disclosure';
import Icon from '../components/Icon';
import {trackRecent} from '../lib/recent';
export default function MedicationDetail() {
 const {id=''}=useParams(),location=useLocation(),m=medicationById(id),visit=useVisit();
 useEffect(()=>{if(m)trackRecent('med',m.id);},[m]);
 const from=typeof location.state?.from==='string'&&/^\/(review|medications)(\?|$)/.test(location.state.from)?location.state.from:'/medications';
 if(!m)return <div className="container"><PageHeader title="Препарат не найден" backTo="/medications" backLabel="Справочник"/><Link className="btn" to="/medications">Открыть справочник</Link></div>;
 const added=visit.meds.includes(id);
 const guides=treatmentGuidesForMedication(id);
 return <div className="container"><PageHeader title={m.name} subtitle={m.class} backTo={from} backLabel={from.startsWith('/review')?'К разбору назначения':'Все препараты'}/>
 <div className="stack">
 <section className="card">{m.plainSummary&&<p style={{marginBottom:17}}>{m.plainSummary}</p>}
 {m.noteOnly?<div className="callout">Это общая памятка. Для записи назначения выберите конкретное средство из заключения. <Link to="/review">Найти препарат</Link></div>:<div className="buttonRow"><button className={'btn '+(added?'soft':'')} disabled={added} onClick={()=>{if(addVisitMedication(id))toast('Препарат добавлен в памятку');}}><Icon name={added?'check':'plus'}/>{added?'В памятке':'Записать назначение'}</button><Link className="btn secondary" to={'/review?med='+id}>Разобрать назначение</Link></div>}
 {m.aliases?.length?<p className="small muted" style={{marginTop:13}}>Также ищут как: {m.aliases.join(', ')}.</p>:null}</section>
 {!!m.evidenceNote&&<div className="callout">{m.evidenceNote}</div>}
 {!!m.availabilityNote&&<div className="callout warn">{m.availabilityNote}</div>}
 {!!guides.length&&<Disclosure title={'Разборы по диагнозам · '+guides.length} defaultOpen><p className="small muted">Выберите диагноз из заключения. В каждом разборе обозначено, относится ли связь к лечению, сопутствующей проблеме или ограничениям доказательств.</p><div className="list" style={{marginTop:14}}>{guides.map(g=>{const d=diagnosisById(g.diagnosisId);return d?<Link className="listCard" key={g.diagnosisId} to={'/review?dx='+g.diagnosisId+'&med='+id}><div className="listMain"><span className={'tag '+(['limited','not_recommended'].includes(g.relationKind)?'warm':'')}>{treatmentRelationLabels[g.relationKind]}</span><h3>{dxName(d)}</h3></div><Icon name="arrow" size={16}/></Link>:null;})}</div></Disclosure>}
 <section className="card"><h2>Для каких целей обсуждают</h2><ul>{m.whenDiscussed.map((x,i)=><li key={i}>{x}</li>)}</ul></section>
 <section className="card"><h2>Что отслеживать с врачом</h2><ul>{m.monitoring.map((x,i)=><li key={i}>{x}</li>)}</ul><p className="small muted">Заранее договоритесь, когда оценить результат и как связаться с врачом при ухудшении.</p></section>
 <section className="card"><h2>Что важно знать</h2><ul>{m.warnings.map((x,i)=><li key={i}>{x}</li>)}</ul></section>
 <section className="card soft"><h3>Полезный вопрос на приём</h3><p style={{margin:'9px 0 13px'}}>Какая цель у этого препарата, как оценим эффект и что будем отслеживать?</p><QuestionButton question={(m.noteOnly?'По теме «':'Про препарат «')+m.name+'»: какая цель назначения, как оценим эффект и что будем отслеживать?'}/></section>
 <div className="callout">План лечения согласуйте с врачом. Это краткая памятка: она не перечисляет все противопоказания и взаимодействия. При опасных симптомах не ждите следующего планового приёма. <Link to="/help">Когда нужна срочная помощь</Link></div>
 <Sources items={m.sources} updatedAt={m.updatedAt}/><Link to="/visit" className="btn secondary full"><Icon name="note"/>Открыть памятку</Link>
 </div></div>;
}
