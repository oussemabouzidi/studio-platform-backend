import pool from "../database.js";

function devLog(...args) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

function computePoints({ bookings, reviews }) {
  const safeBookings = Math.max(0, Number(bookings) || 0);
  const safeReviews = Math.max(0, Number(reviews) || 0);

  // Keep weights modest so XP levels progress gradually.
  const bookingPoints = 10;
  const reviewPoints = 5;

  return safeBookings * bookingPoints + safeReviews * reviewPoints;
}

function computeXpLevel(points) {
  const p = Math.max(0, Number(points) || 0);

  // Mirrors frontend XP thresholds (PointsSection.jsx)
  if (p >= 1001) return 10;
  if (p >= 801) return 9;
  if (p >= 651) return 8;
  if (p >= 501) return 7;
  if (p >= 401) return 6;
  if (p >= 301) return 5;
  if (p >= 201) return 4;
  if (p >= 101) return 3;
  if (p >= 51) return 2;
  return 1;
}


const GamificationModel = {
  updateGamification: async (userId, userType) => {
    try {
      devLog("---- Gamification Debug ----");
      devLog("userId:", userId, "userType:", userType);

      if (userType !== "artist" && userType !== "studio") {
        throw new Error(`Invalid userType "${userType}" for gamification`);
      }

      // 1. Load gamification row
      const [rows] = await pool.query(
        `SELECT * FROM gamification WHERE user_id = ? AND user_type = ?`,
        [userId, userType]
      );
      let gamification = rows[0];
      devLog("Gamification row:", gamification);

      if (!gamification) {
        devLog("No gamification row found, inserting default...");
        await pool.query(
          `INSERT INTO gamification (user_id, user_type, normal_level, last_review_count) VALUES (?, ?, 1, 0)`,
          [userId, userType]
        );
        const [newRows] = await pool.query(
          `SELECT * FROM gamification WHERE user_id = ? AND user_type = ?`,
          [userId, userType]
        );
        gamification = newRows[0];
        devLog("Created new gamification row:", gamification);
      }

      // 2. Queries differ for artist vs studio (recent stats for normal level progression)
      let bookingQuery = "";
      let reviewQuery = "";
      let bookingParams = [];
      let reviewParams = [];

      // Points are based on all-time activity so they don't go down.
      let bookingAllQuery = "";
      let reviewAllQuery = "";
      let bookingAllParams = [];
      let reviewAllParams = [];

      if (userType === "artist") {
        bookingQuery = `
          SELECT COUNT(*) AS total_bookings
          FROM booking
          WHERE user_id = ? AND booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        bookingParams = [userId];

        bookingAllQuery = `
          SELECT COUNT(*) AS total_bookings
          FROM booking
          WHERE user_id = ?
        `;
        bookingAllParams = [userId];

        reviewQuery = `
          SELECT COUNT(*) AS total_reviews
          FROM review
          WHERE artist_id = ? AND review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        reviewParams = [userId];

        reviewAllQuery = `
          SELECT COUNT(*) AS total_reviews
          FROM review
          WHERE artist_id = ?
        `;
        reviewAllParams = [userId];
      }

      if (userType === "studio") {
        bookingQuery = `
          SELECT COUNT(*) AS total_bookings
          FROM booking
          WHERE studio_id = ? AND booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        bookingParams = [userId];

        bookingAllQuery = `
          SELECT COUNT(*) AS total_bookings
          FROM booking
          WHERE studio_id = ?
        `;
        bookingAllParams = [userId];

        reviewQuery = `
          SELECT COUNT(*) AS total_reviews
          FROM review
          WHERE studio_id = ? AND review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        reviewParams = [userId];

        reviewAllQuery = `
          SELECT COUNT(*) AS total_reviews
          FROM review
          WHERE studio_id = ?
        `;
        reviewAllParams = [userId];
      }

      const [[bookingStats]] = await pool.query(bookingQuery, bookingParams);
      const [[reviewStats]] = await pool.query(reviewQuery, reviewParams);

      const totalBookings = bookingStats.total_bookings || 0;
      const totalReviews = reviewStats.total_reviews || 0;
      devLog("Bookings (last 6 months):", totalBookings);
      devLog("Reviews (last 6 months):", totalReviews);

      const [[bookingAllStats]] = bookingAllQuery
        ? await pool.query(bookingAllQuery, bookingAllParams)
        : [[{ total_bookings: 0 }]];
      const [[reviewAllStats]] = reviewAllQuery
        ? await pool.query(reviewAllQuery, reviewAllParams)
        : [[{ total_reviews: 0 }]];

      const totalBookingsAll = bookingAllStats.total_bookings || 0;
      const totalReviewsAll = reviewAllStats.total_reviews || 0;

      // 2b. Compute points + XP level
      const points = computePoints({ bookings: totalBookingsAll, reviews: totalReviewsAll });
      const xpLevel = computeXpLevel(points);

      try {
        await pool.query(
          `UPDATE gamification SET points = ?, xp_level = ? WHERE user_id = ? AND user_type = ?`,
          [points, xpLevel, userId, userType]
        );
      } catch {
        // Older schemas may not have these fields; ignore.
      }

      // 3. Review growth check
      let reviewGrowthOk = false;
      if (gamification.last_review_count == null) {
        reviewGrowthOk = true;
      } else if (gamification.last_review_count === 0) {
        reviewGrowthOk = totalReviews > 0;
      } else {
        const growth =
          ((totalReviews - gamification.last_review_count) /
            gamification.last_review_count) *
          100;
        devLog("Review growth %:", growth);
        reviewGrowthOk = growth >= getRequiredReviewGrowth(gamification.normal_level);
      }
      devLog("Review growth OK?:", reviewGrowthOk);

      // 4. Check level requirements
      const requirements = {
        1: { bookings: 0, reviews: 0 },
        2: { bookings: 3, reviews: 75 },
        3: { bookings: 7, reviews: 80 },
        4: { bookings: 12, reviews: 85 },
        5: { bookings: 18, reviews: 88 },
        6: { bookings: 25, reviews: 90 },
        7: { bookings: 35, reviews: 92 },
        8: { bookings: 45, reviews: 94 },
        9: { bookings: 60, reviews: 95 },
        10: { bookings: 80, reviews: 97 }
      };

      let currentLevel = gamification.normal_level || 1;
      let nextLevel = currentLevel + 1;
      const req = requirements[nextLevel];

      devLog("Current Level:", currentLevel, "Next Level:", nextLevel);
      devLog("Requirements for next:", req);

      if (
        req &&
        totalBookings >= req.bookings &&
        reviewGrowthOk //&&
        //totalReviews >= req.reviews
      ) {
        devLog("Level up! From", currentLevel, "to", nextLevel);
        currentLevel = nextLevel;
        try {
          await pool.query(
            `UPDATE gamification SET normal_level = ?, last_review_count = ?, last_level_up = NOW() WHERE user_id = ? AND user_type = ?`,
            [currentLevel, totalReviews, userId, userType]
          );
        } catch {
          await pool.query(
            `UPDATE gamification SET normal_level = ?, last_review_count = ? WHERE user_id = ? AND user_type = ?`,
            [currentLevel, totalReviews, userId, userType]
          );
        }
      } else {
        devLog("No level up. Updating last_review_count only.");
        await pool.query(
          `UPDATE gamification SET last_review_count = ? WHERE user_id = ? AND user_type = ?`,
          [totalReviews, userId, userType]
        );
      }

      devLog("Final Level:", currentLevel);
      devLog("--------------------------");
      return currentLevel;
    } catch (error) {
      console.error("Error updating gamification:", error);
      throw error;
    }
  }
};


// Helper to get required review growth per level
function getRequiredReviewGrowth(level) {
  const growthRequirements = {
    1: 0,
    2: 5,
    3: 10,
    4: 20,
    5: 30,
    6: 40,
    7: 50,
    8: 60,
    9: 70,
    10: 80
  };
  return growthRequirements[level] || 75; // fallback
}


export default GamificationModel;
