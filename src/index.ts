import express from 'express';
import cors from 'cors';
import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Main API Routes
app.use('/api', apiRoutes);

// --- Telegraf Bot Setup ---
const botToken = process.env.BOT_TOKEN || 'dummy_token_for_dev';
const bot = new Telegraf(botToken);

bot.start((ctx) => {
  ctx.reply(
    'Uybor ga xush kelibsiz! 🏠\nE\'lonlarni ko\'rish uchun quyidagi tugmani bosing.',
    Markup.inlineKeyboard([
      Markup.button.webApp('Uybor ni ochish', 'https://frontend-gules-tau-81.vercel.app')
    ])
  );
});

bot.launch().then(() => {
  console.log('Telegraf bot launched successfully.');
}).catch(err => {
  console.log('Telegraf bot launch failed (likely due to dummy token):', err.message);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// --- Start Express Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express API is running on port ${PORT}`);
});
