import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase';
import { verifyTelegramWebAppData } from '../utils/telegramAuth';

const BOT_TOKEN = process.env.BOT_TOKEN || 'dummy_token_for_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'uybor_secret_key_123';

/**
 * Telegram Bot API orqali foydalanuvchi profil rasmini olish
 */
async function getTelegramPhotoUrl(telegramId: number): Promise<string | null> {
  try {
    // 1) getUserProfilePhotos - foydalanuvchi rasmlarini olish
    const photosRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const photosData = await photosRes.json();

    if (!photosData.ok || photosData.result.total_count === 0) {
      return null;
    }

    // Eng katta o'lchamdagi rasmni olish (oxirgi element)
    const photos = photosData.result.photos[0]; // birinchi rasm
    const biggestPhoto = photos[photos.length - 1]; // eng katta o'lcham
    const fileId = biggestPhoto.file_id;

    // 2) getFile - fayl yo'lini olish
    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      return null;
    }

    // 3) To'liq URL yaratish
    const filePath = fileData.result.file_path;
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  } catch (error) {
    console.error('Error fetching Telegram photo:', error);
    return null;
  }
}

export const loginWithTelegram = async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    const telegramUser = verifyTelegramWebAppData(initData, BOT_TOKEN);
    
    if (!telegramUser) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Invalid initData, but allowing in dev mode (Mock)');
      } else {
        return res.status(401).json({ error: 'Invalid Telegram data' });
      }
    }
    
    const tgId = telegramUser ? telegramUser.id : req.body.fallback_id;
    if (!tgId) {
       return res.status(400).json({ error: 'Could not resolve telegram user id' });
    }

    // Telegram Bot API orqali profil rasmini olish
    const photoUrl = await getTelegramPhotoUrl(tgId);

    // Check if user exists in Supabase
    let { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', tgId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }

    // If user doesn't exist, create them
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: tgId,
          username: telegramUser?.username || null,
          first_name: telegramUser?.first_name || null,
          last_name: telegramUser?.last_name || null,
          photo_url: photoUrl,
          language: telegramUser?.language_code || 'uz',
        })
        .select()
        .single();

      if (insertError) {
         console.error('Error creating user:', insertError);
         return res.status(500).json({ error: 'Could not create user' });
      }
      user = newUser;
    } else {
      // Mavjud foydalanuvchi uchun rasm va ismni yangilash
      const updateFields: Record<string, any> = {};
      if (photoUrl) updateFields.photo_url = photoUrl;
      if (telegramUser?.first_name) updateFields.first_name = telegramUser.first_name;
      if (telegramUser?.last_name !== undefined) updateFields.last_name = telegramUser.last_name || null;

      if (Object.keys(updateFields).length > 0) {
        const { data: updatedUser } = await supabase
          .from('users')
          .update(updateFields)
          .eq('telegram_id', tgId)
          .select()
          .single();

        if (updatedUser) user = updatedUser;
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        telegram_id: user.telegram_id, 
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

