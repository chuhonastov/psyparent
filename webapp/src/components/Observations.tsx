import React,{useState} from 'react';
import {writeJSON} from '../lib/persist';
import {readObservationAnswers,observationKey,Answers} from '../lib/observations';
import {upsertChecklist} from '../lib/visit';
import {toast} from '../lib/toast';
import type {Observation} from '../lib/content';
import Icon from './Icon';
const labels={yes:'Да',no:'Нет',unsure:'Не знаю'};
export default function Observations({dxId,title,items}:{dxId:string;title:string;items:Observation[]}) {
 const key=observationKey(dxId);
 const [initial]=useState(()=>readObservationAnswers(dxId,items));
 const [answers,setAnswers]=useState<Answers>(initial.answers);
 const count=items.filter(i=>answers[i.id]).length;
 const set=(id:string,answer:Answers[string])=>{const next={...answers,[id]:answer};setAnswers(next);writeJSON(key,next);};
 const save=()=>{
 const lines=items.filter(i=>answers[i.id]).map(i=>i.text+' — '+labels[answers[i.id]]);
 if(upsertChecklist(dxId,title,lines))toast('Наблюдения обновлены в памятке',{variant:'success'});
 };
 return <div className="observations"><p className="muted small">Отметьте, что вы наблюдаете или уже обсудили с врачом. Ответ «Не знаю» — полезный повод задать вопрос врачу. По этим ответам приложение не определяет диагноз.</p>
 {initial.migrated&&<p className="small muted">Старые выбранные пункты перенесены как «Да». Неотмеченные оставлены без ответа.</p>}
 {items.map((item,i)=><fieldset className="observation" key={item.id}><legend><span className="stepNumber">{i+1}</span>{item.text}</legend><div className="answerOptions">{(Object.keys(labels) as (keyof typeof labels)[]).map(answer=><label className={'answer '+(answers[item.id]===answer?'selected':'')} key={answer}><input type="radio" name={dxId+item.id} value={answer} checked={answers[item.id]===answer} onChange={()=>set(item.id,answer)}/>{labels[answer]}</label>)}</div></fieldset>)}
 <button className="btn full" type="button" disabled={!count} onClick={save}><Icon name="note"/>Сохранить наблюдения</button><p className="small muted">Повторное сохранение обновит эту запись в разделе «К врачу».</p></div>;
}
