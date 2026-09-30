import express from 'express';
import cors from 'cors';
import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Main API Routes
app.use('/api', apiRoutes);

// --- Telegraf Bot Setup ---
const botToken = process.env.BOT_TOKEN || 'dummy_token_for_dev';
export const bot = new Telegraf(botToken);

bot.start((ctx) => {
  ctx.reply(
    "Uybor ga xush kelibsiz! 🏠\n" +
    "E'lonlarni ko'rish uchun quyidagi tugmani bosing.",
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        Markup.button.webApp('Uybor ni ochish', 'https://frontend-gules-tau-81.vercel.app')
      ])
    }
  );
});

// Chek rasmi (kvitansiya) yuborilganda AI orqali tekshirish
bot.on('photo', async (ctx) => {
  try {
    const photos = ctx.message.photo;
    const bestPhoto = photos[photos.length - 1]; // eng yuqori sifatli rasm
    const fileId = bestPhoto.file_id;

    await ctx.reply('⏳ Chek rasmi qabul qilindi. AI tahlil qilmoqda, kuting...');

    // Telegramdan rasm havolasini olish
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const imageUrl = fileLink.href;

    const { verifyPaymentReceipt } = await import('./utils/ai');
    const analysis = await verifyPaymentReceipt(imageUrl);

    // Supabase ga yozish
    const { supabase } = await import('./utils/supabase');
    const tgId = ctx.from?.id;

    if (tgId) {
      let { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
      if (user) {
        await supabase.from('payments').insert({
          user_id: user.id,
          telegram_id: tgId,
          receipt_image_url: imageUrl,
          amount: analysis.amount,
          currency: analysis.currency,
          transaction_time: analysis.transaction_time,
          card_last_four: analysis.card_last_four,
          sender_recipient: analysis.sender_recipient,
          transaction_id: analysis.transaction_id,
          status: analysis.status,
          ai_analysis: analysis,
        });
      }
    }

    if (analysis.status === 'APPROVED') {
      await ctx.reply(
        `✅ <b>To'lov tasdiqlandi!</b>\n\n` +
        `💰 <b>Summa:</b> ${analysis.amount?.toLocaleString()} ${analysis.currency}\n` +
        `📅 <b>Vaqti:</b> ${analysis.transaction_time || 'Ko\'rsatilmagan'}\n` +
        `💳 <b>Karta:</b> ${analysis.card_last_four ? `*${analysis.card_last_four}` : 'Aniqlanmadi'}\n` +
        `🏢 <b>Qabul qiluvchi:</b> ${analysis.sender_recipient || 'Aniqlanmadi'}\n` +
        `🧾 <b>Tranzaksiya:</b> <code>${analysis.transaction_id || 'Mavjud emas'}</code>\n\n` +
        `<i>${analysis.reason}</i>`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(
        `⚠️ <b>To'lov tekshiruvi xabari:</b>\n\n` +
        `Holat: <b>${analysis.status}</b>\n` +
        `Izoh: ${analysis.reason}\n\n` +
        `<i>Agar xatolik yuz bergan deb hisoblasangiz, ma'muriyat bilan bog'laning.</i>`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (error: any) {
    console.error('Bot photo handling error:', error);
    await ctx.reply('❌ Chekni tahlil qilishda xatolik yuz berdi. Iltimos, rasmni aniqroq qilib qayta yuboring.');
  }
});

// Matnli xabar yuborilganda AI orqali qidiruv parametrlarini ajratish va qidirish
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return; // Buyruqlarni e'tiborsiz qoldirish

  try {
    await ctx.sendChatAction('typing');

    const { extractPreferencesFromText } = await import('./utils/ai');
    const { supabase } = await import('./utils/supabase');

    const extracted = await extractPreferencesFromText(text);

    // Foydalanuvchini bazada topish va talablarini saqlash
    const tgId = ctx.from?.id;
    if (tgId) {
      let { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
      if (user) {
        await supabase.from('user_preferences').insert({
          user_id: user.id,
          telegram_id: tgId,
          category: extracted.category,
          property_type: extracted.property_type,
          min_price: extracted.min_price,
          max_price: extracted.max_price,
          currency: extracted.currency || 'USD',
          rooms: extracted.rooms,
          district: extracted.district,
          raw_prompt: text,
          is_active: true,
        });
      }
    }

    // Mos e'lonlarni bazadan qidirish
    let query = supabase.from('listings').select('*').eq('status', 'ACTIVE');
    if (extracted.category) query = query.eq('category', extracted.category);
    if (extracted.property_type) query = query.eq('property_type', extracted.property_type);
    if (extracted.rooms) query = query.eq('rooms', extracted.rooms);
    if (extracted.max_price) query = query.lte('price', extracted.max_price);

    const { data: matchedListings } = await query.limit(5);

    let responseMsg = `🤖 <b>AI Qidiruv natijasi:</b>\n` +
      `📌 <b>Talabingiz:</b> ${extracted.summary}\n\n`;

    if (matchedListings && matchedListings.length > 0) {
      responseMsg += `Topilgan mos e'lonlar (${matchedListings.length} ta):\n\n`;
      matchedListings.forEach((item, idx) => {
        responseMsg += `${idx + 1}. <b>${item.title}</b>\n` +
          `💰 Narxi: ${item.price} ${item.currency}\n` +
          `📍 Manzil: ${item.address || 'Ko\'rsatilmagan'}\n\n`;
      });
      responseMsg += `E'lonlarni to'liq ko'rish uchun quyidagi tugmani bosing:`;

      await ctx.reply(responseMsg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('🔍 Barcha e\'lonlarni ochish', 'https://frontend-gules-tau-81.vercel.app/all-listings')
        ])
      });
    } else {
      responseMsg += `Hozircha bazada aynan bunday e'lon mavjud emas.\n\n` +
        `🔔 <b>Xavotir olmang!</b> Sizning qidiruv talablaringiz saqlandi. Yangi mos e'lon qo'shilishi bilan sizga Telegram orqali avtomatik xabar yuboraman!`;
      await ctx.reply(responseMsg, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('Bot text handling error:', error);
    await ctx.reply('So\'rovingizni qayta ishlashda xatolik bo\'ldi.');
  }
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
