# 🏠 Uybor — Backend API

Uybor Telegram Mini App (TWA) platformasi uchun Express.js, TypeScript va Supabase (PostgreSQL) asosida qurilgan backend API.

## 🚀 Texnologiyalar

- **Node.js** & **Express 5**
- **TypeScript**
- **Supabase** (PostgreSQL & Storage)
- **Telegraf** (Telegram Bot)
- **JSON Web Token (JWT)** (Autentifikatsiya)
- **CORS** & **Dotenv**

## 📂 Loyiha tuzilishi

```
backend/
├── src/
│   ├── controllers/      # Auth, listings, favorites kontrollerlari
│   ├── middlewares/      # JWT auth middleware
│   ├── routes/           # Express API router (api.ts)
│   ├── utils/            # Supabase mijoz va Telegram initData validatsiyasi
│   └── index.ts          # Asosiy entry point (Express + Telegraf bot)
├── supabase_schema.sql   # Ma'lumotlar bazasi jadvallari va SQL sxemasi
├── package.json
└── tsconfig.json
```

## 🛠 O'rnatish va ishga tushirish

1. Bog'liqliklarni o'rnating:
```bash
npm install
```

2. `.env` faylini sozlang (`.env.example` namunasida):
```env
PORT=3000
BOT_TOKEN=your_telegram_bot_token
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

3. Dasturchi rejimida ishga tushirish:
```bash
npm run dev
```

4. Production uchun build qilish va ishga tushirish:
```bash
npm run build
npm start
```

## 📋 Asosiy API Endpointlar

- `POST /api/auth/telegram` — Telegram initData orqali avtorizatsiya va JWT olish
- `GET /api/listings` — E'lonlar ro'yxatini olish (filtrlash bilan)
- `GET /api/listings/:id` — Bitta e'lon tafsilotlari
- `POST /api/listings` — Yangi e'lon qo'shish (JWT talab etiladi)
- `PUT /api/listings/:id` — E'lonni tahrirlash (JWT talab etiladi)
- `DELETE /api/listings/:id` — E'lonni o'chirish (JWT talab etiladi)
- `GET /api/users/me/listings` — Foydalanuvchining o'z e'lonlari
- `GET /api/favorites` — Saqlangan e'lonlar
- `POST /api/favorites` — E'lonni saqlash
- `DELETE /api/favorites/:listing_id` — E'lonni sevimlilardan o'chirish
