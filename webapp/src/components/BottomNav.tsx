import React from 'react';
import {NavLink,useLocation} from 'react-router-dom';
import Icon,{IconName} from './Icon';
import {useVisitCount} from '../lib/useVisitCount';
import type {Tone} from '../lib/tones';
export default function BottomNav() {
 const count=useVisitCount(),path=useLocation().pathname;
 const items:{to:string;label:string;icon:IconName;tone:Tone;active?:boolean}[]=[
 {to:'/',label:'Главная',icon:'home',tone:'blue'},
 {to:'/diagnoses',label:'Диагнозы',icon:'book',tone:'blue'},
 {to:'/medications',label:'Помощь',icon:'heart',tone:'green',active:path.startsWith('/review')||path.startsWith('/specialists')},
 {to:'/screenings',label:'Тесты',icon:'check',tone:'purple',active:path.startsWith('/forms')},
 {to:'/visit',label:'К врачу',icon:'note',tone:'yellow'}];
 return <nav className="bottomNav" aria-label="Основная навигация"><div className="bottomNavInner">
 {items.map(i=><NavLink end={i.to==='/'} key={i.to} to={i.to} data-tone={i.tone} className={({isActive})=>'navBtn '+(isActive||i.active?'active':'')}><span className="navIcon"><Icon name={i.icon}/>{i.to==='/visit'&&count>0&&<span className="navBadge" aria-label={'Записей: '+count}>{count>9?'9+':count}</span>}</span><span>{i.label}</span></NavLink>)}
 </div></nav>;
}
