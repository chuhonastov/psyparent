import React from 'react';
import {Link} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import {deleteLocalData} from '../lib/persist';
import {toast} from '../lib/toast';
import {journalTemplates} from '../lib/journalContent';
import {screeners} from '../lib/screeningContent';
import meta from '../content/meta.json';
import {leaves,diagnosisGroups,medications,treatmentGuides} from '../lib/content';
import {useSettings} from '../lib/useSettings';
import {saveSettings,textSizeLabels,themeLabels,TextSize,ThemeChoice} from '../lib/settings';
import {backupFileName,createBackup,describeSummary,parseBackup,restoreBackup,summarizeBackup} from '../lib/backup';
import {downloadFile} from '../lib/export';
import {isTelegram} from '../lib/twa';
function ReadingSettings(){
 const settings=useSettings();
 const theme=(t:ThemeChoice)=>t==='auto'&&isTelegram()?'Как в Telegram':themeLabels[t];
 return <section className="card" aria-labelledby="settings-title"><h2 id="settings-title">Настройки чтения</h2>
 <fieldset className="plainFieldset"><legend className="fieldLabel">Размер текста</legend><div className="optionRow">{(Object.keys(textSizeLabels) as TextSize[]).map(size=><label key={size} className={settings.textSize===size?'selected':''}><input type="radio" name="text-size" checked={settings.textSize===size} onChange={()=>saveSettings({textSize:size})}/>{textSizeLabels[size]}</label>)}</div></fieldset>
 <fieldset className="plainFieldset"><legend className="fieldLabel">Оформление</legend><div className="optionRow">{(Object.keys(themeLabels) as ThemeChoice[]).map(t=><label key={t} className={settings.theme===t?'selected':''}><input type="radio" name="theme" checked={settings.theme===t} onChange={()=>saveSettings({theme:t})}/>{theme(t)}</label>)}</div></fieldset>
 <p className="settingsSample">Так выглядит текст в карточках справочника. Настройки сохраняются на этом устройстве.</p></section>;
}
function Backup(){
 const download=()=>{try{downloadFile(JSON.stringify(createBackup(),null,1),backupFileName(),'application/json');}catch{toast('Не удалось создать копию: браузер не дал прочитать записи',{variant:'error'});}};
 const restore=async(file:File)=>{
  let text='';
  try{text=await file.text();}catch{toast('Не удалось прочитать файл',{variant:'error'});return;}
  const parsed=parseBackup(text);
  if(!parsed.ok){toast(parsed.error,{variant:'error',durationMs:5000});return;}
  if(!window.confirm('Заменить записи на этом устройстве копией? В копии — '+describeSummary(summarizeBackup(parsed.data))+'. Текущие записи PsyParent на этом устройстве будут заменены.'))return;
  if(restoreBackup(parsed.data)){toast('Записи восстановлены');window.setTimeout(()=>window.location.reload(),700);}
  else toast('Не удалось восстановить: браузер не разрешил сохранение. Прежние записи оставлены.',{variant:'error',durationMs:5000});
 };
 return <section className="card" aria-labelledby="backup-title"><h2 id="backup-title">Резервная копия</h2><p style={{marginTop:8}}>Записи живут только в этом браузере. Скачайте копию перед сменой телефона или очисткой браузера, а затем восстановите её на новом устройстве.</p>
 <div className="buttonRow" style={{marginTop:14}}><button className="btn secondary" onClick={download}><Icon name="download" size={17}/>Скачать копию</button><label className="btn secondary fileButton"><Icon name="upload" size={17}/>Восстановить из файла<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)restore(file);}}/></label></div>
 <p className="small muted" style={{marginTop:10}}>В файле все записи: вопросы, назначения, ответы тестов и дневники. Храните его как медицинский документ и не пересылайте посторонним.</p></section>;
}
export default function About() {
 return <div className="container"><PageHeader title="О PsyParent" subtitle="Понятная информация после приёма и опора для следующего разговора с врачом." backTo="/" backLabel="Главная"/><div className="stack">
 <section className="card"><div className="eyebrow">Автор проекта</div><h2>Степан Краснощеков</h2><p style={{marginTop:10}}>Детский психиатр. Справочные материалы опираются на международные клинические рекомендации, документы профессиональных обществ и исследования. Ссылки и ограничения указаны в каждой карточке.</p><p>В справочнике {leaves.length} тем в {diagnosisGroups.length} разделах: развитие, тревога, настроение, стресс, поведение, питание и другие трудности. Есть {medications.length} карточек препаратов, добавок и памяток и {treatmentGuides.length} разборов назначений. Есть 11 карточек специалистов и немедикаментозная помощь ко всем 69 темам. В разделе «Тесты» {screeners.length} инструментов. PHQ-9, GAD-7 и рабочую русскую форму SNAP-IV можно пройти здесь; для внешних форм можно сохранить результат, а YGTSS-R с перечнем тиков и критериями оценок заполняется со специалистом. Доступны {journalTemplates.length} дневников и форм наблюдений: история, редактирование, сравнение числовых записей и выбор для памятки. Обзоры и жизненные ситуации отмечены отдельно от диагнозов.</p><p className="small muted">Связи с диагнозами включают лечение, сопутствующие задачи, побочные эффекты и назначения с недостаточными доказательствами. Наличие карточки не означает рекомендацию средства.</p><a href="https://t.me/doc_kras" target="_blank" rel="noopener noreferrer" className="btn secondary compact" style={{marginTop:16}}>Канал автора<Icon name="external" size={15}/></a></section>
 <section className="card"><h2>Как пользоваться</h2><ol><li>Выберите диагноз, который указан в заключении.</li><li>Посмотрите, что стоит уточнить и какая помощь бывает полезна.</li><li>Разберите назначенный препарат и сохраните нужные вопросы.</li><li>Выберите специалистов и немедикаментозные методы в разделе «Помощь» нужного диагноза.</li><li>Выберите тест по возрасту и задаче. Уточните, кто отвечает и где открывается форма, затем сохраните полученный результат.</li><li>В разделе «Дневники и формы» можно описать сон, поведение, переносимость лечения, навыки и жалобы. Выберите нужные записи для передачи врачу.</li><li>Откройте «К врачу» и скопируйте или скачайте памятку.</li></ol><p className="small muted">{meta.disclaimer}</p></section>
 <ReadingSettings/>
 <section className="card"><h2>Ваши записи</h2><ul><li>Вопросы, наблюдения, назначения, дневники и сохранённые результаты скринингов с ответами сохраняются локально, в этом браузере или окне Telegram.</li><li>Приложение не отправляет содержимое памятки на свой сервер или врачу. Вы сами решаете, кому передать скопированный текст или файл.</li><li>После очистки данных браузера записи могут исчезнуть. На другом устройстве они не синхронизируются.</li><li>Доступ к этому устройству и браузеру может означать доступ к записям. Не добавляйте лишние персональные сведения.</li><li>Дата приёма, список недавно открытых карточек и настройки чтения тоже хранятся только здесь.</li></ul><button className="btn danger" onClick={()=>{if(window.confirm('Удалить все записи PsyParent на этом устройстве, включая памятку, дату приёма, историю скринингов с ответами, дневники, отметки в карточках и настройки? Это действие нельзя отменить.')){if(deleteLocalData())toast('Все локальные записи удалены');}}}><Icon name="trash" size={16}/>Удалить все мои записи</button></section>
 <Backup/>
 <div className="callout"><strong>Если заметили неточность</strong><p>Сохраните название карточки и описание проблемы, чтобы передать автору. Не прикладывайте персональные данные ребёнка.</p></div>
 <p className="small muted">Пилотная версия {meta.appVersion}. Обновление материалов: {new Date(meta.contentVersion+'T12:00:00').toLocaleDateString('ru-RU')}. Материалы прошли редакционный пересмотр. Окончательное утверждение автором и проверка в реальном Telegram перед публичным запуском ещё предстоят.</p>
 <Link data-tone="red" className="btn secondary" to="/help">Когда нужна срочная помощь</Link>
 </div></div>;
}
