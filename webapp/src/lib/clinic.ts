import clinicRaw from '../content/clinic.json';
export type Doctor={id:string;name:string;role:string;about?:string;experience?:string;ages?:string;formats?:string[];specialties?:string[];topics?:string[];photo?:string;profileUrl?:string;bookingUrl?:string};
export type Clinic={name:string;site:string;bookingUrl:string;summary:string;updatedAt:string;doctors:Doctor[]};
export const clinic=clinicRaw as Clinic;
export const clinicLabel=()=>clinic.name||new URL(clinic.site).hostname;
export const doctorById=(id:string)=>clinic.doctors.find(d=>d.id===id);
export const doctorsForTopic=(topicId:string)=>clinic.doctors.filter(d=>d.topics?.includes(topicId));
export const bookingFor=(d?:Doctor)=>d?.bookingUrl||d?.profileUrl||clinic.bookingUrl;
export const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
export function validateClinic(c:Clinic,topicIds:string[]):string[]{
 const errors:string[]=[],https=(u?:string)=>!u||/^https:\/\/[^\s]+$/.test(u);
 if(!https(c.site)||!c.site)errors.push('clinic.site must be https');
 if(!https(c.bookingUrl)||!c.bookingUrl)errors.push('clinic.bookingUrl must be https');
 const ids=new Set<string>();
 for(const d of c.doctors){
  if(!/^[a-z0-9-]+$/.test(d.id)||ids.has(d.id))errors.push('bad or duplicate doctor id: '+d.id);ids.add(d.id);
  if(!d.name?.trim()||!d.role?.trim())errors.push('doctor needs name and role: '+d.id);
  for(const u of [d.photo,d.profileUrl,d.bookingUrl])if(!https(u))errors.push('doctor url must be https: '+d.id);
  for(const t of d.topics||[])if(!topicIds.includes(t))errors.push('unknown topic '+t+' for '+d.id);
 }
 return errors;
}
