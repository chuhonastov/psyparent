import React,{useMemo} from 'react';
import {useSearchParams} from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import glossaryRaw from '../content/glossary.json';
export type GlossaryEntry={term:string;aka:string[];text:string};
export const glossary=glossaryRaw as GlossaryEntry[];
const norm=(s:string)=>s.toLowerCase().replace(/ё/g,'е');
export function searchGlossary(q:string){const n=norm(q.trim());return n?glossary.filter(g=>[g.term,...g.aka].some(t=>norm(t).includes(n))||norm(g.text).includes(n)):glossary;}
export default function Glossary(){
 const [params,setParams]=useSearchParams(),q=params.get('q')||'';
 const shown=useMemo(()=>searchGlossary(q).slice().sort((a,b)=>a.term.localeCompare(b.term,'ru')),[q]);
 return <div className="container"><PageHeader title="Словарь" subtitle="Слова из заключений и этого справочника — простыми словами." backTo="/about" backLabel="О проекте"/>
 <div className="searchWrap"><Icon name="search"/><input type="search" className="input" aria-label="Найти слово" placeholder="Например, СИОЗС или ПМПК" value={q} onChange={e=>setParams(e.target.value?{q:e.target.value}:{},{replace:true})}/></div>
 <p className="searchMeta" role="status">{shown.length?'Слов: '+shown.length:'Такого слова пока нет'}</p>
 <dl className="glossary">{shown.map(g=><div className="card" key={g.term} id={g.term}><dt><h2>{g.term}</h2>{!!g.aka.length&&<p className="small muted">{g.aka.join(' · ')}</p>}</dt><dd><p>{g.text}</p></dd></div>)}</dl>
 </div>;
}
