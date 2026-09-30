import React from 'react';
import {NavLink,useLocation} from 'react-router-dom';
import Icon,{IconName} from './Icon';
import {useVisit} from '../lib/useVisit';
import {useJournals} from '../lib/useJournals';
import {useScreenings} from '../lib/useScreenings';
export default function BottomNav() {
 const v=useVisit(),results=useScreenings(),journals=useJournals(),path=useLocation().pathname;
 const count=v.questions.length+v.meds.length+Object.keys(v.checklists).length+results.filter(r=>r.includeInVisit).length+journals.filter(r=>r.includeInVisit).length;
 const items:{to:string;label:string;icon:IconName;active?:boolean}[]=[
 {to:'/',label:'Главная',icon:'home'},
 {to:'/diagnoses',label:'Диагнозы',icon:'book'},
 {to:'/medications',label:'Помощь',icon:'heart',active:path.startsWith('/review')||path.startsWith('/specialists')},
 {to:'/screenings',label:'Тесты',icon:'check',active:path.startsWith('/forms')},
 {to:'/visit',label:'К врачу',icon:'note'}];
 return <nav className="bottomNav" aria-label="Основная навигация"><div className="bottomNavInner">
 {items.map(i=><NavLink end={i.to==='/'} key={i.to} to={i.to} className={({isActive})=>'navBtn '+(isActive||i.active?'active':'')}><span className="navIcon"><Icon name={i.icon}/>{i.to==='/visit'&&count>0&&<span className="navBadge" aria-label={'Записей: '+count}>{count>9?'9+':count}</span>}</span><span>{i.label}</span></NavLink>)}
 </div></nav>;
}
