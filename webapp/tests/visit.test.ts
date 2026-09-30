import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {getVisit,VISIT_KEY,addVisitQuestion,addVisitMedication,setVisitMedicationField,upsertChecklist,clearVisit,removeVisitMedication} from '../src/lib/visit';
import {deleteLocalData} from '../src/lib/persist';
import {matchesQuery} from '../src/lib/search';
import {formatVisit,copyText} from '../src/lib/export';
class MemoryStorage {
 [key:string]:any;
 getItem(key:string){return Object.hasOwn(this,key)?this[key]:null;}
 setItem(key:string,value:string){this[key]=String(value);}
 removeItem(key:string){delete this[key];}
}
beforeEach(()=>{
 Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});
 Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});
});
test('migrates questions, medications and observations from the previous version',()=>{
 localStorage.setItem('parentguide.visit.v1',JSON.stringify({
 questions:['Мой вопрос','[DX] СДВГ (синдром дефицита внимания и гиперактивности): Полные критерии\n1. Наблюдение'],
 meds:['atomoxetine'],medDetails:{atomoxetine:{dose:'25 мг',note:'Запись'}}}));
 const v=getVisit();
 assert.deepEqual(v.questions,['Мой вопрос']);
 assert.equal(v.medDetails.atomoxetine.dose,'25 мг');
 assert.deepEqual(v.checklists.adhd.lines,['Наблюдение']);
 addVisitQuestion('Ещё вопрос');
 assert.equal(JSON.parse(localStorage.getItem(VISIT_KEY)!).questions.length,2);
});
test('combines older checklist snapshots without losing their observations',()=>{
 localStorage.setItem('parentguide.visit.questions.v1',JSON.stringify([
 '[DX] СДВГ (синдром дефицита внимания и гиперактивности): Полные критерии\n1. Первый пункт',
 '[DX] СДВГ (синдром дефицита внимания и гиперактивности): Полные критерии\n1. Второй пункт']));
 assert.deepEqual(getVisit().checklists.adhd.lines,['Первый пункт','Второй пункт']);
});
test('updating observations replaces the current snapshot',()=>{
 upsertChecklist('adhd','СДВГ',['Первый вариант']);
 upsertChecklist('adhd','СДВГ',['Последний вариант']);
 const v=getVisit();
 assert.equal(Object.keys(v.checklists).length,1);
 assert.deepEqual(v.checklists.adhd.lines,['Последний вариант']);
});
test('cleared visits never resurrect legacy data',()=>{
 localStorage.setItem('parentguide.visit.questions.v1','["Старый вопрос"]');
 clearVisit();
 assert.deepEqual(getVisit().questions,[]);
});
test('deduplicates questions and saves medication fields immediately',()=>{
 addVisitQuestion('Вопрос');addVisitQuestion(' Вопрос ');
 addVisitMedication('atomoxetine');setVisitMedicationField('atomoxetine','dose','Назначенная доза');
 assert.equal(getVisit().questions.length,1);
 assert.match(formatVisit(getVisit()),/Назначенная доза/);
 removeVisitMedication('atomoxetine');
 assert.equal(getVisit().medDetails.atomoxetine,undefined);
});
test('handles broken JSON, null legacy data and invalid types',()=>{
 localStorage.setItem('parentguide.visitSheet.v1','null');
 localStorage.setItem(VISIT_KEY,'{broken');
 assert.deepEqual(getVisit().questions,[]);
 localStorage.setItem(VISIT_KEY,JSON.stringify({questions:[1,null,'Да'],meds:[null],checklists:{bad:null}}));
 assert.deepEqual(getVisit().questions,['Да']);
});
test('deleting app data preserves unrelated browser data',()=>{
 localStorage.setItem('parentguide.visit.v1','{}');
 localStorage.setItem('psyparent.observations.v1:adhd','{}');
 localStorage.setItem('other.app','keep');
 assert.equal(deleteLocalData(),true);
 assert.equal(localStorage.getItem('other.app'),'keep');
 assert.equal(localStorage.getItem('parentguide.visit.v1'),null);
 assert.equal(localStorage.getItem('psyparent.observations.v1:adhd'),null);
});
test('search matches aliases without treating РАС as part of расстройство',()=>{
 assert(matchesQuery('аутизм',['РАС','аутизм']));
 assert(matchesQuery('Золофт',['Сертралин','Золофт']));
 assert(!matchesQuery('РАС',['СДВГ'],'Расстройство нейроразвития'));
 assert(matchesQuery('F90.0',['F90.0']));
});
test('failed clipboard fallback returns failure',async()=>{
 Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{throw new Error('denied');}}},configurable:true});
 Object.defineProperty(globalThis,'document',{value:{body:{append(){}},createElement:()=>({value:'',style:{},select(){},remove(){}}),execCommand:()=>false},configurable:true});
 assert.equal(await copyText('test'),false);
});
test('blocked storage cannot report a successful save',()=>{
 Object.defineProperty(globalThis,'localStorage',{value:{getItem(){return null;},setItem(){throw new Error('blocked');}},configurable:true});
 assert.equal(addVisitQuestion('Не потерять'),false);
});
