import React from 'react';
/** «You have an unfinished form» with continue / start over. */
export default function DraftNotice({at,onRestore,onDiscard}:{at:string;onRestore:()=>void;onDiscard:()=>void}){
 const when=new Date(at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
 return <div className="callout warn draftNotice" role="status"><strong>Есть незаконченное заполнение</strong><p>Черновик от {when}. Можно продолжить с того места, где вы остановились.</p><div className="buttonRow" style={{marginTop:10}}><button type="button" className="btn compact" onClick={onRestore}>Продолжить</button><button type="button" className="btn secondary compact" onClick={onDiscard}>Начать заново</button></div></div>;
}
