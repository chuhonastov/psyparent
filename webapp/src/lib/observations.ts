import {readJSON} from './persist';
import type {Observation} from './content';
export type Answer = 'yes' | 'no' | 'unsure';
export type Answers = Record<string, Answer>;
export const observationKey = (dxId:string) => 'psyparent.observations.v1:' + dxId;
export function readObservationAnswers(dxId:string, items:Observation[]) {
  const validIds = new Set(items.map(item => item.id));
  const stored = readJSON<unknown>(observationKey(dxId), null);
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const answers = Object.fromEntries(Object.entries(stored).filter(([id, value]) =>
      validIds.has(id) && (value === 'yes' || value === 'no' || value === 'unsure')
    )) as Answers;
    return {answers, migrated:false};
  }
  const legacy = readJSON<unknown>('parentguide.checklist.v1:dx:' + dxId + ':fullCriteria', []);
  // An unchecked old box meant "not selected", never an explicit "no".
  const ids = Array.isArray(legacy) ? legacy.filter(id => typeof id === 'string' && validIds.has(id)) : [];
  return {answers:Object.fromEntries(ids.map(id => [id, 'yes'])) as Answers, migrated:ids.length > 0};
}
