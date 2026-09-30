import {useEffect,useState} from 'react';
import {getRecent,subscribeRecent} from './recent';
export function useRecent(){const [items,setItems]=useState(getRecent);useEffect(()=>subscribeRecent(()=>setItems(getRecent())),[]);return items;}
