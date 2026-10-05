import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replyText} from '../api/telegram';

test('the bot points to the privacy policy',()=>{
 assert.match(replyText('/start'),/Политика конфиденциальности: https:\/\/psyparent\.vercel\.app\/privacy/);
});

test('public texts carry no app version, testing or pilot wording',()=>{
 const files=['src/pages/About.tsx','src/pages/Home.tsx','src/pages/Privacy.tsx','src/pages/Feedback.tsx','src/pages/ScreeningDetail.tsx','src/lib/screeningContent.ts','src/content/glossary.json','api/telegram.ts'];
 for(const f of files){
  const text=readFileSync(new URL('../'+f,import.meta.url),'utf8');
  assert.doesNotMatch(text,/[Вв]ерси[яиюейям]|[Пп]илотн|тестировани|бета-|\bbeta\b/,f);
 }
 const privacy=readFileSync(new URL('../src/pages/Privacy.tsx',import.meta.url),'utf8');
 for(const must of ['Vercel Inc.','CloudStorage','после знака «#»','не использует файлы cookie','Удалить все мои записи'])assert(privacy.includes(must),must);
});
