import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useChildren} from '../lib/useChildren';
import {ageLabel,birthLabel,screeningsLink,localMonth,MAX_CHILDREN,removeChild,saveChild,validateChild,Child} from '../lib/children';
import {toast} from '../lib/toast';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';

export default function Children(){
 const children=useChildren(),[editing,setEditing]=useState<string|null>(children.length?null:'new'),addRef=useRef<HTMLButtonElement>(null),closed=useRef(false);
 // After a form closes, keep focus on the page instead of letting it fall back to the document start.
 useEffect(()=>{if(editing===null&&closed.current){closed.current=false;(addRef.current||document.getElementById('main'))?.focus();}},[editing]);
 const done=()=>{closed.current=true;setEditing(null);};
 return <div className="container"><PageHeader title="Мои дети" subtitle="Условное имя и месяц рождения — чтобы тесты и дневники сами подставляли возраст." backTo="/visit" backLabel="К врачу"/>
 <div className="stack">
 {children.map(c=>editing===c.id?<ChildForm key={c.id} child={c} onDone={done}/>:<section className="card childCard" key={c.id}>
  <div className="childCardTop"><span className="childAvatar" aria-hidden="true">{c.label.slice(0,1).toUpperCase()}</span><div><h2>{c.label}</h2><p className="small muted">{ageLabel(c)} · месяц рождения: {birthLabel(c)}</p></div></div>
  <div className="buttonRow" style={{marginTop:14}}><Link className="btn compact" to={screeningsLink(c)}>Тесты<Icon name="arrow" size={15}/></Link><Link className="btn secondary compact" to={'/forms/history?child='+encodeURIComponent(c.label)}>Дневники</Link></div>
  <div className="buttonRow" style={{marginTop:6}}><button type="button" className="textButton" onClick={()=>setEditing(c.id)}>Изменить</button><button type="button" className="textButton danger" onClick={()=>{if(window.confirm('Удалить профиль «'+c.label+'»? Результаты тестов и дневники останутся.')&&removeChild(c.id))toast('Профиль удалён');}}>Удалить профиль</button></div>
 </section>)}
 {editing==='new'?<ChildForm onDone={done} first={!children.length}/>:children.length<MAX_CHILDREN&&<button type="button" ref={addRef} className="btn secondary full" onClick={()=>setEditing('new')}><Icon name="plus" size={17}/>Добавить ребёнка</button>}
 <div className="privacyNote"><Icon name="shield" size={16}/><span>Фамилия и точная дата рождения не нужны. Профили хранятся только в этом браузере и попадают в резервную копию. Если переименовать профиль, прежние записи останутся под старым именем.</span></div>
 </div></div>;
}
function ChildForm({child,onDone,first}:{child?:Child;onDone:()=>void;first?:boolean}){
 const [label,setLabel]=useState(child?.label||''),[birth,setBirth]=useState(child?.birth||''),[errors,setErrors]=useState<string[]>([]),errorRef=useRef<HTMLDivElement>(null);
 const submit=(e:React.FormEvent)=>{e.preventDefault();const issues=validateChild({label,birth});setErrors(issues);if(issues.length){requestAnimationFrame(()=>errorRef.current?.focus());return;}
  if(saveChild({id:child?.id,label,birth})){toast(child?'Профиль обновлён':'Профиль добавлен');onDone();}else toast('Не удалось сохранить профиль',{variant:'error'});};
 return <form className="card" noValidate onSubmit={submit}><h2 style={{marginBottom:16}}>{child?'Изменить профиль':first?'Добавьте ребёнка':'Новый профиль'}</h2>
  {errors.length>0&&<div className="callout danger" role="alert" tabIndex={-1} ref={errorRef} style={{marginBottom:14}}>{errors.map(x=><p key={x}>{x}</p>)}</div>}
  <div className="formField"><label className="fieldLabel" htmlFor="child-label">Как обозначить</label><input className="input" id="child-label" value={label} maxLength={30} autoComplete="off" placeholder="Например: Маша или старший" onChange={e=>setLabel(e.target.value)}/></div>
  <div className="formField"><label className="fieldLabel" htmlFor="child-birth">Месяц и год рождения</label><input className="input" id="child-birth" type="month" max={localMonth()} value={birth} onChange={e=>setBirth(e.target.value)}/><p className="small muted">Возраст считается по месяцу и может отличаться на месяц — в формах его можно поправить.</p></div>
  <div className="buttonRow"><button className="btn">{child?'Сохранить':'Добавить'}</button>{!first&&<button type="button" className="btn secondary" onClick={onDone}>Отмена</button>}</div>
 </form>;
}
