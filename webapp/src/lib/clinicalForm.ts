import {toast} from './toast';
export async function downloadClinicalForm(){
 try{
  const source=(window as any).__PSYPARENT_CLINICAL_PDF__||'/forms/YGTSS-R-2017-RU.pdf';
  const response=await fetch(source);if(!response.ok)throw new Error('PDF unavailable');
  const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='YGTSS-R-2017-RU.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch{toast('Не удалось скачать бланк. Откройте оригинал по ссылке.',{variant:'error'});}
}
