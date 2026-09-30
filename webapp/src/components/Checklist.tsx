import React,{useState} from 'react';
import {readJSON,writeJSON} from '../lib/persist';
export type ChecklistItem={id:string;text:string};
export default function Checklist({items,storageKey,hint,onSubmit,submitLabel='Сохранить в памятку'}:{items:ChecklistItem[];storageKey:string;hint?:string;onSubmit?:(selected:ChecklistItem[],ids:string[])=>void;submitLabel?:string}) {
 const key='parentguide.checklist.v1:'+storageKey;
 const [checked,setChecked]=useState<string[]>(()=>{const v=readJSON<unknown>(key,[]);return Array.isArray(v)?v.filter((id):id is string=>typeof id==='string'&&items.some(i=>i.id===id)):[];});
 const toggle=(id:string)=>{const next=checked.includes(id)?checked.filter(x=>x!==id):[...checked,id];setChecked(next);writeJSON(key,next);};
 return <div>{hint&&<p className="small muted">{hint}</p>}<div className="checklist">{items.map(item=><label key={item.id} className="checkRow"><input type="checkbox" checked={checked.includes(item.id)} onChange={()=>toggle(item.id)}/><span>{item.text}</span></label>)}</div>
 {onSubmit&&<button className="btn full" disabled={!checked.length} onClick={()=>onSubmit(items.filter(i=>checked.includes(i.id)),checked)}>{submitLabel}</button>}
 <p className="small muted">Выбранные пункты нужны для разговора с врачом. Их количество не подтверждает и не исключает диагноз.</p></div>;
}
