import { getAllStats } from '../models/stats.js';


export const getStats = async (req, res) => {
  try {
    const stats = await getAllStats();
    
    // Process and format the data for frontend consumption
    const processedStats = {
      // User Statistics
      userStats: {
        total: stats.userStats.total,
        breakdown: stats.userStats.breakdown.reduce((acc, item) => {
          acc[item.type] = item.count;
          return acc;
        }, {}),
        artists: stats.userStats.breakdown.find(item => item.type === 'artist')?.count || 0,
        studios: stats.userStats.breakdown.find(item => item.type === 'studio')?.count || 0,
        admins: stats.userStats.breakdown.find(item => item.type === 'admin')?.count || 0
      },

      // User Growth (format for charts)
      userGrowth: {
        artists: stats.userGrowth.artists.map(item => ({
          month: item.month,
          count: item.count
        })),
        studios: stats.userGrowth.studios.map(item => ({
          month: item.month,
          count: item.count
        }))
      },

      // Revenue Statistics
      revenueStats: {
        monthly: stats.revenueStats.monthly.map(item => ({
          month: item.month,
          revenue: parseFloat(item.revenue)
        })),
        yearly: stats.revenueStats.yearly.map(item => ({
          year: parseInt(item.year),
          revenue: parseFloat(item.revenue)
        })),
        currentMonth: parseFloat(stats.revenueStats.currentMonth),
        currentYear: parseFloat(stats.revenueStats.currentYear),
        total: parseFloat(stats.revenueStats.total)
      },

      // Booking Statistics
      bookingStats: {
        priceRanges: stats.bookingStats.priceRanges.map(item => ({
          priceRange: item.price_range,
          count: item.count
        })),
        timeSlots: stats.bookingStats.timeSlots.map(item => ({
          hour: item.time_slot,
          bookings: item.bookings
        })),
        total: stats.bookingStats.total
      },

      // Top Studios
      topStudios: stats.topStudios.map(studio => ({
        id: studio.id,
        name: studio.name,
        bookings: studio.bookings,
        revenue: parseFloat(studio.revenue),
        rating: parseFloat(studio.avg_rating).toFixed(1)
      })),

      // Enhanced Gamification
      gamification: {
        stats: stats.gamificationStats.stats.map(item => ({
          userType: item.user_type,
          avgPoints: parseFloat(item.avg_points),
          maxPoints: item.max_points,
          maxLevel: item.max_level,
          totalUsers: item.total_users,
          totalPoints: item.total_points
        })),
        topUsers: stats.gamificationStats.topUsers.map(user => ({
          userId: user.user_id,
          userType: user.user_type,
          name: user.name || 'Unknown User',
          points: user.points,
          level: user.level
        })),
        summary: {
          totalBadges: stats.gamificationStats.stats.reduce((sum, item) => sum + item.max_level, 0),
          totalPoints: stats.gamificationStats.stats.reduce((sum, item) => sum + item.total_points, 0)
        }
      },

      // Device Usage with percentages
      deviceUsage: (() => {
        const totalUsage = stats.deviceUsage.reduce((sum, item) => sum + item.count, 0);
        return stats.deviceUsage.map(item => ({
          device: item.device_type,
          count: item.count,
          uniqueUsers: item.unique_users,
          percentage: totalUsage > 0 ? ((item.count / totalUsage) * 100).toFixed(1) : "0"
        }));
      })(),

      // Geographic Distribution with percentages
      artistCountries: (() => {
        const totalArtists = stats.artistCountries.reduce((sum, item) => sum + item.count, 0);
        return stats.artistCountries.map(item => ({
          country: item.country,
          users: item.count,
          percentage: totalArtists > 0 ? ((item.count / totalArtists) * 100).toFixed(1) : "0"
        }));
      })(),

      studioCountries: (() => {
        const totalStudios = stats.studioCountries.reduce((sum, item) => sum + item.count, 0);
        return stats.studioCountries.map(item => ({
          country: item.country,
          users: item.count,
          percentage: totalStudios > 0 ? ((item.count / totalStudios) * 100).toFixed(1) : "0"
        }));
      })(),

      // Summary metrics for quick overview
      summary: {
        totalUsers: stats.userStats.total,
        totalRevenue: parseFloat(stats.revenueStats.total),
        totalBookings: stats.bookingStats.total,
        averageBookingValue: stats.bookingStats.total > 0 ? 
          parseFloat(stats.revenueStats.total) / stats.bookingStats.total : 0,
        activeStudios: stats.topStudios.length,
        topRevenueStudio: stats.topStudios[0] || null,
        growthRate: {
          artists: calculateGrowthRate(stats.userGrowth.artists),
          studios: calculateGrowthRate(stats.userGrowth.studios)
        }
      }
    };

    res.json(processedStats);
  } catch (error) {
    console.error('Error fetching comprehensive stats:', error);
    res.status(500).json({ 
      message: "Error fetching stats",
      error: error.message 
    });
  }
};

// Helper function to calculate growth rate
const calculateGrowthRate = (growthData) => {
  if (growthData.length < 2) return 0;
  
  const latest = growthData[growthData.length - 1]?.count || 0;
  const previous = growthData[growthData.length - 2]?.count || 0;
  
  if (previous === 0) return latest > 0 ? 100 : 0;
  
  return ((latest - previous) / previous * 100).toFixed(1);
};