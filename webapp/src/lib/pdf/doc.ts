// A small document model for PDFs meant for specialists: tables and short blocks instead of a wall of text.
// Builders (lib/reports.ts) make it from the records; pdf/makePdf.ts draws it. Plain data, so it can also travel
// to the phone browser inside a link (lib/files.ts).
export type Tone='good'|'bad'|'warn'|'muted'|'sev0'|'sev1'|'sev2'|'sev3'|'accent';
export type Cell=string|{text:string;tone?:Tone;bold?:boolean};
export type Block=
 |{t:'title';kicker:string;title:string;meta?:string[]}
 |{t:'facts';items:{label:string;value:string;tone?:'danger'}[]}
 |{t:'h';text:string;note?:string}
 |{t:'table';head:string[];rows:Cell[][];widths?:number[];note?:string}
 |{t:'list';items:string[];numbered?:boolean}
 |{t:'callout';tone:'danger'|'warn'|'info';title:string;items?:string[]}
 |{t:'legend';items:{tone:Tone;label:string}[]}
 |{t:'text';text:string;muted?:boolean};
export type Doc={title:string;running:string;footer:string;blocks:Block[]};
const TONES=new Set(['good','bad','warn','muted','sev0','sev1','sev2','sev3','accent']);
const str=(v:unknown,max=4000)=>typeof v==='string'?v.slice(0,max):'';
const cell=(c:any):Cell=>typeof c==='string'?c.slice(0,2000):{text:str(c?.text,2000),...(TONES.has(c?.tone)?{tone:c.tone}:{}),...(c?.bold?{bold:true}:{})};
/** Accepts a document that came from a link: unknown parts are dropped, every value becomes plain text. */
export function cleanDoc(d:any):Doc|null{
 if(!d||typeof d!=='object'||!Array.isArray(d.blocks)||d.blocks.length>400)return null;
 const blocks:Block[]=[];
 for(const b of d.blocks){
  if(!b||typeof b!=='object')continue;
  const list=(v:unknown,max=200)=>Array.isArray(v)?v.slice(0,max).map(x=>str(x)):[];
  switch(b.t){
   case 'title':blocks.push({t:'title',kicker:str(b.kicker,120),title:str(b.title,200),meta:list(b.meta,10)});break;
   case 'facts':blocks.push({t:'facts',items:(Array.isArray(b.items)?b.items:[]).slice(0,20).map((x:any)=>({label:str(x?.label,120),value:str(x?.value,2000),...(x?.tone==='danger'?{tone:'danger' as const}:{})}))});break;
   case 'h':blocks.push({t:'h',text:str(b.text,200),...(b.note?{note:str(b.note,400)}:{})});break;
   case 'table':blocks.push({t:'table',head:list(b.head,12),rows:(Array.isArray(b.rows)?b.rows:[]).slice(0,600).map((r:any)=>Array.isArray(r)?r.slice(0,12).map(cell):[]),...(Array.isArray(b.widths)?{widths:b.widths.slice(0,12).map((n:any)=>Number(n)||1)}:{}),...(b.note?{note:str(b.note,400)}:{})});break;
   case 'list':blocks.push({t:'list',items:list(b.items,300),...(b.numbered?{numbered:true}:{})});break;
   case 'callout':blocks.push({t:'callout',tone:b.tone==='danger'||b.tone==='warn'?b.tone:'info',title:str(b.title,300),items:list(b.items,40)});break;
   case 'legend':blocks.push({t:'legend',items:(Array.isArray(b.items)?b.items:[]).slice(0,10).filter((x:any)=>TONES.has(x?.tone)).map((x:any)=>({tone:x.tone,label:str(x.label,60)}))});break;
   case 'text':blocks.push({t:'text',text:str(b.text),...(b.muted?{muted:true}:{})});break;
  }
 }
 return {title:str(d.title,200),running:str(d.running,200),footer:str(d.footer,300),blocks};
}
