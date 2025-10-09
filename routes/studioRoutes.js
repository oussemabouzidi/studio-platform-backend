import express from "express";
const router = express.Router();
import studioController from '../controllers/studioController.js';
import GamificationModel from "../models/gamification.js";


// Bookings
router.get('/:studioId/bookings', studioController.fetchAllBookings);

// Updating booking status
router.put('/:id/booking', studioController.updateBookingStatus)

// Earnings / transactions
router.get('/:studioId/earnings', studioController.fetchEarningsTransactions);

// Reviews
router.get('/:studioId/reviews', studioController.fetchRelatedReviews);

// add service
router.post('/service/create', studioController.addStudioService);

// update service
router.put('/service/:id', studioController.updateService);

// delete service
router.delete('/service/:id', studioController.deleteStudioService);


// Services
router.get('/:studioId/services', studioController.fetchRelatedServices);
router.post('/services', studioController.postService);
router.delete('/services/:serviceId', studioController.deleteService);
router.put('/services/:serviceId', studioController.updateService);

// Profile
router.get('/:studioId/profile', studioController.fetchProfile);
router.get('/:studioId/manage_profile', studioController.fetchManageProfile)
router.put('/:studioId/profile', studioController.updateProfile);

// Settings
router.get('/settings/:userId', studioController.fetchSettings);
router.put('/settings/:userId', studioController.updateSettings);

// Payment methods & history
router.get('/payment-method/:userId', studioController.fetchPaymentMethod);
router.get('/:studioId/payment-history', studioController.fetchPaymentHistory);
router.put('/payment-method/:userId', studioController.updatePaymentMethod);
router.put('/:studioId/payment-history', studioController.updatePaymentHistory);

// Connected account
router.get('/connected-account/:userId', studioController.fetchConnectedAccount);
router.put('/connected-account/:userId', studioController.updateConnectedAccount);

// Notifications
router.get('/notification/:userId', studioController.fetchNotification);
router.put('/notification/:userId', studioController.updateNotification);

// Profile visibility
router.get('/profile-visibility/:userId', studioController.fetchProfileVisibility);
router.put('/profile-visibility/:userId', studioController.updateProfileVisibility);

// Content visibility
router.get('/content-visibility/:userId', studioController.fetchContentVisibility);
router.put('/content-visibility/:userId', studioController.updateContentVisibility);

// Language & timezone & currency & time format
router.get('/language-settings/:userId', studioController.fetchLanguageSettings);
router.put('/language-settings/:userId', studioController.updateLanguageSettings);

// Gamification
router.get('/:studioId/gamification', studioController.fetchGamification);

// Gamification
router.put("/gamification/:userId/:userType", async (req, res, next) => {
  try {
    const { userId, userType } = req.params;
    const result = await GamificationModel.updateGamification(userId, userType);
    res.json(result);
  } catch (err) {
    next(err);
  }
});


export default router;