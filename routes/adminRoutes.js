// routes/adminRoutes.js
import express from 'express';


import adminController from '../controllers/adminController.js';


const router = express.Router();

// Fetch all artists
router.get('/artists', adminController.getAllArtists);

// Fetch all studios
router.get('/studios', adminController.getAllStudios);

// Fetch artist by ID
router.get('/artist/:id', adminController.getArtistById);

// Fetch studio by ID
router.get('/studio/:id', adminController.getStudioById);

// Update artist status
router.put('/artist/:id/status', adminController.updateArtistStatus);

// Update artist verification
router.put('/artist/:id/verification', adminController.updateArtistVerification);

// Update studio activation
router.put('/studio/:id/activation', adminController.updateStudioActivation);

// Update studio status
router.put('/studio/:id/status', adminController.updateStudioStatus);

// Get user stats
router.get('/stats/users', adminController.getUserStats);

// Get revenue stats
router.get('/stats/revenue', adminController.getRevenueStats);

// Get booking stats
router.get('/stats/bookings', adminController.getBookingStats);

// Get studio stats
router.get('/stats/studios', adminController.getStudioStats);

// Get gamification stats
router.get('/stats/gamification', adminController.getGamificationStats);

export default router;
