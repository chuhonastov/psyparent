import {useEffect,useState} from 'react';
import {getChildren,subscribeChildren} from './children';
export function useChildren(){
  const [rows,setRows]=useState(getChildren);
  useEffect(()=>subscribeChildren(()=>setRows(getChildren())),[]);
  return rows;
}
