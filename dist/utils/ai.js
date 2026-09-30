"use strict";
/**
 * OpenRouter AI xizmati:
 * 1. Foydalanuvchi qidiruv talablarini tabiiy tildan ajratib olish (Parsing)
 * 2. To'lov cheklarini rasm orqali OCR qilib tekshirish (Vision)
 * 3. Mini App AI yordamchi suhbati (Chat & Property Recommender)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenRouter = callOpenRouter;
exports.extractPreferencesFromText = extractPreferencesFromText;
exports.verifyPaymentReceipt = verifyPaymentReceipt;
exports.chatWithAI = chatWithAI;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';
/**
 * OpenRouter umumiy so'rov yuborish funksiyasi
 */
async function callOpenRouter(messages, model = OPENROUTER_MODEL, jsonMode = false) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY sozlanmagan!');
    }
    const payload = {
        model,
        messages,
    };
    if (jsonMode) {
        payload.response_format = { type: 'json_object' };
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://frontend-gules-tau-81.vercel.app',
            'X-Title': 'UyBor Real Estate AI',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter xatosi (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}
/**
 * 1. Foydalanuvchining tabiiy tildagi xabaridan mezonlarni ajratib olish
 * Masalan: "Chilonzor metrosi yaqinidan 350 dollargacha ijaraga 2 xonali kvartira qidiryapman"
 */
async function extractPreferencesFromText(userPrompt) {
    const systemPrompt = `Sen "UyBor" ko'chmas mulk platformasining AI yordamchisisan.
Foydalanuvchining o'zbek yoki rus tilidagi xabarini tahlil qil va qidiruv parametrlarini JSON formatida ajratib ber.

Faqat toza JSON qaytar, markdown bloklarisiz (e.g. { ... }):
{
  "category": "RENT" (ijara/arendaga) yoki "SALE" (sotib olish/sotuv) yoki null,
  "property_type": "APARTMENT" (kvartira/dom) yoki "HOUSE" (hovli/uchastka) yoki "COMMERCIAL" yoki "LAND" yoki null,
  "min_price": son yoki null,
  "max_price": son yoki null,
  "currency": "USD" yoki "UZS" (agar $ yoki dollar bo'lsa USD, so'm bo'lsa UZS),
  "rooms": son yoki null (xonalar soni),
  "district": "tuman yoki joy nomi (masalan: Chilonzor, Yunusobod, Mirzo Ulugbek va h.k.)" yoki null,
  "summary": "Foydalanuvchi qidirayotgan uyning qisqa tushunarli bayoni o'zbek tilida"
}`;
    try {
        const raw = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ], OPENROUTER_MODEL, true);
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    }
    catch (error) {
        console.error('extractPreferencesFromText xatosi:', error);
        return {
            category: null,
            property_type: null,
            min_price: null,
            max_price: null,
            currency: 'USD',
            rooms: null,
            district: null,
            summary: userPrompt,
        };
    }
}
/**
 * 2. To'lov cheki rasmini tahlil qilish (Vision OCR)
 * Click, Payme, Uzum, Apelsin, Anorbank kabi cheklardan summani va to'lov holatini aniqlaydi.
 */
async function verifyPaymentReceipt(imageUrlOrBase64, expectedAmount) {
    const systemPrompt = `Sen "UyBor" to'lovlarni tekshirish AI tizimisan.
Senga foydalanuvchi yuborgan to'lov cheki / kvitansiya skrinshoti (Click, Payme, Uzum Bank, Paynet yoki bank ilovasi) beriladi.
Rasmdagi barcha yozuvlarni diqqat bilan o'qi va quyidagi JSON formatida natija ber.

Faqat toza JSON qaytar:
{
  "is_valid": true/false (haqiqiy to'lov chekimi?),
  "amount": son (masalan: 50000 yoki 100000, probellarsiz sof son),
  "currency": "UZS" yoki "USD",
  "transaction_time": "sana va vaqt (masalan: 30.09.2026 11:45)",
  "card_last_four": "karta oxirgi 4 raqami (masalan: 1234)" yoki null,
  "sender_recipient": "kimga o'tkazilgani yoki qabul qiluvchi nomi",
  "transaction_id": "tranzaksiya yoki chek raqami" yoki null,
  "status": "APPROVED" (agar to'lov muvaffaqiyatli o'tgan bo'lsa) yoki "REJECTED" (agar xato, bekor qilingan yoki soxta bo'lsa) yoki "MANUAL_REVIEW" (noaniq bo'lsa),
  "confidence": 0 dan 1 gacha son (ishonch darajasi),
  "reason": "Qisqa tushuntirish o'zbek tilida (masalan: 'Click orqali 50,000 UZS muvaffaqiyatli to'langan')"
}`;
    const imageContent = imageUrlOrBase64.startsWith('http')
        ? { type: 'image_url', image_url: { url: imageUrlOrBase64 } }
        : { type: 'image_url', image_url: { url: imageUrlOrBase64 } };
    try {
        const raw = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: [
                    { type: 'text', text: expectedAmount ? `Kutilayotgan summa: ${expectedAmount} UZS. Ushbu chekni tekshir.` : `Ushbu to'lov chekini tekshir.` },
                    imageContent,
                ],
            },
        ], OPENROUTER_MODEL, true);
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleaned);
        // Agar kutilayotgan summa berilgan bo'lsa va to'g'ri kelmasa
        if (expectedAmount && result.amount && result.amount < expectedAmount) {
            result.status = 'MANUAL_REVIEW';
            result.reason += ` (To'langan summa ${result.amount} kutilgan ${expectedAmount} dan kam)`;
        }
        return result;
    }
    catch (error) {
        console.error('verifyPaymentReceipt xatosi:', error);
        return {
            is_valid: false,
            amount: null,
            currency: 'UZS',
            transaction_time: null,
            card_last_four: null,
            sender_recipient: null,
            transaction_id: null,
            status: 'MANUAL_REVIEW',
            confidence: 0,
            reason: `Tahlil jarayonida xatolik yuz berdi: ${error.message}`,
        };
    }
}
/**
 * 3. Mini App ichidagi AI maslahatchi chat
 * Foydalanuvchi savoliga mavjud e'lonlar bazasidan foydalanib o'zbek tilida do'stona javob beradi.
 */
async function chatWithAI(userMessage, history, availableListings = []) {
    // E'lonlarni AI ga qisqa ko'rinishda uzatish
    const listingsContext = availableListings.slice(0, 15).map(l => ({
        id: l.id,
        title: l.title,
        category: l.category === 'RENT' ? 'Ijara' : 'Sotuv',
        type: l.property_type,
        price: `${l.price} ${l.currency || 'USD'}`,
        rooms: l.rooms,
        address: l.address,
    }));
    const systemPrompt = `Sen "UyBor" platformasining muloyim va professional ko'chmas mulk bo'yicha AI maslahatchisisan.
Sening vazifang foydalanuvchiga orzusidagi uyni topishda yordam berish, maslahatlar berish va bazadagi e'lonlarni tavsiya qilish.

Mavjud e'lonlar bazasi (oxirgi 15 ta):
${JSON.stringify(listingsContext, null, 2)}

Qoidalar:
1. O'zbek tilida samimiy, chiroyli va tushunarli javob ber.
2. Agar foydalanuvchi ma'lum turdagi uy so'rasa va u bazada bo'lsa, mos e'lonlarning ID sini va ma'lumotlarini ayt.
3. Agar mos e'lon topilmasa, "Hozircha aynan bunday e'lon yo'q, lekin men sizning talablaringizni eslab qolaman va yangi e'lon qo'shilishi bilan xabar beraman!" deb ayt.
4. Javobing oxirida agar tavsiya qilingan e'lonlar bo'lsa, quyidagi maxsus teglarni qo'sh:
[RECOMMENDED_IDS: id1, id2]`;
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6),
        { role: 'user', content: userMessage },
    ];
    try {
        const rawAnswer = await callOpenRouter(messages);
        // [RECOMMENDED_IDS: ...] tegini ajratib olish
        const match = rawAnswer.match(/\[RECOMMENDED_IDS:\s*([^\]]+)\]/);
        let recommendedListingIds = [];
        let cleanText = rawAnswer;
        if (match) {
            recommendedListingIds = match[1].split(',').map(s => s.trim()).filter(Boolean);
            cleanText = rawAnswer.replace(/\[RECOMMENDED_IDS:[^\]]+\]/, '').trim();
        }
        return {
            text: cleanText,
            recommendedListingIds,
        };
    }
    catch (error) {
        console.error('chatWithAI xatosi:', error);
        return {
            text: `Kechirasiz, so'rovda xatolik yuz berdi (${error?.message || 'aloqa xatosi'}). Iltimos, qayta urinib ko'ring.`,
            recommendedListingIds: [],
        };
    }
}
