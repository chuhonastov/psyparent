import React from 'react';
import {Link} from 'react-router-dom';
import {useChildren} from '../lib/useChildren';
import {setActiveChild} from '../lib/profile';
import {confirmLeave} from '../lib/unsaved';
import type {Child} from '../lib/children';
/** Chips to switch the route between children; hidden for a single child. */
export default function ChildSwitcher({active,manage=true}:{active:Child|null;manage?:boolean}){
 const children=useChildren();
 if(children.length<2&&!manage)return null;
 return <div className="pickChips childSwitcher" role="group" aria-label="Ребёнок">
  {children.length>1&&children.map(c=><button type="button" key={c.id} className="pickChip" aria-pressed={active?.id===c.id} onClick={()=>{if(c.id!==active?.id&&confirmLeave())setActiveChild(c.id);}}>{c.label}</button>)}
  {manage&&<Link className="pickChip ghost" to="/children">{children.length>1?'Профили':'Добавить ещё ребёнка'}</Link>}
 </div>;
}
