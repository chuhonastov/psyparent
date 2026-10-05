import {useEffect,useMemo,useState} from 'react';
import {useChildren} from './useChildren';
import {getActiveChild,subscribeProfiles} from './profile';
/** The chosen child profile, refreshed when profiles or the choice change. */
export function useActiveChild(){const children=useChildren(),[tick,setTick]=useState(0);useEffect(()=>subscribeProfiles(()=>setTick(t=>t+1)),[]);return useMemo(()=>getActiveChild(children),[children,tick]);}
