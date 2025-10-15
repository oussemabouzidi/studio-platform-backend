import pool from "../database.js";

const AdminModel = {
  // Fetch all artists
  async getAllArtists() {
  const { rows } = await pool.query(`
    SELECT 
      a.id,
      a.user_id,
      a.full_name,
      a.email,
      a.status,
      a.instagram,
      STRING_AGG(g.name, ', ') AS "genre_name",
      a.verified
    FROM artist a
    LEFT JOIN artist_genre ag ON a.id = ag.artist_id
    LEFT JOIN genre g ON ag.genre_id = g.id
    GROUP BY a.id, a.user_id, a.full_name, a.email, a.status, a.instagram, a.verified
  `);    return rows;
  },

  // Fetch all studios
  async getAllStudios() {
    const { rows } = await pool.query(`
      SELECT 
        s.id,
        s.user_id,
        s.name,
        s.location,
        s.status,
        COUNT(DISTINCT b.id) AS number_of_bookings,
        AVG(r.rating) AS average_rating,
        COALESCE(SUM(t.amount), 0) AS total_revenue
      FROM studio s
      LEFT JOIN booking b ON s.id = b.studio_id
      LEFT JOIN review r ON s.id = r.studio_id
      LEFT JOIN transactions t ON s.id = t.studio_id
      GROUP BY s.id, s.user_id, s.name, s.location, s.status
    `);
    return rows;
  },

  // Fetch artist by ID
  async getArtistById(id) {
    const { rows } = await pool.query(`SELECT * FROM artist WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  // Fetch studio by ID
  async getStudioById(id) {
    const { rows } = await pool.query(`SELECT * FROM studio WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  // Update artist status (if you actually have a 'status' column)
  async updateArtistStatus(id, status) {
    const result = await pool.query(
      `UPDATE artist SET status = $1 WHERE id = $2`,
      [status, id]
    );
    return result.rowCount > 0;
  },

  // Update artist verification (if you have a 'verified' column)
  async updateArtistVerification(id, verified) {
    const result = await pool.query(
      `UPDATE artist SET verified = $1 WHERE id = $2`,
      [!!verified, id]
    );
    return result.rowCount > 0;
  },

  // Update studio activation
  async updateStudioActivation(id, activated) {
    const result = await pool.query(
      `UPDATE studio SET activated = $1 WHERE id = $2`,
      [!!activated, id]
    );
    return result.rowCount > 0;
  },

  // Update studio status
  async updateStudioStatus(id, status) {
    const result = await pool.query(
      `UPDATE studio SET status = $1 WHERE id = $2`,
      [status, id]
    );
    return result.rowCount > 0;
  },


  // Get user stats
  async getUserStats() {
    const { rows: artistRows } = await pool.query(
      `SELECT COUNT(*)::int AS "artistCount" FROM artist`
    );
    const { rows: studioRows } = await pool.query(
      `SELECT COUNT(*)::int AS "studioCount" FROM studio`
    );
    return { artistCount: artistRows[0]?.artistCount ?? 0, studioCount: studioRows[0]?.studioCount ?? 0 };
  },

  // Get revenue stats
  async getRevenueStats() {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS "totalRevenue"
       FROM transactions 
       WHERE status = 'completed'`
    );
    return { totalRevenue: rows[0]?.totalRevenue ?? 0 };
  },

  // Get booking stats
  async getBookingStats() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS "totalBookings" FROM booking`
    );
    return { totalBookings: rows[0]?.totalBookings ?? 0 };
  },

  // Get studio stats
  async getStudioStats() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS "totalStudios" FROM studio`
    );
    return { totalStudios: rows[0]?.totalStudios ?? 0 };
  },

  // Get gamification stats
  async getGamificationStats() {
    const { rows: totalRows } = await pool.query(
      `SELECT COALESCE(SUM(total_points), 0) AS "totalPoints" FROM points`
    );

    const { rows: levelCounts } = await pool.query(
      `SELECT level, COUNT(level)::int AS "count" FROM points GROUP BY level`
    );

    return {
      totalPoints: totalRows[0]?.totalPoints ?? 0,
      levelCounts
    };
  }
};

export default AdminModel;