import React,{useMemo,useState} from 'react';
import Icon from './Icon';
import {medications} from '../lib/content';
import {pickMatch} from './DiagnosisPicker';
export type PickedMed={medId?:string;medName?:string;label:string};
/** Medicine for the timeline: the parent's current medicines first, then search; a name that is not in the reference is kept as typed. */
export default function MedicationPicker({value,onChange,quick=[]}:{value:PickedMed|null;onChange:(v:PickedMed|null)=>void;quick?:PickedMed[]}){
 const [q,setQ]=useState('');
 const options=useMemo(()=>q.trim()?medications.filter(m=>!m.noteOnly&&pickMatch(q,[m.name,...(m.aliases||[])])).slice(0,8):[],[q]);
 if(value)return <div className="reviewChoice"><div><span className="fieldLabel">Препарат</span><strong>{value.label}</strong></div><button type="button" className="textButton" onClick={()=>{onChange(null);setQ('');}}>Изменить</button></div>;
 return <div className="picker">
  {quick.length>0&&<><p className="fieldLabel">Препарат</p><div className="pickChips" style={{marginBottom:12}}>{quick.map(m=><button type="button" className="pickChip" key={m.medId||m.medName} onClick={()=>onChange(m)}>{m.label}</button>)}</div></>}
  <label className="fieldLabel" htmlFor="med-search">{quick.length?'Или найдите другой':'Препарат'}</label>
  <div className="searchWrap"><Icon name="search"/><input id="med-search" type="search" className="input" autoComplete="off" placeholder="Название из назначения или с упаковки" value={q} onChange={e=>setQ(e.target.value)}/></div>
  {q.trim()&&<div className="pickList" role="list">
   {options.map(m=><button type="button" role="listitem" className="pickRow" key={m.id} onClick={()=>onChange({medId:m.id,label:m.name})}><span>{m.name}{m.aliases?.length?<span className="small muted"> · {m.aliases.slice(0,2).join(', ')}</span>:null}</span><Icon name="arrow" size={15}/></button>)}
   <button type="button" role="listitem" className="pickRow" onClick={()=>onChange({medName:q.trim().slice(0,80),label:q.trim().slice(0,80)})}><span>Записать как есть: «{q.trim().slice(0,80)}»</span><Icon name="plus" size={15}/></button>
  </div>}
 </div>;
}
