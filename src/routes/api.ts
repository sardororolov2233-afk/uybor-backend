import { Router } from 'express';
import express from 'express';
import { loginWithTelegram } from '../controllers/auth.controller';
import { getListings, getListingById, createListing, getMyListings, updateListing, deleteListing, generateUploadUrls } from '../controllers/listings.controller';
import { getFavorites, addFavorite, removeFavorite } from '../controllers/favorites.controller';
import { aiChat, saveUserPreferences, verifyReceiptPayment, getUserPreferences } from '../controllers/ai.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Auth
router.post('/auth/telegram', loginWithTelegram);

// Public Listings
router.get('/listings', getListings);
router.get('/listings/:id', getListingById);

// Protected Listings
// Maxsus upload URLs yaratish (signed URLs)
router.post('/listings/upload-urls', authMiddleware, express.json(), generateUploadUrls);

// E'lon yaratish va tahrirlash (JSON orqali)
router.post('/listings', authMiddleware, express.json(), createListing);
router.put('/listings/:id', authMiddleware, express.json(), updateListing);

router.get('/users/me/listings', authMiddleware, getMyListings);
router.delete('/listings/:id', authMiddleware, deleteListing);

// Favorites
router.get('/favorites', authMiddleware, getFavorites);
router.post('/favorites', authMiddleware, addFavorite);
router.delete('/favorites/:listing_id', authMiddleware, removeFavorite);

// AI & Payments
router.post('/ai/chat', express.json(), aiChat);
router.get('/ai/preferences', authMiddleware, getUserPreferences);
router.post('/ai/preferences', authMiddleware, express.json(), saveUserPreferences);
router.post('/payments/verify-receipt', authMiddleware, express.json({ limit: '50mb' }), verifyReceiptPayment);

export default router;
