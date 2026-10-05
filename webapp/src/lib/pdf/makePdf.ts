import {jsPDF} from 'jspdf';
import {BOLD,REGULAR,SUPPORTED} from './fontData';
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
export function makePdf(text:string,meta:{title?:string}={}):Blob{
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
 doc.addFileToVFS('KoraPDFSans-Regular.ttf',REGULAR);doc.addFont('KoraPDFSans-Regular.ttf','Kora','normal');
 doc.addFileToVFS('KoraPDFSans-Bold.ttf',BOLD);doc.addFont('KoraPDFSans-Bold.ttf','Kora','bold');
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
