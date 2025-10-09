import express from "express";
const router = express.Router();
import artistController from '../controllers/artistController.js';

// Studios related
router.get('/studios', artistController.fetchAllStudios);              // 1
router.get('/:artistId/bookings', artistController.fetchAllBookings);   // 2
router.get('/:artistId/reviews', artistController.fetchRelatedReviews); // 3
router.get('/:artistId/points', artistController.fetchPoints);          // 4
router.get('/:artistId/notifications', artistController.fetchNotifications);  // 5
router.get('/:artistId/favorites', artistController.fetchFavoriteStudios);   // 6
router.get('/studio/:studioId', artistController.fetchStudioById);            // 7
router.get('/:artistId/profile', artistController.fetchProfile);               // 8

// Payments
router.get('/payment-method/:userId', artistController.fetchPaymentMethod);    // 9
router.get('/:artistId/payment-history', artistController.fetchPaymentHistory); // 10
router.put('/payment-method/:id', artistController.updatePaymentMethod);       // 11
router.put('/payment-history/:id', artistController.updatePaymentHistory);   


// Settings
router.get('/settings/:userId', artistController.fetchSettings);
router.put('/settings/:userId', artistController.updateArtistSettings)

// update profile 
router.put('/:artistId/profile', artistController.updateProfile);

// Connected account
router.get('/connected-account/:userId', artistController.fetchConnectedAccount); // 13
router.put('/connected-account/:id', artistController.updateConnectedAccount);     // 14

// Notifications (plural)
router.put('/:artistId/notifications', artistController.updateNotification);       // 15 <== likely culprit

// Profile visibility
router.get('/profile-visibility/:userId', artistController.fetchProfileVisibility); // 16
router.put('/profile-visibility/:userId', artistController.updateProfileVisibility); // 17

// Create bookings
router.post('/booking/create', artistController.createBooking);


// Create review
router.post('/review/create', artistController.createReview);

// add favorite studio
router.post('/favorite/add', artistController.addFavorite);

// Gamification
router.get('/:artistId/gamification', artistController.fetchGamification);


export default router;
