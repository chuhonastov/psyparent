import React from 'react';
import {Link} from 'react-router-dom';
import {useChildren} from '../lib/useChildren';
import {ageLabel,childAge,Child} from '../lib/children';

// One tap fills the child's nickname and age on the given date in a test or diary form.
export default function ChildQuickFill({unit='years',date,current,onPick}:{unit?:'years'|'months';date?:string;current:string;onPick:(label:string,age:number)=>void}){
 const children=useChildren();
 const fill=(c:Child)=>{const a=childAge(c,date);onPick(c.label,unit==='months'?a.months:a.years);};
 if(!children.length)return <p className="small muted childHint"><Link to="/children">Добавьте профиль ребёнка</Link> — имя и возраст будут подставляться сами.</p>;
 return <div className="childPick"><p className="small muted pickHint">Для кого:</p><div className="pickChips">{children.map(c=><button type="button" className="pickChip" key={c.id} aria-pressed={current.trim()===c.label} onClick={()=>fill(c)}>{c.label} · {ageLabel(c,date)}</button>)}</div></div>;
}
