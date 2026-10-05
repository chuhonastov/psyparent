import React,{useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import DraftNotice from '../components/DraftNotice';
import meta from '../content/meta.json';
import {isTelegram} from '../lib/twa';
import {isStandalone} from '../lib/device';
import {copyText} from '../lib/export';
import {useDraft} from '../lib/drafts';
import {track} from '../lib/analytics';
import {toast} from '../lib/toast';
export const FEEDBACK_EMAIL='chuhonastov@yandex.ru';
type State='form'|'sending'|'sent'|'failed';
/** «Написать автору»: the message goes to the author's e-mail through the app's server function and is not stored. */
export default function Feedback(){
 const [message,setMessage]=useState(''),[contact,setContact]=useState(''),[website,setWebsite]=useState(''),[state,setState]=useState<State>('form'),[error,setError]=useState(''),opened=useRef(Date.now());
 const draft=useDraft('feedback',{message,contact},d=>{setMessage(d.message);setContact(d.contact);});
 const platform=isTelegram()?'tg':isStandalone()?'pwa':'web';
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();const text=message.trim();
  if(text.length<5){setError('Напишите хотя бы несколько слов.');return;}
  setError('');setState('sending');
  try{
   const res=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text,contact:contact.trim(),platform,app:meta.appVersion,website,elapsed:Date.now()-opened.current})});
   if(res.ok){draft.clear();setState('sent');track('feedback');return;}
   if(res.status===429){setState('form');setError('Слишком много сообщений подряд. Попробуйте через несколько минут.');return;}
  }catch{}
  setState('failed');
 };
 const header=<PageHeader title="Написать автору" subtitle="Ошибка, неточность в тексте, непонятное место или идея — сообщение прочитает автор, Степан Краснощеков." backTo="/about" backLabel="О проекте"/>;
 if(state==='sent')return <div className="container">{header}<div className="callout" role="status"><strong>Спасибо! Сообщение отправлено</strong><p>{contact.trim()?'Если понадобится, автор ответит по указанному контакту.':'Контакт не указан, поэтому ответа не будет — но сообщение прочитают.'}</p></div><Link className="btn secondary" style={{marginTop:14}} to="/">На главную</Link></div>;
 return <div className="container">{header}
 {state==='failed'&&<div className="callout warn" role="alert" style={{marginBottom:14}}><strong>Не получилось отправить</strong><p>Скопируйте текст и отправьте его на почту <strong>{FEEDBACK_EMAIL}</strong>.</p><div className="buttonRow" style={{marginTop:10}}><button type="button" className="btn compact" onClick={async()=>{const ok=await copyText(message.trim()+(contact.trim()?'\n\nКак ответить: '+contact.trim():''));toast(ok?'Текст скопирован':'Не удалось скопировать',{variant:ok?'success':'error'});}}><Icon name="copy" size={15}/>Скопировать текст</button><button type="button" className="btn secondary compact" onClick={async()=>{const ok=await copyText(FEEDBACK_EMAIL);toast(ok?'Адрес скопирован':'Не удалось скопировать',{variant:ok?'success':'error'});}}><Icon name="mail" size={15}/>Скопировать адрес</button><a className="btn secondary compact" href={'mailto:'+FEEDBACK_EMAIL+'?subject='+encodeURIComponent('Кора')+'&body='+encodeURIComponent(message.trim())}>Открыть почту</a></div></div>}
 <form className="stack" noValidate onSubmit={submit}>
  {draft.pending&&<DraftNotice at={draft.pending.at} onRestore={draft.restore} onDiscard={draft.discard}/>}
  {error&&<div className="callout danger" role="alert"><p>{error}</p></div>}
  <div className="formField"><label className="fieldLabel" htmlFor="fb-message">Сообщение</label><textarea id="fb-message" maxLength={3000} rows={7} placeholder="Например: на экране «Лента» не открывается запись; в карточке препарата непонятно, что значит…" value={message} onChange={e=>setMessage(e.target.value)}/></div>
  <div className="formField"><label className="fieldLabel" htmlFor="fb-contact">Как вам ответить (необязательно)</label><input className="input" id="fb-contact" maxLength={120} autoComplete="email" placeholder="Почта или имя в Telegram" value={contact} onChange={e=>setContact(e.target.value)}/></div>
  <div className="honeypot" aria-hidden="true"><label htmlFor="fb-website">Сайт</label><input id="fb-website" tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></div>
  <div className="callout"><p className="small">Не пишите имя ребёнка, диагнозы и другие медицинские подробности — для ответа они не нужны. Сообщение уйдёт на почту автора и больше нигде не хранится; контакт нужен только для ответа. Вместе с ним передаётся, где открыта «Кора» (Telegram или браузер) и номер сборки — это помогает разобраться с ошибками.</p></div>
  <button className="btn full" disabled={state==='sending'}>{state==='sending'?'Отправляем…':'Отправить'}</button>
 </form></div>;
}
