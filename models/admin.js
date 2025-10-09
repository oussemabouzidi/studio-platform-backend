import pool from "../database.js";

const AdminModel = {
  // Fetch all artists
  async getAllArtists() {
  const [rows] = await pool.query(`
    SELECT 
      a.id,
      a.user_id,
      a.full_name,
      a.email,
      a.status,
      a.instagram,
      GROUP_CONCAT(g.name SEPARATOR ', ') AS genre_name,
      a.verified
    FROM artist a
    LEFT JOIN artist_genre ag ON a.id = ag.artist_id
    LEFT JOIN genre g ON ag.genre_id = g.id
    GROUP BY a.id, a.user_id, a.full_name, a.email, a.status, a.instagram, a.verified
  `);    return rows;
  },

  // Fetch all studios
  async getAllStudios() {
    const [rows] = await pool.query(`SELECT s.id, s.user_id, s.name, s.location, s.status, COUNT(DISTINCT b.id) AS number_of_bookings, AVG(r.rating) AS average_rating, COALESCE(SUM(t.amount), 0) AS total_revenue FROM studio s LEFT JOIN booking b ON s.id = b.studio_id LEFT JOIN review r ON s.id = r.studio_id LEFT JOIN transactions t ON s.id = t.studio_id GROUP BY s.id, s.user_id, s.name, s.location`);
    return rows;
  },

  // Fetch artist by ID
  async getArtistById(id) {
    const [rows] = await pool.query(`SELECT * FROM artist WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  // Fetch studio by ID
  async getStudioById(id) {
    const [rows] = await pool.query(`SELECT * FROM studio WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  // Update artist status (if you actually have a 'status' column)
  async updateArtistStatus(id, status) {
    const [result] = await pool.query(
      `UPDATE artist SET status = ? WHERE id = ?`,
      [status, id]
    );
    return result.affectedRows > 0;
  },

  // Update artist verification (if you have a 'verified' column)
  async updateArtistVerification(id, verified) {
    const [result] = await pool.query(
      `UPDATE artist SET verified = ? WHERE id = ?`,
      [verified ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  // Update studio activation
  async updateStudioActivation(id, activated) {
    const [result] = await pool.query(
      `UPDATE studio SET activated = ? WHERE id = ?`,
      [activated ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  // Update studio status
  async updateStudioStatus(id, status) {
    const [result] = await pool.query(
      `UPDATE studio SET status = ? WHERE id = ?`,
      [status, id]
    );
    return result.affectedRows > 0;
  },


  // Get user stats
  async getUserStats() {
    const [[{ artistCount }]] = await pool.query(
      `SELECT COUNT(*) AS artistCount FROM artist`
    );
    const [[{ studioCount }]] = await pool.query(
      `SELECT COUNT(*) AS studioCount FROM studio`
    );
    return { artistCount, studioCount };
  },

  // Get revenue stats
  async getRevenueStats() {
    const [[{ totalRevenue }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalRevenue 
       FROM transactions 
       WHERE status = 'completed'`
    );
    return { totalRevenue };
  },

  // Get booking stats
  async getBookingStats() {
    const [[{ totalBookings }]] = await pool.query(
      `SELECT COUNT(*) AS totalBookings FROM booking`
    );
    return { totalBookings };
  },

  // Get studio stats
  async getStudioStats() {
    const [[{ totalStudios }]] = await pool.query(
      `SELECT COUNT(*) AS totalStudios FROM studio`
    );
    return { totalStudios };
  },

  // Get gamification stats
  async getGamificationStats() {
    const [[{ totalPoints }]] = await pool.query(
      `SELECT COALESCE(SUM(total_points), 0) AS totalPoints FROM points`
    );

    const [levelCounts] = await pool.query(
      `SELECT level, COUNT(level) AS count FROM points GROUP BY level`
    );

    return {
      totalPoints,
      levelCounts
    };
  }
};

export default AdminModel;