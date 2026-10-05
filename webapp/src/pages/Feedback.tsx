import React,{useState} from 'react';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import DraftNotice from '../components/DraftNotice';
import meta from '../content/meta.json';
import {openTelegramUrl} from '../lib/twa';
import {copyText} from '../lib/export';
import {useDraft} from '../lib/drafts';
import {toast} from '../lib/toast';
const CHANNEL=(meta as {authorChannel?:string}).authorChannel||'doc_kras',TITLE=(meta as {authorChannelTitle?:string}).authorChannelTitle||'Краснощеков | Детская психиатрия';
/** t.me/<channel>?direct opens the channel's direct messages. */
export const channelMessagesLink='https://t.me/'+CHANNEL+'?direct';
/**
 * «Написать автору»: messages go to the direct messages of the author's Telegram channel.
 * Кора sends nothing itself — it can copy the text written here and open the chat.
 */
export default function Feedback(){
 const [message,setMessage]=useState('');
 const draft=useDraft('feedback',{message},d=>setMessage(d.message));
 const open=async()=>{
  const text=message.trim();
  if(text){const ok=await copyText(text);toast(ok?'Текст скопирован — вставьте его в чат канала':'Не удалось скопировать текст',{variant:ok?'info':'error',durationMs:5000});draft.clear();}
  openTelegramUrl(channelMessagesLink);
 };
 return <div className="container"><PageHeader title="Написать автору" subtitle="Ошибка, неточность в тексте, непонятное место или идея — сообщение прочитает автор, Степан Краснощеков." backTo="/about" backLabel="О проекте"/>
 <div className="stack">
  <section className="card"><h2>В сообщения Telegram-канала</h2>
   <p style={{marginTop:8}}>Сообщения принимает канал автора «{TITLE}». Откроется отдельный чат с каналом: его видят только вы и команда канала, не подписчики.</p>
   <button type="button" className="btn full" style={{marginTop:14}} onClick={open}><Icon name="mail" size={18}/>{message.trim()?'Скопировать текст и открыть чат':'Открыть сообщения канала'}</button>
   <p className="small muted" style={{marginTop:10}}>Если открылся сам канал, а не чат, нажмите внизу «Сообщение».</p>
  </section>
  {draft.pending&&<DraftNotice at={draft.pending.at} onRestore={draft.restore} onDiscard={draft.discard}/>}
  <div className="formField"><label className="fieldLabel" htmlFor="fb-message">Можно сначала написать здесь (необязательно)</label><textarea id="fb-message" maxLength={3000} rows={6} placeholder="Например: на экране «Лента» не открывается запись; в карточке препарата непонятно, что значит…" value={message} onChange={e=>setMessage(e.target.value)}/><p className="small muted">Текст скопируется, останется вставить его в чат.</p></div>
  <div className="callout"><p className="small">Сообщение уйдёт от вашего аккаунта Telegram. Не пишите имя ребёнка, диагнозы и другие медицинские подробности — чтобы исправить ошибку или ответить, они не нужны. «Кора» сама ничего не отправляет и не хранит.</p></div>
 </div></div>;
}
