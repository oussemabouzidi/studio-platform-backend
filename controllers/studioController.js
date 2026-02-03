import StudioModel from '../models/studio.js';

const studioController = {
  // Bookings
  fetchAllBookings: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const bookings = await StudioModel.fetchBookings(studioId);
      res.json(bookings);
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: error.message });
    }
  },




  updateBookingStatus: async (req, res) => {
    try{
      const id = Number(req.params.id);
      const status = req.body;
      const updatedStatus = await StudioModel.updateBookingStatus(id, status);
      
      res.json(updatedStatus);
    } catch(error){
      res.status(500).json({ error: error.message });
    }
  },


  addStudioService: async (req, res) => {
    try {  
      console.log(req.body);    
      const serviceData = {
        name: req.body.name,
        price_type: req.body.priceType,
        price: parseFloat(req.body.price),
        duration: req.body.duration,
        max_capacity: parseInt(req.body.maxCapacity),
        available_timing: req.body.availableTimes,
        description: req.body.description,
        studio_id: req.body.studio_id
      };

      const result = await StudioModel.addService(serviceData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding service:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },


  updateStudioService: async (req, res) => {
    try {
      const studioId = req.user.id;
      const serviceId = req.params.id;
      
      const updateData = {};
      
      // Map frontend fields to database fields
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.priceType !== undefined) updateData.price_type = req.body.priceType;
      if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
      if (req.body.duration !== undefined) updateData.duration = req.body.duration;
      if (req.body.maxCapacity !== undefined) updateData.max_capacity = parseInt(req.body.maxCapacity);
      if (req.body.availableTimes !== undefined) updateData.available_timing = req.body.availableTimes;
      if (req.body.description !== undefined) updateData.description = req.body.description;

      const result = await StudioModel.updateService(serviceId, studioId, updateData);
      res.json(result);
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }, 


  deleteStudioService: async (req, res) => {
    try {
      const serviceId = req.params.id; // ✅ get from URL params

      const result = await StudioModel.deleteService(serviceId);

      // if nothing was deleted, return 404
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Service not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Service deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  },



  fetchEarningsTransactions: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const earnings = await StudioModel.fetchEarnings(studioId);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchRelatedReviews: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const reviews = await StudioModel.fetchReviews(studioId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchRelatedServices: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const services = await StudioModel.fetchServices(studioId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchProfile: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const profile = await StudioModel.fetchProfile(studioId);
      if (!profile) return res.status(404).json({ message: "Studio not found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchManageProfile: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const profile = await StudioModel.fetchManageProfile(studioId);
      if (!profile) return res.status(404).json({ message: "Studio not found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Settings
  fetchSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const settings = await StudioModel.getStudioSettings(userId);
      if (!settings) return res.status(404).json({ message: "Settings not found" });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updatedSettings = await StudioModel.updateStudioSettings(userId, data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Services
  postService: async (req, res) => {
    try {
      const data = req.body;
      const newService = await StudioModel.postService(data);
      res.status(201).json(newService);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteService: async (req, res) => {
    try {
      const serviceId = Number(req.params.serviceId);
      await StudioModel.deleteService(serviceId);
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateService: async (req, res) => {
    try {
      const serviceId = Number(req.params.id);
      const studioId = req.body.studio_id || req.user.studioId; // make sure this exists
      const data = req.body;

      // Map frontend camelCase to DB snake_case
      const mappedData = {
        name: data.name,
        price_type: data.priceType,
        price: data.price,
        duration: data.duration,
        max_capacity: data.maxCapacity,
        available_timing: data.availableTimes,
        description: data.description
      };

      const updatedService = await StudioModel.updateService(serviceId, studioId, mappedData);
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: error.message });
    }
  },


  // Profile
  updateProfile: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const data = req.body;
      const updatedProfile = await StudioModel.updateStudioProfile(studioId, data);
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Payments
  fetchPaymentMethod: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const paymentMethod = await StudioModel.fetchPaymentMethod(userId);
      res.json(paymentMethod);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchPaymentHistory: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const history = await StudioModel.fetchPaymentHistory(studioId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updatePaymentMethod: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updated = await StudioModel.updatePaymentMethod(userId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updatePaymentHistory: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const data = req.body;
      const updated = await StudioModel.updatePaymentHistory(studioId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Connected account
  fetchConnectedAccount: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const account = await StudioModel.fetchConnectedAccount(userId);
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateConnectedAccount: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updated = await StudioModel.updateConnectedAccount(userId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Notifications
  fetchNotification: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const notification = await StudioModel.fetchNotifications(userId);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateNotification: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updated = await StudioModel.updateNotification(userId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Visibility
  fetchProfileVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const visibility = await StudioModel.fetchProfileVisibility(userId);
      res.json(visibility);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateProfileVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const visibility = req.body?.visibility ?? req.body;

      if (visibility === undefined) {
        return res.status(400).json({ error: "visibility is required" });
      }

      const updated = await StudioModel.updateProfileVisibility(userId, visibility);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchContentVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const visibility = await StudioModel.fetchContentVisibility(userId);
      res.json(visibility);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateContentVisibility: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const status = req.body?.status ?? req.body?.show_reviews_public ?? req.body;

      if (status === undefined) {
        return res.status(400).json({ error: "status is required" });
      }

      const updated = await StudioModel.updateContentVisibility(userId, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  fetchLanguageSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const settings = await StudioModel.fetchLanguageSettings(userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateLanguageSettings: async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const data = req.body;
      const updated = await StudioModel.updateLanguageSettings(userId, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Gamification
  fetchGamification: async (req, res) => {
    try {
      const studioId = Number(req.params.studioId);
      const gamification = await StudioModel.fetchGamification(studioId);

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

export default studioController;
