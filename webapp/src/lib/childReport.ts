import {RouteData,changeReport,childScreenings,dayMonth,formatChanges,formatTimeline,fullDate,reportIsEmpty,timelineEntries} from './route';
import {activeCourses} from './treatment';
import {summarizeCheckIn} from './monitoring';
import {ageLabel} from './children';
import {diagnosisById,dxName,specialists} from './content';
import {screenerById} from './screeningContent';
import {formatAppointment,daysUntil} from './appointment';
import {getPlan,planFilled} from './safety';
const MONTHS=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const FOOTER='Составлено в приложении «Кора». Это записи семьи, а не медицинский документ.';
/** «Всё о ребёнке» for a PDF: profile, what changed since the last visit and the whole timeline. */
export function formatChildReport(d:RouteData){
 const c=d.child,p=d.profile,title=c.label+', '+ageLabel(c);
 const L=['ВСЁ О РЕБЁНКЕ · '+title,'Записи семьи на '+fullDate(d.today)+'. Дозы и диагнозы переписаны родителями из документов врача.'];
 L.push('','ПРОФИЛЬ');
 const [y,m]=c.birth.split('-');L.push('Месяц рождения: '+(MONTHS[Number(m)-1]||'')+' '+y);
 const dx=p.diagnoses.map(diagnosisById).filter((x):x is NonNullable<typeof x>=>!!x).map(dxName);
 if(dx.length)L.push('Диагнозы из заключения: '+dx.join(', '));
 const current=activeCourses(d.events);
 L.push('Лечение сейчас: '+(current.length?current.map(x=>x.label+(x.dose?' — '+x.dose:'')+' (с '+dayMonth(x.since)+')').join('; '):'препараты не отмечены'));
 const sp=p.specialists.map(id=>specialists.find(s=>s.id===id)?.shortTitle).filter(Boolean);
 if(sp.length)L.push('Занятия: '+sp.join(', '));
 if(p.doctors.length){L.push('','Специалисты семьи:');p.doctors.forEach(x=>L.push('• '+[x.name,x.role,x.phone,x.place].filter(Boolean).join(', ')));}
 if(p.goals.length){L.push('','Цели:');p.goals.forEach(g=>L.push('• '+g.text+(g.measure==='count'?' (сколько раз за неделю)':'')));}
 const last=d.checkIns[d.checkIns.length-1];
 if(last)L.push('','Последний опрос — '+fullDate(last.date)+': '+summarizeCheckIn(last,p));
 const results=childScreenings(d.screenings,c).slice().sort((a,b)=>b.completedDate.localeCompare(a.completedDate)),latest=[...new Map(results.map(r=>[r.screenerId+r.respondent,r] as const)).values()].slice(0,6);
 if(latest.length){L.push('','Тесты (последние результаты, не диагноз):');latest.forEach(r=>L.push('• '+(screenerById(r.screenerId)?.name||r.screenerId)+': '+r.score.total+' из '+r.score.max+', '+fullDate(r.completedDate)));}
 if(d.appointment&&daysUntil(d.appointment.date)>=0)L.push('','Следующий приём: '+formatAppointment(d.appointment));
 if(planFilled(getPlan(c.id)))L.push('','План безопасности составлен — его можно скачать отдельно.');
 const changes=changeReport(d);
 if(!reportIsEmpty(changes))L.push('',...formatChanges(changes,title).split('\n'));
 const entries=timelineEntries(d);
 if(entries.length)L.push('',...formatTimeline(entries,title).split('\n').filter(x=>!x.startsWith('Составлено')));
 L.push('',FOOTER);
 return L.join('\n');
}
