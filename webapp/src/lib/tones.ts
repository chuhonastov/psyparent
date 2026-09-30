import type {RecentKind} from './recent';
/** Each section of the app has its own colour; styles.css maps a tone to buttons, tabs, tints and icon tiles. */
export type Tone='blue'|'green'|'pink'|'purple'|'orange'|'yellow'|'red';
export function toneForPath(path:string):Tone{
  if(path.startsWith('/medications')||path.startsWith('/review'))return 'green';
  if(path.startsWith('/specialists'))return 'pink';
  if(path.startsWith('/screenings'))return 'purple';
  if(path.startsWith('/forms'))return 'orange';
  if(path.startsWith('/visit'))return 'yellow';
  if(path.startsWith('/help'))return 'red';
  return 'blue';
}
export const recentTone:Record<RecentKind,Tone>={dx:'blue',med:'green',spec:'pink',scr:'purple',form:'orange'};
