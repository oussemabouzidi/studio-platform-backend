import express from "express";
const router = express.Router();
import artistController from '../controllers/artistController.js';
import dns from 'node:dns/promises';
import pool from '../database.js';

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

// Temporary diagnostics route to debug DNS/DB (remove after fixing)
router.get('/__diag', async (req, res) => {
  const diagnostics = { startedAt: new Date().toISOString() };
  try {
    diagnostics.env = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeOptions: process.env.NODE_OPTIONS || null,
      pgSslMode: process.env.PGSSLMODE || null
    };

    // DNS resolve
    const host = 'db.cxdbwekciccqkleqehuw.supabase.co';
    try {
      const ipv4 = await dns.resolve4(host);
      diagnostics.dnsIPv4 = ipv4;
    } catch (e) {
      diagnostics.dnsIPv4Error = e.message;
    }
    try {
      const ipv6 = await dns.resolve6(host);
      diagnostics.dnsIPv6 = ipv6;
    } catch (e) {
      diagnostics.dnsIPv6Error = e.message;
    }

    // DB connect
    try {
      const client = await pool.connect();
      diagnostics.dbConnect = 'ok';
      try {
        const r = await client.query('SELECT NOW() as now');
        diagnostics.dbQuery = { ok: true, now: r.rows?.[0]?.now };
      } catch (qe) {
        diagnostics.dbQuery = { ok: false, error: qe.message };
      } finally {
        client.release();
      }
    } catch (ce) {
      diagnostics.dbConnect = `error: ${ce.message}`;
    }

    diagnostics.endedAt = new Date().toISOString();
    res.json(diagnostics);
  } catch (err) {
    res.status(500).json({ error: err.message, diagnostics });
  }
});
