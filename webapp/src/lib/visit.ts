import {diagnoses,medicationById} from './content';
import {readJSON, writeJSON} from './persist';
export type MedDetail = {dose?: string; schedule?: string; goal?: string; monitoring?: string; warnings?: string; note?: string};
export type ChecklistSnapshot = {id: string; title: string; lines: string[]; updatedAt?: string; migrated?: boolean};
export type VisitState = {version: 2; questions: string[]; meds: string[]; medDetails: Record<string, MedDetail>; checklists: Record<string, ChecklistSnapshot>};
export const VISIT_KEY = 'psyparent.visit.v2';
const EVENT = 'psyparent:visit-updated';
const strings = (value: unknown): string[] => Array.isArray(value) ? Array.from(new Set(value.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean))) : [];
const empty = (): VisitState => ({version:2,questions:[],meds:[],medDetails:{},checklists:{}});
function details(raw: unknown): Record<string,MedDetail> {
  const out: Record<string,MedDetail> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id,value] of Object.entries(raw)) {
    const item: MedDetail = {};
    if (typeof value === 'string') item.note = value;
    else if(value && typeof value === 'object') {
      for(const field of ['dose','schedule','goal','monitoring','warnings','note'] as const) {
        const v = (value as Record<string,unknown>)[field];
        if(typeof v === 'string' && v.trim()) item[field] = v;
      }
    }
    if(Object.keys(item).length) out[id] = item;
  }
  return out;
}
export function normalizeVisit(raw: unknown): VisitState {
  const base = empty();
  if(!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string,unknown>;
  base.questions = strings(obj.questions);
  base.meds = strings(obj.meds);
  base.medDetails = details(obj.medDetails);
  for(const id of Object.keys(base.medDetails)) if(!base.meds.includes(id)) delete base.medDetails[id];
  if(obj.checklists && typeof obj.checklists === 'object') {
    for(const [id,c] of Object.entries(obj.checklists)) {
      if(c && typeof c === 'object' && typeof c.title === 'string') {
        base.checklists[id] = {id,title:c.title,lines:strings(c.lines),updatedAt:typeof c.updatedAt === 'string'?c.updatedAt:undefined,migrated:!!c.migrated};
      }
    }
  }
  return base;
}
export function getVisit(): VisitState {
  const stored = readJSON<unknown>(VISIT_KEY,null);
  if(stored) return normalizeVisit(stored);
  const old = readJSON<any>('parentguide.visit.v1',null);
  const base = normalizeVisit(old);
  base.questions = strings([...(Array.isArray(old)?old:base.questions),...strings(readJSON('parentguide.visit.questions.v1',[])),...strings(readJSON<any>('parentguide.visitSheet.v1',{})?.items)]);
  base.meds = strings([...base.meds,...strings(readJSON('parentguide.visit.meds.v1',[]))]);
  base.medDetails = details(old?.medDetails ?? old?.details ?? old?.medsDetails ?? old?.notes ?? old?.medNotes);
  const normal: string[] = [];
  for(const text of base.questions) {
    if(!text.startsWith('[DX] ')) {normal.push(text);continue;}
    const lines = text.replace(/^\[DX\]\s*/, '').split('\n');
    const title = lines[0].replace(/:\s*Полные критерии.*$/, '').trim();
    const id = diagnoses.find(d=>d.title === title)?.id || 'legacy-' + encodeURIComponent(title);
    const previous = base.checklists[id]?.lines || [];
    base.checklists[id] = {id,title,lines:strings([...previous,...lines.slice(1).map(l=>l.replace(/^\d+\.\s*/,''))]),migrated:true};
  }
  base.questions = normal;
  return base;
}
function update(fn: (v:VisitState)=>VisitState) {
  const next = normalizeVisit(fn(getVisit()));
  if(!writeJSON(VISIT_KEY,next)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}
export function addVisitQuestion(text: string) {
  const q=text.trim();
  if(!q) return false;
  return update(v=>({...v,questions:strings([...v.questions,q])}));
}
export function removeVisitQuestion(text: string) {return update(v=>({...v,questions:v.questions.filter(q=>q!==text)}));}
export function addVisitMedication(id: string) {if(medicationById(id)?.noteOnly)return false;return update(v=>({...v,meds:strings([...v.meds,id])}));}
export function removeVisitMedication(id: string) {
  return update(v=>{const md={...v.medDetails};delete md[id];return {...v,meds:v.meds.filter(m=>m!==id),medDetails:md};});
}
export function setVisitMedicationField(id:string,field:keyof MedDetail,value:string) {
  return update(v=>({...v,meds:strings([...v.meds,id]),medDetails:{...v.medDetails,[id]:{...v.medDetails[id],[field]:value}}}));
}
export function upsertChecklist(id:string,title:string,lines:string[]) {
  return update(v=>({...v,checklists:{...v.checklists,[id]:{id,title,lines,updatedAt:new Date().toISOString()}}}));
}
export function removeChecklist(id:string) {
  return update(v=>{const next={...v.checklists};delete next[id];return {...v,checklists:next};});
}
export function clearVisit(){return update(()=>empty());}
export function subscribeVisit(handler:()=>void) {
  const storage = (e:StorageEvent)=>{if(!e.key || e.key===VISIT_KEY || e.key.startsWith('parentguide.'))handler();};
  window.addEventListener(EVENT,handler);
  window.addEventListener('storage',storage);
  return ()=>{window.removeEventListener(EVENT,handler);window.removeEventListener('storage',storage);};
}
