import ArtistModel from '../models/artist.js';

export default {
  fetchAllStudios: async (req, res) => {
    try {
      console.log("fetchAllStudios called");
      // Test database connection first
      const testQuery = await ArtistModel.testConnection();
      console.log("Database connection test:", testQuery);
      
      // No artistId param needed here (in your model, getAllStudios has no args)
      const studios = await ArtistModel.getAllStudios();
      console.log("studio method is being used");
      console.log("Studios found:", studios.length);
      res.json(studios);
    } catch (error) {
      console.error("Error in fetchAllStudios:", error);
      res.status(500).json({ 
        error: error.message,
        details: "Database connection or query failed",
        timestamp: new Date().toISOString()
      });
    }
  },

  fetchAllBookings: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const bookings = await ArtistModel.getBookingsByArtist(artistId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchRelatedReviews: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const reviews = await ArtistModel.getReviewsByArtist(artistId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchPoints: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const points = await ArtistModel.getPoints(artistId);
      res.json(points);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchSettings: async (req, res) => {
    try {
      const artistId = Number(req.params.userId);
      const settings = await ArtistModel.getSettings(artistId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchNotifications: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const notifications = await ArtistModel.getNotifications(artistId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchFavoriteStudios: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const favorites = await ArtistModel.getFavoriteStudios(artistId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchStudioById: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const studio = await ArtistModel.fetchStudioDetails(studioId);
      if (!studio) return res.status(404).json({ message: "Studio not found" });
      res.json(studio);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchProfile: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const profile = await ArtistModel.getProfile(artistId);
      if (!profile) return res.status(404).json({ message: "Artist not found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchPaymentMethod: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const paymentMethod = await ArtistModel.getPaymentMethod(userId);
      res.json(paymentMethod);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchPaymentHistory: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const history = await ArtistModel.getPaymentHistory(artistId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchConnectedAccount: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const account = await ArtistModel.getConnectedAccount(userId);
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchProfileVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const visibility = await ArtistModel.getProfileVisibility(userId);
      res.json(visibility);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchContentVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const visibility = await ArtistModel.getContentVisibility(userId);
      res.json(visibility);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchLanguageSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const settings = await ArtistModel.getLocalizationSettings(userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updatePaymentMethod: async (req, res) => {
    try {
      const id = Number(req.params.id);  // make sure your route sends payment method id here
      const data = req.body;
      const updated = await ArtistModel.updatePaymentMethod(id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updatePaymentHistory: async (req, res) => {
    try {
      const id = Number(req.params.id);  // transaction id
      const data = req.body;
      const updated = await ArtistModel.updatePaymentHistory(id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateConnectedAccount: async (req, res) => {
    try {
      const id = Number(req.params.id);  // account id
      const data = req.body;
      const updated = await ArtistModel.updateConnectedAccount(id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateProfileVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { visibility } = req.body;
      const updated = await ArtistModel.updateProfileVisibility(userId, visibility);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateContentVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { status } = req.body;
      const updated = await ArtistModel.updateContentVisibility(userId, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateLanguageSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updated = await ArtistModel.updateLocalizationSettings(userId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateNotification: async (req, res) => {
  try {
    const artistId = Number(req.params.artistId);
    const data = req.body;
    // Assuming you have an ArtistModel method for this:
    const updated = await ArtistModel.updateNotification(artistId, data);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  },

  updateArtistSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updatedSettings = await ArtistModel.updateArtistSettings(userId, data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createBooking: async (req, res) => {
    try {
      const { user_id, studio_id, booking_date, booking_time, nbr_guests, service_id, status } = req.body;
      
      // Validate required fields
      if (!user_id || !studio_id || !booking_date || !booking_time || !nbr_guests || !service_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Create the booking
      const booking = await ArtistModel.createBooking({
        user_id,
        studio_id,
        booking_date,
        booking_time,
        nbr_guests,
        service_id,
        status: status || "Pending" // Default to "Pending" if not provided
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  },

  createReview: async (req, res) => {
    try {
      const { artist_id, studio_id, rating, comment, review_date} = req.body;
      
      // Validate required fields
      if (!artist_id || !studio_id || !rating || !comment || !review_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Create the booking
      const review = await ArtistModel.createReview({
        artist_id,
        studio_id,
        rating,
        comment,
        review_date
      });
      
      res.status(201).json(review);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  },


  addFavorite: async (req, res) => {
    try {
      const { artist_id, studio_id} = req.body;
      
      // Validate required fields
      if (!artist_id || !studio_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Create the booking
      const Favorite = await ArtistModel.addFavorite({
        artist_id,
        studio_id,
      });
      
      res.status(201).json(Favorite);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  },


  updateProfile: async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const data = req.body;
      const updatedProfile = await ArtistModel.updateArtistProfile(artistId, data);
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updatedSettings = await ArtistModel.updateSettings(userId, data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Gamification
  fetchGamification: async (req, res) => {
    try {
      const id = Number(req.params.artistId);
      const gamification = await ArtistModel.fetchGamification(id);

      if (!gamification) {
        return res.status(404).json({ message: "No gamification data found" });
      }

      res.json(gamification);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  },

};
