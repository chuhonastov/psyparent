import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import {useActiveChild} from '../lib/useRoute';
import {addDocument,docKindLabels,getDocuments,readFile,removeDocument,sizeLabel,subscribeDocuments,validateDocument,DocKind,DocMeta} from '../lib/documents';
import {ageLabel} from '../lib/children';
import {localDate} from '../lib/screenings';
import {fullDate} from '../lib/route';
import {toast} from '../lib/toast';
import {useUnsaved} from '../lib/unsaved';
const KINDS=Object.keys(docKindLabels) as DocKind[];

function DocForm({childId,onDone}:{childId:string;onDone:()=>void}){
 const today=localDate(),[kind,setKind]=useState<DocKind>('conclusion'),[title,setTitle]=useState(''),[date,setDate]=useState(today),[note,setNote]=useState(''),[file,setFile]=useState<File|null>(null),[errors,setErrors]=useState<string[]>([]),[busy,setBusy]=useState(false);
 useUnsaved(!!(title.trim()||note.trim()||file));
 const submit=async(e:React.FormEvent)=>{e.preventDefault();const issues=validateDocument({kind,date,title,note},today,file);setErrors(issues);if(issues.length)return;
  setBusy(true);const doc=await addDocument({childId,kind,date,title,note},file);setBusy(false);
  if(doc){toast('Документ добавлен');onDone();}else toast('Не удалось сохранить: браузер не дал места для файла',{variant:'error',durationMs:5000});};
 return <form className="card" noValidate onSubmit={submit}><h2 style={{marginBottom:12}}>Новый документ</h2>
  {errors.length>0&&<div className="callout danger" role="alert" style={{marginBottom:12}}>{errors.map(x=><p key={x}>{x}</p>)}</div>}
  <fieldset className="plainFieldset"><legend className="fieldLabel">Что это</legend><div className="pickChips">{KINDS.map(k=><button type="button" key={k} className="pickChip" aria-pressed={kind===k} onClick={()=>setKind(k)}>{docKindLabels[k]}</button>)}</div></fieldset>
  <div className="formField" style={{marginTop:14}}><label className="fieldLabel" htmlFor="doc-title">Название (необязательно)</label><input className="input" id="doc-title" maxLength={120} placeholder={docKindLabels[kind]+': кто выдал, о чём'} value={title} onChange={e=>setTitle(e.target.value)}/></div>
  <div className="formField"><label className="fieldLabel" htmlFor="doc-date">Дата документа</label><input className="input" id="doc-date" type="date" max={today} value={date} onChange={e=>setDate(e.target.value)}/></div>
  <div className="formField"><label className="fieldLabel" htmlFor="doc-note">Главное из документа (необязательно)</label><textarea id="doc-note" maxLength={1000} placeholder="Например: эпиактивности нет; рекомендован вариант 7.1 и логопед" value={note} onChange={e=>setNote(e.target.value)}/></div>
  <div className="formField"><label className="fieldLabel" htmlFor="doc-file">Фото или PDF (необязательно)</label><input id="doc-file" type="file" accept="image/*,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<p className="small muted">{file.name} · {sizeLabel(file.size)}</p>}<p className="small muted">Файл хранится на этом устройстве. Чтобы не потерять его при смене телефона, сделайте в «О приложении» резервную копию «с файлами документов».</p></div>
  <div className="buttonRow" style={{marginTop:12}}><button className="btn" disabled={busy}>{busy?'Сохраняем…':'Добавить'}</button><button type="button" className="btn secondary" onClick={onDone}>Отмена</button></div>
 </form>;
}

function DocCard({d}:{d:DocMeta}){
 const [url,setUrl]=useState<string|null>(null),[missing,setMissing]=useState(false),urlRef=useRef<string|null>(null);
 useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
 const open=async()=>{if(!d.file)return;if(url){setUrl(null);return;}const blob=await readFile(d.file.id);if(!blob){setMissing(true);return;}const u=URL.createObjectURL(blob);urlRef.current=u;setUrl(u);};
 const image=d.file?.type.startsWith('image/');
 return <section className="card docCard"><span className="tag">{docKindLabels[d.kind]}</span><h3>{d.title}</h3><p className="small muted">{fullDate(d.date)}</p>{d.note&&<p className="small" style={{marginTop:8}}>{d.note}</p>}
  {d.file&&<div style={{marginTop:10}}>{missing?<p className="small muted">Файл «{d.file.name}» есть только на том устройстве, где его добавили.</p>:<div className="buttonRow" style={{alignItems:'center'}}><button type="button" className="btn secondary compact" onClick={open}>{url?'Скрыть':image?'Показать':'Открыть'} · {sizeLabel(d.file.size)}</button>{url&&<a className="textButton" href={url} download={d.file.name}>Скачать</a>}</div>}
   {url&&(image?<img className="docPreview" src={url} alt={d.title}/>:<p className="small" style={{marginTop:8}}><a href={url} target="_blank" rel="noopener noreferrer">Открыть PDF в новой вкладке</a></p>)}</div>}
  <button type="button" className="textButton danger" style={{marginTop:8}} onClick={async()=>{if(window.confirm('Удалить документ «'+d.title+'»'+(d.file?' вместе с файлом':'')+'?')&&await removeDocument(d.id))toast('Документ удалён');}}>Удалить</button>
 </section>;
}

export default function Documents(){
 const child=useActiveChild(),[docs,setDocs]=useState<DocMeta[]>(()=>child?getDocuments(child.id):[]),[adding,setAdding]=useState(false),[kind,setKind]=useState<DocKind|''>('');
 useEffect(()=>{if(!child)return;setDocs(getDocuments(child.id));return subscribeDocuments(()=>setDocs(getDocuments(child.id)));},[child?.id]);
 if(!child)return <div className="container"><PageHeader title="Документы" backTo="/child" backLabel="Ребёнок"/><div className="emptyState"><h3>Сначала добавьте ребёнка</h3><Link className="btn" to="/child">Добавить ребёнка</Link></div></div>;
 const kinds=[...new Set(docs.map(d=>d.kind))],shown=docs.filter(d=>!kind||d.kind===kind);
 return <div className="container"><PageHeader title="Документы" subtitle="Заключения, ПМПК, обследования и выписки — в одном месте и в ленте лечения, по датам." eyebrow={child.label+', '+ageLabel(child)} backTo="/child" backLabel="Ребёнок"/>
 <ChildSwitcher active={child} manage={false}/>
 {adding?<DocForm childId={child.id} onDone={()=>setAdding(false)}/>:<button className="btn full" onClick={()=>setAdding(true)}><Icon name="plus" size={17}/>Добавить документ</button>}
 {kinds.length>1&&<div className="pickChips" role="group" aria-label="Тип" style={{marginTop:16}}><button type="button" className="pickChip" aria-pressed={!kind} onClick={()=>setKind('')}>Все</button>{kinds.map(k=><button type="button" key={k} className="pickChip" aria-pressed={kind===k} onClick={()=>setKind(kind===k?'':k)}>{docKindLabels[k]}</button>)}</div>}
 <div className="stack" style={{marginTop:16}}>{shown.map(d=><DocCard key={d.id} d={d}/>)}</div>
 {!docs.length&&!adding&&<div className="emptyState" style={{marginTop:16}}><Icon name="note" size={27}/><h3>Документов пока нет</h3><p>Сфотографируйте заключения и выписки — они будут под рукой на приёме и в ПМПК. Главное из документа можно записать текстом: это попадёт в ленту и в сводку для врача.</p></div>}
 <p className="small muted" style={{marginTop:16}}><Link to="/about#backup">Резервная копия с файлами</Link>. Список документов входит в резервную копию и синхронизацию Telegram. Сами файлы остаются на устройстве, где их добавили, и переносятся только полной копией «с файлами документов».</p>
 </div>;
}
