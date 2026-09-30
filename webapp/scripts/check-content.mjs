import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../src/content/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root)));
const dx=read('diagnoses.json'),meds=read('medications.json'),guides=read('treatment-guides.json');
const provenance=read('catalog-provenance.json'),categories=read('medication-categories.json');
const specialists=read('specialists.json'),support=read('nonpharm-support.json');
const groups=dx.filter(d=>d.kind==='group'),leaves=dx.filter(d=>d.kind!=='group');
for(const id of provenance.legacyTopicIds)assert(leaves.some(d=>d.id===id),'Lost legacy topic '+id);
for(const d of leaves)assert.equal(groups.filter(g=>g.children.includes(d.id)).length,1,'Topic needs exactly one group: '+d.id);
const sources=(items,id)=>{
 assert(items?.length,id+': no sources');
 for(const s of items){assert(s.label?.trim(),id+': missing source label');assert.match(s.url||'',/^https:\/\//,id+': non-HTTPS source');}
};
for(const [name,items] of [['diagnoses',dx],['medications',meds]]){
 assert.equal(new Set(items.map(x=>x.id)).size,items.length,name+': duplicate IDs');
 for(const item of items)for(const alias of item.aliases||[])assert.equal(typeof alias,'string');
}
for(const d of dx){
 if(d.kind==='group'){for(const id of d.children)assert(dx.some(x=>x.id===id),'Missing child '+id);continue;}
 assert(d.summary&&d.introductionTitle&&d.introduction?.length&&d.homeHelp?.length&&d.questionsToDoctor?.length,'Incomplete parent route: '+d.id);
 assert.match(d.updatedAt,/^\d{4}-\d{2}-\d{2}$/);sources(d.sources,d.id);
 const items=d.fullCriteriaChecklist.items;
 assert.equal(new Set(items.map(x=>x.id)).size,items.length,'Repeated observation IDs '+d.id);
 for(const id of d.effectiveMeds){
  assert(meds.some(x=>x.id===id&&!x.noteOnly),'Missing or group medication '+id);
  assert(guides.some(g=>g.diagnosisId===d.id&&g.medicationId===id),'No prepared guide for '+d.id+'/'+id);
 }
}
for(const m of meds){
 assert(categories.some(c=>c.id===m.category),'Unknown medication category: '+m.id);
 assert(m.plainSummary&&m.whenDiscussed?.length&&m.monitoring?.length&&m.warnings?.length,'Incomplete medication: '+m.id);
 assert.match(m.updatedAt,/^\d{4}-\d{2}-\d{2}$/);sources(m.sources,m.id);
}
const keys=guides.map(g=>g.diagnosisId+'/'+g.medicationId);assert.equal(new Set(keys).size,keys.length,'Duplicate treatment guide');
const relationKinds=['condition','specialist','cooccurring','limited','not_recommended','safety'];
for(const g of guides){
 assert(dx.some(d=>d.id===g.diagnosisId&&(!d.topicKind||d.topicKind==='diagnosis')),'Guide attached to overview/reference');
 assert(dx.some(d=>d.id===g.diagnosisId&&d.kind!=='group'),'Unknown diagnosis in guide');
 assert(meds.some(m=>m.id===g.medicationId&&!m.noteOnly),'Unknown or group medication in guide');
 assert(g.summary&&g.context&&g.goals?.length,'Incomplete guide');sources(g.sources,g.diagnosisId+'/'+g.medicationId);
 assert(relationKinds.includes(g.relationKind),'Unknown relationship type: '+g.diagnosisId+'/'+g.medicationId);
 assert.match(g.updatedAt,/^\d{4}-\d{2}-\d{2}$/);
 if(['limited','not_recommended','safety'].includes(g.relationKind)){
  assert(!dx.find(d=>d.id===g.diagnosisId).effectiveMeds.includes(g.medicationId),'Uncertain/negative/safety link in affirmative drug list');
 }
}
const limitationKinds=['not_indicated','limited','harmful','adjunct'];
assert.equal(new Set(specialists.map(s=>s.id)).size,specialists.length,'Duplicate specialist ID');
for(const s of specialists){
 assert(s.title&&s.summary&&s.domains.length&&s.helps.length&&s.limitations.length&&s.whatToCheck.length&&s.questions.length,'Incomplete specialist: '+s.id);
 for(const h of s.helps)assert(h.situation&&h.method&&h.result,'Unclear specialist method/result: '+s.id);
 for(const l of s.limitations)assert(limitationKinds.includes(l.kind)&&l.text,'Invalid specialist limitation');
 sources(s.sources,s.id);
}
assert.equal(support.length,leaves.length,'Every topic needs non-pharmacological help');
assert.equal(new Set(support.map(s=>s.diagnosisId)).size,support.length,'Duplicate support plan');
for(const p of support){
 assert(leaves.some(d=>d.id===p.diagnosisId),'Unknown support diagnosis');
 assert(p.intro&&p.providers.length&&p.limitations.length&&p.progress.length,'Incomplete support plan: '+p.diagnosisId);
 assert.equal(new Set(p.providers.map(s=>s.specialistId)).size,p.providers.length,'Duplicate provider in '+p.diagnosisId);
 for(const s of p.providers){assert(specialists.some(x=>x.id===s.specialistId),'Missing specialist');assert(['core','conditional'].includes(s.role)&&s.goal&&s.method,'Missing task/method/role');}
 for(const l of p.limitations)assert(limitationKinds.includes(l.kind)&&l.text,'Invalid support limitation');
 sources(p.sources,p.diagnosisId);
}
for(const s of specialists)assert(support.some(p=>p.providers.some(x=>x.specialistId===s.id)),'Unlinked specialist');
// Pairs: every clinical diagnosis × medication and × specialist gets a review (written or general).
const pairs=read('pair-context.json'),clinical=leaves.filter(d=>!d.topicKind||d.topicKind==='diagnosis');
for(const s of specialists)assert(s.shortTitle?.trim()&&s.whenNeeded?.trim(),'Specialist needs shortTitle and whenNeeded: '+s.id);
for(const p of support){
 const roles=p.providers.map(x=>x.role);assert.deepEqual(roles,[...roles].sort((a,b)=>(a==='core'?0:1)-(b==='core'?0:1)),'Core providers must come first: '+p.diagnosisId);
 for(const x of p.providers)assert(x.avoid===undefined||x.avoid.trim(),'Empty avoid note: '+p.diagnosisId);
 for(const n of p.notFor||[]){assert(specialists.some(x=>x.id===n.specialistId),'Unknown specialist in notFor');assert(['limited','not_needed'].includes(n.kind)&&n.text?.trim(),'Bad notFor: '+p.diagnosisId);assert(!p.providers.some(x=>x.specialistId===n.specialistId),'Specialist both helps and does not: '+p.diagnosisId+'/'+n.specialistId);}
}
for(const d of clinical){const c=pairs.diagnoses[d.id];assert(c?.prep?.startsWith('при ')&&c.helps?.trim(),'Pair wording missing for '+d.id);}
const ruleKinds=['limited','not_recommended','offlabel','other'];
for(const m of meds.filter(x=>!x.noteOnly)){
 const rules=pairs.medicationRules.filter(r=>r.ids.includes(m.id));assert.equal(rules.length,1,'Medication needs exactly one pair rule: '+m.id);
 const r=rules[0];assert(ruleKinds.includes(r.kind)&&r.text.includes('{prep}'),'Bad pair rule for '+m.id);
 if(r.kind==='other')assert(pairs.purpose[m.id]?.trim(),'Pair rule needs purpose: '+m.id);
 if(r.kind==='offlabel')assert(pairs.usual[m.id]||guides.some(g=>g.medicationId===m.id&&['condition','specialist'].includes(g.relationKind)),'Pair rule needs usual use: '+m.id);
}
for(const r of pairs.medicationRules)for(const id of r.ids)assert(meds.some(m=>m.id===id&&!m.noteOnly),'Unknown medication in pair rule: '+id);
// Investigations: cards, written «investigation × diagnosis» pairs and wording for the rest.
const exams=read('investigations.json'),examGuides=read('investigation-guides.json');
const examGroupIds=exams.groups.map(g=>g.id);
assert.equal(new Set(exams.items.map(e=>e.id)).size,exams.items.length,'Duplicate investigation id');
for(const e of exams.items){
 assert(examGroupIds.includes(e.group)&&['clinical','monitoring','dubious'].includes(e.kind),'Bad investigation group/kind: '+e.id);
 assert(e.name?.trim()&&e.summary?.trim()&&e.whenNot.length&&e.howItGoes?.trim()&&e.results?.trim(),'Incomplete investigation: '+e.id);
 if(e.kind==='dubious')assert(e.verdict?.trim()&&!e.whenNeeded.length,'Dubious investigation needs a verdict and no indications: '+e.id);
 else assert(/^[а-яё]/.test(e.usual||''),'Investigation needs «usual» wording in lower case: '+e.id),assert(e.whenNeeded.length,'Investigation needs indications: '+e.id);
 assert.match(e.updatedAt,/^\d{4}-\d{2}-\d{2}$/);sources(e.sources,e.id);
}
const examKeys=examGuides.map(g=>g.diagnosisId+'/'+g.investigationId);assert.equal(new Set(examKeys).size,examKeys.length,'Duplicate investigation pair');
for(const g of examGuides){
 assert(clinical.some(d=>d.id===g.diagnosisId),'Investigation pair on unknown or non-clinical topic: '+g.diagnosisId);
 const e=exams.items.find(x=>x.id===g.investigationId);assert(e,'Unknown investigation in pair: '+g.investigationId);
 assert(['recommended','conditional','monitoring','not_routine','not_recommended'].includes(g.relationKind)&&g.summary?.trim(),'Bad investigation pair: '+g.diagnosisId+'/'+g.investigationId);
 if(e.kind==='dubious')assert.equal(g.relationKind,'not_recommended','Dubious investigation cannot be recommended: '+g.investigationId);
 sources(g.sources,g.diagnosisId+'/'+g.investigationId);
}
for(const d of clinical)assert(pairs.diagnoses[d.id].exams?.trim(),'Diagnosis needs a note on investigations: '+d.id);
// Dubious non-drug methods.
const methods=read('methods.json');
assert.equal(new Set(methods.items.map(m=>m.id)).size,methods.items.length,'Duplicate method id');
for(const m of methods.items){
 assert(methods.groups.some(g=>g.id===m.group)&&['harmful','useless','limited'].includes(m.verdict),'Bad method group/verdict: '+m.id);
 for(const k of ['name','summary','promise','evidence','risks','instead'])assert(m[k]?.trim(),'Method needs '+k+': '+m.id);
 assert(m.offeredFor.length&&m.offeredFor.every(id=>leaves.some(d=>d.id===id)),'Method needs known topics: '+m.id);
 assert.match(m.updatedAt,/^\d{4}-\d{2}-\d{2}$/);sources(m.sources,m.id);
}
for(const d of leaves)for(const id of d.screeningIds||[])assert(['mchat','sdq','phq9','gad7','ygtss','crafft','snapiv','psc17','scared','vanderbilt2002'].includes(id),'Unknown screener on '+d.id);
console.log(`Methods OK: ${methods.items.length} dubious methods, ${methods.items.filter(m=>m.verdict==='harmful').length} dangerous.`);
console.log(`Investigations OK: ${exams.items.length} cards, ${examGuides.length} written pairs, general reviews for the other ${clinical.length*exams.items.length-examGuides.length}.`);
console.log(`Pairs OK: ${guides.length} written medication reviews, general reviews for the other ${clinical.length*meds.filter(m=>!m.noteOnly).length-guides.length} of ${clinical.length*meds.filter(m=>!m.noteOnly).length} pairs; ${support.reduce((n,s)=>n+s.providers.length+(s.notFor?.length||0),0)} written specialist pairs.`);
console.log(`Content OK: ${leaves.length} parent routes and support plans, ${specialists.length} specialists, ${support.reduce((n,s)=>n+s.providers.length,0)} support links; ${meds.length} medication/reference cards, ${guides.length} treatment guides.`);


const forms=read('journal-templates.json');
assert.equal(forms.length,13);assert.equal(new Set(forms.map(f=>f.id)).size,forms.length);
for(const f of forms){
 assert(f.title&&f.instructions&&f.version===1&&f.fields.length&&f.respondents.length,'Incomplete journal '+f.id);sources(f.sources,f.id);
 assert.equal(new Set(f.fields.map(x=>x.id)).size,f.fields.length,'Duplicate journal field '+f.id);
 for(const d of f.related)assert(leaves.some(x=>x.id===d),'Unknown journal topic '+f.id+'/'+d);
 for(const k of f.compareKeys)assert(f.fields.some(x=>x.id===k),'Unknown comparison field '+k);
 for(const x of f.fields){assert(['text','textarea','number','select','datetime-local'].includes(x.type));if(x.type==='select')assert(x.options.length&&new Set(x.options.map(o=>o.value)).size===x.options.length);}
}
const snap=read('snapiv.json'),ygtss=read('ygtss-clinical.json');
assert.equal(snap.questions.length,26);assert.equal(snap.options.length,4);sources(snap.sources,'SNAP-IV');
assert.equal(ygtss.criteria.length,6);for(const a of ygtss.criteria)assert.equal(a.length,6);assert.equal(ygtss.groups.reduce((n,g)=>n+g.items.length,0),57);
console.log(`Forms OK: ${forms.length} journals, SNAP-IV 26 items, YGTSS-R 36 anchors and 57 checklist items.`);
const clinic=read('clinic.json'),https=u=>u===undefined||/^https:\/\/\S+$/.test(u);
assert(https(clinic.site)&&clinic.site&&https(clinic.bookingUrl)&&clinic.bookingUrl,'Clinic needs HTTPS site and booking URL');
assert.equal(new Set(clinic.doctors.map(d=>d.id)).size,clinic.doctors.length,'Duplicate doctor IDs');
for(const d of clinic.doctors){assert.match(d.id,/^[a-z0-9-]+$/,'Bad doctor id '+d.id);assert(d.name?.trim()&&d.role?.trim(),'Doctor needs name and role: '+d.id);for(const u of [d.profileUrl,d.bookingUrl])assert(https(u),'Doctor URL must be HTTPS: '+d.id);if(d.photo&&!https(d.photo)){assert.match(d.photo,/^doctors\/[a-z0-9-]+\.(webp|jpe?g|png)$/,'Bad photo path '+d.id);assert(fs.existsSync(new URL('../../public/'+d.photo,root)),'Missing photo file '+d.photo);}for(const b of d.branches||[])assert((clinic.branches||[]).some(x=>x.id===b),'Unknown branch '+b);for(const t of d.topics||[])assert(leaves.some(x=>x.id===t),'Unknown topic '+t+' for doctor '+d.id);}
console.log(`Clinic OK: ${clinic.doctors.length} doctors, booking at ${clinic.bookingUrl}.`);
