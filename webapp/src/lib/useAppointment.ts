import {useEffect,useState} from 'react';
import {getAppointment,subscribeAppointment} from './appointment';
export function useAppointment(){const [value,setValue]=useState(getAppointment);useEffect(()=>subscribeAppointment(()=>setValue(getAppointment())),[]);return value;}
