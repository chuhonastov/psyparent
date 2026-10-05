import React,{useEffect,useState} from 'react';
import {Link,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ToastHost from '../components/ToastHost';
import Home from '../pages/Home';
import Diagnoses from '../pages/Diagnoses';
import DiagnosisGroup from '../pages/DiagnosisGroup';
import DiagnosisDetail from '../pages/DiagnosisDetail';
import Medications from '../pages/Medications';
import MedicationDetail from '../pages/MedicationDetail';
import MedicationGroupRedirect from '../pages/MedicationGroupRedirect';
import TreatmentReview from '../pages/TreatmentReview';
import VisitSheet from '../pages/VisitSheet';
import About from '../pages/About';
import Help from '../pages/Help';
import Specialists from '../pages/Specialists';
import Doctors,{DoctorDetail} from '../pages/Doctors';
import Glossary from '../pages/Glossary';
import Children from '../pages/Children';
import ChildRoute from '../pages/ChildRoute';
import Timeline from '../pages/Timeline';
import CheckIn from '../pages/CheckIn';
import Changes from '../pages/Changes';
import Library from '../pages/Library';
import Difficulties from '../pages/Difficulties';
import Navigator,{NavigatorRoute,NavigatorTopic} from '../pages/Navigator';
import SafetyPlan from '../pages/SafetyPlan';
import Documents from '../pages/Documents';
import SaveFile from '../pages/SaveFile';
import Feedback from '../pages/Feedback';
import Passport from '../pages/Passport';
import Plans,{PlanDetail} from '../pages/Plans';
import ParentSupport from '../pages/ParentSupport';
import {SendForm,TeacherForm,ImportAnswer} from '../pages/Handoff';
import Exams,{ExamDetail} from '../pages/Exams';
import Methods,{MethodDetail} from '../pages/Methods';
import SpecialistDetail from '../pages/SpecialistDetail';
import JournalCatalog from '../pages/JournalCatalog';
import JournalEditor from '../pages/JournalEditor';
import JournalHistory,{JournalSavedRecord} from '../pages/JournalHistory';
import Screenings from '../pages/Screenings';
import ScreeningDetail from '../pages/ScreeningDetail';
import ScreeningHistory,{ScreeningSavedResult} from '../pages/ScreeningHistory';
import {getStartParam,initTwa,setTelegramBack} from '../lib/twa';
import {useActiveChild} from '../lib/useActiveChild';
import {hasStorageError} from '../lib/persist';
import {applySettings,subscribeSettings} from '../lib/settings';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="container"><h1>Не удалось открыть экран</h1><p style={{margin:'15px 0'}}>Попробуйте перезагрузить приложение. Уже сохранённые записи останутся в браузере.</p><button className="btn" onClick={()=>window.location.reload()}>Перезагрузить</button></div>:this.props.children;}
}
function NavigationEffects() {
 const location=useLocation(),navigate=useNavigate();
 useEffect(()=>{window.scrollTo(0,0);document.body.scrollTop=0;},[location.pathname]);
 useEffect(()=>setTelegramBack(location.pathname!=='/',()=>{if((window.history.state?.idx||0)>0)navigate(-1);else navigate('/');}),[location.pathname,navigate]);
 // A teacher's answer opened as t.me/<bot>?startapp=… arrives as the start parameter of the mini app.
 useEffect(()=>{const p=getStartParam();try{if(p&&sessionStorage.getItem('kora.start')!==p){sessionStorage.setItem('kora.start',p);navigate('/import#'+p);}}catch{}},[navigate]);
 return null;
}
/** Child pages start fresh for each child: form state and drafts never carry over to another child. */
function PerChild({children}:{children:React.ReactNode}){const child=useActiveChild();return <React.Fragment key={child?.id||'none'}>{children}</React.Fragment>;}
function StorageNotice(){
 const [failed,setFailed]=useState(hasStorageError);
 useEffect(()=>{const handle=()=>setFailed(true);if(hasStorageError())handle();window.addEventListener('psyparent:storage-error',handle);return ()=>window.removeEventListener('psyparent:storage-error',handle);},[]);
 return failed?<div className="storageNotice" role="alert">Браузер не разрешает сохранять записи. Не закрывайте страницу до копирования нужного текста; сохранение может не работать.</div>:null;
}
export default function App() {
 const path=useLocation().pathname,teacher=path==='/t'||path==='/save';
 useEffect(()=>initTwa(),[]);
 useEffect(()=>subscribeSettings(()=>applySettings()),[]);
 return <ErrorBoundary><a className="skipLink" href="#main" onClick={event=>{event.preventDefault();const main=document.getElementById('main');main?.focus();main?.scrollIntoView();}}>К содержанию</a><StorageNotice/><NavigationEffects/><main id="main" tabIndex={-1}><Routes>
 <Route path="/" element={<Home/>}/><Route path="/diagnoses" element={<Diagnoses/>}/>
 <Route path="/diagnoses/group/:id" element={<DiagnosisGroup/>}/><Route path="/diagnoses/:id" element={<DiagnosisDetail/>}/>
 <Route path="/medications" element={<Medications/>}/><Route path="/medications/group/:id" element={<MedicationGroupRedirect/>}/><Route path="/medications/:id" element={<MedicationDetail/>}/>
 <Route path="/review" element={<TreatmentReview/>}/><Route path="/visit" element={<PerChild><VisitSheet/></PerChild>}/><Route path="/about" element={<About/>}/><Route path="/help" element={<Help/>}/><Route path="/feedback" element={<Feedback/>}/><Route path="/parent" element={<ParentSupport/>}/><Route path="/plans" element={<PerChild><Plans/></PerChild>}/><Route path="/plans/:id" element={<PerChild><PlanDetail/></PerChild>}/><Route path="/child/passport" element={<PerChild><Passport/></PerChild>}/>
 <Route path="/glossary" element={<Glossary/>}/><Route path="/children" element={<Children/>}/><Route path="/child" element={<PerChild><ChildRoute/></PerChild>}/><Route path="/child/timeline" element={<PerChild><Timeline/></PerChild>}/><Route path="/child/check-in" element={<PerChild><CheckIn/></PerChild>}/><Route path="/child/safety" element={<PerChild><SafetyPlan/></PerChild>}/><Route path="/child/documents" element={<PerChild><Documents/></PerChild>}/><Route path="/visit/changes" element={<PerChild><Changes/></PerChild>}/><Route path="/library" element={<Library/>}/><Route path="/difficulties" element={<Difficulties/>}/><Route path="/navigator" element={<Navigator/>}/><Route path="/navigator/:id" element={<NavigatorRoute/>}/><Route path="/navigator/topic/:id" element={<NavigatorTopic/>}/><Route path="/exams" element={<Exams/>}/><Route path="/exams/:id" element={<ExamDetail/>}/><Route path="/methods" element={<Methods/>}/><Route path="/methods/:id" element={<MethodDetail/>}/><Route path="/doctors" element={<Doctors/>}/><Route path="/doctors/:id" element={<DoctorDetail/>}/><Route path="/specialists" element={<Specialists/>}/><Route path="/specialists/:id" element={<SpecialistDetail/>}/>
 <Route path="/forms" element={<JournalCatalog/>}/><Route path="/forms/history" element={<JournalHistory/>}/><Route path="/forms/record/:recordId" element={<JournalSavedRecord/>}/><Route path="/forms/:formId" element={<JournalEditor/>}/>
 <Route path="/screenings" element={<Screenings/>}/><Route path="/screenings/send" element={<SendForm/>}/><Route path="/t" element={<TeacherForm/>}/><Route path="/save" element={<SaveFile/>}/><Route path="/import" element={<ImportAnswer/>}/><Route path="/screenings/history" element={<ScreeningHistory/>}/><Route path="/screenings/result/:resultId" element={<ScreeningSavedResult/>}/><Route path="/screenings/:id" element={<ScreeningDetail/>}/>
 <Route path="*" element={<div className="container"><h1>Страница не найдена</h1><p style={{margin:'16px 0'}}>Возможно, ссылка устарела. Ваши записи доступны в разделе «К врачу».</p><Link to="/" className="btn">На главную</Link></div>}/>
 </Routes></main><ToastHost/>{!teacher&&<BottomNav/>}</ErrorBoundary>;
}
