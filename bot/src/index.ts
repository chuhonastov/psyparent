import 'dotenv/config';
import {Telegraf,Markup} from 'telegraf';
const token=process.env.BOT_TOKEN;
const webappUrl=process.env.WEBAPP_URL || '';
if(!token) throw new Error('Укажите BOT_TOKEN в .env');
if(!webappUrl) throw new Error('Укажите WEBAPP_URL в .env');
const parsedUrl=new URL(webappUrl);
if(parsedUrl.protocol!=='https:') throw new Error('WEBAPP_URL должен начинаться с https://');
const bot=new Telegraf(token);
const button=()=>Markup.inlineKeyboard([Markup.button.webApp('Открыть PsyParent',webappUrl)]);
bot.start(async ctx=>{await ctx.reply('PsyParent помогает разобраться в диагнозе и назначениях, а затем собрать вопросы врачу.\n\nЗаписи сохраняются внутри приложения. Не отправляйте сюда медицинские документы и персональные данные ребёнка.',button());});
bot.command('app',async ctx=>{await ctx.reply('Ваша памятка и справочник:',button());});
bot.command('help',async ctx=>{await ctx.reply('Нажмите «Открыть PsyParent». В приложении есть диагнозы, разбор назначений и памятка к приёму. Бот не проводит консультации.',button());});
bot.on('message',async ctx=>{await ctx.reply('Откройте приложение кнопкой ниже. Этот бот не обрабатывает медицинские сообщения.',button());});
bot.catch(()=>console.error('Ошибка обработки события бота. Содержимое сообщения не записывается в журнал.'));
async function start(){
  await bot.telegram.setChatMenuButton({menuButton:{type:'web_app',text:'PsyParent',web_app:{url:webappUrl}}});
  console.info('Запуск PsyParent');
  await bot.launch();
}
start().catch(()=>{console.error('Не удалось запустить бота. Проверьте токен, HTTPS-адрес и сетевое соединение.');process.exitCode=1;});
process.once('SIGINT',()=>bot.stop('SIGINT'));
process.once('SIGTERM',()=>bot.stop('SIGTERM'));
