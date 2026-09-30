import React from 'react';
export type TrendPoint={label:string;value:number|null};
// Small dependency-free line chart for diary values between visits. Gaps stay gaps: an empty field is not zero.
export default function TrendChart({title,unit,points}:{title:string;unit?:string;points:TrendPoint[]}){
 const values=points.map(p=>p.value).filter((v):v is number=>v!==null);
 if(values.length<2)return null;
 const W=320,H=130,padL=34,padR=10,padT=12,padB=26,min=Math.min(0,...values),max=Math.max(...values),span=max-min||1;
 const x=(i:number)=>padL+(points.length===1?0:i*(W-padL-padR)/(points.length-1));
 const y=(v:number)=>padT+(H-padT-padB)*(1-(v-min)/span);
 const segments:string[]=[];let cur='';
 points.forEach((p,i)=>{if(p.value===null){if(cur)segments.push(cur);cur='';return;}cur+=(cur?' L':'M')+x(i).toFixed(1)+' '+y(p.value).toFixed(1);});if(cur)segments.push(cur);
 const last=values[values.length-1],first=values[0];
 return <figure className="trendChart"><figcaption><strong>{title}</strong><span className="small muted">{first.toLocaleString('ru-RU')} → {last.toLocaleString('ru-RU')}{unit?' '+unit:''}</span></figcaption>
 <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${points.map(p=>p.label+' — '+(p.value??'нет данных')).join('; ')}`}>
  {[min,(min+max)/2,max].map((v,i)=><g key={i}><line x1={padL} x2={W-padR} y1={y(v)} y2={y(v)} className="trendGrid"/><text x={padL-6} y={y(v)+4} textAnchor="end" className="trendAxis">{Number.isInteger(v)?v:v.toFixed(1)}</text></g>)}
  {segments.map((d,i)=><path key={i} d={d} className="trendLine"/>)}
  {points.map((p,i)=>p.value===null?null:<circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} className="trendDot"/>)}
  {points.map((p,i)=>(i===0||i===points.length-1||points.length<=6)?<text key={'l'+i} x={x(i)} y={H-8} textAnchor={i===0?'start':i===points.length-1?'end':'middle'} className="trendAxis">{p.label}</text>:null)}
 </svg></figure>;
}
