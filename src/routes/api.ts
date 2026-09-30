import { Router } from 'express';
import { loginWithTelegram } from '../controllers/auth.controller';
import { getListings, getListingById, createListing, getMyListings, updateListing, deleteListing } from '../controllers/listings.controller';
import { getFavorites, addFavorite, removeFavorite } from '../controllers/favorites.controller';
import { aiChat, saveUserPreferences, verifyReceiptPayment } from '../controllers/ai.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Auth
router.post('/auth/telegram', loginWithTelegram);

// Public Listings
router.get('/listings', getListings);
router.get('/listings/:id', getListingById);

// Protected Listings
router.post('/listings', authMiddleware, createListing);
router.get('/users/me/listings', authMiddleware, getMyListings);
router.put('/listings/:id', authMiddleware, updateListing);
router.delete('/listings/:id', authMiddleware, deleteListing);

// Favorites
router.get('/favorites', authMiddleware, getFavorites);
router.post('/favorites', authMiddleware, addFavorite);
router.delete('/favorites/:listing_id', authMiddleware, removeFavorite);

// AI & Payments
router.post('/ai/chat', aiChat);
router.post('/ai/preferences', authMiddleware, saveUserPreferences);
router.post('/payments/verify-receipt', authMiddleware, verifyReceiptPayment);

export default router;
