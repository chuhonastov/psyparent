import React from 'react';
import {Link} from 'react-router-dom';
import Icon from './Icon';
export default function PageHeader({title,subtitle,backTo,backLabel='Назад',right,eyebrow}:{title:string;subtitle?:string;backTo?:string;backLabel?:string;right?:React.ReactNode;eyebrow?:string}) {
 return <header className="pageHeader">{(backTo||right)&&<div className="headerTop">{backTo?<Link className="backLink" to={backTo}><Icon name="back" size={17}/>{backLabel}</Link>:<span/>}{right}</div>}
 {eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle&&<p className="lead">{subtitle}</p>}</header>;
}
