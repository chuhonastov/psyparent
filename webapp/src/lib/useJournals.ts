import {useEffect,useState} from 'react';
import {getJournals,subscribeJournals} from './journals';
export function useJournals(){const [records,setRecords]=useState(getJournals);useEffect(()=>subscribeJournals(()=>setRecords(getJournals())),[]);return records;}
