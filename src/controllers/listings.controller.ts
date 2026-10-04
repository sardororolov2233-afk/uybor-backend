import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getListings = async (req: Request, res: Response) => {
  try {
    const { category, price_max, rooms, property_type } = req.query;
    
    const pageNum = parseInt(req.query.page as string) || 1;
    const limitNum = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    let query = supabase.from('listings').select('*, users!inner(username, first_name)').eq('status', 'ACTIVE');

    if (category) query = query.eq('category', String(category));
    if (property_type) query = query.eq('property_type', String(property_type));
    if (rooms) query = query.eq('rooms', parseInt(String(rooms), 10));
    if (price_max) query = query.lte('price', parseFloat(String(price_max)));

    const { data, error } = await query.order('created_at', { ascending: false }).range((pageNum - 1) * limitNum, pageNum * limitNum - 1);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: error?.message || 'Internal server error', details: error });
  }
};

export const getListingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('listings')
      .select('*, users(username, first_name, phone_number)')
      .eq('id', id)
      .single();

    if (error) {
       return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ error: error?.message || 'Internal server error', details: error });
  }
};

// ==========================================
// SIGNED UPLOAD URLS
// ==========================================
export const generateUploadUrls = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { files } = req.body; 
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const results = [];
    for (const f of files) {
      const ext = f.ext || 'jpeg';
      const fileName = `listings/${user_id}_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
      
      // Signed URL yaratish
      const { data, error } = await supabase.storage
        .from('listing-images')
        .createSignedUploadUrl(fileName);

      if (error) throw error;

      // Ommaviy ulanish havolasini ham tayyorlab beramiz
      const { data: publicUrlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(data.path);
      
      results.push({
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
        publicUrl: publicUrlData.publicUrl
      });
    }
    
    res.json({ urls: results });
  } catch (error: any) {
    console.error('generateUploadUrls error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate upload urls' });
  }
};

export const createListing = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.body) {
      return res.status(400).json({ error: 'Request body is empty' });
    }

    const { title, description, currency, category, property_type, address, lat, lon } = req.body;
    
    const price = parseFloat(String(req.body.price).replace(/\s/g, '')) || 0;
    const rooms = parseInt(String(req.body.rooms)) || 1;
    const area = req.body.area ? parseFloat(String(req.body.area)) : null;
    
    const imageUrls = req.body.imageUrls || [];

    // Check monthly limit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: currentMonthListingsCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', startOfMonth.toISOString());

    // Todo: Check if user has active subscription from users or subscriptions table
    // For now, if no subscription and count >= 5, throw limit reached
    if ((currentMonthListingsCount || 0) >= 5) {
      // Temporary check: If user hasn't paid, restrict
      // In a real app, verify subscription tier limits here.
      return res.status(403).json({ 
        error: 'LIMIT_REACHED', 
        message: 'Oylik bepul e\'lonlar limiti (5 ta) tugadi. Iltimos, rieltor paketini xarid qiling.' 
      });
    }

    const { data, error } = await supabase
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
        images: imageUrls,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (error) throw error;

    // Bildirishnoma yuborish
    notifyMatchingUsers(data).catch(err => console.error('notifyMatchingUsers error:', err));

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: error?.message || 'Internal server error', details: error });
  }
};

async function notifyMatchingUsers(listing: any) {
  try {
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('is_active', true);

    if (!preferences || preferences.length === 0) return;

    const { bot } = await import('../index');

    for (const pref of preferences) {
      if (pref.category && pref.category !== listing.category) continue;
      if (pref.property_type && pref.property_type !== listing.property_type) continue;
      if (pref.rooms && pref.rooms !== listing.rooms) continue;
      if (pref.max_price && Number(listing.price) > Number(pref.max_price)) continue;
      if (pref.min_price && Number(listing.price) < Number(pref.min_price)) continue;

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
                  web_app: { url: `${process.env.FRONTEND_URL || 'https://frontend-gules-tau-81.vercel.app'}/listing/${listing.id}` }
                }
              ],
              [
                { text: '✅ Foydali', callback_data: `feedback_useful_${pref.id}` },
                { text: '🔄 Yana reklamalarni yubor', callback_data: `feedback_more_${pref.id}` }
              ]
            ]
          }
        }).catch(e => console.warn(`Failed to notify tg_id ${pref.telegram_id}:`, e.message));

        // Disable it so we only send one ad
        await supabase.from('user_preferences').update({ is_active: false }).eq('id', pref.id);
      }
    }
  } catch (error) {
    console.error('Error in notifyMatchingUsers:', error);
  }
}

export const getMyListings = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching own listings:', error);
    res.status(500).json({ error: error?.message || 'Internal server error', details: error });
  }
};

export const updateListing = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id } = req.params;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { data: existing } = await supabase
      .from('listings')
      .select('user_id, images')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.body) {
      return res.status(400).json({ error: 'Request body is empty' });
    }

    const { title, description, currency, category, property_type,
            address, lat, lon, status, imageUrls } = req.body;

    const price = parseFloat(String(req.body.price).replace(/\s/g, '')) || 0;
    const rooms = parseInt(String(req.body.rooms)) || 1;
    const area = req.body.area ? parseFloat(String(req.body.area)) : null;

    if (status && !['ACTIVE', 'ARCHIVED', 'PROMOTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
            
    const finalImageUrls: string[] = imageUrls || [];

    // O'chirilgan rasmlarni storage'dan tozalash
    const removedImages = existing.images?.filter((img: string) => !finalImageUrls.includes(img)) || [];
    if (removedImages.length > 0) {
      const paths = removedImages.map((url: string) => {
        const parts = url.split('/');
        return 'listings/' + parts[parts.length - 1];
      });
      await supabase.storage.from('listing-images').remove(paths);
    }

    const { data, error } = await supabase
      .from('listings')
      .update({
        title, description, price, currency, category, property_type,
        rooms, area, address, lat, lon, 
        images: finalImageUrls,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating listing:', error);
    res.status(500).json({ error: error?.message || 'Internal server error', details: error });
  }
};

export const deleteListing = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id } = req.params;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { data: existing } = await supabase
      .from('listings')
      .select('user_id, images')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existing.images && existing.images.length > 0) {
      const paths = existing.images.map((url: string) => {
        const parts = url.split('/');
        return 'listings/' + parts[parts.length - 1];
      });
      await supabase.storage.from('listing-images').remove(paths);
    }

    const { error } = await supabase
      .from('listings')
      .delete()
      .match({ id, user_id });

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: error?.message || 'Internal server error', details: error });
  }
};
