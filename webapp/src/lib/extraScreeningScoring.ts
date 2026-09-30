import {scaleFields,ScreeningId} from './screeningContent';
import type {ScreeningInput,ScreeningScore} from './screenings';
export const extraIds:ScreeningId[]=['assq','vanderbilt','ygtss','rcads25','crafft'];
const int=(n:unknown,min:number,max:number):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;
export function validateExtra(id:ScreeningId,input:ScreeningInput){
 const errors:string[]=[],values=input.measurements||{},fields=scaleFields(id,input.respondent);
 if(typeof input.sourceForm!=='string'||!input.sourceForm.trim()||input.sourceForm.length>240)errors.push('Укажите исходный бланк / перевод (до 240 символов).');
 if(!values||typeof values!=='object'||Array.isArray(values))return [...errors,'Проверьте внесённые показатели.'];
 for(const f of fields){const v=values[f.id];if(v===undefined&&f.optional)continue;if(!int(v,f.min||0,f.max)||(f.step&&v%f.step!==0))errors.push(f.label+': укажите целый балл '+(f.min||0)+'–'+f.max+(f.step?' с шагом '+f.step:'')+'.');}
 for(const key of Object.keys(values))if(!fields.some(f=>f.id===key))errors.push('Показатель не соответствует выбранной форме.');
 if(id!=='ygtss'&&!int(input.total,0,id==='crafft'?6:id==='rcads25'?75:54))errors.push('Проверьте общий балл этой формы.');
 if(id==='ygtss'){
  if(input.clinicianConfirmed!==true)errors.push('Подтвердите, что баллы YGTSS-R выставлены со специалистом по критериям бланка.');
  for(const kind of ['motor','vocal'])if(values[kind+'0']===0&&[1,2,3,4].some(i=>values[kind+i]>0))errors.push('Если тики этого типа отсутствуют, все пять оценок этого типа должны быть нулевыми.');
  if(fields.slice(0,10).every(f=>values[f.id]===0)&&values.impairment>0)errors.push('При отсутствии тиков уточните у специалиста, с чем связано указанное нарушение функционирования.');
 }
 if(id==='vanderbilt'&&int(values.inattention,0,9)&&int(values.hyperactivity,0,9)&&int(input.total,0,54)){
  const positive=values.inattention+values.hyperactivity;
  if(input.total<positive*2||input.total>18+positive*2)errors.push('Сумма пунктов 1–18 не согласуется с числом ответов 2 или 3. Проверьте исходный бланк.');
 }
 if(id==='rcads25'){
  const a=values.anxiety,d=values.depression;
  if(a!==undefined&&d!==undefined&&a+d!==input.total)errors.push('Общая сумма RCADS-25 должна равняться сумме тревоги и депрессивных симптомов.');
  if(input.total!==undefined&&((a!==undefined&&(a>input.total||input.total-a>30))||(d!==undefined&&(d>input.total||input.total-d>45))))errors.push('Субшкала RCADS-25 не согласуется с общей суммой.');
 }
 if(id==='crafft'&&((values.car===1&&input.total===0)||(values.car===0&&input.total===6)))errors.push('Общая сумма CRAFFT не согласуется с ответом CAR.');
 return errors;
}
export function scoreExtra(id:ScreeningId,input:ScreeningInput):ScreeningScore{
 const m=input.measurements||{},base={safety:false,status:'recorded' as const};
 if(id==='ygtss'){
  const motor=[0,1,2,3,4].reduce((n,i)=>n+m['motor'+i],0),vocal=[0,1,2,3,4].reduce((n,i)=>n+m['vocal'+i],0),total=motor+vocal;
  return {...base,total,max:50,label:'Клиническая оценка тиков записана',next:'Обсудите со специалистом, какие тики мешают и как меняется повседневная жизнь. Баллы не подтверждают диагноз и не определяют необходимость лекарства.',metrics:[{label:'Моторные тики',value:motor,max:25},{label:'Вокальные тики',value:vocal,max:25},{label:'Нарушение функционирования',value:m.impairment,max:50},{label:'Глобальный балл',value:total+m.impairment,max:100}]};
 }
 if(id==='vanderbilt'){
  const attention=m.inattention>=6,hyper=m.hyperactivity>=6,impairment=m.performance>0,positive=(attention||hyper)&&impairment;
  const extra=[];
  if(m.opposition>=4&&impairment)extra.push('оппозиционные проявления');
  if(m.conduct>=3&&impairment)extra.push('поведение');
  if(m.oppositionConduct>=3&&impairment)extra.push('оппозиционные проявления / поведение');
  if(m.anxietyDepression>=3&&impairment)extra.push('тревога / настроение');
  return {...base,total:input.total!,max:54,status:positive||extra.length?'discuss':'recorded',label:positive?'По этой форме нужна оценка симптомов СДВГ':'Результаты Vanderbilt записаны',next:(positive?'В этой форме достигнут порог симптомов и отмечено влияние на функционирование. Это повод для оценки, а не установленный диагноз. ':attention||hyper?'Число симптомов повышено, но в этой форме не отмечен порог нарушения функционирования. Это не позволяет подтвердить СДВГ по бланку. ':'Порог основных симптомов по этой форме не достигнут; это не исключает трудности. ')+(extra.length?'Дополнительно обсудите: '+extra.join(', ')+'. ':'')+'Сопоставьте отдельные оценки родителя и учителя с беседой и историей развития.',metrics:[{label:'Невнимательность: ответов 2 / 3',value:m.inattention,max:9},{label:'Гиперактивность / импульсивность: ответов 2 / 3',value:m.hyperactivity,max:9},{label:'Функционирование: ответов 4 / 5',value:m.performance,max:8}]};
 }
 if(id==='crafft')return {...base,total:input.total!,max:6,status:input.total!>=2?'discuss':'recorded',label:input.total!>=2?'Нужна более подробная оценка употребления':'Результат для конфиденциальной беседы',next:(m.car===1?'Отмечен риск поездок: обсудите безопасный транспорт; не садитесь в машину к водителю под воздействием веществ и не управляйте транспортом после употребления. ':'')+(input.total!>=2?'Сумма 2 и более — повод для дополнительной оценки специалистом. Это не диагноз зависимости.':'Даже при небольшой сумме обсудите употребление и риски со специалистом конфиденциально.'),metrics:[{label:'Отметка CAR (0 — нет, 1 — да)',value:m.car,max:1}]};
 return {...base,total:input.total!,max:id==='assq'?54:75,label:'Баллы записаны для обсуждения',next:id==='assq'?'Покажите балл вместе с исходным бланком специалисту. Единого порога для всех переводов, возрастов и отвечающих здесь нет. При трудностях общения оценка нужна независимо от суммы.':'Покажите исходный бланк и результат специалисту. Это сырые баллы; для T-баллов нужна подходящая нормативная система. Не сравнивайте их с порогами PHQ-9 или GAD-7.'};
}
