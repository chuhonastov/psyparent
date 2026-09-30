import data from '../content/journal-templates.json';
import type {Source} from './content';
import type {Respondent} from './screeningContent';
export type JournalField={id:string;label:string;type:'text'|'textarea'|'number'|'select'|'datetime-local';required?:boolean;help?:string;min?:number;max?:number;step?:number;trend?:boolean;options?:{value:string;label:string}[]};
export type JournalTemplate={id:string;version:number;title:string;summary:string;domain:string;cadence:string;fromDocument:boolean;respondents:Respondent[];instructions:string;related:string[];sources:Source[];fields:JournalField[];compareKeys:string[]};
export const journalTemplates=data as JournalTemplate[];
export const journalTemplate=(id:string)=>journalTemplates.find(f=>f.id===id);
export const journalTemplatesForDiagnosis=(id:string)=>journalTemplates.filter(f=>['complaints','goals','tolerability'].includes(f.id)||f.related.includes(id));
export const journalValueLabel=(field:JournalField,value:string)=>value===''?'Не указано':field.type==='select'?field.options?.find(o=>o.value===value)?.label||value:field.type==='datetime-local'?value.replace('T',' '):value;
