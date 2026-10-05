import methodsRaw from '../content/methods.json';
import {Source} from './content';

// Non-drug methods offered to families without proven benefit: what they promise, what is known,
// the harm, what helps instead and where they are usually offered.
export type MethodVerdict='harmful'|'useless'|'limited';
export type Method={id:string;name:string;group:string;verdict:MethodVerdict;aliases:string[];summary:string;promise:string;evidence:string;risks:string;instead:string;offeredFor:string[];sources:Source[];updatedAt:string};
const data=methodsRaw as {groups:{id:string;title:string}[];items:Method[]};
export const methodGroups=data.groups;
export const methods=data.items;
export const methodById=(id:string)=>methods.find(x=>x.id===id);
// Three different conclusions, not one «doesn't work»: real risks; no benefit shown for this problem; at most an add-on.
export const methodVerdictLabels:Record<MethodVerdict,string>={harmful:'Есть серьёзные риски',useless:'Пользы не показано',limited:'Только как дополнение'};
export const verdictTag=(v:MethodVerdict)=>v==='harmful'?'danger':v==='useless'?'warm':'neutral';
export const methodVerdictOrder:MethodVerdict[]=['harmful','useless','limited'];
/** Methods usually offered for a topic, dangerous ones first. */
export const methodsForDiagnosis=(diagnosisId:string)=>methods.filter(x=>x.offeredFor.includes(diagnosisId)).sort((a,b)=>methodVerdictOrder.indexOf(a.verdict)-methodVerdictOrder.indexOf(b.verdict));
/** What to do if a doctor prescribed the method — the author's rules from the parents' book. */
export const ifPrescribed:Record<MethodVerdict,string[]>={
 harmful:['Здесь нужна твёрдая позиция: риск для здоровья больше любой возможной пользы. От такого назначения можно и нужно отказаться.','Если врач настаивает, возьмите второе мнение у другого детского психиатра или педиатра.','Не прекращайте из-за этого основное лечение и занятия.'],
 useless:['Вы вправе отказаться: пользы у метода нет, даже если его назначил врач.','Если очень хочется попробовать и это безопасно, заранее решите, какой результат вы ждёте («новые слова», «меньше срывов») и за какой срок — недели, а не годы. Нет результата — уходите без «ещё одного курса».','Основное лечение и занятия не бросайте и не ставьте на паузу.'],
 limited:['Как дополнение для радости и отдыха — можно, если это не отнимает время и деньги у основной помощи.','Не ждите, что это вылечит основное состояние, и не заменяйте этим занятия с доказанной пользой.'],
};
export const methodQuestions=(m:Method)=>[
 'Какие исследования показали пользу метода «'+m.name+'» при нашем диагнозе?',
 'Какой результат мы ждём и через сколько недель его проверим?',
 'Какую помощь с доказанной пользой ребёнок получает параллельно?',
 ...(m.verdict==='harmful'?['Какие осложнения бывают и кто отвечает за них?']:[]),
];
/** Red flags of a method that sells hope instead of help (parents' book, «Если очень хочется попробовать»). */
export const methodRedFlags=['Обещает вылечить или «снять диагноз».','Ставит диагноз с порога или по прибору.','Велит бросить лекарства и «вашу официальную медицину».','Требует бесконечных дорогих курсов — «иначе всё вернётся».','Обещает «вывести», «очистить», «убить паразитов».'];
