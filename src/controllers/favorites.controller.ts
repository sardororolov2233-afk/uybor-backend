import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch the favorited listings
    const { data, error } = await supabase
      .from('favorites')
      .select('*, listings(*)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { listing_id } = req.body;
    if (!listing_id) return res.status(400).json({ error: 'listing_id is required' });

    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id, listing_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({ error: 'Already in favorites' });
      }
      throw error;
    }
    
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { listing_id } = req.params;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .match({ user_id, listing_id });

    if (error) throw error;
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
