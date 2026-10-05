import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {Link,useLocation} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import {deleteLocalData} from '../lib/persist';
import {toast} from '../lib/toast';
import meta from '../content/meta.json';
import {useSettings} from '../lib/useSettings';
import {saveSettings,textSizeLabels,themeLabels,TextSize,ThemeChoice} from '../lib/settings';
import {backupFileName,createBackup,createFullBackup,describeSummary,lastBackupAt,markBackupDone,parseBackup,restoreBackup,summarizeBackup} from '../lib/backup';
import {saveWithNotice,SaveOutcome,SaveRequest} from '../lib/files';
import {setStatsConsent,statsConsent,subscribeStats,track,trackError} from '../lib/analytics';
import {isTelegram} from '../lib/twa';
import {disableCloudSync,enableCloudSync,getSyncView,subscribeSync,syncNow} from '../lib/sync';
import {isIOS,isStandalone} from '../lib/device';
import {count} from '../lib/plural';
import {clearFiles,filesSize,importFiles,referencedFiles,sizeLabel,FileRestore} from '../lib/documents';
const useSyncView=()=>useSyncExternalStore(subscribeSync,getSyncView);
const when=(t:number)=>new Date(t).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
function TelegramStorage(){
 const v=useSyncView();
 const toggle=async()=>{
  if(v.cloud){
   if(!window.confirm('Выключить синхронизацию? Копия записей удалится из облака Telegram. Записи на этом и других устройствах останутся, но перестанут обновляться друг от друга.'))return;
   try{await disableCloudSync();toast('Синхронизация выключена, копия удалена из облака');}catch{toast('Не удалось удалить копию из облака Telegram. Попробуйте ещё раз.',{variant:'error',durationMs:5000});}
  }else{
   if(!window.confirm('Включить синхронизацию? Записи «Коры» будут храниться в облаке Telegram вашего аккаунта и появятся на других ваших устройствах. Сервер «Коры» их не получает.'))return;
   try{await enableCloudSync();toast('Синхронизация включена');}catch{toast(getSyncView().error||'Не удалось включить синхронизацию',{variant:'error',durationMs:5000});}
  }
 };
 const now=async()=>{toast(await syncNow()?'Записи синхронизированы':getSyncView().error||'Не удалось синхронизировать',{variant:getSyncView().error?'error':'success'});};
 return <section className="card" id="storage" aria-labelledby="storage-title"><h2 id="storage-title">Хранение в Telegram</h2>
 <p style={{marginTop:8}}>{v.device?'Копия записей хранится в памяти Telegram на этом устройстве. Если окно «Коры» потеряет данные, записи вернутся при следующем открытии.':'Ваш Telegram не умеет хранить копию записей. Обновите Telegram или время от времени скачивайте резервную копию.'}</p>
 {v.cloudAvailable?<><label className="selectionCheck" style={{marginTop:14,alignItems:'flex-start'}}><input type="checkbox" style={{marginTop:2}} checked={v.cloud} disabled={v.busy} onChange={toggle}/><span><strong>Синхронизировать между устройствами</strong><br/>Записи появятся в «Коре» на телефоне, компьютере и планшете с этим аккаунтом Telegram.</span></label>
 {v.cloud&&<div className="buttonRow" style={{marginTop:12,alignItems:'center'}}><button className="btn secondary compact" disabled={v.busy} onClick={now}>Синхронизировать сейчас</button><span className="small muted" role="status">{v.busy?'Синхронизация…':v.lastSync?'Последняя: '+when(v.lastSync):''}</span></div>}
 <p className="small muted" style={{marginTop:10}}>Копия лежит в облаке Telegram вашего аккаунта, сервер «Коры» её не получает. Если выключить синхронизацию, копия удалится из облака.</p></>
 :<p className="small muted" style={{marginTop:10}}>Синхронизация между устройствами заработает после обновления Telegram.</p>}
 {v.error&&<p className="small" role="alert" style={{marginTop:10,color:'var(--danger)'}}>{v.error}</p>}
 </section>;
}
function BrowserStorage(){
 const ios=isIOS(),home=isStandalone();
 return <section className="card" id="storage" aria-labelledby="storage-title"><h2 id="storage-title">Хранение в браузере</h2>
 <p style={{marginTop:8}}>Записи хранятся только в этом браузере на этом устройстве. В Telegram и в других браузерах их не видно.</p>
 {ios&&!home&&<div className="callout warn" style={{marginTop:12}}><strong>На iPhone и iPad</strong><p>Safari может стереть записи сайта, который не открывали неделю. Надёжнее добавить «Кору» на экран «Домой»: кнопка «Поделиться» → «На экран „Домой“». Записи из Safari туда сами не переходят — перенесите их резервной копией. Или пользуйтесь «Корой» в Telegram.</p></div>}
 {ios&&home&&<p className="small muted" style={{marginTop:10}}>Вы открыли «Кору» с экрана «Домой»: здесь записи хранятся надёжнее, чем во вкладке Safari.</p>}
 </section>;
}
function ReadingSettings(){
 const settings=useSettings();
 const theme=(t:ThemeChoice)=>t==='auto'&&isTelegram()?'Как в Telegram':themeLabels[t];
 return <section className="card" id="reading" aria-labelledby="settings-title"><h2 id="settings-title">Настройки чтения</h2>
 <fieldset className="plainFieldset"><legend className="fieldLabel">Размер текста</legend><div className="optionRow">{(Object.keys(textSizeLabels) as TextSize[]).map(size=><label key={size} className={settings.textSize===size?'selected':''}><input type="radio" name="text-size" checked={settings.textSize===size} onChange={()=>saveSettings({textSize:size})}/>{textSizeLabels[size]}</label>)}</div></fieldset>
 <fieldset className="plainFieldset"><legend className="fieldLabel">Оформление</legend><div className="optionRow">{(Object.keys(themeLabels) as ThemeChoice[]).map(t=><label key={t} className={settings.theme===t?'selected':''}><input type="radio" name="theme" checked={settings.theme===t} onChange={()=>saveSettings({theme:t})}/>{theme(t)}</label>)}</div></fieldset>
 <p className="settingsSample">Так выглядит текст в карточках справочника. Настройки сохраняются на этом устройстве.</p></section>;
}
/** What a restore actually brought back: records and document files are reported separately. */
function RestoreResult({summary,files}:{summary:string;files:FileRestore}){
 const total=files.restored+files.failed.length,problem=files.failed.length>0||files.absent>0;
 return <div id="restore-result" className={'callout '+(problem?'warn':'')} role="status" style={{marginTop:14}}><strong>{problem?'Записи восстановлены, но не все файлы':'Копия восстановлена'}</strong>
  <p>Записи: {summary}.</p>
  {total>0&&<p>Файлы документов: восстановлено {files.restored} из {total}.</p>}
  {files.failed.length>0&&<p>Не удалось сохранить: {files.failed.join(', ')}. Вероятно, браузеру не хватило места. Освободите место на устройстве и восстановите копию ещё раз.</p>}
  {files.absent>0&&<p>Без файла: {count(files.absent,'документ','документа','документов')} — в этой копии нет их фото или PDF. Описание и дата сохранены; сами файлы переносит только копия «с файлами документов».</p>}
  <button type="button" className="btn compact" style={{marginTop:10}} onClick={()=>window.location.reload()}>Готово</button></div>;
}
function Backup(){
 const [,setDone]=useState(0),[result,setResult]=useState<{summary:string;files:FileRestore}|null>(null);
 const done=(o:SaveOutcome)=>{if(o==='downloaded'||o==='browser'){markBackupDone();track('backup');setDone(x=>x+1);}};
 const download=()=>{let content='';try{content=JSON.stringify(createBackup());}catch{toast('Не удалось создать копию: браузер не дал прочитать записи',{variant:'error'});return;}saveWithNotice({kind:'file',name:backupFileName(),type:'application/json',content},'Копия сохранена').then(done);};
 const fileBytes=filesSize();
 // The copy with files is assembled first (it takes a moment); in Telegram saving then needs a second tap.
 const [full,setFull]=useState<SaveRequest|null>(null);
 const downloadFull=async()=>{try{const {backup,missing}=await createFullBackup();const req:SaveRequest={kind:'file',name:backupFileName(new Date(),true),type:'application/json',content:JSON.stringify(backup)};if(missing)toast('Файлов нет на этом устройстве: '+missing+'. Сделайте полную копию там, где их добавляли.',{variant:'info',durationMs:5000});if(isTelegram())setFull(req);else done(await saveWithNotice(req,'Копия с файлами сохранена'));}catch{toast('Не удалось собрать копию с файлами',{variant:'error'});}};
 const restore=async(file:File)=>{
  let text='';
  try{text=await file.text();}catch{toast('Не удалось прочитать файл',{variant:'error'});return;}
  const parsed=parseBackup(text);
  if(!parsed.ok){toast(parsed.error,{variant:'error',durationMs:5000});return;}
  const nFiles=parsed.files?Object.keys(parsed.files).length:0;
  if(!window.confirm('Заменить записи на этом устройстве копией? В копии — '+describeSummary(summarizeBackup(parsed.data))+(nFiles?', файлов документов: '+nFiles:'')+'. Текущие записи «Коры» на этом устройстве будут заменены.'))return;
  if(!restoreBackup(parsed.data)){trackError('restore');toast('Не удалось восстановить: браузер не разрешил сохранение. Прежние записи оставлены.',{variant:'error',durationMs:5000});return;}
  const files=await importFiles(parsed.files,referencedFiles(parsed.data));
  if(files.failed.length)trackError('files');
  setResult({summary:describeSummary(summarizeBackup(parsed.data)),files});
  window.setTimeout(()=>document.getElementById('restore-result')?.scrollIntoView({block:'center'}),50);
 };
 const last=lastBackupAt();
 return <section className="card" id="backup" aria-labelledby="backup-title"><h2 id="backup-title">Резервная копия</h2><p style={{marginTop:8}}>{isTelegram()?'Файл пригодится, чтобы перенести записи из Telegram в браузер или сохранить их вне Telegram.':'Скачайте копию перед сменой телефона или очисткой браузера, а затем восстановите её на новом устройстве.'}</p>
 {result&&<RestoreResult {...result}/>}
 {full&&<div className="callout" style={{marginTop:14}}><strong>Копия с файлами готова</strong><p>Нажмите, чтобы сохранить её через браузер телефона.</p><button type="button" className="btn compact" style={{marginTop:10}} onClick={()=>{const r=full;setFull(null);saveWithNotice(r).then(done);}}><Icon name="download" size={16}/>Сохранить</button></div>}
 <div className="buttonRow" style={{marginTop:14}}><button className="btn secondary" onClick={download}><Icon name="download" size={17}/>{fileBytes?'Копия записей':'Скачать копию'}</button>{fileBytes>0&&<button className="btn secondary" onClick={downloadFull}><Icon name="download" size={17}/>С файлами документов · {sizeLabel(fileBytes)}</button>}<label className="btn secondary fileButton"><Icon name="upload" size={17}/>Восстановить из файла<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)restore(file);}}/></label></div>
 <p className="small muted" style={{marginTop:10}}>Последняя копия: {last?last.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'ещё не делали'}. В файле все записи: вопросы, назначения, ответы тестов и дневники.{fileBytes>0&&' Фото и PDF документов входят только в копию «с файлами документов»; в обычной — только их список.'} Храните копию как медицинский документ и не пересылайте посторонним.</p></section>;
}
/** Usage statistics: what exactly is counted, who gets it, and the switch. */
function Stats(){
 const [consent,setConsent]=useState(statsConsent);
 useEffect(()=>subscribeStats(()=>setConsent(statsConsent())),[]);
 if(window.location.protocol==='file:'||window.__PSYPARENT_OFFLINE__)return null;
 return <section className="card statsCard" id="stats" aria-labelledby="stats-head"><h2 id="stats-head">Статистика использования</h2>
  <p style={{marginTop:8}}>Если вы разрешите, «Кора» будет отправлять только счётчики: приложение открыли сегодня; сохранили опрос, запись дневника, тест, запись в ленте или документ; выгрузили памятку; при сохранении произошла ошибка. К ним добавляются день, неделя и месяц первого использования, Telegram это или браузер, и откуда пришли в первый раз — например, «vk.com».</p>
  <p style={{marginTop:8}}>Не отправляются имена, записи, диагнозы, лекарства, ответы тестов, поисковые запросы и адреса страниц. Идентификатора устройства нет: сервер хранит только суммы по дням. Их видит автор «Коры»; хранятся до двух лет. IP-адрес сервер не сохраняет.</p>
  <div className="optionRow" role="radiogroup" aria-label="Статистика" style={{marginTop:12}}>{([['yes','Разрешить'],['no','Не отправлять']] as const).map(([v,l])=><label key={v} className={consent===v?'selected':''}><input type="radio" name="stats" checked={consent===v} onChange={()=>setStatsConsent(v)}/>{l}</label>)}</div>
 </section>;
}
export default function About() {
 const {hash}=useLocation();
 // «Размер текста» on the home screen opens this page at the reading settings.
 useEffect(()=>{if(hash)requestAnimationFrame(()=>document.getElementById(hash.slice(1))?.scrollIntoView());},[hash]);
 const removeAll=async()=>{
  const cloud=getSyncView().cloud;
  if(!window.confirm('Удалить все записи «Коры» на этом устройстве, включая памятку, дату приёма, ленту лечения, опросы, историю скринингов с ответами, дневники, документы с файлами, план безопасности, отметки в карточках и настройки?'+(cloud?' Копия в облаке Telegram тоже удалится, синхронизация выключится.':'')+' Это действие нельзя отменить.'))return;
  if(cloud){try{await disableCloudSync();}catch{toast('Не удалось удалить копию из облака Telegram. Записи не тронуты, попробуйте ещё раз.',{variant:'error',durationMs:5000});return;}}
  await clearFiles();
  if(deleteLocalData())toast('Все локальные записи удалены');
 };
 return <div className="container"><PageHeader title="О приложении «Кора»" subtitle="Понятная информация после приёма и опора для следующего разговора с врачом." backTo="/" backLabel="Сегодня"/><div className="stack">
 <section className="card"><div className="eyebrow">Автор проекта</div><h2>Степан Краснощеков</h2><p style={{marginTop:10}}>Детский психиатр. Справочные материалы опираются на международные клинические рекомендации, документы профессиональных обществ и исследования. Ссылки и ограничения указаны в каждой карточке.</p><p className="small muted">Связи с диагнозами включают лечение, сопутствующие задачи, побочные эффекты и назначения с недостаточными доказательствами. Наличие карточки не означает рекомендацию средства.</p><a href="https://t.me/doc_kras" target="_blank" rel="noopener noreferrer" className="btn secondary compact" style={{marginTop:16}}>Канал автора<Icon name="external" size={15}/></a></section>
 <section className="card"><h2>Как пользоваться</h2><ol><li>Выберите диагноз, который указан в заключении.</li><li>Посмотрите, что стоит уточнить и какая помощь бывает полезна.</li><li>Разберите назначенный препарат или специалиста и сохраните нужные вопросы.</li><li>Посмотрите немедикаментозную помощь во вкладке «Помощь» нужного диагноза.</li><li>Выберите тест по возрасту и задаче. Уточните, кто отвечает и где открывается форма, затем сохраните полученный результат.</li><li>В разделе «Дневники и формы» можно описать сон, поведение, переносимость лечения, навыки и жалобы. Выберите нужные записи для передачи врачу.</li><li>Откройте «К врачу» и скопируйте или скачайте памятку.</li></ol><p className="small muted">{meta.disclaimer}</p></section>
 <ReadingSettings/>
 <section className="card"><h2>Ваши записи</h2><ul><li>Вопросы, наблюдения, назначения, дневники и результаты тестов с ответами хранятся на вашем устройстве: в окне Telegram или в браузере.</li><li>Сервер «Коры» не получает ваши записи. Вы сами решаете, кому передать скопированный текст или файл. На сервер уходят только счётчики статистики, если вы их разрешили, и сообщения, которые вы сами пишете автору.</li><li>Когда в Telegram вы скачиваете PDF или копию, данные передаются в браузер телефона внутри ссылки после знака «#» — эта часть ссылки на сервер не отправляется.</li><li>Записи в Telegram и в браузере хранятся отдельно. Перенести их можно резервной копией.</li><li>Доступ к этому устройству может означать доступ к записям. Не добавляйте лишние персональные сведения.</li></ul><button className="btn danger" onClick={removeAll}><Icon name="trash" size={16}/>Удалить все мои записи</button></section>
 {isTelegram()?<TelegramStorage/>:<BrowserStorage/>}
 <Backup/>
 <Stats/>
 <section className="card" id="feedback"><h2>Написать автору</h2><p style={{marginTop:8}}>Нашли ошибку или неточность, что-то непонятно, есть идея? Сообщение придёт автору на почту.</p><Link className="btn secondary compact" style={{marginTop:12}} to="/feedback"><Icon name="mail" size={16}/>Написать</Link></section>
 <p className="small muted">Материалы обновлены {new Date(meta.contentVersion+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}.</p>
 <Link className="btn secondary" to="/help">Когда нужна срочная помощь</Link>
 </div></div>;
}
