import React from 'react';
export type IconName = 'home'|'book'|'pill'|'note'|'arrow'|'back'|'check'|'plus'|'search'|'shield'|'heart'|'leaf'|'download'|'copy'|'close'|'trash'|'external'|'clock'|'calendar'|'share'|'upload'|'print'|'phone'|'user'|'flask';
const paths: Record<IconName,React.ReactNode> = {
 phone:<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
 home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
 book:<><path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z"/></>,
 pill:<><rect x="2.5" y="8.25" width="19" height="7.5" rx="3.75" transform="rotate(-45 12 12)"/><path d="m9.35 9.35 5.3 5.3"/></>,
 note:<><rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/></>,
 arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,
 back:<path d="M19 12H5m6-6-6 6 6 6"/>,
 check:<path d="m5 12 4 4L19 6"/>,
 plus:<path d="M12 5v14M5 12h14"/>,
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
 flask:<><path d="M9 3h6M10 3v6l-5.2 9A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3L14 9V3"/><path d="M7.4 15h9.2"/></>,
 shield:<><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
 heart:<path d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13z"/>,
 leaf:<><path d="M20 3C7 2 2 9 5 16c7 6 16 0 15-13zM3 21 15 8"/></>,
 download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
 copy:<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/></>,
 close:<path d="m6 6 12 12M6 18 18 6"/>,
 trash:<><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>,
 external:<><path d="M14 3h7v7m0-7-11 11M10 3H3v18h18v-7"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
 calendar:<><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4m8-4v4"/></>,
 share:<><path d="M12 15V3m-4 4 4-4 4 4"/><path d="M8 10H5v11h14V10h-3"/></>,
 upload:<><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
 print:<><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/></>
};
export default function Icon({name,size=20}:{name:IconName;size?:number}) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
