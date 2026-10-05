import {dataChanged,readJSON,writeJSON} from './persist';
import {childIdForLabel,getChildren} from './children';
import {getActiveChild} from './profile';
import {updateScreenings} from './screenings';
import {updateJournals} from './journals';
import {VISIT_KEY,visitKeyFor,getVisitFor} from './visit';
import {APPOINTMENT_KEY,appointmentKeyFor} from './appointment';
// Keeps every record tied to a child by id, so renaming a profile or switching between children shows the right data.

/** Results and diaries signed with a profile's name get its id — once, so later renames do not break the link. */
export function linkRecordsToChildren(children=getChildren()){
 if(!children.length)return;
 updateScreenings(r=>r.childId?r:{...r,childId:childIdForLabel(r.childLabel,children)});
 updateJournals(r=>r.childId?r:{...r,childId:childIdForLabel(r.childLabel,children)});
}
/** After a rename the child's records follow: linked by id, or still signed with the old name. */
export function renameChildRecords(childId:string,oldLabel:string,newLabel:string){
 const old=oldLabel.trim().toLocaleLowerCase('ru'),mine=(r:{childId?:string;childLabel:string})=>r.childId===childId||(!r.childId&&r.childLabel.trim().toLocaleLowerCase('ru')===old);
 updateScreenings(r=>mine(r)?{...r,childId,childLabel:newLabel.trim()}:r);
 updateJournals(r=>mine(r)?{...r,childId,childLabel:newLabel.trim()}:r);
}
const hasContent=(key:string)=>{try{return localStorage.getItem(key)!==null;}catch{return false;}};
/** A memo and a visit date made before profiles existed move to the chosen child the first time there is one. */
export function moveGeneralMemoToChild(){
 const child=getActiveChild();
 if(!child)return;
 const memo=getVisitFor(null),filled=memo.questions.length+memo.meds.length+Object.keys(memo.checklists).length>0;
 if(filled&&!hasContent(visitKeyFor(child.id))){if(writeJSON(visitKeyFor(child.id),memo))writeJSON(VISIT_KEY,{version:2,questions:[],meds:[],medDetails:{},checklists:{}});}
 const appointment=readJSON<unknown>(APPOINTMENT_KEY,null);
 if(appointment&&!hasContent(appointmentKeyFor(child.id))){if(writeJSON(appointmentKeyFor(child.id),appointment))writeJSON(APPOINTMENT_KEY,null);}
}
export function removeChildMemo(childId:string){
 try{localStorage.removeItem(visitKeyFor(childId));localStorage.removeItem(appointmentKeyFor(childId));dataChanged();}catch{}
}
export function migrateChildData(){
 try{linkRecordsToChildren();moveGeneralMemoToChild();}catch{}
}
