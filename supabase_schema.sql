-- 1. UUID kengaytmasini yoqish (agar yoqilmagan bo'lsa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users (Foydalanuvchilar) jadvali
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  photo_url TEXT,
  language TEXT DEFAULT 'uz',
  role TEXT DEFAULT 'USER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Listings (E'lonlar) jadvali
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL, -- RENT, SALE
  property_type TEXT NOT NULL, -- APARTMENT, HOUSE, COMMERCIAL, LAND
  rooms INTEGER NOT NULL,
  area NUMERIC,
  address TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  status TEXT DEFAULT 'ACTIVE',
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Favorites (Sevimlilar) jadvali
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- 5. Rasmlar saqlash uchun Supabase Storage da yangi quti (bucket) yaratish
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage uchun ruxsatnomalar (Public o'qish imkoniyati)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'listing-images' );

-- (Ixtiyoriy) E'lonlar yangilanganda updated_at ustunini avtomatik o'zgartirish uchun trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. User Preferences (Foydalanuvchi qidiruv talablari - AI orqali saralash uchun)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  category TEXT, -- RENT, SALE
  property_type TEXT, -- APARTMENT, HOUSE, etc.
  min_price NUMERIC,
  max_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  rooms INTEGER,
  district TEXT, -- Chilonzor, Yunusobod, etc.
  raw_prompt TEXT, -- Masalan: "Chilonzordan 400$ gacha 2 xonali uy kerak"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Payments (To'lov cheklari va AI orqali tekshirish natijalari)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  receipt_image_url TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT DEFAULT 'UZS',
  transaction_time TEXT,
  card_last_four TEXT,
  sender_recipient TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

