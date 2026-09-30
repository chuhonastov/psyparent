import {useVisit} from './useVisit';
import {useJournals} from './useJournals';
import {useScreenings} from './useScreenings';
/** Everything that will go into the visit sheet: questions, medications, observations and the selected results and journals. */
export function useVisitCount(){
  const v=useVisit(),results=useScreenings(),journals=useJournals();
  return v.questions.length+v.meds.length+Object.keys(v.checklists).length+results.filter(r=>r.includeInVisit).length+journals.filter(r=>r.includeInVisit).length;
}
