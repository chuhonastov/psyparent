import React from 'react';
import {Link} from 'react-router-dom';
import Icon from '../components/Icon';
import {useVisit} from '../lib/useVisit';
import {useJournals} from '../lib/useJournals';
import {useScreenings} from '../lib/useScreenings';
export default function Home() {
 const visit=useVisit(),results=useScreenings(),journals=useJournals(),count=visit.questions.length+visit.meds.length+Object.keys(visit.checklists).length+results.filter(r=>r.includeInVisit).length+journals.filter(r=>r.includeInVisit).length;
 return <div className="container">
 <div className="brandRow"><Link className="brand" to="/"><span className="brandMark"><Icon name="leaf" size={22}/></span>PsyParent</Link><span className="releaseBadge">Для родителей</span></div>
 <section className="hero"><div className="heroMark"><Icon name="leaf" size={185}/></div><div className="eyebrow">Понятно о детской психиатрии</div><h1>После приёма<br/>хочется ясности.</h1><p>Разберитесь в диагнозе и назначениях. Сохраните вопросы, которые важно обсудить с врачом.</p><div className="heroFoot"><Icon name="shield" size={16}/>С опорой на научные данные</div></section>
 <div className="sectionHeading"><h2>С чего начнём?</h2></div>
 <div className="actionGrid">
 <Link to="/diagnoses" className="actionCard primary"><span className="actionIcon"><Icon name="book" size={23}/></span><div className="actionMain"><h3>Разобраться в диагнозе</h3><p>Что означает заключение и какая помощь бывает полезна</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/review" className="actionCard"><span className="actionIcon"><Icon name="pill" size={23}/></span><div className="actionMain"><h3>Разобрать назначения</h3><p>Цель препарата, наблюдение и вопросы врачу</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/specialists" className="actionCard"><span className="actionIcon"><Icon name="heart" size={23}/></span><div className="actionMain"><h3>Выбрать специалиста и занятия</h3><p>Кто помогает с речью, эмоциями, поведением и обучением</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/screenings" className="actionCard"><span className="actionIcon"><Icon name="check" size={23}/></span><div className="actionMain"><h3>Пройти скрининг</h3><p>Опросники по возрасту и результаты для визита к врачу</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/forms" className="actionCard"><span className="actionIcon"><Icon name="clock" size={23}/></span><div className="actionMain"><h3>Дневники и формы</h3><p>Сон, поведение, переносимость лечения и наблюдения за изменениями</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/visit" className="actionCard"><span className="actionIcon"><Icon name="note" size={23}/></span><div className="actionMain"><h3>Памятка к приёму</h3><p>{count?'Сохранённых записей: '+count+'. Можно продолжить.':'Соберите всё важное в одном месте'}</p></div><Icon name="arrow" size={18}/></Link>
 </div>
 <div className="sectionHeading"><h2>Частые темы</h2><Link to="/diagnoses">Все темы</Link></div>
 <div className="topics"><Link className="topic" to="/diagnoses/adhd">СДВГ</Link><Link className="topic" to="/diagnoses/asd">Аутизм</Link><Link className="topic" to="/diagnoses/group/anxiety">Тревога и страхи</Link><Link className="topic" to="/diagnoses/depression">Депрессия</Link><Link className="topic" to="/diagnoses/group/stress">Стресс и травма</Link><Link className="topic" to="/diagnoses/group/eating_disorders">Питание</Link></div>
 <div className="authorCard"><span className="authorAvatar">СК</span><div><strong>Материалы Степана Краснощекова</strong><p>Детский психиатр.</p><p>Справочник помогает подготовиться к разговору со специалистом.</p></div></div>
 <div className="footerLinks"><Link to="/about">О проекте и ваших данных</Link><Link to="/help">Когда нужна срочная помощь</Link></div>
 </div>;
}
