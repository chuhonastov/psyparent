import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import ChildSwitcher from '../components/ChildSwitcher';
import {useActiveChild,useRouteData} from '../lib/useRoute';
import {changeReport,formatChanges,fullDate,dayMonth,reportIsEmpty,trendValue,trendWord} from '../lib/route';
import {lastVisit,eventKindLabels} from '../lib/treatment';
import {countLabel,missedLabels,scaleLabels} from '../lib/monitoring';
import {ageLabel} from '../lib/children';
import {copyText,downloadText,shareText} from '../lib/export';
import {shareToTelegram} from '../lib/twa';
import {toast} from '../lib/toast';
import {plural} from '../lib/plural';
const WEEKS=[4,6,8,12];
const num=(v:number)=>String(Math.round(v*10)/10).replace('.',',');

export default function Changes(){
 const child=useActiveChild(),data=useRouteData(child?.id),[params,setParams]=useSearchParams(),weeks=Number(params.get('weeks'))||undefined;
 if(!child||!data)return <div className="container"><PageHeader title="Что изменилось" backTo="/visit" backLabel="К врачу"/><div className="emptyState"><h3>Сначала добавьте ребёнка</h3><p>Сводка собирается из ленты лечения, коротких опросов, тестов и дневников одного ребёнка.</p><Link className="btn" to="/child">Добавить ребёнка</Link></div></div>;
 const visit=lastVisit(data.events,data.today),r=changeReport(data,weeks),title=child.label+', '+ageLabel(child),text=()=>formatChanges(r,title);
 const share=async()=>{const t=text();if(await shareText(t,'Что изменилось с прошлого приёма')!=='unavailable'||shareToTelegram(t))return;const ok=await copyText(t);toast(ok?'Текст скопирован':'Не удалось отправить',{variant:ok?'info':'error'});};
 const empty=reportIsEmpty(r);
 return <div className="container"><PageHeader title={r.sinceVisit?'Что изменилось с прошлого приёма':'Что изменилось за '+r.weeks+' '+plural(r.weeks,'неделю','недели','недель')} subtitle="Сводка для врача из ваших записей: лечение, самочувствие, шкалы и события." eyebrow={title} backTo="/visit" backLabel="К врачу"/>
 <ChildSwitcher active={child} manage={false}/>
 <div className="pickChips" role="group" aria-label="Период" style={{marginTop:14}}>
  {visit&&<button type="button" className="pickChip" aria-pressed={!weeks} onClick={()=>setParams({},{replace:true})}>С приёма {dayMonth(visit)}</button>}
  {WEEKS.map(w=><button type="button" key={w} className="pickChip" aria-pressed={weeks===w||(!visit&&!weeks&&w===6)} onClick={()=>setParams({weeks:String(w)},{replace:true})}>{w} нед.</button>)}
 </div>
 <p className="small muted" style={{marginTop:10}}>{fullDate(r.from)} — {fullDate(r.to)}{!visit&&' · отметьте приём в ленте, и сводка будет считаться от него'}</p>
 {empty?<div className="emptyState" style={{marginTop:18}}><Icon name="clock" size={27}/><h3>За этот период записей нет</h3><p>Отмечайте изменения в ленте и проходите короткий опрос раз в неделю. Перед приёмом здесь соберётся сводка: дозы, самочувствие, побочные эффекты и шкалы.</p><div className="buttonRow" style={{justifyContent:'center'}}><Link className="btn" to="/child/check-in">Короткий опрос</Link><Link className="btn secondary" to="/child/timeline?add=start">Запись в ленту</Link></div></div>:<div className="stack" style={{marginTop:16}}>
 {(r.meds.length>0||r.current.length>0)&&<section className="card"><h2>Лечение</h2>
  {r.meds.length>0&&<ul className="changeList">{r.meds.map((m,i)=><li key={i}><span className="changeDate">{dayMonth(m.date)}</span>{m.text}</li>)}</ul>}
  {r.current.length>0&&<p className="small" style={{marginTop:12}}><strong>Сейчас:</strong> {r.current.map(c=>c.label+(c.dose?' '+c.dose:'')).join('; ')}</p>}
 </section>}
 {r.checkIns>0&&<section className="card"><h2>Самочувствие</h2><p className="small muted">По {r.checkIns} {plural(r.checkIns,'короткому опросу','коротким опросам','коротким опросам')} родителя.</p>
  {r.goals.length>0&&<ul className="changeList">{r.goals.map(t=><li key={t.label}><span className="changeLabel">{t.label}</span><span className="changeValue">{t.n>1&&<>{trendValue(t,t.first)} → </>}{trendValue(t,t.last)}{t.measure==='count'&&' '+countLabel}{t.measure==='severity'&&trendWord(t)&&<span className={'tag '+(trendWord(t)==='лучше'?'':trendWord(t)==='хуже'?'warm':'neutral')} style={{margin:'0 0 0 8px'}}>{trendWord(t)}</span>}</span></li>)}</ul>}
  {r.effects.length>0&&<><h3 style={{marginTop:16}}>Отмечались</h3><ul className="changeList">{r.effects.map(e=><li key={e.label}><span className="changeLabel">{e.label}</span><span className="changeValue">{scaleLabels[e.max].toLocaleLowerCase('ru')}</span></li>)}</ul></>}
  {r.numbers.length>0&&<ul className="changeList">{r.numbers.map(n=><li key={n.label}><span className="changeLabel">{n.label}</span><span className="changeValue">{n.first!==n.last&&num(n.first)+' → '}{num(n.last)} {n.unit}</span></li>)}</ul>}
  {r.missed!==null&&<p className="small" style={{marginTop:10}}>Пропуски приёма: {missedLabels[r.missed].toLocaleLowerCase('ru')}</p>}
 </section>}
 {r.scales.length>0&&<section className="card"><h2>Шкалы</h2><p className="small muted">Баллы — не диагноз; важно, как они меняются.</p><ul className="changeList">{r.scales.map(s=><li key={s.name+s.respondent}><span className="changeLabel">{s.name} <span className="small muted">({s.respondent})</span></span><span className="changeValue">{s.before!==undefined&&s.before+' → '}{s.after} из {s.max}</span></li>)}</ul></section>}
 {r.notes.length>0&&<section className="card"><h2>Записи в ленте</h2><ul className="changeList">{r.notes.map((n,i)=><li key={i}><span className="changeDate">{dayMonth(n.date)}</span><span><strong>{eventKindLabels[n.kind]}</strong>{n.text&&': '+n.text}</span></li>)}</ul></section>}
 {r.docs.length>0&&<section className="card"><h2>Документы</h2><ul className="changeList">{r.docs.map((x,i)=><li key={i}><span className="changeDate">{dayMonth(x.date)}</span><span><strong>{x.title}</strong>{x.note&&': '+x.note}</span></li>)}</ul></section>}
 {(r.journals.length>0||r.questions>0)&&<section className="card">{r.journals.length>0&&<><h2>Дневники</h2><p className="small" style={{marginTop:8}}>{r.journals.map(j=>j.title+' — '+j.count+' '+plural(j.count,'запись','записи','записей')).join('; ')}</p></>}{r.questions>0&&<p className="small" style={{marginTop:r.journals.length?10:0}}>В памятке к приёму: {r.questions} {plural(r.questions,'запись','записи','записей')}. <Link to="/visit">Открыть</Link></p>}</section>}
 <div className="visitActions"><button className="btn" onClick={share}><Icon name="share" size={18}/>Отправить</button><button className="btn secondary" onClick={async()=>{const ok=await copyText(text());toast(ok?'Сводка скопирована':'Не удалось скопировать',{variant:ok?'success':'error'});}}><Icon name="copy" size={18}/>Скопировать</button><button className="btn secondary" onClick={()=>downloadText(text(),'Kora-izmeneniya-'+data.today+'.txt')}><Icon name="download" size={18}/>Скачать</button></div>
 <p className="small muted">Сводка войдёт и в памятку к приёму. Это записи семьи — врач оценит их вместе с осмотром.</p>
 </div>}
 </div>;
}
