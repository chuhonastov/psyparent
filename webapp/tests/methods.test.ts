import {test} from 'node:test';
import assert from 'node:assert/strict';
import {leaves} from '../src/lib/content';
import {methods,methodById,methodsForDiagnosis,ifPrescribed,methodQuestions} from '../src/lib/methods';
import {searchEverything} from '../src/lib/globalSearch';

test('every dubious method is complete and points to real topics',()=>{
 for(const m of methods){
  assert(m.promise&&m.evidence&&m.risks&&m.instead,m.id);
  assert(m.offeredFor.every(id=>leaves.some(d=>d.id===id)),m.id);
  assert(ifPrescribed[m.verdict].length>=2);
  assert(methodQuestions(m).length>=3);
 }
 assert.equal(methodById('chelation_detox')?.verdict,'harmful');
 assert.equal(methodById('stem_cells')?.verdict,'harmful');
 assert.equal(methodById('hippotherapy')?.verdict,'limited');
});
test('a topic lists its dubious methods, dangerous first',()=>{
 const asd=methodsForDiagnosis('asd');
 assert(asd.length>=15);
 assert.equal(asd[0].verdict,'harmful');
 assert(asd.some(m=>m.id==='dolphin_therapy')&&asd.some(m=>m.id==='gfcf_diet'));
 assert(methodsForDiagnosis('enuresis').some(m=>m.id==='acupuncture'));
 assert.deepEqual(methodsForDiagnosis('ptsd'),[]);
});
test('global search finds dubious methods',()=>{
 for(const [q,id] of [['остеопат','osteopathy'],['дельфин','dolphin_therapy'],['микротоки','tdcs_microcurrents'],['Томатис','tomatis'],['стволовые','stem_cells']] as const){
  const g=searchEverything(q).find(x=>x.id==='methods');
  assert.equal(g?.hits[0].id,id,q);
 }
});
