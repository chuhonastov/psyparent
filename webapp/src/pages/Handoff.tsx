import React,{useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import {useActiveChild} from '../lib/useRoute';
import {useChildren} from '../lib/useChildren';
import {childAge} from '../lib/children';
import {answerLink,answerToRecord,decodeHandoff,encodeHandoff,extractCode,forgetRequest,getRequests,handoffTitle,markAnswered,newRequestId,rememberRequest,requestLink,saveAnswer,screeningFormFor,HANDOFF_FORMS,HandoffAnswer,HandoffForm,HandoffRequest} from '../lib/handoff';
import {sectionAt} from '../lib/screeningContent';
import {journalTemplate} from '../lib/journalContent';
import {localDate} from '../lib/screenings';
import {copyText,shareText} from '../lib/export';
import {isTelegram,shareToTelegram} from '../lib/twa';
import {toast} from '../lib/toast';
import {dayMonth} from '../lib/route';
const DEFAULT_MESSAGE='Здравствуйте! Мы обсуждаем с врачом, как помочь ребёнку. Ваши наблюдения из школы очень важны. Ответы увидим только мы и врач.';

/** Parent: choose a form, get a link for the teacher. */
export function SendForm(){
 const active=useActiveChild(),children=useChildren(),[childId,setChildId]=useState(active?.id||''),child=children.find(c=>c.id===childId)||active;
 const [form,setForm]=useState<HandoffForm>('vanderbilt2002'),[label,setLabel]=useState(child?.label||''),[age,setAge]=useState(child?String(childAge(child).years):''),[to,setTo]=useState(''),[message,setMessage]=useState(DEFAULT_MESSAGE),[link,setLink]=useState(''),[requests,setRequests]=useState(getRequests);
 useEffect(()=>{if(child){setLabel(child.label);setAge(String(childAge(child).years));}},[child?.id]);
 useEffect(()=>{const h=()=>setRequests(getRequests());window.addEventListener('psyparent:requests-updated',h);return ()=>window.removeEventListener('psyparent:requests-updated',h);},[]);
 const spec=HANDOFF_FORMS.find(f=>f.id===form)!,n=Number(age),ageOk=form==='school'?(age===''||(Number.isInteger(n)&&n>=0&&n<=25)):Number.isInteger(n)&&n>=(spec.minAge??0)&&n<=(spec.maxAge??25);
 const create=async()=>{
  if(!label.trim()){toast('Укажите, как подписать ребёнка',{variant:'error'});return;}
  if(!ageOk){toast(form==='school'?'Проверьте возраст':'Эта форма рассчитана на возраст '+spec.minAge+'–'+spec.maxAge+' лет',{variant:'error'});return;}
  const req:HandoffRequest={k:'q',v:1,id:newRequestId(),f:form,c:label.trim().slice(0,60),a:age===''?undefined:n,r:isTelegram()?'tg':'web',m:message.trim().slice(0,500)||undefined};
  const url=requestLink(await encodeHandoff(req));setLink(url);
  rememberRequest({id:req.id,f:form,childLabel:req.c,to:to.trim(),sentAt:new Date().toISOString()});
 };
 const text=()=>'Просьба заполнить форму «'+spec.title+'» о ребёнке ('+label.trim()+'). Это займёт несколько минут, регистрация не нужна: '+link;
 const share=async()=>{const t=text();if(await shareText(t,spec.title)!=='unavailable'||shareToTelegram(t))return;const ok=await copyText(t);toast(ok?'Текст со ссылкой скопирован — вставьте его в сообщение':'Не удалось отправить',{variant:ok?'info':'error'});};
 const waiting=requests.filter(r=>!r.answeredAt);
 return <div className="container"><PageHeader title="Форма для учителя" subtitle="Учитель или воспитатель заполнит её по ссылке — без регистрации и без доступа к вашим записям. Ответ придёт к вам ссылкой." backTo="/screenings" backLabel="Тесты"/>
 {!link?<div className="stack">
  <fieldset className="plainFieldset"><legend className="fieldLabel">Какую форму отправить</legend><div className="list">{HANDOFF_FORMS.map(f=><button type="button" key={f.id} className={'listCard'+(form===f.id?' selectedCard':'')} aria-pressed={form===f.id} onClick={()=>setForm(f.id)}><div className="listMain"><h3>{f.title}</h3><p>{f.note}</p></div>{form===f.id&&<Icon name="check" size={18}/>}</button>)}</div></fieldset>
  {children.length>1&&<div className="pickChips" role="group" aria-label="Ребёнок">{children.map(c=><button type="button" key={c.id} className="pickChip" aria-pressed={child?.id===c.id} onClick={()=>setChildId(c.id)}>{c.label}</button>)}</div>}
  <div className="formField"><label className="fieldLabel" htmlFor="h-label">Как подписать ребёнка для учителя</label><input className="input" id="h-label" maxLength={60} value={label} onChange={e=>setLabel(e.target.value)} placeholder="Имя, как его знает учитель"/><p className="small muted">Ответ сохранится под этим именем. Чтобы он попал в ленту ребёнка, оставьте имя как в профиле.</p></div>
  <div className="formField"><label className="fieldLabel" htmlFor="h-age">Возраст, лет</label><input className="input narrowInput" id="h-age" inputMode="numeric" value={age} onChange={e=>setAge(e.target.value.replace(/\D/g,'').slice(0,2))}/>{!ageOk&&<p className="small" style={{color:'var(--danger)'}}>{form==='school'?'Возраст — от 0 до 25 лет.':'Эта форма рассчитана на '+spec.minAge+'–'+spec.maxAge+' лет. Выберите «Наблюдения педагога».'}</p>}</div>
  <div className="formField"><label className="fieldLabel" htmlFor="h-to">Кому (только для вас)</label><input className="input" id="h-to" maxLength={80} value={to} onChange={e=>setTo(e.target.value)} placeholder="Например: классный руководитель"/></div>
  <div className="formField"><label className="fieldLabel" htmlFor="h-msg">Сообщение учителю</label><textarea id="h-msg" maxLength={500} value={message} onChange={e=>setMessage(e.target.value)}/></div>
  <div className="privacyNote"><Icon name="shield" size={16}/><span>В ссылке — только название формы, имя для учителя, возраст и ваше сообщение. Диагнозы, лечение и другие записи учитель не увидит.</span></div>
  <button className="btn full" onClick={create}>Создать ссылку</button>
  <p className="small muted">SDQ для учителя — официальный бланк авторов: попросите заполнить его и передать вам, а результат внесите в <Link to="/screenings/sdq">разделе SDQ</Link>.</p>
 </div>:<div className="stack">
  <div className="callout"><strong>Ссылка готова</strong><p>Отправьте её учителю. Когда он ответит, вам придёт ссылка с ответами — откройте её{isTelegram()?' в Telegram':''}, и результат сохранится в тестах ребёнка.</p></div>
  <div className="linkBox"><code>{link}</code></div>
  <div className="buttonRow"><button className="btn" onClick={share}><Icon name="share" size={17}/>Отправить учителю</button><button className="btn secondary" onClick={async()=>{const ok=await copyText(link);toast(ok?'Ссылка скопирована':'Не удалось скопировать',{variant:ok?'success':'error'});}}><Icon name="copy" size={17}/>Скопировать</button></div>
  <button type="button" className="textButton" onClick={()=>setLink('')}>Создать ещё одну</button>
 </div>}
 {waiting.length>0&&<section className="card" style={{marginTop:18}}><h2>Ждём ответ</h2><ul className="plainList">{waiting.map(r=><li key={r.id}><span>{handoffTitle(r.f)} · {r.childLabel}{r.to&&' · '+r.to}<span className="small muted"> · отправлено {dayMonth(r.sentAt.slice(0,10))}</span></span><button type="button" className="iconButton" aria-label="Больше не ждать" onClick={()=>forgetRequest(r.id)}><Icon name="close" size={15}/></button></li>)}</ul><p className="small muted">Пришёл ответ ссылкой, но по ней ничего не открылось? Скопируйте ссылку и вставьте её здесь.</p><Link className="btn secondary compact" style={{marginTop:10}} to="/import"><Icon name="copy" size={15}/>Вставить ответ учителя</Link></section>}
 </div>;
}

/** Teacher: a standalone page without the app's records or navigation. */
export function TeacherForm(){
 const {hash}=useLocation(),[req,setReq]=useState<HandoffRequest|null|undefined>(undefined);
 const [answers,setAnswers]=useState<(number|undefined)[]>([]),[values,setValues]=useState<Record<string,string>>({}),[observer,setObserver]=useState(''),[note,setNote]=useState(''),[result,setResult]=useState(''),[errors,setErrors]=useState<string[]>([]);
 useEffect(()=>{decodeHandoff(extractCode(hash)).then(r=>setReq(r&&r.k==='q'?r:null));},[hash]);
 const form=useMemo(()=>req?screeningFormFor(req.f):null,[req]),template=req?.f==='school'?journalTemplate('school'):undefined;
 if(req===undefined)return <div className="container teacherPage"><p className="small muted">Открываем форму…</p></div>;
 if(!req)return <div className="container teacherPage"><PageHeader title="Ссылка не открылась"/><p>Похоже, ссылка скопирована не целиком. Попросите родителя прислать её ещё раз.</p></div>;
 const answered=answers.filter(x=>x!==undefined).length;
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  const issues:string[]=[];
  if(form&&answered<form.questions.length)issues.push('Ответьте на все вопросы: осталось '+(form.questions.length-answered)+'.');
  if(template&&!Object.values(values).some(v=>v.trim()))issues.push('Заполните хотя бы одно поле.');
  setErrors(issues);if(issues.length){window.scrollTo(0,0);return;}
  const ans:HandoffAnswer={k:'a',v:1,id:req.id,f:req.f,c:req.c,a:req.a,d:localDate(),o:observer.trim().slice(0,60)||undefined,x:form?answers.join(''):undefined,j:template?Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()]).filter(([,v])=>v)):undefined,n:note.trim()||undefined};
  setResult(answerLink(await encodeHandoff(ans),req.r));window.scrollTo(0,0);
 };
 const header=<div className="teacherHead"><span className="brandMark"><Icon name="leaf" size={20}/></span><div><strong>Кора</strong><span className="small muted"> · форма для педагога</span></div></div>;
 if(result){
  const share=async()=>{const t='Ответы на форму «'+handoffTitle(req.f)+'» ('+req.c+'): '+result+'\n\nЕсли по ссылке ничего не открылось, скопируйте её и вставьте в «Коре»: «Тесты» → «Вставить ответ учителя».';if(await shareText(t,'Ответы учителя')!=='unavailable')return;const ok=await copyText(t);toast(ok?'Скопировано — вставьте в сообщение родителю':'Не удалось скопировать',{variant:ok?'info':'error'});};
  return <div className="container teacherPage">{header}<h1>Спасибо!</h1><p style={{marginTop:10}}>Осталось отправить ответ родителю: нажмите кнопку и выберите мессенджер, где вы переписываетесь. Ответы хранятся только в этой ссылке — на сервер они не отправлялись.</p>
   <div className="buttonRow" style={{marginTop:16}}><button className="btn" onClick={share}><Icon name="share" size={17}/>Отправить родителю</button><button className="btn secondary" onClick={async()=>{const ok=await copyText(result);toast(ok?'Ссылка скопирована':'Не удалось скопировать',{variant:ok?'success':'error'});}}><Icon name="copy" size={17}/>Скопировать ссылку</button></div>
   <div className="linkBox" style={{marginTop:14}}><code>{result}</code></div></div>;
 }
 return <div className="container teacherPage">{header}
  <h1>{handoffTitle(req.f)}</h1>
  <p style={{marginTop:10}}>О ребёнке: <strong>{req.c}</strong>{req.a!==undefined&&', '+req.a+' лет'}.</p>
  {req.m&&<div className="callout" style={{marginTop:12}}><strong>Сообщение от родителя</strong><p>{req.m}</p></div>}
  <p className="small muted" style={{marginTop:12}}>Регистрация не нужна. Ответы не сохраняются на сервере: в конце вы получите ссылку и отправите её родителю. Пожалуйста, отвечайте о том, что видите сами, — не согласовывая ответы с родителями.</p>
  {errors.length>0&&<div className="callout danger" role="alert" style={{marginTop:14}}>{errors.map(x=><p key={x}>{x}</p>)}</div>}
  <form onSubmit={submit} noValidate style={{marginTop:16}}>
  {form&&<>{form.instructions&&<p className="small" style={{marginBottom:12}}>{form.instructions}</p>}
   {form.questions.map((q,i)=>{const sec=sectionAt(form,i),first=form.sections.find(s=>s.from===i);return <React.Fragment key={i}>{first?.title&&<h2 className="teacherSection">{first.title}</h2>}
    <fieldset className="plainFieldset scalePick"><legend className="fieldLabel"><span className="muted">{i+1}.</span> {q}</legend><div className="optionRow">{sec.options.map((o,k)=><label key={o} className={answers[i]===k?'selected':''}><input type="radio" name={'q'+i} checked={answers[i]===k} onChange={()=>{const n=[...answers];n[i]=k;setAnswers(n);}}/>{o}</label>)}</div></fieldset></React.Fragment>;})}
   <p className="small muted" style={{marginTop:14}} role="status">Отвечено: {answered} из {form.questions.length}</p></>}
  {template&&<>{template.fields.map(f=><div className="formField" key={f.id} style={{marginTop:14}}><label className="fieldLabel" htmlFor={'f-'+f.id}>{f.label}</label>{f.type==='textarea'?<textarea id={'f-'+f.id} maxLength={3000} value={values[f.id]||''} onChange={e=>setValues({...values,[f.id]:e.target.value})}/>:<input className="input" id={'f-'+f.id} maxLength={300} value={values[f.id]||''} onChange={e=>setValues({...values,[f.id]:e.target.value})}/>}</div>)}</>}
  <div className="formField" style={{marginTop:18}}><label className="fieldLabel" htmlFor="t-observer">Кто заполнил (необязательно)</label><input className="input" id="t-observer" maxLength={60} placeholder="Например: классный руководитель" value={observer} onChange={e=>setObserver(e.target.value)}/></div>
  {form&&<div className="formField"><label className="fieldLabel" htmlFor="t-note">Комментарий (необязательно)</label><textarea id="t-note" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></div>}
  <button className="btn full" style={{marginTop:16}}>Готово — получить ссылку для родителя</button>
  </form>
 </div>;
}

/** Parent: open the teacher's answer link (or paste it) and save it to the child's tests. */
export function ImportAnswer(){
 const {hash}=useLocation(),navigate=useNavigate(),[text,setText]=useState(''),[answer,setAnswer]=useState<HandoffAnswer|null>(null),[error,setError]=useState(''),[include,setInclude]=useState(true);
 const read=async(input:string)=>{const code=extractCode(input);if(!code){setError('Не нашли ответ в этом тексте. Вставьте ссылку целиком.');return;}const r=await decodeHandoff(code);if(!r||r.k!=='a'){setError('Это не ответ на форму «Коры» или ссылка скопирована не целиком.');setAnswer(null);return;}setError('');setAnswer(r);};
 useEffect(()=>{if(hash.length>1)read(hash);},[hash]);
 const rec=answer?answerToRecord(answer):null;
 const save=()=>{if(!answer||!rec)return;if(saveAnswer(rec,include)){markAnswered(answer.id);toast('Ответ учителя сохранён');navigate('kind' in rec&&rec.kind==='screening'?'/screenings/result/'+rec.result.id:'kind' in rec&&rec.kind==='journal'?'/forms/record/'+rec.record.id:'/screenings');}else toast('Не удалось сохранить',{variant:'error'});};
 const already=answer&&getRequests().find(r=>r.id===answer.id)?.answeredAt;
 return <div className="container"><PageHeader title="Ответ учителя" subtitle="Ответ на форму, которую вы отправили по ссылке." backTo="/screenings" backLabel="Тесты"/>
 {!answer?<div className="stack">
  <div className="formField"><label className="fieldLabel" htmlFor="imp">Ссылка с ответом</label><textarea id="imp" placeholder="Вставьте ссылку или код от учителя" value={text} onChange={e=>setText(e.target.value)}/></div>
  {error&&<div className="callout danger" role="alert"><p>{error}</p></div>}
  <button className="btn full" disabled={!text.trim()} onClick={()=>read(text)}>Открыть ответ</button>
 </div>:<div className="stack">
  <section className="card"><h2>{handoffTitle(answer.f)}</h2><p className="small" style={{marginTop:8}}>{answer.c}{answer.a!==undefined&&', '+answer.a+' лет'} · {dayMonth(answer.d)}{answer.o&&' · '+answer.o}</p>
   {rec&&'error' in rec?<div className="callout danger" style={{marginTop:12}}><p>{rec.error}</p></div>:rec&&'kind' in rec&&rec.kind==='screening'?<><p style={{marginTop:12}}><strong>{rec.result.score.total} из {rec.result.score.max}</strong> · {rec.result.score.label}</p><p className="small muted">{rec.result.score.next}</p></>:<p className="small" style={{marginTop:12}}>Наблюдения своими словами — откроются после сохранения.</p>}
   {answer.n&&<p className="small" style={{marginTop:10}}>Комментарий: {answer.n}</p>}
  </section>
  {already&&<div className="callout warn"><p>Этот ответ уже сохраняли {dayMonth(already.slice(0,10))}. Повторное сохранение создаст ещё одну запись.</p></div>}
  {rec&&!('error' in rec)&&<><label className="selectionCheck"><input type="checkbox" checked={include} onChange={e=>setInclude(e.target.checked)}/><span>Включить в памятку врачу</span></label><button className="btn full" onClick={save}>Сохранить в тесты ребёнка</button></>}
  <button type="button" className="textButton" onClick={()=>{setAnswer(null);setText('');navigate('/import',{replace:true});}}>Открыть другой ответ</button>
 </div>}
 </div>;
}
