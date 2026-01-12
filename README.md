# Telegram Mini App: ParentGuide (MVP)

This repo contains:
- **webapp/** — Telegram Mini App (React + Vite + TypeScript)
- **bot/** — Telegram bot (Telegraf) that opens the Mini App via a WebApp button

## 1) Requirements
- Node.js 18+ (recommended 20+)
- A Telegram bot token from @BotFather
- A public HTTPS URL for the webapp (for testing you can use a tunneling tool like ngrok)

## 2) Run the webapp locally
```bash
cd webapp
npm i
npm run dev
```

## 3) Expose the webapp to Telegram
Telegram WebApps must be loaded from **HTTPS**.
- Use your hosting (Vercel/Netlify/VPS+Nginx) OR a tunneling tool during development.
- Put the resulting HTTPS URL into the bot env `WEBAPP_URL`.

## 4) Run the bot
```bash
cd bot
cp .env.example .env
# edit .env (BOT_TOKEN, WEBAPP_URL)
npm i
npm run dev
```

## 5) Content
Content is stored as JSON in:
- `webapp/src/content/diagnoses.json`
- `webapp/src/content/medications.json`

Later you can replace this JSON with data extracted from your book and/or a CMS.

## Safety note
This MVP is a **reference/education** tool. It does not give personal medical advice.

## Контент

Справочник лежит в `webapp/src/content/*.json`.
Подробности: `webapp/src/content/CONTENT_STRUCTURE.md`.


## Tools (optional)
If you have the book in .docx, you can use `tools/extract_from_book.py` to quickly locate chapters/keywords and prepare JSON content.
