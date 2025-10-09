import pool from "../database.js";


const GamificationModel = {
  updateGamification: async (userId, userType) => {
    try {
      console.log("---- Gamification Debug ----");
      console.log("userId:", userId, "userType:", userType);

      // 1. Load gamification row
      const [rows] = await pool.query(
        `SELECT * FROM gamification WHERE user_id = ? AND user_type = ?`,
        [userId, userType]
      );
      let gamification = rows[0];
      console.log("Gamification row:", gamification);

      if (!gamification) {
        console.log("No gamification row found, inserting default...");
        await pool.query(
          `INSERT INTO gamification (user_id, user_type, normal_level, last_review_count) VALUES (?, ?, 1, 0)`,
          [userId, userType]
        );
        const [newRows] = await pool.query(
          `SELECT * FROM gamification WHERE user_id = ? AND user_type = ?`,
          [userId, userType]
        );
        gamification = newRows[0];
        console.log("Created new gamification row:", gamification);
      }

      // 2. Queries differ for artist vs studio
      let bookingQuery = "";
      let reviewQuery = "";
      let bookingParams = [];
      let reviewParams = [];

      if (userType === "artist") {
        bookingQuery = `
          SELECT COUNT(*) AS total_bookings
          FROM booking
          WHERE user_id = ? AND booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        bookingParams = [userId];

        reviewQuery = `
          SELECT COUNT(*) AS total_reviews
          FROM review
          WHERE artist_id = ? AND review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        reviewParams = [userId];
      }

      if (userType === "studio") {
        bookingQuery = `
          SELECT COUNT(*) AS total_bookings
          FROM booking
          WHERE studio_id = ? AND booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        bookingParams = [userId];

        reviewQuery = `
          SELECT COUNT(*) AS total_reviews
          FROM review
          WHERE studio_id = ? AND review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `;
        reviewParams = [userId];
      }

      const [[bookingStats]] = await pool.query(bookingQuery, bookingParams);
      const [[reviewStats]] = await pool.query(reviewQuery, reviewParams);

      const totalBookings = bookingStats.total_bookings || 0;
      const totalReviews = reviewStats.total_reviews || 0;
      console.log("Bookings (last 6 months):", totalBookings);
      console.log("Reviews (last 6 months):", totalReviews);

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
        console.log("Review growth %:", growth);
        reviewGrowthOk = growth >= getRequiredReviewGrowth(gamification.normal_level);
      }
      console.log("Review growth OK?:", reviewGrowthOk);

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

      console.log("Current Level:", currentLevel, "Next Level:", nextLevel);
      console.log("Requirements for next:", req);

      if (
        req &&
        totalBookings >= req.bookings &&
        reviewGrowthOk //&&
        //totalReviews >= req.reviews
      ) {
        console.log("🎉 Level up! From", currentLevel, "to", nextLevel);
        currentLevel = nextLevel;
        await pool.query(
          `UPDATE gamification SET normal_level = ?, last_review_count = ? WHERE user_id = ? AND user_type = ?`,
          [currentLevel, totalReviews, userId, userType]
        );
      } else {
        console.log("❌ No level up. Updating last_review_count only.");
        await pool.query(
          `UPDATE gamification SET last_review_count = ? WHERE user_id = ? AND user_type = ?`,
          [totalReviews, userId, userType]
        );
      }

      console.log("Final Level:", currentLevel);
      console.log("--------------------------");
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
