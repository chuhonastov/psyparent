import React,{useEffect,useId,useMemo,useRef,useState} from 'react';
import {clinicalDiagnoses,diagnosisGroups,dxName,Diagnosis} from '../lib/content';
import {normalizeQuery} from '../lib/search';
import Icon from './Icon';

// Replaces a 60-item native dropdown: search first, frequent topics as chips, sections open one at a time.
// As-you-type: every typed fragment must start some word (short fragments too, unlike the global search).
export function pickMatch(query:string,names:string[],extra=''){const terms=normalizeQuery(query).split(/\s+/).filter(Boolean);if(!terms.length)return true;const words=normalizeQuery(names.join(' ')+' '+extra).split(/\s+/);return terms.every(t=>words.some(w=>w.startsWith(t)));}
const FREQUENT=['adhd','asd','gad','depression','tics_tourette','ocd','enuresis','sleep_disorders','speech_language_disorder','odd'];
export default function DiagnosisPicker({value,onChange,suggested=[],suggestedLabel='Чаще всего это обсуждают при:',label}:{value:string;onChange:(id:string)=>void;suggested?:string[];suggestedLabel?:string;label:string}){
 const [open,setOpen]=useState(!value),[q,setQ]=useState(''),[section,setSection]=useState(''),id=useId();
 // Keep keyboard and screen-reader focus on the picker when it opens or closes (not on first render: no keyboard pop-up on page load).
 const changeRef=useRef<HTMLButtonElement>(null),inputRef=useRef<HTMLInputElement>(null),moved=useRef(false);
 useEffect(()=>{if(!moved.current)return;moved.current=false;(open?inputRef.current:changeRef.current)?.focus();},[open]);
 const toggle=(next:boolean)=>{moved.current=true;setOpen(next);};
 const selected=clinicalDiagnoses.find(d=>d.id===value);
 const results=useMemo(()=>q.trim()?clinicalDiagnoses.filter(d=>pickMatch(q,[d.title,d.shortTitle||'',...(d.aliases||[])])).concat(clinicalDiagnoses.filter(d=>!pickMatch(q,[d.title,d.shortTitle||'',...(d.aliases||[])])&&pickMatch(q,[],d.summary))).slice(0,10):[],[q]);
 const pick=(next:string)=>{onChange(next);toggle(false);setQ('');setSection('');};
 const chip=(d:Diagnosis)=><button type="button" className="pickChip" key={d.id} onClick={()=>pick(d.id)}>{dxName(d)}</button>;
 const quick=[...new Set([...suggested,...FREQUENT])].map(x=>clinicalDiagnoses.find(d=>d.id===x)).filter((d):d is Diagnosis=>!!d).slice(0,suggested.length?Math.max(6,suggested.length):8);
 if(!open)return <div className="reviewChoice"><div><span className="fieldLabel">{label}</span><strong>{selected?dxName(selected):'Не знаю / нет в списке'}</strong></div><button type="button" className="textButton" ref={changeRef} onClick={()=>toggle(true)}>Изменить</button></div>;
 return <div className="picker">
  <label className="fieldLabel" htmlFor={id}>{label}</label>
  <div className="searchWrap"><Icon name="search"/><input id={id} ref={inputRef} type="search" className="input" autoComplete="off" placeholder="Начните вводить: СДВГ, тревога, тики…" value={q} onChange={e=>setQ(e.target.value)}/>{q&&<button type="button" className="clearSearch" aria-label="Очистить" onClick={()=>setQ('')}><Icon name="close" size={16}/></button>}</div>
  {q.trim()?<div className="pickList" role="list">{results.length?results.map(d=><button type="button" role="listitem" className="pickRow" key={d.id} onClick={()=>pick(d.id)}><span>{dxName(d)}</span><Icon name="arrow" size={15}/></button>):<p className="small muted">Ничего не нашлось. Попробуйте другое слово или выберите раздел ниже.</p>}</div>:<>
   <p className="small muted pickHint">{suggested.length?suggestedLabel:'Частые диагнозы'}</p>
   <div className="pickChips">{quick.map(chip)}</div>
   <p className="small muted pickHint">Или откройте раздел</p>
   <div className="pickSections">{diagnosisGroups.map(g=>{const items=clinicalDiagnoses.filter(d=>g.children?.includes(d.id));if(!items.length)return null;const isOpen=section===g.id;return <div key={g.id} className={'pickSection'+(isOpen?' open':'')}>
    <button type="button" className="pickSectionHead" aria-expanded={isOpen} onClick={()=>setSection(isOpen?'':g.id)}><span>{g.title}</span><span className="small muted">{items.length}</span><Icon name="arrow" size={15}/></button>
    {isOpen&&<div className="pickList">{items.map(d=><button type="button" className="pickRow" key={d.id} onClick={()=>pick(d.id)}><span>{dxName(d)}</span><Icon name="arrow" size={15}/></button>)}</div>}
   </div>;})}</div>
  </>}
  <div className="buttonRow" style={{marginTop:12}}><button type="button" className="textButton" onClick={()=>pick('')}>Не знаю / нет в списке</button>{value&&<button type="button" className="textButton" onClick={()=>{toggle(false);setQ('');}}>Отмена</button>}</div>
 </div>;
}
