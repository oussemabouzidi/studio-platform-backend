import pool from '../database.js';

// === User Statistics ===
export const getUserStats = async () => {
  const [rows] = await pool.query(`
    SELECT 
      type,
      COUNT(*) as count
    FROM user_profile 
    GROUP BY type
  `);
  
  const [totalResult] = await pool.query(`
    SELECT COUNT(*) as total FROM user_profile
  `);
  
  return {
    breakdown: rows,
    total: totalResult[0].total
  };
};

// === User Growth (Monthly) ===
export const getUserGrowthStats = async () => {
  const [artistGrowth] = await pool.query(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COUNT(*) as count
    FROM artist 
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  const [studioGrowth] = await pool.query(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COUNT(*) as count
    FROM studio 
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  return {
    artists: artistGrowth,
    studios: studioGrowth
  };
};

// === Revenue Statistics ===
export const getRevenueStats = async () => {
  // Monthly revenue
  const [monthlyRevenue] = await pool.query(`
    SELECT 
      DATE_FORMAT(transaction_date, '%Y-%m') as month,
      SUM(amount) as revenue
    FROM transactions
    WHERE status = 'completed' 
      AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
    ORDER BY month ASC
  `);

  // Current month revenue
  const [currentMonth] = await pool.query(`
    SELECT SUM(amount) as revenue
    FROM transactions 
    WHERE status = 'completed' 
      AND MONTH(transaction_date) = MONTH(CURDATE()) 
      AND YEAR(transaction_date) = YEAR(CURDATE())
  `);

  // Current year revenue
  const [currentYear] = await pool.query(`
    SELECT SUM(amount) as revenue
    FROM transactions
    WHERE status = 'completed' 
      AND YEAR(transaction_date) = YEAR(CURDATE())
  `);

  // Total revenue
  const [totalRevenue] = await pool.query(`
    SELECT SUM(amount) as revenue
    FROM transactions 
    WHERE status = 'completed'
  `);

  // Yearly revenue
  const [yearlyRevenue] = await pool.query(`
    SELECT 
      YEAR(transaction_date) as year,
      SUM(amount) as revenue
    FROM transactions
    WHERE status = 'completed' 
      AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)
    GROUP BY YEAR(transaction_date)
    ORDER BY year ASC
  `);

  return {
    monthly: monthlyRevenue,
    yearly: yearlyRevenue,
    currentMonth: currentMonth[0]?.revenue || 0,
    currentYear: currentYear[0]?.revenue || 0,
    total: totalRevenue[0]?.revenue || 0
  };
};

// === Booking Statistics ===
export const getBookingStats = async () => {
  // Bookings by price range
  const [priceRanges] = await pool.query(`
    SELECT
      x.price_range,
      COUNT(*) as count
    FROM (
      SELECT
        CASE
          WHEN t.amount BETWEEN 0 AND 50 THEN '$0-50'
          WHEN t.amount BETWEEN 51 AND 100 THEN '$50-100'
          WHEN t.amount BETWEEN 101 AND 200 THEN '$100-200'
          WHEN t.amount BETWEEN 201 AND 500 THEN '$200-500'
          ELSE '$500+'
        END as price_range,
        CASE
          WHEN t.amount BETWEEN 0 AND 50 THEN 1
          WHEN t.amount BETWEEN 51 AND 100 THEN 2
          WHEN t.amount BETWEEN 101 AND 200 THEN 3
          WHEN t.amount BETWEEN 201 AND 500 THEN 4
          ELSE 5
        END as sort_order
      FROM booking b
      JOIN transactions t ON b.id = t.booking_id
      WHERE t.status = 'completed'
    ) x
    GROUP BY x.price_range, x.sort_order
    ORDER BY x.sort_order
  `);

  // Bookings by time slots
  const [timeSlots] = await pool.query(`
    SELECT
      x.time_slot,
      COUNT(*) as bookings
    FROM (
      SELECT
        CASE
          WHEN TIME(booking_time) BETWEEN '09:00:00' AND '10:59:59' THEN '9-11 AM'
          WHEN TIME(booking_time) BETWEEN '11:00:00' AND '12:59:59' THEN '11-1 PM'
          WHEN TIME(booking_time) BETWEEN '13:00:00' AND '14:59:59' THEN '1-3 PM'
          WHEN TIME(booking_time) BETWEEN '15:00:00' AND '16:59:59' THEN '3-5 PM'
          WHEN TIME(booking_time) BETWEEN '17:00:00' AND '18:59:59' THEN '5-7 PM'
          WHEN TIME(booking_time) BETWEEN '19:00:00' AND '20:59:59' THEN '7-9 PM'
          ELSE 'Other'
        END as time_slot,
        CASE
          WHEN TIME(booking_time) BETWEEN '09:00:00' AND '10:59:59' THEN 1
          WHEN TIME(booking_time) BETWEEN '11:00:00' AND '12:59:59' THEN 2
          WHEN TIME(booking_time) BETWEEN '13:00:00' AND '14:59:59' THEN 3
          WHEN TIME(booking_time) BETWEEN '15:00:00' AND '16:59:59' THEN 4
          WHEN TIME(booking_time) BETWEEN '17:00:00' AND '18:59:59' THEN 5
          WHEN TIME(booking_time) BETWEEN '19:00:00' AND '20:59:59' THEN 6
          ELSE 7
        END as sort_order
      FROM booking
      WHERE status IN ('Confirmed', 'Completed')
    ) x
    GROUP BY x.time_slot, x.sort_order
    ORDER BY x.sort_order
  `);

  // Total bookings count
  const [totalBookings] = await pool.query(`
    SELECT COUNT(*) as total FROM booking WHERE status IN ('Confirmed', 'Completed')
  `);

  return {
    priceRanges,
    timeSlots,
    total: totalBookings[0].total
  };
};

// === Top Performing Studios ===
export const getTopStudios = async () => {
  const [rows] = await pool.query(`
    SELECT 
      s.id,
      s.name,
      COUNT(b.id) as bookings,
      COALESCE(SUM(t.amount), 0) as revenue,
      COALESCE(AVG(r.rating), 0) as avg_rating
    FROM studio s
    LEFT JOIN booking b ON s.id = b.studio_id AND b.status IN ('Confirmed', 'Completed')
    LEFT JOIN transactions t ON b.id = t.booking_id AND t.status = 'completed'
    LEFT JOIN review r ON s.id = r.studio_id
    WHERE s.status = 'active'
    GROUP BY s.id, s.name
    ORDER BY revenue DESC, bookings DESC
    LIMIT 10
  `);
  
  return rows;
};

// === Enhanced Gamification Stats ===
export const getEnhancedGamificationStats = async () => {
  const [stats] = await pool.query(`
    SELECT 
      user_type,
      AVG(points) as avg_points,
      MAX(points) as max_points,
      MAX(normal_level) as max_level,
      COUNT(*) as total_users,
      SUM(points) as total_points
    FROM gamification
    GROUP BY user_type
  `);

  const [topUsers] = await pool.query(`
    SELECT 
      g.user_id,
      g.user_type,
      g.points,
      g.normal_level as level,
      CASE 
        WHEN g.user_type = 'artist' THEN a.full_name
        WHEN g.user_type = 'studio' THEN s.name
        ELSE 'Admin User'
      END as name
    FROM gamification g
    LEFT JOIN artist a ON g.user_id = a.id AND g.user_type = 'artist'
    LEFT JOIN studio s ON g.user_id = s.id AND g.user_type = 'studio'
    ORDER BY g.points DESC
    LIMIT 10
  `);

  return {
    stats,
    topUsers
  };
};

// === Enhanced Country Stats ===
export const getEnhancedArtistByCountry = async () => {
  const [rows] = await pool.query(`
    SELECT 
      COALESCE(location, 'Unknown') as country,
      COUNT(*) as count
    FROM artist 
    WHERE status = 'active'
    GROUP BY COALESCE(location, 'Unknown')
    ORDER BY count DESC
  `);
  return rows;
};

export const getEnhancedStudioByCountry = async () => {
  const [rows] = await pool.query(`
    SELECT 
      COALESCE(location, 'Unknown') as country,
      COUNT(*) as count
    FROM studio 
    WHERE status = 'active'
    GROUP BY COALESCE(location, 'Unknown')
    ORDER BY count DESC
  `);
  return rows;
};

// === Enhanced Device Usage Stats ===
export const getEnhancedDeviceUsageStats = async () => {
  const [rows] = await pool.query(`
    SELECT 
      device_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM device_usage
    WHERE login_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY device_type
    ORDER BY count DESC
  `);
  return rows;
};

// === Main Stats Function ===
export const getAllStats = async () => {
  try {
    const [
      userStats,
      userGrowth,
      revenueStats,
      bookingStats,
      topStudios,
      gamificationStats,
      deviceUsage,
      artistCountries,
      studioCountries
    ] = await Promise.all([
      getUserStats(),
      getUserGrowthStats(),
      getRevenueStats(),
      getBookingStats(),
      getTopStudios(),
      getEnhancedGamificationStats(),
      getEnhancedDeviceUsageStats(),
      getEnhancedArtistByCountry(),
      getEnhancedStudioByCountry()
    ]);

    return {
      userStats,
      userGrowth,
      revenueStats,
      bookingStats,
      topStudios,
      gamificationStats,
      deviceUsage,
      artistCountries,
      studioCountries
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};
