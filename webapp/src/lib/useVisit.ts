import {useEffect,useState} from 'react';
import {getVisit,subscribeVisit} from './visit';
export function useVisit() {
  const [visit,setVisit] = useState(getVisit);
  useEffect(()=>subscribeVisit(()=>setVisit(getVisit())),[]);
  return visit;
}
