import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clinicalDiagnoses,medications,specialists,supportForDiagnosis,treatmentGuideFor} from '../src/lib/content';
import {composeTreatmentGuide,diagnosesForSpecialist,reviewGuide,specialistPair,usualFor} from '../src/lib/pairs';

const drugs=medications.filter(m=>!m.noteOnly);
test('every diagnosis × medication pair has a review with finished wording',()=>{
 for(const d of clinicalDiagnoses)for(const m of drugs){
  const g=reviewGuide(d.id,m.id);
  assert(g,'no review '+d.id+'/'+m.id);
  assert(g.summary.length>30&&!/[{}]/.test(g.summary)&&!/ \./.test(g.summary),'bad summary '+d.id+'/'+m.id+': '+g.summary);
  assert(g.context&&g.goals.length===3||!g.composed);
 }
});
test('written reviews win over general ones',()=>{
 assert.equal(reviewGuide('adhd','atomoxetine'),treatmentGuideFor('adhd','atomoxetine'));
 assert.equal(reviewGuide('adhd','atomoxetine')?.composed,undefined);
});
test('general reviews follow the drug family',()=>{
 const noo=composeTreatmentGuide('enuresis','actovegin')!;
 assert.equal(noo.relationKind,'limited');assert.match(noo.summary,/^Актовегин при энурезе не помогает/);
 const old=composeTreatmentGuide('depression','thioridazine')!;
 assert.equal(old.relationKind,'not_recommended');assert(old.stop);assert.match(old.goals[2],/Не прекращайте приём резко/);
 const allergy=composeTreatmentGuide('adhd','loratadine')!;
 assert.equal(allergy.relationKind,'other');assert.match(allergy.summary,/Назначают при аллергии|назначают при аллергии/);
 const ssri=composeTreatmentGuide('stuttering','ssri_sertraline')!;
 assert.equal(ssri.relationKind,'offlabel');assert.match(ssri.summary,/Обычно его назначают при /);
 assert.match(usualFor('ssri_fluvoxamine'),/^при /);
 assert.equal(composeTreatmentGuide('adhd','nootropics_generic'),undefined);
 assert.equal(composeTreatmentGuide('neurodevelopment_overview','actovegin'),undefined);
});
test('every diagnosis × specialist pair has a review, and plans put the main help first',()=>{
 for(const d of clinicalDiagnoses)for(const s of specialists){
  const p=specialistPair(d.id,s.id);
  assert(p,'no pair '+d.id+'/'+s.id);assert(p.summary.trim()&&p.questions.length>=2,'thin pair '+d.id+'/'+s.id);
 }
 const asd=supportForDiagnosis('asd')!.providers.map(p=>p.specialistId);
 assert.deepEqual(asd.slice(0,3),['behavior','speech','special_educator']);
 assert.equal(specialistPair('asd','behavior')?.kind,'core');
 assert.match(specialistPair('asd','speech')?.avoid||'',/массаж/);
 assert.equal(specialistPair('adhd','occupational')?.kind,'limited');
 const none=specialistPair('gad','speech')!;
 assert.equal(none.kind,'not_needed');assert(none.composed);assert.match(none.summary,/^При тревоге логопед не входит в основную помощь\. Логопед нужен/);
 assert.match(none.context,/психотерапевт/);
});
test('a specialist page lists diagnoses by role',()=>{
 const groups=diagnosesForSpecialist('speech');
 assert.deepEqual(groups.map(g=>g.kind),['core','conditional','limited'].filter(k=>groups.some(g=>g.kind===k)));
 assert(groups.find(g=>g.kind==='core')!.items.some(d=>d.id==='stuttering'));
});
