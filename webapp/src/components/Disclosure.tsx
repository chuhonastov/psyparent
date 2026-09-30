import React,{useId,useState} from 'react';
export default function Disclosure({title,children,defaultOpen=false,tone='neutral',right}:{title:string;children:React.ReactNode;defaultOpen?:boolean;tone?:'neutral'|'green'|'lime'|'red';right?:React.ReactNode}) {
 const [open,setOpen]=useState(defaultOpen),id=useId();
 return <section className={'disclosure tone-'+tone+(open?' open':'')}>
 <button className="disclosureHeader" type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><span>{title}{right}</span><span className="disclosureChevron" aria-hidden="true"/></button>
 {open&&<div className="disclosureBody" id={id}>{children}</div>}</section>;
}
