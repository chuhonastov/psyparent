import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readObservationAnswers,observationKey} from '../src/lib/observations';
import {addVisitMedication,getVisit} from '../src/lib/visit';
const items=[{id:'b1',text:'Общение'},{id:'b2',text:'Жесты'}];
beforeEach(()=>{
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,String(value)),removeItem:(key:string)=>values.delete(key)}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
});
test('selected legacy observations migrate to yes; unselected ones remain unanswered',()=>{
 localStorage.setItem('parentguide.checklist.v1:dx:asd:fullCriteria',JSON.stringify(['b1','unknown',42]));
 const state=readObservationAnswers('asd',items);
 assert.equal(state.migrated,true);assert.deepEqual(state.answers,{b1:'yes'});
});
test('new explicit no and unsure take precedence over old checkboxes',()=>{
 localStorage.setItem('parentguide.checklist.v1:dx:asd:fullCriteria','["b1"]');
 localStorage.setItem(observationKey('asd'),JSON.stringify({b1:'no',b2:'unsure',unknown:'yes',invalid:42}));
 assert.deepEqual(readObservationAnswers('asd',items),{answers:{b1:'no',b2:'unsure'},migrated:false});
});
test('an empty current answer set never restores older selections',()=>{
 localStorage.setItem('parentguide.checklist.v1:dx:asd:fullCriteria','["b1"]');
 localStorage.setItem(observationKey('asd'),'{}');assert.deepEqual(readObservationAnswers('asd',items).answers,{});
});
test('group reference cards cannot be added as medication prescriptions',()=>{
 assert.equal(addVisitMedication('antipsychotic_safety_note'),false);
 assert.equal(addVisitMedication('valerian_note'),false);
 assert.equal(addVisitMedication('atomoxetine'),true);
 assert.deepEqual(getVisit().meds,['atomoxetine']);
});
