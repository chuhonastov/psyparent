import React from 'react';
import {Link} from 'react-router-dom';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import GlobalSearch from '../components/GlobalSearch';
/** The reference in one place: what used to be the home screen catalogue. */
export default function Library(){
 return <div className="container"><PageHeader title="Справочник" subtitle="Диагнозы, лечение, обследования и помощь — понятным языком, с опорой на научные данные."/>
 <GlobalSearch title="Поиск по справочнику" hint="Можно писать торговое название или сокращение, например «Минирин» или «ПТСР».">
 <div className="sectionHeading"><h2>Разделы</h2></div>
 <div className="actionGrid">
 <Link to="/diagnoses" className="actionCard primary"><span className="actionIcon"><Icon name="book" size={23}/></span><div className="actionMain"><h3>Разобраться в диагнозе</h3><p>Что означает заключение и какая помощь бывает полезна</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/review" className="actionCard"><span className="actionIcon"><Icon name="pill" size={23}/></span><div className="actionMain"><h3>Разобрать назначение</h3><p>Лекарство, специалист или обследование при конкретном диагнозе</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/medications" className="actionCard"><span className="actionIcon"><Icon name="pill" size={23}/></span><div className="actionMain"><h3>Лекарства</h3><p>Для чего назначают, что отслеживать, когда звонить врачу</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/exams" className="actionCard"><span className="actionIcon"><Icon name="flask" size={23}/></span><div className="actionMain"><h3>Обследования</h3><p>ЭЭГ, МРТ, анализы, генетика — когда нужны и когда нет</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/specialists" className="actionCard"><span className="actionIcon"><Icon name="heart" size={23}/></span><div className="actionMain"><h3>Специалисты и занятия</h3><p>Кто помогает с речью, эмоциями, поведением и обучением</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/methods" className="actionCard"><span className="actionIcon"><Icon name="alert" size={23}/></span><div className="actionMain"><h3>Что не помогает</h3><p>Остеопатия, микротоки, дельфины, диеты и «чистки» — почему от них стоит отказаться</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/glossary" className="actionCard"><span className="actionIcon"><Icon name="note" size={23}/></span><div className="actionMain"><h3>Словарь</h3><p>Термины из заключений простыми словами</p></div><Icon name="arrow" size={18}/></Link>
 <Link to="/doctors" className="actionCard"><span className="actionIcon"><Icon name="user" size={23}/></span><div className="actionMain"><h3>Врачи клиники</h3><p>Детские психиатры и психологи. Запись на сайте клиники</p></div><Icon name="arrow" size={18}/></Link>
 </div>
 <div className="sectionHeading"><h2>Частые темы</h2><Link to="/diagnoses">Все темы</Link></div>
 <div className="topics"><Link className="topic" to="/diagnoses/adhd">СДВГ</Link><Link className="topic" to="/diagnoses/asd">Аутизм</Link><Link className="topic" to="/diagnoses/group/anxiety">Тревога и страхи</Link><Link className="topic" to="/diagnoses/depression">Депрессия</Link><Link className="topic" to="/diagnoses/group/stress">Стресс и травма</Link><Link className="topic" to="/diagnoses/group/eating_disorders">Питание</Link></div>
 <Link className="btn secondary full" style={{marginTop:22}} to="/help">Когда нужна срочная помощь</Link>
 </GlobalSearch>
 </div>;
}
