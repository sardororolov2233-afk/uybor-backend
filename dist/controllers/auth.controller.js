"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithTelegram = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../utils/supabase");
const telegramAuth_1 = require("../utils/telegramAuth");
const BOT_TOKEN = process.env.BOT_TOKEN || 'dummy_token_for_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'uybor_secret_key_123';
const loginWithTelegram = async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }
        const telegramUser = (0, telegramAuth_1.verifyTelegramWebAppData)(initData, BOT_TOKEN);
        if (!telegramUser) {
            // In dev mode, if we want to bypass, we could allow it, but let's be strict or add a dev fallback
            if (process.env.NODE_ENV === 'development') {
                console.warn('Invalid initData, but allowing in dev mode (Mock)');
            }
            else {
                return res.status(401).json({ error: 'Invalid Telegram data' });
            }
        }
        const tgId = telegramUser ? telegramUser.id : req.body.fallback_id; // fallback_id for testing only if needed
        if (!tgId) {
            return res.status(400).json({ error: 'Could not resolve telegram user id' });
        }
        // Check if user exists in Supabase
        let { data: user, error: fetchError } = await supabase_1.supabase
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
            const { data: newUser, error: insertError } = await supabase_1.supabase
                .from('users')
                .insert({
                telegram_id: tgId,
                username: telegramUser?.username || null,
                first_name: telegramUser?.first_name || null,
                last_name: telegramUser?.last_name || null,
                language: telegramUser?.language_code || 'uz',
            })
                .select()
                .single();
            if (insertError) {
                console.error('Error creating user:', insertError);
                return res.status(500).json({ error: 'Could not create user' });
            }
            user = newUser;
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            telegram_id: user.telegram_id,
            role: user.role
        }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.loginWithTelegram = loginWithTelegram;
