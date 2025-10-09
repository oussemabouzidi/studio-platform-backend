// controllers/adminController.js
import AdminModel from '../models/admin.js';

export default {
  getAllArtists: async (req, res) => {
    try {
      const artists = await AdminModel.getAllArtists();
      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAllStudios: async (req, res) => {
    try {
      const studios = await AdminModel.getAllStudios();
      res.json(studios);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getArtistById: async (req, res) => {
    try {
      const artist = await AdminModel.getArtistById(Number(req.params.id));
      if (!artist) return res.status(404).json({ message: 'Artist not found' });
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getStudioById: async (req, res) => {
    try {
      const studio = await AdminModel.getStudioById(Number(req.params.id));
      if (!studio) return res.status(404).json({ message: 'Studio not found' });
      res.json(studio);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateArtistStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const success = await AdminModel.updateArtistStatus(Number(req.params.id), status);
      if (!success) return res.status(404).json({ message: 'Artist not found or not updated' });
      res.json({ message: 'Artist status updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateArtistVerification: async (req, res) => {
    try {
      const { verified } = req.body;
      const success = await AdminModel.updateArtistVerification(Number(req.params.id), verified);
      if (!success) return res.status(404).json({ message: 'Artist not found or not updated' });
      res.json({ message: 'Artist verification updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateStudioActivation: async (req, res) => {
    try {
      const { activated } = req.body;
      const success = await AdminModel.updateStudioActivation(Number(req.params.id), activated);
      if (!success) return res.status(404).json({ message: 'Studio not found or not updated' });
      res.json({ message: 'Studio activation updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateStudioStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const success = await AdminModel.updateStudioStatus(Number(req.params.id), status);
      if (!success) return res.status(404).json({ message: 'Studio not found or not updated' });
      res.json({ message: 'Studio status updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUserStats: async (req, res) => {
    try {
      const stats = await AdminModel.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getRevenueStats: async (req, res) => {
    try {
      const stats = await AdminModel.getRevenueStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getBookingStats: async (req, res) => {
    try {
      const stats = await AdminModel.getBookingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getStudioStats: async (req, res) => {
    try {
      const stats = await AdminModel.getStudioStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getGamificationStats: async (req, res) => {
    try {
      const stats = await AdminModel.getGamificationStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
