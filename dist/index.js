"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const errorHandler_1 = require("./middlewares/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use((0, cors_1.default)({ origin: [process.env.FRONTEND_URL || 'https://frontend-gules-tau-81.vercel.app', 'http://localhost:5173'] }));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '2mb', extended: true }));
const limiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests' });
// Main API Routes
app.use('/api', limiter);
app.use('/api', api_1.default);
// --- Telegraf Bot Setup ---
const botToken = process.env.BOT_TOKEN || 'dummy_token_for_dev';
exports.bot = new telegraf_1.Telegraf(botToken);
exports.bot.start((ctx) => {
    ctx.reply("Uybor ga xush kelibsiz! 🏠\n" +
        "E'lonlarni ko'rish uchun quyidagi tugmani bosing.", {
        parse_mode: 'HTML',
        ...telegraf_1.Markup.inlineKeyboard([
            telegraf_1.Markup.button.webApp('Uybor ni ochish', process.env.FRONTEND_URL || 'https://frontend-gules-tau-81.vercel.app')
        ])
    });
});
// Chek rasmi (kvitansiya) yuborilganda AI orqali tekshirish
exports.bot.on('photo', async (ctx) => {
    try {
        const photos = ctx.message.photo;
        const bestPhoto = photos[photos.length - 1]; // eng yuqori sifatli rasm
        const fileId = bestPhoto.file_id;
        await ctx.reply('⏳ Chek rasmi qabul qilindi. AI tahlil qilmoqda, kuting...');
        // Telegramdan rasm havolasini olish
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const imageUrl = fileLink.href;
        const { verifyPaymentReceipt } = await Promise.resolve().then(() => __importStar(require('./utils/ai')));
        const analysis = await verifyPaymentReceipt(imageUrl);
        // Supabase ga yozish
        const { supabase } = await Promise.resolve().then(() => __importStar(require('./utils/supabase')));
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
            await ctx.reply(`✅ <b>To'lov tasdiqlandi!</b>\n\n` +
                `💰 <b>Summa:</b> ${analysis.amount?.toLocaleString()} ${analysis.currency}\n` +
                `📅 <b>Vaqti:</b> ${analysis.transaction_time || 'Ko\'rsatilmagan'}\n` +
                `💳 <b>Karta:</b> ${analysis.card_last_four ? `*${analysis.card_last_four}` : 'Aniqlanmadi'}\n` +
                `🏢 <b>Qabul qiluvchi:</b> ${analysis.sender_recipient || 'Aniqlanmadi'}\n` +
                `🧾 <b>Tranzaksiya:</b> <code>${analysis.transaction_id || 'Mavjud emas'}</code>\n\n` +
                `<i>${analysis.reason}</i>`, { parse_mode: 'HTML' });
        }
        else {
            await ctx.reply(`⚠️ <b>To'lov tekshiruvi xabari:</b>\n\n` +
                `Holat: <b>${analysis.status}</b>\n` +
                `Izoh: ${analysis.reason}\n\n` +
                `<i>Agar xatolik yuz bergan deb hisoblasangiz, ma'muriyat bilan bog'laning.</i>`, { parse_mode: 'HTML' });
        }
    }
    catch (error) {
        console.error('Bot photo handling error:', error);
        await ctx.reply('❌ Chekni tahlil qilishda xatolik yuz berdi. Iltimos, rasmni aniqroq qilib qayta yuboring.');
    }
});
// Matnli xabar yuborilganda AI orqali qidiruv parametrlarini ajratish va qidirish
exports.bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/'))
        return; // Buyruqlarni e'tiborsiz qoldirish
    try {
        await ctx.sendChatAction('typing');
        const { extractPreferencesFromText } = await Promise.resolve().then(() => __importStar(require('./utils/ai')));
        const { supabase } = await Promise.resolve().then(() => __importStar(require('./utils/supabase')));
        const extracted = await extractPreferencesFromText(text);
        // Foydalanuvchini bazada topish va talablarini saqlash
        const tgId = ctx.from?.id;
        let prefId = null;
        if (tgId) {
            let { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
            if (user) {
                const { data: prefData } = await supabase.from('user_preferences').insert({
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
                    is_active: false,
                }).select('id').single();
                if (prefData)
                    prefId = prefData.id;
            }
        }
        // Mos e'lonlarni bazadan qidirish
        let query = supabase.from('listings').select('*').eq('status', 'ACTIVE');
        if (extracted.category)
            query = query.eq('category', extracted.category);
        if (extracted.property_type)
            query = query.eq('property_type', extracted.property_type);
        if (extracted.rooms)
            query = query.eq('rooms', extracted.rooms);
        if (extracted.max_price)
            query = query.lte('price', extracted.max_price);
        const { data: matchedListings } = await query.limit(1);
        let responseMsg = `🤖 <b>AI Qidiruv natijasi:</b>\n` +
            `📌 <b>Talabingiz:</b> ${extracted.summary}\n\n`;
        if (matchedListings && matchedListings.length > 0) {
            const item = matchedListings[0];
            responseMsg += `Topilgan mos e'lon:\n\n`;
            responseMsg += `<b>${item.title}</b>\n` +
                `💰 Narxi: ${item.price} ${item.currency}\n` +
                `📍 Manzil: ${item.address || 'Ko\'rsatilmagan'}\n\n`;
            await ctx.reply(responseMsg, {
                parse_mode: 'HTML',
                ...telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.webApp('👀 E\'lonni to\'liq ko\'rish', `${process.env.FRONTEND_URL || 'https://frontend-gules-tau-81.vercel.app'}/listing/${item.id}`)],
                    [telegraf_1.Markup.button.callback('🔍 Ofline qolganda ham menga topib yubor', `activate_pref_${prefId}`)]
                ])
            });
        }
        else {
            responseMsg += `Hozircha bazada aynan bunday e'lon mavjud emas.\n\n`;
            await ctx.reply(responseMsg, {
                parse_mode: 'HTML',
                ...telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔍 Ofline qolganda ham menga topib yubor', `activate_pref_${prefId}`)]
                ])
            });
        }
    }
    catch (error) {
        console.error('Bot text handling error:', error);
        await ctx.reply('So\'rovingizni qayta ishlashda xatolik bo\'ldi.');
    }
});
exports.bot.action(/activate_pref_(.+)/, async (ctx) => {
    const prefId = ctx.match[1];
    if (!prefId || prefId === 'null') {
        return ctx.answerCbQuery('Xatolik: Talab topilmadi.');
    }
    try {
        const { supabase } = await Promise.resolve().then(() => __importStar(require('./utils/supabase')));
        await supabase.from('user_preferences').update({ is_active: true }).eq('id', prefId);
        await ctx.answerCbQuery('Faollashtirildi! Yangi e\'lonlar chiqsa yuboramiz.', { show_alert: true });
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply('Sizning qidiruv talablaringiz saqlandi. Yangi mos e\'lon qo\'shilishi bilan sizga avtomatik bitta xabar yuboraman!');
    }
    catch (err) {
        console.error(err);
        await ctx.answerCbQuery('Xatolik yuz berdi.');
    }
});
exports.bot.action(/feedback_useful_(.+)/, async (ctx) => {
    const prefId = ctx.match[1];
    try {
        // Actually, it's already deactivated when sent. So we just acknowledge.
        await ctx.answerCbQuery('Rahmat! Qidiruv to\'xtatildi.', { show_alert: true });
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply('✅ E\'lon foydali deb topildi. Boshqa reklama yuborilmaydi. Yangi e\'lonlar qidirish uchun istalgan vaqtda yozishingiz mumkin.');
    }
    catch (err) {
        console.error(err);
    }
});
exports.bot.action(/feedback_more_(.+)/, async (ctx) => {
    const prefId = ctx.match[1];
    try {
        const { supabase } = await Promise.resolve().then(() => __importStar(require('./utils/supabase')));
        await supabase.from('user_preferences').update({ is_active: true }).eq('id', prefId);
        await ctx.answerCbQuery('Yana e\'lonlar qidirilmoqda...', { show_alert: true });
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply('✅ Qidiruv davom ettiriladi. Yana mos e\'lon chiqqanda yuboraman.');
    }
    catch (err) {
        console.error(err);
    }
});
app.use(errorHandler_1.errorHandler);
exports.bot.launch().then(() => {
    console.log('Telegraf bot launched successfully.');
}).catch(err => {
    console.log('Telegraf bot launch failed (likely due to dummy token):', err.message);
});
// --- Start Express Server ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Express API is running on port ${PORT}`);
});
const shutdown = () => { exports.bot.stop(); server.close(); process.exit(0); };
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
