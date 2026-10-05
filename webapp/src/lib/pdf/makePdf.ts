import {jsPDF} from 'jspdf';
import {BOLD,REGULAR,SUPPORTED} from './fontData';
import type {Cell,Doc,Tone} from './doc';
// Plain-text exports of the app become a tidy A4 PDF: title, CAPITAL section headings, «Label:» subheadings, bullet lists.
// Loaded on demand (dynamic import), so the font and jsPDF do not slow down the app start.
const W=210,H=297,M=18,TOP=20,BOTTOM=18,PT=0.3528;
const ACCENT:[number,number,number]=[25,94,78],MUTED:[number,number,number]=[92,110,104],TEXT:[number,number,number]=[32,51,46];
const inFont=(c:number)=>SUPPORTED.some(([a,b])=>c>=a&&c<=b);
/** Characters the embedded font cannot draw: close look-alikes, otherwise dropped (emoji and other scripts). */
export function cleanText(text:string){
 return text.replace(/‑/g,'-').replace(/[✓✔]/g,'+').replace(/[✕✖×]/g,'×').replace(/\r\n?/g,'\n').replace(/\t/g,'  ')
  .split('').filter(ch=>ch==='\n'||inFont(ch.codePointAt(0)!)).join('');
}
type Kind='title'|'subtitle'|'section'|'sub'|'bullet'|'number'|'text'|'blank'|'footer';
export function classify(lines:string[]):{kind:Kind;text:string;mark?:string}[]{
 return lines.map((raw,i)=>{
  const line=raw.trim(),prevBlank=i>0&&!lines[i-1].trim(),next=(lines[i+1]||'').trim();
  if(!line)return {kind:'blank',text:''};
  if(i===0)return {kind:'title',text:line};
  if(i===1&&line.length<140)return {kind:'subtitle',text:line};
  if(/^Составлено в приложении/.test(line))return {kind:'footer',text:line};
  // «ЛЕНТА ЛЕЧЕНИЯ · Маша, 9 лет»: the part before « · » decides.
  const letters=line.split(' · ')[0].replace(/[^A-Za-zА-Яа-яЁё]/g,'');
  if(letters.length>=4&&letters===letters.toLocaleUpperCase('ru'))return {kind:'section',text:line};
  const bullet=/^([•\-—–*])\s+(.*)$/.exec(line);if(bullet)return {kind:'bullet',text:bullet[2],mark:'•'};
  const num=/^(\d{1,2}[.)])\s+(.*)$/.exec(line);if(num)return {kind:'number',text:num[2],mark:num[1]};
  if(line.length<=70&&(/:$/.test(line)||(prevBlank&&!/[.!?]$/.test(line)&&!/: /.test(line)&&(/^[•\-—]/.test(next)||/^[^:]{1,30}: /.test(next)||!next))))return {kind:'sub',text:line.replace(/:$/,'')};
  return {kind:'text',text:line};
 });
}
function newPdf(){
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
 doc.addFileToVFS('KoraPDFSans-Regular.ttf',REGULAR);doc.addFont('KoraPDFSans-Regular.ttf','Kora','normal');
 doc.addFileToVFS('KoraPDFSans-Bold.ttf',BOLD);doc.addFont('KoraPDFSans-Bold.ttf','Kora','bold');
 return doc;
}
export function makePdf(text:string,meta:{title?:string}={}):Blob{
 const doc=newPdf();
 const blocks=classify(cleanText(text).split('\n')),title=meta.title||blocks[0]?.text||'Кора';
 doc.setProperties({title,creator:'Кора',subject:'Записи семьи'});
 let y=TOP;
 const width=W-2*M;
 const put=(t:string,{size=10.5,bold=false,color=TEXT,indent=0,mark,before=0,after=0,lh=1.38}:{size?:number;bold?:boolean;color?:[number,number,number];indent?:number;mark?:string;before?:number;after?:number;lh?:number})=>{
  doc.setFont('Kora',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);
  const step=size*PT*lh,lines:string[]=doc.splitTextToSize(t,width-indent);
  y+=before;
  // Keep a heading with at least two lines of what follows.
  const need=(bold&&size>10.5?3:1)*step;
  if(y+need>H-BOTTOM){doc.addPage();y=TOP;}
  lines.forEach((l,i)=>{if(y+step>H-BOTTOM){doc.addPage();y=TOP;}if(i===0&&mark){doc.setFont('Kora','normal');doc.text(mark,M+indent-(mark==='•'?3.6:5.5),y+size*PT);doc.setFont('Kora',bold?'bold':'normal');}doc.text(l,M+indent,y+size*PT);y+=step;});
  y+=after;
 };
 for(const b of blocks){
  switch(b.kind){
   case 'title':put(b.text,{size:16,bold:true,after:1.5,lh:1.25});break;
   case 'subtitle':put(b.text,{size:9.5,color:MUTED,after:2});break;
   case 'section':put(b.text,{size:11,bold:true,color:ACCENT,before:3,after:1});break;
   case 'sub':put(b.text,{size:10.5,bold:true,before:1.5,after:0.5});break;
   case 'bullet':case 'number':put(b.text,{indent:b.kind==='number'?7:5,mark:b.mark});break;
   case 'blank':y+=2;break;
   case 'footer':put(b.text,{size:8.5,color:MUTED,before:4});break;
   default:put(b.text,{});
  }
 }
 const pages=doc.getNumberOfPages(),made='Сформировано '+new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
 for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFont('Kora','normal');doc.setFontSize(8);doc.setTextColor(...MUTED);doc.text(cleanText('Кора · '+made),M,H-9);doc.text(p+' / '+pages,W-M,H-9,{align:'right'});}
 return doc.output('blob');
}

// Structured documents (lib/pdf/doc.ts): a title band, key facts, tables with coloured cells, short lists.
type RGB=[number,number,number];
const COL={accent:[25,94,78] as RGB,text:TEXT,muted:MUTED,line:[214,224,216] as RGB,soft:[234,243,235] as RGB,white:[255,255,255] as RGB,
 dangerBg:[252,236,232] as RGB,danger:[150,61,53] as RGB,warnBg:[246,239,220] as RGB,warn:[114,96,45] as RGB};
const FILL:Partial<Record<Tone,RGB>>={sev0:[230,243,233],sev1:[252,244,212],sev2:[251,224,192],sev3:[246,205,199]};
const INK:Record<Tone,RGB>={good:[33,112,74],bad:[160,52,42],warn:[140,92,16],muted:[112,126,120],sev0:[45,95,70],sev1:[110,88,14],sev2:[140,72,14],sev3:[140,40,30],accent:[25,94,78]};
export function renderDoc(d:Doc):Blob{
 const pdf=newPdf(),M=16,width=W-2*M,TOP_FIRST=14,TOP=17,LIMIT=H-15,LH=1.28;
 pdf.setLineHeightFactor(LH);
 pdf.setProperties({title:d.title,creator:'Кора',subject:'Записи семьи'});
 let y=TOP_FIRST;
 const font=(size:number,bold=false,color:RGB=TEXT)=>{pdf.setFont('Kora',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);};
 const lines=(text:string,w:number,size:number,bold=false):string[]=>{font(size,bold);return pdf.splitTextToSize(cleanText(text)||' ',w);};
 const hOf=(n:number,size:number)=>n*size*PT*LH;
 const page=()=>{pdf.addPage();y=TOP;};
 const room=(h:number)=>{if(y+h>LIMIT)page();};
 const textOf=(c:Cell)=>typeof c==='string'?c:c.text,toneOf=(c:Cell)=>typeof c==='string'?undefined:c.tone;
 d.blocks.forEach((b,bi)=>{
  const next=d.blocks[bi+1];
  if(b.t==='title'){
   const t=lines(b.title,width,19,true),bandH=17+hOf(t.length,19);
   pdf.setFillColor(...COL.accent);pdf.rect(0,0,W,bandH,'F');
   font(8,true,[186,224,204]);pdf.text(cleanText(b.kicker).toLocaleUpperCase('ru'),M,9,{baseline:'top',charSpace:0.3});
   font(19,true,COL.white);pdf.text(t,M,14,{baseline:'top'});
   y=bandH+5;
   for(const m of b.meta||[]){const l=lines(m,width,9);font(9,false,MUTED);pdf.text(l,M,y,{baseline:'top'});y+=hOf(l.length,9)+0.6;}
   y+=3;
  }else if(b.t==='facts'){
   const gap=4,cw=(width-gap)/2,pad=3;
   for(let i=0;i<b.items.length;i+=2){
    const pair=b.items.slice(i,i+2).map(f=>({f,lab:lines(f.label.toLocaleUpperCase('ru'),cw-2*pad,7,true),val:lines(f.value||'—',cw-2*pad,9.5,true)}));
    const h=Math.max(...pair.map(p=>2*pad+hOf(p.lab.length,7)+1.2+hOf(p.val.length,9.5)));
    room(h);
    pair.forEach((p,k)=>{const x=M+k*(cw+gap);pdf.setFillColor(...(p.f.tone==='danger'?COL.dangerBg:COL.soft));pdf.roundedRect(x,y,cw,h,2,2,'F');
     font(7,true,p.f.tone==='danger'?COL.danger:MUTED);pdf.text(p.lab,x+pad,y+pad,{baseline:'top',charSpace:0.2});
     font(9.5,true,p.f.tone==='danger'?COL.danger:TEXT);pdf.text(p.val,x+pad,y+pad+hOf(p.lab.length,7)+1.2,{baseline:'top'});});
    y+=h+3;
   }
   y+=1;
  }else if(b.t==='h'){
   const note=b.note?lines(b.note,width,8.5):[];
   // Keep a heading with the start of what follows (legend, table header and a row or two).
   room(16+hOf(note.length,8.5)+(next?.t==='legend'?34:next?.t==='table'?24:next?.t==='list'||next?.t==='text'?10:0));
   y+=3;font(12,true,COL.accent);pdf.text(cleanText(b.text),M,y,{baseline:'top'});y+=hOf(1,12)+0.8;
   pdf.setDrawColor(...COL.line);pdf.setLineWidth(0.35);pdf.line(M,y,M+width,y);y+=2.2;
   if(note.length){font(8.5,false,MUTED);pdf.text(note,M,y,{baseline:'top'});y+=hOf(note.length,8.5)+1.5;}
  }else if(b.t==='table'){
   const n=b.head.length,weights=b.widths&&b.widths.length===n?b.widths:Array(n).fill(1),sum=weights.reduce((a,c)=>a+c,0),cols=weights.map(w=>w/sum*width),pad=1.5;
   const measure=(cells:Cell[],size:number,head:boolean)=>{const ls=cols.map((w,i)=>{const c=cells[i]??'',tone=toneOf(c);return lines(textOf(c),w-2*pad,size,head||(typeof c!=='string'&&!!c.bold)||tone==='good'||tone==='bad');});return {ls,h:2*pad+Math.max(...ls.map(l=>hOf(l.length,size)))};};
   const draw=(cells:Cell[],m:{ls:string[][];h:number},size:number,head:boolean)=>{
    let x=M;
    cols.forEach((w,i)=>{const c=cells[i]??'',tone=toneOf(c),fill=head?COL.soft:tone?FILL[tone]:undefined;
     if(fill){pdf.setFillColor(...fill);pdf.rect(x,y,w,m.h,'F');}
     pdf.setDrawColor(...COL.line);pdf.setLineWidth(0.2);pdf.rect(x,y,w,m.h,'S');
     font(size,head||(typeof c!=='string'&&!!c.bold)||tone==='good'||tone==='bad',head?MUTED:tone?INK[tone]:TEXT);
     pdf.text(m.ls[i],x+pad,y+pad,{baseline:'top'});x+=w;});
    y+=m.h;
   };
   const head=measure(b.head,7.8,true);
   room(head.h+12);draw(b.head,head,7.8,true);
   for(const r of b.rows){const m=measure(r,8.6,false);if(y+m.h>LIMIT){page();draw(b.head,head,7.8,true);}draw(r,m,8.6,false);}
   if(b.note){const l=lines(b.note,width,8);room(hOf(l.length,8)+2);y+=1.5;font(8,false,MUTED);pdf.text(l,M,y,{baseline:'top'});y+=hOf(l.length,8);}
   y+=4;
  }else if(b.t==='list'){
   b.items.forEach((it,i)=>{const mark=b.numbered?(i+1)+'.':'•',ind=b.numbered?7:5,l=lines(it,width-ind,9.5);room(hOf(l.length,9.5)+1);
    font(9.5,b.numbered,b.numbered?COL.accent:MUTED);pdf.text(mark,M,y,{baseline:'top'});font(9.5,false,TEXT);pdf.text(l,M+ind,y,{baseline:'top'});y+=hOf(l.length,9.5)+1;});
   y+=2;
  }else if(b.t==='callout'){
   const pad=3.2,inner=width-2*pad-2,title=lines(b.title,inner,9.8,true),items=(b.items||[]).map(x=>lines(x,inner-4,9));
   const h=2*pad+hOf(title.length,9.8)+items.reduce((a,l)=>a+hOf(l.length,9)+0.6,items.length?1.2:0);
   room(h);
   const bg=b.tone==='danger'?COL.dangerBg:b.tone==='warn'?COL.warnBg:COL.soft,ink=b.tone==='danger'?COL.danger:b.tone==='warn'?COL.warn:COL.accent;
   pdf.setFillColor(...bg);pdf.roundedRect(M,y,width,h,2,2,'F');pdf.setFillColor(...ink);pdf.rect(M,y,1.4,h,'F');
   let yy=y+pad;font(9.8,true,ink);pdf.text(title,M+pad+2,yy,{baseline:'top'});yy+=hOf(title.length,9.8)+(items.length?1.2:0);
   items.forEach(l=>{font(9,false,TEXT);pdf.text('•',M+pad+2,yy,{baseline:'top'});pdf.text(l,M+pad+6,yy,{baseline:'top'});yy+=hOf(l.length,9)+0.6;});
   y+=h+4;
  }else if(b.t==='legend'){
   room(8);let x=M;
   for(const it of b.items){font(7.8,false,MUTED);const w=pdf.getTextWidth(cleanText(it.label))+9;if(x+w>M+width){x=M;y+=5;}
    pdf.setFillColor(...(FILL[it.tone]||COL.soft));pdf.setDrawColor(...COL.line);pdf.setLineWidth(0.2);pdf.rect(x,y+0.3,3.4,3.4,'FD');pdf.text(cleanText(it.label),x+4.8,y,{baseline:'top'});x+=w;}
   y+=7;
  }else if(b.t==='text'){
   const l=lines(b.text,width,b.muted?8.5:9.5);room(hOf(l.length,b.muted?8.5:9.5));font(b.muted?8.5:9.5,false,b.muted?MUTED:TEXT);pdf.text(l,M,y,{baseline:'top'});y+=hOf(l.length,b.muted?8.5:9.5)+2.5;
  }
 });
 const pages=pdf.getNumberOfPages();
 for(let p=1;p<=pages;p++){
  pdf.setPage(p);font(7.5,false,MUTED);
  if(p>1){pdf.text(cleanText(d.running),M,8,{baseline:'top'});pdf.setDrawColor(...COL.line);pdf.setLineWidth(0.2);pdf.line(M,12.5,W-M,12.5);}
  pdf.text(cleanText(d.footer),M,H-9);pdf.text(p+' / '+pages,W-M,H-9,{align:'right'});
 }
 return pdf.output('blob');
}
