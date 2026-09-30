import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clinicalDiagnoses} from '../src/lib/content';
import {investigations,investigationGuides,composeExamGuide,reviewExam,examsForDiagnosis,diagnosesForExam,examNote,examQuestions} from '../src/lib/investigations';
import {searchEverything} from '../src/lib/globalSearch';

test('every diagnosis × investigation pair has a review with finished wording',()=>{
 for(const d of clinicalDiagnoses)for(const e of investigations){
  const g=reviewExam(d.id,e.id);
  assert(g,'no review '+d.id+'/'+e.id);
  assert(g.summary.length>15&&!/[{}]/.test(g.summary)&&!/undefined/.test(g.summary),'bad summary '+d.id+'/'+e.id+': '+g.summary);
  assert(examQuestions(g).length>=2);
 }
});
test('dubious tests are never recommended, written pairs win over general ones',()=>{
 for(const e of investigations.filter(x=>x.kind==='dubious'))for(const d of clinicalDiagnoses)assert.equal(reviewExam(d.id,e.id)!.relationKind,'not_recommended',d.id+'/'+e.id);
 assert.equal(reviewExam('asd','hearing')!.relationKind,'recommended');
 assert.equal(reviewExam('asd','hearing')!.composed,undefined);
 assert.equal(reviewExam('adhd','eeg')!.relationKind,'not_routine');
 const osipov=composeExamGuide('tics_tourette','hms_osipov')!;
 assert.match(osipov.summary,/^При тиках это обследование не нужно: метод не проверен/);
 const eeg=composeExamGuide('gad','eeg_video')!;
 assert.equal(eeg.relationKind,'not_routine');assert.match(eeg.summary,/^При тревоге это обследование обычно не нужно\. Оно нужно, если/);
 assert.equal(composeExamGuide('neurodevelopment_overview','eeg'),undefined);
});
test('a diagnosis lists its investigations by role and every one has a note',()=>{
 const asd=examsForDiagnosis('asd');
 assert.deepEqual(asd.map(g=>g.kind).slice(0,2),['recommended','monitoring']);
 assert(asd[0].items.some(x=>x.exam.id==='cma'));
 for(const d of clinicalDiagnoses)assert(examNote(d.id).length>40,d.id);
 assert.equal(new Set(investigationGuides.map(g=>g.diagnosisId+'/'+g.investigationId)).size,investigationGuides.length);
 const cma=diagnosesForExam('cma');
 assert(cma.find(g=>g.kind==='recommended')!.items.some(d=>d.id==='intellectual_disability'));
});
test('global search finds investigations by Russian names',()=>{
 const reg=searchEverything('РЭГ').find(g=>g.id==='exams');
 assert.equal(reg?.hits[0].id,'reg');
 const osipov=searchEverything('Осипов').find(g=>g.id==='exams');
 assert.equal(osipov?.hits[0].id,'hms_osipov');
 assert(searchEverything('ЭЭГ').find(g=>g.id==='exams')!.hits.some(h=>h.id==='eeg'));
});
