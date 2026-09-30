import React from 'react';
import {ticCriteria} from '../lib/ygtss';
import Disclosure from './Disclosure';
import {scaleFields,Screener,Respondent} from '../lib/screeningContent';
export default function ExtraScaleFields({s,respondent,values,setValues,confirmed,setConfirmed}:{s:Screener;respondent:Respondent;values:Record<string,string>;setValues:(v:Record<string,string>)=>void;confirmed:boolean;setConfirmed:(v:boolean)=>void}){
 const fields=scaleFields(s.id,respondent);
 if(!fields.length)return null;
 return <section className="card"><h2>{s.mode==='clinical'?'Оценки специалиста':'Показатели исходного бланка'}</h2>
 <p className="small muted">{s.id==='ygtss'?'Оцените последнюю неделю со специалистом по критериям ниже или перенесите оценки из заполненного бланка. Количество — это балл 0–5 по критериям, а не фактическое число тиков. Нарушение функционирования оценивают отдельно: 0, 10, 20, 30, 40 или 50.':s.id==='vanderbilt'?'Перенесите число отмеченных пунктов, не сумму их оценок. Функционирование: пункты 48–55 у родителя, 36–43 у учителя. Дополнительные разделы необязательны.':'Перенесите значения из уже заполненной формы. Не угадывайте отсутствующие результаты.'}</p>
 {s.id==='ygtss'&&<Disclosure title="Все критерии YGTSS-R">{ticCriteria.map((c,i)=><section key={i} style={{marginBottom:20}}><h3>{['Количество','Частота','Интенсивность','Сложность','Помехи','Нарушение функционирования'][i]}</h3>{c.map((text,n)=><p className="small" key={n}><strong>{i===5?n*10:n}.</strong> {text}</p>)}</section>)}</Disclosure>}
 <div className="scaleFields">{fields.map(f=><div className="formField" key={f.id}><label className="fieldLabel" htmlFor={'scale-'+f.id}>{f.label}{f.optional?' (необязательно)':''}</label>{s.id==='ygtss'||s.id==='crafft'?<select id={'scale-'+f.id} value={values[f.id]||''} onChange={e=>setValues({...values,[f.id]:e.target.value})}><option value="">Выберите балл</option>{Array.from({length:f.max/(f.step||1)+1},(_,i)=>i*(f.step||1)).map(v=><option key={v} value={v}>{v}</option>)}</select>:<input className="input" id={'scale-'+f.id} type="number" inputMode="numeric" min={f.min||0} max={f.max} step={f.step||1} value={values[f.id]||''} onChange={e=>setValues({...values,[f.id]:e.target.value})}/>}{s.id==='ygtss'&&values[f.id]!==undefined&&values[f.id]!==''&&<p className="clinicalAnchor">{ticCriteria[f.id==='impairment'?5:Number(f.id.slice(-1))][Number(values[f.id])/(f.step||1)]}</p>}</div>)}</div>
 {s.mode==='clinical'&&<label className="selectionCheck"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>Баллы выставлены со специалистом по критериям YGTSS-R</span></label>}
 </section>;
}
