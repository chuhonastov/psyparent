import React from 'react';
import {Navigate,useParams} from 'react-router-dom';
import {medicationCategories} from '../lib/content';
export default function MedicationGroupRedirect() {
 const {id=''}=useParams();
 const aliases:Record<string,string>={tranquilizers:'sedatives',nootropics:'evidence',other_meds:''};
 const category=id in aliases?aliases[id]:id;
 return <Navigate replace to={medicationCategories.some(c=>c.id===category)?'/medications?category='+category:'/medications'}/>;
}
