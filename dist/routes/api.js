"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const listings_controller_1 = require("../controllers/listings.controller");
const favorites_controller_1 = require("../controllers/favorites.controller");
const ai_controller_1 = require("../controllers/ai.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Auth
router.post('/auth/telegram', auth_controller_1.loginWithTelegram);
// Public Listings
router.get('/listings', listings_controller_1.getListings);
router.get('/listings/:id', listings_controller_1.getListingById);
// Protected Listings
router.post('/listings', authMiddleware_1.authMiddleware, listings_controller_1.createListing);
router.get('/users/me/listings', authMiddleware_1.authMiddleware, listings_controller_1.getMyListings);
router.put('/listings/:id', authMiddleware_1.authMiddleware, listings_controller_1.updateListing);
router.delete('/listings/:id', authMiddleware_1.authMiddleware, listings_controller_1.deleteListing);
// Favorites
router.get('/favorites', authMiddleware_1.authMiddleware, favorites_controller_1.getFavorites);
router.post('/favorites', authMiddleware_1.authMiddleware, favorites_controller_1.addFavorite);
router.delete('/favorites/:listing_id', authMiddleware_1.authMiddleware, favorites_controller_1.removeFavorite);
// AI & Payments
router.post('/ai/chat', ai_controller_1.aiChat);
router.get('/ai/preferences', authMiddleware_1.authMiddleware, ai_controller_1.getUserPreferences);
router.post('/ai/preferences', authMiddleware_1.authMiddleware, ai_controller_1.saveUserPreferences);
router.post('/payments/verify-receipt', authMiddleware_1.authMiddleware, ai_controller_1.verifyReceiptPayment);
exports.default = router;
