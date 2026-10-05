import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {setStatsConsent,statsConsent,subscribeStats} from '../lib/analytics';
/** Asked once: may Кора count how it is used. Nothing is sent before the answer, and «Нет» is final until changed in «О проекте». */
export default function StatsPrompt(){
 const [consent,setConsent]=useState(statsConsent);
 useEffect(()=>subscribeStats(()=>setConsent(statsConsent())),[]);
 if(consent||window.location.protocol==='file:'||window.__PSYPARENT_OFFLINE__)return null;
 return <section className="callout statsPrompt" aria-labelledby="stats-title"><strong id="stats-title">Можно считать, как используют «Кору»?</strong>
  <p>Только числа: сколько раз открывали приложение и какие функции пригодились. Без имён, записей, диагнозов и лекарств — их «Кора» никуда не отправляет. Это поможет понять, что улучшать.</p>
  <div className="buttonRow" style={{marginTop:10,alignItems:'center'}}><button type="button" className="btn compact" onClick={()=>setStatsConsent('yes')}>Да, можно</button><button type="button" className="btn secondary compact" onClick={()=>setStatsConsent('no')}>Нет</button><Link className="textButton" to="/about#stats">Подробнее</Link></div>
 </section>;
}
