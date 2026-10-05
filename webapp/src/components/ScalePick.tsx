import React from 'react';
/** One answer out of a few short options, as a row of buttons; clicking the chosen one clears it. */
export default function ScalePick({name,labels,value,onChange,legend,hint,danger}:{name:string;labels:string[];value:number|undefined;onChange:(v:number|undefined)=>void;legend:string;hint?:string;danger?:boolean}){
 return <fieldset className={'plainFieldset scalePick'+(danger?' danger':'')}><legend className="fieldLabel">{legend}{hint&&<span className="small muted"> — {hint}</span>}</legend>
  <div className="optionRow">{labels.map((l,i)=><label key={l} className={value===i?'selected':''}><input type="radio" name={name} checked={value===i} onChange={()=>onChange(i)} onClick={()=>{if(value===i)onChange(undefined);}}/>{l}</label>)}</div>
 </fieldset>;
}
