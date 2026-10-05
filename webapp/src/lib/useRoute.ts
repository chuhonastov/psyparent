import {useEffect,useMemo,useState} from 'react';
import {useChildren} from './useChildren';
import {useScreenings} from './useScreenings';
import {useJournals} from './useJournals';
import {useAppointment} from './useAppointment';
import {useVisitCount} from './useVisitCount';
import {getActiveChild,getProfile,subscribeProfiles} from './profile';
import {getEvents,subscribeTreatment} from './treatment';
import {getCheckIns,subscribeCheckIns} from './monitoring';
import {localDate} from './screenings';
import type {RouteData} from './route';
function useStore<T>(read:()=>T,subscribe:(h:()=>void)=>()=>void,deps:unknown[]){
 const [value,setValue]=useState(read);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{setValue(read());return subscribe(()=>setValue(read()));},deps);
 return value;
}
export function useActiveChild(){const children=useChildren(),[tick,setTick]=useState(0);useEffect(()=>subscribeProfiles(()=>setTick(t=>t+1)),[]);return useMemo(()=>getActiveChild(children),[children,tick]);}
export const useProfile=(childId:string)=>useStore(()=>getProfile(childId),subscribeProfiles,[childId]);
export const useEvents=(childId:string)=>useStore(()=>getEvents(childId),subscribeTreatment,[childId]);
export const useCheckIns=(childId:string)=>useStore(()=>getCheckIns(childId),subscribeCheckIns,[childId]);
/** Everything the route screens need for one child, refreshed when any of the records change. */
export function useRouteData(childId:string|undefined):RouteData|null{
 const children=useChildren(),child=children.find(c=>c.id===childId)||null,id=child?.id||'';
 const profile=useProfile(id),events=useEvents(id),checkIns=useCheckIns(id),screenings=useScreenings(),journals=useJournals(),appointment=useAppointment(),memoCount=useVisitCount();
 return useMemo(()=>child?{child,profile,events,checkIns,screenings,journals,appointment,memoCount,today:localDate()}:null,[child,profile,events,checkIns,screenings,journals,appointment,memoCount]);
}
