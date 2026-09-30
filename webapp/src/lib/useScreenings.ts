import {useEffect,useState} from 'react';
import {getScreenings,subscribeScreenings} from './screenings';
export function useScreenings(){const [results,setResults]=useState(getScreenings);useEffect(()=>subscribeScreenings(()=>setResults(getScreenings())),[]);return results;}
