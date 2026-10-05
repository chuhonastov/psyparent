import React from 'react';
import {NavLink,useLocation} from 'react-router-dom';
import Icon,{IconName} from './Icon';
import {useVisitCount} from '../lib/useVisitCount';
// Five main sections: today's route, the child, the reference, tests and diaries, the visit.
const LIBRARY=['/library','/navigator','/diagnoses','/medications','/review','/exams','/specialists','/methods','/glossary','/doctors'];
export default function BottomNav() {
 const count=useVisitCount(),path=useLocation().pathname;
 const items:{to:string;label:string;icon:IconName;active?:boolean}[]=[
 {to:'/',label:'Сегодня',icon:'home'},
 {to:'/child',label:'Ребёнок',icon:'user',active:path.startsWith('/children')},
 {to:'/library',label:'Справочник',icon:'book',active:LIBRARY.some(p=>path.startsWith(p))},
 {to:'/screenings',label:'Тесты',icon:'check',active:path.startsWith('/forms')},
 {to:'/visit',label:'К врачу',icon:'note'}];
 return <nav className="bottomNav" aria-label="Основная навигация"><div className="bottomNavInner">
 {items.map(i=><NavLink end={i.to==='/'} key={i.to} to={i.to} className={({isActive})=>'navBtn '+(isActive||i.active?'active':'')}><span className="navIcon"><Icon name={i.icon}/>{i.to==='/visit'&&count>0&&<span className="navBadge" aria-label={'Записей: '+count}>{count>9?'9+':count}</span>}</span><span>{i.label}</span></NavLink>)}
 </div></nav>;
}
