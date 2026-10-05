import React,{useState} from 'react';
import Icon from './Icon';
import type {Contact} from '../lib/safety';
// Editable lists with suggestions and phone contacts: the safety plan and the school passport.
export function ListEditor({label,hint,value,onChange,suggest=[],placeholder}:{label:string;hint?:string;value:string[];onChange:(v:string[])=>void;suggest?:string[];placeholder:string}){
 const [text,setText]=useState('');
 const add=(v:string)=>{const t=v.trim();if(t&&!value.includes(t))onChange([...value,t]);setText('');};
 return <fieldset className="plainFieldset safetyField"><legend className="fieldLabel">{label}</legend>{hint&&<p className="small muted">{hint}</p>}
  {value.length>0&&<ul className="plainList">{value.map(v=><li key={v}><span>{v}</span><button type="button" className="iconButton" aria-label={'Убрать «'+v+'»'} onClick={()=>onChange(value.filter(x=>x!==v))}><Icon name="close" size={15}/></button></li>)}</ul>}
  {suggest.filter(s=>!value.includes(s)).length>0&&<div className="pickChips" style={{marginTop:10}}>{suggest.filter(s=>!value.includes(s)).map(s=><button type="button" key={s} className="pickChip" onClick={()=>add(s)}>+ {s}</button>)}</div>}
  <div className="inlineAdd"><input className="input" aria-label={label} maxLength={200} placeholder={placeholder} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add(text);}}}/><button type="button" className="btn secondary compact" disabled={!text.trim()} onClick={()=>add(text)}>Добавить</button></div>
 </fieldset>;
}
export function ContactsEditor({label,value,onChange,max=6}:{label:string;value:Contact[];onChange:(v:Contact[])=>void;max?:number}){
 const set=(i:number,patch:Partial<Contact>)=>onChange(value.map((c,j)=>j===i?{...c,...patch}:c));
 return <fieldset className="plainFieldset safetyField"><legend className="fieldLabel">{label}</legend>
  {value.map((c,i)=><div className="contactRow" key={i}><input className="input" aria-label="Имя" placeholder="Кто это" maxLength={80} value={c.name} onChange={e=>set(i,{name:e.target.value})}/><input className="input" aria-label="Телефон" placeholder="Телефон" inputMode="tel" maxLength={40} value={c.phone} onChange={e=>set(i,{phone:e.target.value})}/><button type="button" className="iconButton" aria-label="Убрать контакт" onClick={()=>onChange(value.filter((_,j)=>j!==i))}><Icon name="close" size={15}/></button></div>)}
  {value.length<max&&<button type="button" className="textButton" onClick={()=>onChange([...value,{name:'',phone:''}])}>+ Добавить контакт</button>}
 </fieldset>;
}

