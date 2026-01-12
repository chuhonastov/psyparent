import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

const token = process.env.BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL;

if (!token) throw new Error('BOT_TOKEN is missing');
if (!webappUrl) throw new Error('WEBAPP_URL is missing');

const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const name = ctx.from?.first_name ?? 'друг';
  await ctx.reply(
    `Привет, ${name}!\n\nЯ открою справочник для родителей (Telegram Mini App).`,
    Markup.keyboard([
      Markup.button.webApp('Открыть справочник', webappUrl),
    ]).resize()
  );
});

bot.command('app', async (ctx) => {
  await ctx.reply(
    'Открываю приложение:',
    Markup.inlineKeyboard([
      Markup.button.webApp('ParentGuide', webappUrl),
    ])
  );
});

bot.on('message', async (ctx) => {
  await ctx.reply('Напиши /app или нажми кнопку «Открыть справочник».');
});

bot.launch().then(() => console.log('Bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
