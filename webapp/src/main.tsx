import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter,HashRouter} from 'react-router-dom';
import App from './app/App';
import {applySettings} from './lib/settings';
import {bootSync} from './lib/sync';
import {askPersistentStorage} from './lib/device';
import './styles.css';
const Router = window.location.protocol === 'file:' || window.__PSYPARENT_OFFLINE__ ? HashRouter : BrowserRouter;
applySettings();
// In Telegram the first screen waits up to 1.5 s for records kept in Telegram storage; in a browser it opens at once.
bootSync().finally(()=>{
 applySettings();
 ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Router><App/></Router></React.StrictMode>);
 askPersistentStorage();
});
if('serviceWorker' in navigator&&window.location.protocol==='https:'&&!window.__PSYPARENT_OFFLINE__)window.addEventListener('load',()=>{navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{});});
