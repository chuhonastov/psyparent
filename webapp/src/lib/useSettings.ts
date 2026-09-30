import {useEffect,useState} from 'react';
import {getSettings,subscribeSettings} from './settings';
export function useSettings(){const [value,setValue]=useState(getSettings);useEffect(()=>subscribeSettings(()=>setValue(getSettings())),[]);return value;}
