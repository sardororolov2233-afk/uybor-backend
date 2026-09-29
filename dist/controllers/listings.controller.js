"use strict";
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
            images: images || [],
            status: 'ACTIVE'
        })
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
exports.createListing = createListing;
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
        const { data, error } = await supabase_1.supabase
            .from('listings')
            .update({
            title, description, price, currency, category, property_type,
            rooms, area, address, lat, lon, images, status
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
