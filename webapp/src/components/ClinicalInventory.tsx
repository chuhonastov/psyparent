import React from 'react';
import {ticGroups} from '../lib/ygtss';
import Disclosure from './Disclosure';
export default function ClinicalInventory({selected,onChange}:{selected:string[];onChange:(v:string[])=>void}){
 return <section className="card"><h2>Тики за последнюю неделю</h2><p className="small muted">Необязательный перечень из рабочего бланка. Специалист уточняет, являются ли эти движения и звуки тиками. Число отметок не подставляется автоматически в балл «Количество»; описания отдельных проявлений добавьте в заметку.</p>{ticGroups.map(g=><Disclosure key={g.id} title={g.title}><div className="stack">{g.items.map(item=><label className="selectionCheck" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>onChange(e.target.checked?[...selected,item.id]:selected.filter(x=>x!==item.id))}/><span>{item.label}</span></label>)}</div></Disclosure>)}</section>;
}
