import React from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import {queryAnswers} from '../lib/queries';
// «I want to help with a specific difficulty»: everyday problems in parents' words, each with a calm first step.
const EVERYDAY=['sleep','speech','tantrums','aggression','attention','school','anxiety','mood','tics','enuresis','eating','ocd','learning','gadgets','autism'];
const URGENT=['suicide','selfharm','psychosis'];
export default function Difficulties(){
 const pick=(ids:string[])=>ids.map(id=>queryAnswers.find(a=>a.id===id)).filter((a):a is NonNullable<typeof a>=>!!a);
 return <div className="container"><PageHeader title="Помочь с конкретной трудностью" subtitle="Выберите то, что беспокоит сейчас. Для каждой трудности — первый спокойный шаг и куда смотреть дальше." backTo="/" backLabel="Сегодня"/>
 <div className="callout danger" style={{marginBottom:16}}><strong>Если тревожно прямо сейчас</strong><div className="answerLinks">{pick(URGENT).map(a=><Link key={a.id} className="pickChip" to={a.links[0].to}>{a.title}</Link>)}<Link className="btn danger compact" to="/help">Когда нельзя ждать</Link></div></div>
 <div className="answers">{pick(EVERYDAY).map(a=><div key={a.id} className="answerCard"><h3>{a.title}</h3><p>{a.text}</p><div className="answerLinks">{a.links.map((l,i)=><Link key={l.to} className={i?'pickChip':'btn compact'} to={l.to}>{l.label}</Link>)}</div></div>)}</div>
 <p className="small muted" style={{marginTop:12}}>Не нашли своё? Опишите своими словами в поиске на главной — например, «не слушается» или «боится темноты».</p>
 </div>;
}
