import React from 'react';
import {Link} from 'react-router-dom';
import {ScreeningResult,formatScreening} from '../lib/screenings';
import {screenerById,respondentLabels,impactOptions,sdqFields,scaleFields} from '../lib/screeningContent';
import {copyText,downloadText} from '../lib/export';
import {toast} from '../lib/toast';
import Disclosure from './Disclosure';
import Icon from './Icon';
import Sources from './Sources';
import {ticItemById} from '../lib/ygtss';
import {diagnosisById,dxName} from '../lib/content';
export default function ScreeningResultCard({result:r}:{result:ScreeningResult}){
 const s=screenerById(r.screenerId)!;
 const copy=async()=>{const ok=await copyText(formatScreening(r));toast(ok?'Результат скопирован':'Не удалось скопировать. Попробуйте скачать файл.',{variant:ok?'success':'error'});};
 const nextStep=<div className={'callout '+(r.score.safety?'danger':r.score.status==='priority'||r.score.status==='followup'?'warn':'')} role={r.score.safety?'alert':undefined}><strong>{r.score.safety?'Обратитесь за поддержкой сегодня':'Следующий шаг'}</strong><p>{r.score.next}</p>{r.score.safety&&<Link to="/help" className="btn danger compact" style={{marginTop:10}}>Если нужна срочная помощь</Link>}</div>;
 return <div className="stack screeningResult" data-testid="screening-result">
 {r.score.safety&&nextStep}
 <section className="card soft"><div className="eyebrow">{s.name} · {s.mode==='clinical'?'клиническая оценка':'результат скрининга'}</div><h2>{r.score.label}</h2><p className="screeningScore">{r.score.total}<span> / {r.score.max}</span></p><p>{s.totalLabel||(s.id==='mchat'?'Исходный балл M-CHAT-R':s.id==='sdq'?'Общий балл трудностей':'Сумма ответов')}</p><p className="small muted">{r.childLabel} · {r.age} {s.ageUnit==='months'?'мес.':'лет'} · {new Date(r.completedDate+'T12:00:00').toLocaleDateString('ru-RU')}<br/>{respondentLabels[r.respondent]}</p>
 {s.id==='mchat'&&r.total!>=3&&r.total!<=7&&<p><strong>{r.followUpDone?'После Follow-Up осталось пунктов риска: '+r.followUpScore:'Уточняющее интервью ещё не проведено'}</strong></p>}
 </section>
 {r.score.metrics&&<div className="scoreMetrics">{r.score.metrics.map(m=><div key={m.label}><span className="small muted">{m.label}</span><strong>{m.value.toLocaleString('ru-RU')} <span className="small muted">/ {m.max}</span></strong></div>)}</div>}
 {!r.score.safety&&nextStep}
 <p className="small muted">{s.mode==='clinical'?'Это оценка выраженности, а не диагностика причины тиков.':'Это скрининг, а не диагноз.'} {s.id==='snapiv'?'Показаны суммы и средние без диагностических порогов. Рабочий русский перевод; период наблюдения — последний месяц.':s.mode!=='embedded'?'Баллы внесены вручную; приложение не проверяло исходный бланк.':'Приведены стандартные диапазоны выраженности симптомов; диагноз и безопасность по сумме не определяются.'}</p>
 <Disclosure title={r.answers?'Ответы и сведения для врача':'Сведения для врача'}>
 {r.answers&&<ol>{r.answers.map((value,i)=><li key={i}>{s.questions![i]}<br/><strong>{s.options![value]} · {value}</strong></li>)}</ol>}
 {r.impact!==undefined&&<p>Влияние на жизнь: {impactOptions[r.impact]} (не входит в сумму).</p>}
 {r.subscales&&<ul>{sdqFields.filter(f=>r.subscales![f.id]!==undefined).map(f=><li key={f.id}>{f.label}: {r.subscales![f.id]} / 10</li>)}</ul>}
 {r.ticInventory?.length?<><h3>Отмеченные тики</h3><ul>{r.ticInventory.map(id=><li key={id}>{ticItemById(id)}</li>)}</ul></>:null}
 {r.sourceForm&&<p>Исходный бланк / перевод: {r.sourceForm}</p>}
 {r.clinicianConfirmed&&<p>Оценки выставлены со специалистом. Период: последняя неделя.</p>}
 {r.measurements&&<ul>{scaleFields(r.screenerId,r.respondent).filter(f=>r.measurements![f.id]!==undefined).map(f=><li key={f.id}>{f.label}: {r.measurements![f.id]} / {f.max}</li>)}</ul>}
 {r.notes&&<p style={{whiteSpace:'pre-wrap'}}>Заметка: {r.notes}</p>}
 <p className="small muted">{r.translation}</p><p className="small muted">Версия: {r.instrumentVersion}.</p>
 </Disclosure>
 <div className="buttonRow noPrint"><button className="btn secondary" onClick={copy}><Icon name="copy" size={17}/>Скопировать результат</button><button className="btn secondary" onClick={()=>downloadText(formatScreening(r),'PsyParent-'+s.name.replace(/[^a-z0-9-]/gi,'-')+'-'+r.completedDate+'.txt')}><Icon name="download" size={17}/>Скачать результат .txt</button></div>
 <Disclosure title="Границы этого опросника"><p>{s.limitations}</p><p className="small muted">{s.attribution}</p></Disclosure>
 <div className="topics">{s.related.map(id=><Link key={id} to={'/diagnoses/'+id} className="topic">{diagnosisById(id)?dxName(diagnosisById(id)!):id}</Link>)}</div>
 <Sources items={s.sources}/>
 </div>;
}
