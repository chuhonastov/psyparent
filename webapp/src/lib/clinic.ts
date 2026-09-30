import clinicRaw from '../content/clinic.json';
export type Branch={id:string;title:string;city:string;address:string;phone:string};
export type Doctor={id:string;name:string;role:string;about?:string;ages?:string;ageFrom?:number;ageTo?:number;online?:boolean;branches?:string[];specialties?:string[];topics?:string[];photo?:string;profileUrl?:string;bookingUrl?:string;bookingNote?:string};
export type Clinic={name:string;site:string;bookingUrl:string;summary:string;updatedAt:string;branches?:Branch[];doctors:Doctor[]};
export const clinic=clinicRaw as Clinic;
export const clinicLabel=()=>clinic.name||new URL(clinic.site).hostname;
export const doctorById=(id:string)=>clinic.doctors.find(d=>d.id===id);
export const doctorsForTopic=(topicId:string)=>clinic.doctors.filter(d=>d.topics?.includes(topicId));
export const bookingFor=(d?:Doctor)=>d?.bookingUrl||d?.profileUrl||clinic.bookingUrl;
export const branchById=(id:string)=>clinic.branches?.find(b=>b.id===id);
export const doctorCities=(d:Doctor)=>[...new Set((d.branches||[]).map(id=>branchById(id)?.city).filter((c):c is string=>!!c))];
export const clinicCities=()=>[...new Set((clinic.branches||[]).map(b=>b.city).filter(Boolean))];
export const photoUrl=(d:Doctor)=>!d.photo?'':/^https:\/\//.test(d.photo)?d.photo:(import.meta.env?.BASE_URL||'/')+d.photo;
export const seesAge=(d:Doctor,age:number)=>(d.ageFrom===undefined||age>=d.ageFrom)&&(d.ageTo===undefined||age<=d.ageTo);
export const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
export function filterDoctors(list:Doctor[],f:{city?:string;age?:number;online?:boolean}){
 return list.filter(d=>(!f.city||doctorCities(d).includes(f.city))&&(f.age===undefined||seesAge(d,f.age))&&(!f.online||d.online));
}
export function validateClinic(c:Clinic,topicIds:string[]):string[]{
 const errors:string[]=[],https=(u?:string)=>!u||/^https:\/\/[^\s]+$/.test(u);
 if(!https(c.site)||!c.site)errors.push('clinic.site must be https');
 if(!https(c.bookingUrl)||!c.bookingUrl)errors.push('clinic.bookingUrl must be https');
 const ids=new Set<string>(),branchIds=new Set((c.branches||[]).map(b=>b.id));
 for(const d of c.doctors){
  if(!/^[a-z0-9-]+$/.test(d.id)||ids.has(d.id))errors.push('bad or duplicate doctor id: '+d.id);ids.add(d.id);
  if(!d.name?.trim()||!d.role?.trim())errors.push('doctor needs name and role: '+d.id);
  for(const u of [d.profileUrl,d.bookingUrl])if(!https(u))errors.push('doctor url must be https: '+d.id);
  if(d.photo&&!https(d.photo)&&!/^doctors\/[a-z0-9-]+\.(webp|jpe?g|png)$/.test(d.photo))errors.push('doctor photo must be https or doctors/<id>.<ext>: '+d.id);
  for(const b of d.branches||[])if(!branchIds.has(b))errors.push('unknown branch '+b+' for '+d.id);
  for(const t of d.topics||[])if(!topicIds.includes(t))errors.push('unknown topic '+t+' for '+d.id);
 }
 return errors;
}
