import { getAllStudiosSupabase } from '../supabase-client.js';

export default {
  fetchAllStudios: async (req, res) => {
    try {
      console.log("fetchAllStudios called - trying Supabase REST API");
      
      // Try Supabase REST API instead of direct PostgreSQL
      const studios = await getAllStudiosSupabase();
      
      console.log("Studios found via Supabase API:", studios.length);
      
      // Transform the data to match your expected format
      const transformedStudios = studios.map(studio => ({
        id: studio.id,
        name: studio.name,
        avatar: studio.avatar_link || null,
        coverPhoto: '/studio/cover.jpg',
        rating: 0, // You'll need to calculate this separately
        location: studio.location || null,
        types: [], // You'll need to fetch these separately
        genres: [], // You'll need to fetch these separately
        price: 75,
        amenities: [],
        equipment: [], // You'll need to fetch these separately
        languages: [], // You'll need to fetch these separately
        availability: [],
        level: 1
      }));
      
      res.json(transformedStudios);
    } catch (error) {
      console.error("Error in fetchAllStudios:", error);
      res.status(500).json({ 
        error: error.message,
        details: "Supabase REST API connection failed",
        timestamp: new Date().toISOString()
      });
    }
  }
};
