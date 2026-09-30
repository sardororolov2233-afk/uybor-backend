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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteListing = exports.updateListing = exports.getMyListings = exports.createListing = exports.getListingById = exports.getListings = void 0;
const supabase_1 = require("../utils/supabase");
const getListings = async (req, res) => {
    try {
        const { category, price_max, rooms, property_type } = req.query;
        let query = supabase_1.supabase.from('listings').select('*, users!inner(username, first_name, phone_number)');
        if (category)
            query = query.eq('category', String(category));
        if (property_type)
            query = query.eq('property_type', String(property_type));
        if (rooms)
            query = query.eq('rooms', parseInt(String(rooms), 10));
        if (price_max)
            query = query.lte('price', parseFloat(String(price_max)));
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.getListings = getListings;
const getListingById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('listings')
            .select('*, users(username, first_name, phone_number)')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ error: 'Listing not found' });
        }
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getListingById = getListingById;
const createListing = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { title, description, price, currency, category, property_type, rooms, area, address, lat, lon, images } = req.body;
        let uploadedImageUrls = [];
        // Base64 rasmlarni Supabase Storage'ga yuklash
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const mimeType = matches[1];
                            const base64Data = matches[2];
                            const buffer = Buffer.from(base64Data, 'base64');
                            const ext = mimeType.split('/')[1] || 'jpeg';
                            const fileName = `listings/${user_id}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                            const { data: uploadData, error: uploadError } = await supabase_1.supabase.storage
                                .from('listing-images')
                                .upload(fileName, buffer, {
                                contentType: mimeType,
                                upsert: false
                            });
                            if (!uploadError && uploadData) {
                                const { data: publicUrlData } = supabase_1.supabase.storage.from('listing-images').getPublicUrl(fileName);
                                uploadedImageUrls.push(publicUrlData.publicUrl);
                            }
                        }
                    }
                    catch (e) {
                        console.error('Image upload error:', e);
                        uploadedImageUrls.push(img); // Xatolik bo'lsa base64 ni o'zini qoldiramiz (fallback)
                    }
                }
                else {
                    uploadedImageUrls.push(img); // Agar u oldin yuklangan URL bo'lsa
                }
            }
        }
        const { data, error } = await supabase_1.supabase
            .from('listings')
            .insert({
            user_id,
            title,
            description,
            price,
            currency: currency || 'USD',
            category,
            property_type,
            rooms,
            area,
            address,
            lat,
            lon,
            images: uploadedImageUrls,
            status: 'ACTIVE'
        })
            .select()
            .single();
        if (error)
            throw error;
        // Mos keluvchi foydalanuvchilarga bot orqali bildirishnoma yuborish
        notifyMatchingUsers(data).catch(err => console.error('notifyMatchingUsers error:', err));
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.createListing = createListing;
/**
 * Yangi e'lon qo'shilganda uning parametrlariga mos keluvchi foydalanuvchilar lichkasiga Telegram xabar yuborish
 */
async function notifyMatchingUsers(listing) {
    try {
        const { data: preferences } = await supabase_1.supabase
            .from('user_preferences')
            .select('*')
            .eq('is_active', true);
        if (!preferences || preferences.length === 0)
            return;
        const { bot } = await Promise.resolve().then(() => __importStar(require('../index')));
        for (const pref of preferences) {
            // 1. Kategoriya mosligi
            if (pref.category && pref.category !== listing.category)
                continue;
            // 2. Mulk turi mosligi
            if (pref.property_type && pref.property_type !== listing.property_type)
                continue;
            // 3. Xonalar soni
            if (pref.rooms && pref.rooms !== listing.rooms)
                continue;
            // 4. Maksimal narx
            if (pref.max_price && Number(listing.price) > Number(pref.max_price))
                continue;
            // 5. Minimal narx
            if (pref.min_price && Number(listing.price) < Number(pref.min_price))
                continue;
            // Agar barcha mezonlar to'g'ri kelsa, Telegram lichkasiga yuborish
            if (bot && pref.telegram_id) {
                const text = `🔔 <b>Siz qidirgan yangi e'lon qo'shildi!</b>\n\n` +
                    `🏠 <b>${listing.title}</b>\n` +
                    `💰 <b>Narxi:</b> ${listing.price} ${listing.currency}\n` +
                    `🚪 <b>Xonalar:</b> ${listing.rooms} xona\n` +
                    `📍 <b>Manzil:</b> ${listing.address || 'Ko\'rsatilmagan'}\n\n` +
                    `<i>Sizning qidiruv talabingiz: "${pref.raw_prompt || 'Saqlangan mezon'}"</i>`;
                await bot.telegram.sendMessage(pref.telegram_id, text, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '👀 E\'lonni ko\'rish',
                                    web_app: { url: `https://frontend-gules-tau-81.vercel.app/listing/${listing.id}` }
                                }
                            ]
                        ]
                    }
                }).catch(e => console.warn(`Failed to notify tg_id ${pref.telegram_id}:`, e.message));
            }
        }
    }
    catch (error) {
        console.error('Error in notifyMatchingUsers:', error);
    }
}
const getMyListings = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { data, error } = await supabase_1.supabase
            .from('listings')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching own listings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyListings = getMyListings;
const updateListing = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const { id } = req.params;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { data: existing } = await supabase_1.supabase
            .from('listings')
            .select('user_id')
            .eq('id', id)
            .single();
        if (!existing || existing.user_id !== user_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { title, description, price, currency, category, property_type, rooms, area, address, lat, lon, images, status } = req.body;
        let uploadedImageUrls = [];
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:image')) {
                    try {
                        const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const mimeType = matches[1];
                            const base64Data = matches[2];
                            const buffer = Buffer.from(base64Data, 'base64');
                            const ext = mimeType.split('/')[1] || 'jpeg';
                            const fileName = `listings/${user_id}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                            const { data: uploadData, error: uploadError } = await supabase_1.supabase.storage
                                .from('listing-images')
                                .upload(fileName, buffer, {
                                contentType: mimeType,
                                upsert: false
                            });
                            if (!uploadError && uploadData) {
                                const { data: publicUrlData } = supabase_1.supabase.storage.from('listing-images').getPublicUrl(fileName);
                                uploadedImageUrls.push(publicUrlData.publicUrl);
                            }
                        }
                    }
                    catch (e) {
                        console.error('Image upload error:', e);
                        uploadedImageUrls.push(img);
                    }
                }
                else {
                    uploadedImageUrls.push(img); // Already a URL
                }
            }
        }
        const { data, error } = await supabase_1.supabase
            .from('listings')
            .update({
            title, description, price, currency, category, property_type,
            rooms, area, address, lat, lon,
            ...(images ? { images: uploadedImageUrls } : {}),
            status
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error updating listing:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.updateListing = updateListing;
const deleteListing = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const { id } = req.params;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { error } = await supabase_1.supabase
            .from('listings')
            .delete()
            .match({ id, user_id });
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteListing = deleteListing;
