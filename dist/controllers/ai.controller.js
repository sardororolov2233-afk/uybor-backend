"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReceiptPayment = exports.saveUserPreferences = exports.aiChat = void 0;
const supabase_1 = require("../utils/supabase");
const ai_1 = require("../utils/ai");
const index_1 = require("../index");
/**
 * 1. AI Assistant Chat (Mini App chat oynasi uchun)
 */
const aiChat = async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Xabar matni (message) kiritilishi shart' });
        }
        // Bazadagi so'nggi faol e'lonlarni olish
        const { data: listings } = await supabase_1.supabase
            .from('listings')
            .select('id, title, category, property_type, price, currency, rooms, address, images')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(20);
        const aiResponse = await (0, ai_1.chatWithAI)(message, history, listings || []);
        // Tavsiya etilgan e'lonlarning to'liq ma'lumotlarini topish
        let recommendedListings = [];
        if (aiResponse.recommendedListingIds.length > 0 && listings) {
            recommendedListings = listings.filter(l => aiResponse.recommendedListingIds.includes(l.id));
        }
        res.json({
            reply: aiResponse.text,
            recommended_listings: recommendedListings,
        });
    }
    catch (error) {
        console.error('aiChat error:', error);
        res.status(500).json({ error: 'AI bilan aloqada xatolik yuz berdi' });
    }
};
exports.aiChat = aiChat;
/**
 * 2. Foydalanuvchi qidiruv talablarini saqlash (Avtomatik saralash va bildirishnoma uchun)
 */
const saveUserPreferences = async (req, res) => {
    try {
        const user = req.user;
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Qidiruv talabi (prompt) kiritilishi shart' });
        }
        // AI orqali prompt dan parametrlarni ajratib olish
        const extracted = await (0, ai_1.extractPreferencesFromText)(prompt);
        // Bazaga saqlash
        const { data, error } = await supabase_1.supabase
            .from('user_preferences')
            .insert({
            user_id: user.id,
            telegram_id: user.telegram_id,
            category: extracted.category,
            property_type: extracted.property_type,
            min_price: extracted.min_price,
            max_price: extracted.max_price,
            currency: extracted.currency || 'USD',
            rooms: extracted.rooms,
            district: extracted.district,
            raw_prompt: prompt,
            is_active: true,
        })
            .select()
            .single();
        if (error) {
            console.error('saveUserPreferences DB error:', error);
            return res.status(500).json({ error: 'Ma\'lumotlar bazasiga saqlashda xatolik' });
        }
        res.json({
            message: 'Qidiruv talablaringiz muvaffaqiyatli saqlandi! Yangi mos e\'lon tushishi bilan xabar beramiz.',
            extracted,
            preference: data,
        });
    }
    catch (error) {
        console.error('saveUserPreferences error:', error);
        res.status(500).json({ error: 'Qidiruv talablarini saqlashda xatolik' });
    }
};
exports.saveUserPreferences = saveUserPreferences;
/**
 * 3. To'lov chekini AI (Vision) orqali tekshirish
 */
const verifyReceiptPayment = async (req, res) => {
    try {
        const user = req.user;
        const { receipt_image_url, listing_id, expected_amount } = req.body;
        if (!receipt_image_url) {
            return res.status(400).json({ error: 'Chek rasmining havolasi (receipt_image_url) kiritilishi shart' });
        }
        // AI orqali tekshirish
        const analysis = await (0, ai_1.verifyPaymentReceipt)(receipt_image_url, expected_amount);
        // Bazaga to'lov yozuvini kiritish
        const { data: payment, error } = await supabase_1.supabase
            .from('payments')
            .insert({
            user_id: user.id,
            telegram_id: user.telegram_id,
            listing_id: listing_id || null,
            receipt_image_url,
            amount: analysis.amount,
            currency: analysis.currency,
            transaction_time: analysis.transaction_time,
            card_last_four: analysis.card_last_four,
            sender_recipient: analysis.sender_recipient,
            transaction_id: analysis.transaction_id,
            status: analysis.status,
            ai_analysis: analysis,
        })
            .select()
            .single();
        if (error) {
            console.error('Payment DB insert error:', error);
            return res.status(500).json({ error: 'To\'lov yozuvini saqlashda xatolik' });
        }
        // Agar e'lon ID berilgan bo'lsa va to'lov tasdiqlangan bo'lsa, e'lonni TOP/VIP qilish
        if (analysis.status === 'APPROVED' && listing_id) {
            await supabase_1.supabase
                .from('listings')
                .update({ status: 'PROMOTED' })
                .eq('id', listing_id);
        }
        // Telegram orqali xabar yuborish
        try {
            if (user.telegram_id && index_1.bot) {
                if (analysis.status === 'APPROVED') {
                    await index_1.bot.telegram.sendMessage(user.telegram_id, `✅ <b>To'lov tasdiqlandi!</b>\n\nSumma: <b>${analysis.amount?.toLocaleString()} ${analysis.currency}</b>\nVaqti: ${analysis.transaction_time || 'Noma\'lum'}\nHolat: Muvaffaqiyatli qabul qilindi.`, { parse_mode: 'HTML' });
                }
                else {
                    await index_1.bot.telegram.sendMessage(user.telegram_id, `⚠️ <b>To'lov tekshiruvi:</b> ${analysis.reason}\n\nHolati: <i>${analysis.status}</i>`, { parse_mode: 'HTML' });
                }
            }
        }
        catch (tgError) {
            console.warn('Telegram xabarnoma yuborishda xatolik:', tgError);
        }
        res.json({
            message: analysis.status === 'APPROVED' ? 'To\'lov muvaffaqiyatli tasdiqlandi!' : 'To\'lov tekshirildi',
            analysis,
            payment,
        });
    }
    catch (error) {
        console.error('verifyReceiptPayment error:', error);
        res.status(500).json({ error: 'Chekni tekshirishda xatolik yuz berdi' });
    }
};
exports.verifyReceiptPayment = verifyReceiptPayment;
