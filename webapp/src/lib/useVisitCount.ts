import {useVisit} from './useVisit';
import {useJournals} from './useJournals';
import {useScreenings} from './useScreenings';
import {useActiveChild} from './useActiveChild';
import {belongsTo} from './profile';
/** Everything that will go into the chosen child's visit sheet: questions, medications, observations and the selected results and journals. */
export function useVisitCount(){
  const v=useVisit(),results=useScreenings(),journals=useJournals(),child=useActiveChild();
  const mine=<T extends {childId?:string;childLabel:string}>(r:T)=>!child||belongsTo(r,child);
  return v.questions.length+v.meds.length+Object.keys(v.checklists).length+results.filter(r=>r.includeInVisit&&mine(r)).length+journals.filter(r=>r.includeInVisit&&mine(r)).length;
}
