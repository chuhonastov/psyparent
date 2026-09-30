import React from 'react';
import {Link,useParams,Navigate} from 'react-router-dom';
import {diagnosisById,dxName,topicLabel} from '../lib/content';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
export default function DiagnosisGroup() {
 const {id=''}=useParams(),group=diagnosisById(id);
 if(!group||group.kind!=='group')return <Navigate to="/diagnoses" replace/>;
 return <div className="container"><PageHeader title={group.title} subtitle={group.summary} backTo="/diagnoses" backLabel="Все темы"/><div className="list">{group.children?.map(id=>{const d=diagnosisById(id);return d?<Link className="listCard" key={id} to={'/diagnoses/'+id}><div className="listMain"><span className="tag">{topicLabel(d)}</span><h3>{dxName(d)}</h3><p>{d.summary}</p></div><Icon name="arrow" size={17}/></Link>:null;})}</div></div>;
}
