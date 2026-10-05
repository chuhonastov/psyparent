import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {resetEnv} from './env020';
beforeEach(resetEnv);
import {beforeVisitReminder,checkinReminder,nextWeekday,parseStartParam,planReminder,reminderLink,weekdayOf} from '../src/lib/reminders';
import {planById} from '../src/lib/plans';
const unfold=(ics:string)=>ics.replace(/\r\n /g,'');

test('weekly check-in reminder: the chosen weekday and time, a link into the mini app',()=>{
 assert.equal(weekdayOf('2026-10-05'),0,'5 October 2026 is a Monday');
 assert.equal(nextWeekday('2026-10-05',6),'2026-10-11');
 assert.equal(nextWeekday('2026-10-05',0),'2026-10-05');
 const ics=checkinReminder({childId:'c-1',childLabel:'Маша',weekday:6,time:'20:30',every:7,today:'2026-10-05',telegram:true});
 const text=unfold(ics);
 assert.match(text,/DTSTART:20261011T203000\r\n/);
 assert.match(text,/RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SU\r\n/);
 assert.match(text,/URL:https:\/\/t\.me\/psyparent_bot\?startapp=checkin_c-1\r\n/);
 assert.match(text,/SUMMARY:Кора: короткий опрос — Маша\r\n/);
 assert.match(text,/BEGIN:VALARM\r\nACTION:DISPLAY/);
 assert(ics.split('\r\n').every(l=>new TextEncoder().encode(l).length<=75),'lines are folded');
 assert.match(unfold(checkinReminder({childId:'c-1',childLabel:'Маша',weekday:2,time:'09:00',every:14,today:'2026-10-05',telegram:false})),/RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE[\s\S]*URL:https:\/\/psyparent\.vercel\.app\/child\/check-in\?child=c-1/);
});

test('before a visit: one reminder three days ahead, or tomorrow if that day has passed',()=>{
 const a=(date:string)=>({version:1 as const,date});
 assert.match(beforeVisitReminder({childId:'c',childLabel:'Петя',appointment:a('2026-10-20'),time:'19:00',today:'2026-10-05',telegram:true}),/DTSTART:20261017T190000/);
 const soon=beforeVisitReminder({childId:'c',childLabel:'Петя',appointment:a('2026-10-07'),time:'19:00',today:'2026-10-05',telegram:true});
 assert.match(soon,/DTSTART:20261006T190000/);
 assert.doesNotMatch(soon,/RRULE/);
});

test('mini-plan reminder lasts until the plan ends; reminder links are told apart from teacher answers',()=>{
 const plan=planById('sleep')!;
 const ics=unfold(planReminder({plan,run:{id:'r1',planId:'sleep',goalId:'g',startedAt:'2026-10-01',until:'2026-10-15',done:[],status:'active'},time:'21:00',today:'2026-10-05',telegram:true}));
 assert.match(ics,/DTSTART:20261005T210000/);assert.match(ics,/RRULE:FREQ=DAILY;COUNT=10/);
 assert.match(ics,/startapp=plan_sleep/);
 assert.deepEqual(parseStartParam('checkin_c-1'),{kind:'checkin',childId:'c-1'});
 assert.deepEqual(parseStartParam('plan_sleep'),{kind:'plan',planId:'sleep'});
 assert.equal(parseStartParam('gH4sIAAAAAAAA'),null,'a teacher answer code');
 assert.equal(reminderLink({kind:'plan',planId:'fear'},false,'https://x.ru'),'https://x.ru/plans/fear');
});
