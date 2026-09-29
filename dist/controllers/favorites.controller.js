"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFavorite = exports.addFavorite = exports.getFavorites = void 0;
const supabase_1 = require("../utils/supabase");
const getFavorites = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        // Fetch the favorited listings
        const { data, error } = await supabase_1.supabase
            .from('favorites')
            .select('*, listings(*)')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getFavorites = getFavorites;
const addFavorite = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { listing_id } = req.body;
        if (!listing_id)
            return res.status(400).json({ error: 'listing_id is required' });
        const { data, error } = await supabase_1.supabase
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
    }
    catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addFavorite = addFavorite;
const removeFavorite = async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id)
            return res.status(401).json({ error: 'Unauthorized' });
        const { listing_id } = req.params;
        const { error } = await supabase_1.supabase
            .from('favorites')
            .delete()
            .match({ user_id, listing_id });
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.removeFavorite = removeFavorite;
