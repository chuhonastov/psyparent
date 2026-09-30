import React from 'react';
import {addVisitQuestion} from '../lib/visit';
import {useVisit} from '../lib/useVisit';
import {toast} from '../lib/toast';
import Icon from './Icon';
export default function QuestionButton({question,compact=false}:{question:string;compact?:boolean}) {
 const added=useVisit().questions.includes(question);
 return <button className={'btn '+(added?'soft':'secondary')+(compact?' compact':'')} type="button" disabled={added} onClick={()=>{if(addVisitQuestion(question))toast('Вопрос добавлен в памятку',{variant:'success'});}}>
 <Icon name={added?'check':'plus'} size={16}/>{added?'В памятке':'Добавить вопрос'}</button>;
}
