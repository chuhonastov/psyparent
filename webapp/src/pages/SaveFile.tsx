import React,{useEffect,useRef,useState} from 'react';
import Icon from '../components/Icon';
import {downloadNow,readSaveLink,SaveRequest} from '../lib/files';
/**
 * Opened from Telegram in the phone's browser: the file travels in the link after «#», which browsers never send
 * to a server. The page makes the file here, offers to save it and removes the data from the address bar.
 */
export default function SaveFile(){
 const [req]=useState<SaveRequest|null>(()=>readSaveLink(window.location.hash.slice(1))),[state,setState]=useState<'ready'|'saving'|'saved'|'failed'>('ready'),tried=useRef(false);
 const save=async()=>{setState('saving');try{await downloadNow(req!);setState('saved');}catch{setState('failed');}};
 useEffect(()=>{
  try{window.history.replaceState(null,'',window.location.pathname);}catch{}
  if(req&&!tried.current){tried.current=true;save();}
 },[]);
 if(!req)return <div className="container teacherPage"><h1>Файл не открылся</h1><p style={{marginTop:12}}>Ссылка неполная или устарела. Вернитесь в «Кору» и нажмите «Скачать» ещё раз.</p></div>;
 return <div className="container teacherPage"><div className="brandRow"><span className="brand"><span className="brandMark"><Icon name="leaf" size={22}/></span>Кора</span></div>
  <section className="card"><h1 style={{fontSize:'1.5rem'}}>{state==='saved'?'Файл сохранён':'Файл готов'}</h1><p style={{marginTop:8}}><strong>{req.name}</strong></p>
   <p className="small muted" style={{marginTop:8}}>{state==='saved'?'Найдите его в загрузках телефона. Если загрузка не началась, нажмите кнопку ещё раз.':state==='failed'?'Не получилось сохранить автоматически. Нажмите кнопку.':'Сейчас начнётся загрузка.'}</p>
   <button type="button" className="btn full" style={{marginTop:14}} disabled={state==='saving'} onClick={save}><Icon name="download" size={18}/>{state==='saved'?'Скачать ещё раз':'Скачать'}</button></section>
  <p className="small muted" style={{marginTop:14}}>Записи пришли из Telegram прямо в этот браузер внутри ссылки и не отправлялись на сервер. Эта страница ничего не хранит. Можно закрыть её и вернуться в Telegram.</p>
 </div>;
}
