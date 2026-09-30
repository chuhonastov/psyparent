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
import SpecialistDetail from '../pages/SpecialistDetail';
import JournalCatalog from '../pages/JournalCatalog';
import JournalEditor from '../pages/JournalEditor';
import JournalHistory,{JournalSavedRecord} from '../pages/JournalHistory';
import Screenings from '../pages/Screenings';
import ScreeningDetail from '../pages/ScreeningDetail';
import ScreeningHistory,{ScreeningSavedResult} from '../pages/ScreeningHistory';
import {initTwa,setTelegramBack} from '../lib/twa';
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
 return null;
}
function StorageNotice(){
 const [failed,setFailed]=useState(hasStorageError);
 useEffect(()=>{const handle=()=>setFailed(true);if(hasStorageError())handle();window.addEventListener('psyparent:storage-error',handle);return ()=>window.removeEventListener('psyparent:storage-error',handle);},[]);
 return failed?<div className="storageNotice" role="alert">Браузер не разрешает сохранять записи. Не закрывайте страницу до копирования нужного текста; сохранение может не работать.</div>:null;
}
export default function App() {
 useEffect(()=>initTwa(),[]);
 useEffect(()=>subscribeSettings(()=>applySettings()),[]);
 return <ErrorBoundary><a className="skipLink" href="#main" onClick={event=>{event.preventDefault();const main=document.getElementById('main');main?.focus();main?.scrollIntoView();}}>К содержанию</a><StorageNotice/><NavigationEffects/><main id="main" tabIndex={-1}><Routes>
 <Route path="/" element={<Home/>}/><Route path="/diagnoses" element={<Diagnoses/>}/>
 <Route path="/diagnoses/group/:id" element={<DiagnosisGroup/>}/><Route path="/diagnoses/:id" element={<DiagnosisDetail/>}/>
 <Route path="/medications" element={<Medications/>}/><Route path="/medications/group/:id" element={<MedicationGroupRedirect/>}/><Route path="/medications/:id" element={<MedicationDetail/>}/>
 <Route path="/review" element={<TreatmentReview/>}/><Route path="/visit" element={<VisitSheet/>}/><Route path="/about" element={<About/>}/><Route path="/help" element={<Help/>}/>
 <Route path="/glossary" element={<Glossary/>}/><Route path="/children" element={<Children/>}/><Route path="/doctors" element={<Doctors/>}/><Route path="/doctors/:id" element={<DoctorDetail/>}/><Route path="/specialists" element={<Specialists/>}/><Route path="/specialists/:id" element={<SpecialistDetail/>}/>
 <Route path="/forms" element={<JournalCatalog/>}/><Route path="/forms/history" element={<JournalHistory/>}/><Route path="/forms/record/:recordId" element={<JournalSavedRecord/>}/><Route path="/forms/:formId" element={<JournalEditor/>}/>
 <Route path="/screenings" element={<Screenings/>}/><Route path="/screenings/history" element={<ScreeningHistory/>}/><Route path="/screenings/result/:resultId" element={<ScreeningSavedResult/>}/><Route path="/screenings/:id" element={<ScreeningDetail/>}/>
 <Route path="*" element={<div className="container"><h1>Страница не найдена</h1><p style={{margin:'16px 0'}}>Возможно, ссылка устарела. Ваши записи доступны в разделе «К врачу».</p><Link to="/" className="btn">На главную</Link></div>}/>
 </Routes></main><ToastHost/><BottomNav/></ErrorBoundary>;
}
