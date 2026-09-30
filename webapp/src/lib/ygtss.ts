import data from '../content/ygtss-clinical.json';
export const ticCriteria=data.criteria;
export const ticGroups=data.groups.map(g=>({...g,items:g.items.map((label,i)=>({id:g.id+':'+i,label}))}));
export const ticItemById=(id:string)=>ticGroups.flatMap(g=>g.items).find(x=>x.id===id)?.label;
