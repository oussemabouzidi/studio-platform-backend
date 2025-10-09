import pool from '../database.js';
import GamificationModel from './gamification.js';

// Create a connection pool (configure with your DB credentials)

export default {
  // ---- FETCH ----
  fetchBookings: async (studioId) => {
    const [rows] = await pool.query(
      `
      SELECT 
        b.*, 
        s.name AS service_name, 
        s.price AS service_price,
        a.full_name AS artist_name,
        a.avatar_link AS artist_avatar
      FROM booking b
      JOIN service s ON b.service_id = s.id
      JOIN artist a ON b.user_id = a.user_id
      WHERE b.studio_id = ?
      `,
      [studioId]
    );
    return rows;
  },

  fetchEarnings: async (studioId) => {
    const [rows] = await pool.query(
      `
      SELECT 
    t.studio_id,
    COALESCE(SUM(t.amount), 0) AS total_earnings,
    COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount END), 0) AS pending_payments,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) AS completed_earnings,
    COALESCE(SUM(CASE 
        WHEN t.status = 'completed' 
             AND YEAR(t.transaction_date) = YEAR(CURDATE())
             AND MONTH(t.transaction_date) = MONTH(CURDATE()) 
        THEN t.amount END), 0) AS earnings_this_month,
    COALESCE(SUM(CASE 
        WHEN t.status = 'completed' 
             AND YEAR(t.transaction_date) = YEAR(CURDATE() - INTERVAL 1 MONTH)
             AND MONTH(t.transaction_date) = MONTH(CURDATE() - INTERVAL 1 MONTH)
        THEN t.amount END), 0) AS earnings_last_month
FROM transactions t
WHERE t.studio_id = ?
GROUP BY t.studio_id;
      `,
      [studioId]
    );

    // return a single object instead of array, or empty object if no results
    return rows[0] || {
      studio_id: studioId,
      total_earnings: 0,
      pending_payments: 0,
      completed_earnings: 0,
      earnings_this_month: 0
    };
  },


  fetchReviews: async (studioId) => {
    const [rows] = await pool.query(
      `SELECT 
          r.id AS id, 
          r.artist_id AS artistId, 
          a.artist_name AS artistName, 
          a.avatar_link AS artistAvatar, 
          r.rating AS rating, 
          r.comment AS comment, 
          r.review_date AS date 
        FROM 
          review r 
        LEFT JOIN 
          artist a 
        ON 
          r.artist_id = a.id 
        WHERE 
          r.studio_id = ?
        `,
      [studioId]
    );

    // Make sure keys match the Review type from frontend
    return rows.map(row => ({
      id: row.id,
      artistId: row.artistId,
      artistName: row.artistName,
      artistAvatar: row.artistAvatar,
      rating: row.rating,
      comment: row.comment,
      date: row.date
    }));
  },


  fetchServices: async (studioId) => {
    const [rows] = await pool.query(
        `
        SELECT 
          ss.*, 
          s.*, 
          GROUP_CONCAT(t.name) AS tags
        FROM studio_service ss
        JOIN service s ON ss.service_id = s.id
        LEFT JOIN service_tag st ON s.id = st.service_id
        LEFT JOIN tag t ON st.tag_id = t.id
        WHERE ss.studio_id = ?
        GROUP BY s.id
        `,
        [studioId]
    );

      // Convert comma-separated tags into arrays
      return rows.map(row => ({
        ...row,
        tags: row.tags ? row.tags.split(',') : []
      }));
  },


  fetchProfile: async (studioId) => {
    const [rows] = await pool.query(
      `SELECT 
          s.*,
          a.name AS amenity_name,
          e.name AS equipment_name
      FROM studio s
      LEFT JOIN studio_amenities sa ON sa.studio_id = s.id
      LEFT JOIN amenities a ON a.id = sa.amenitie_id
      LEFT JOIN studio_equipement se ON se.studio_id = s.id
      LEFT JOIN equipement e ON e.id = se.equipement_id
      WHERE s.id = ?`,
      [studioId]
    );

    if (rows.length === 0) return null;

    const studio = {
      ...rows[0], // base studio info
      amenities: [...new Set(rows.map(r => r.amenity_name).filter(Boolean))],
      equipment: [...new Set(rows.map(r => r.equipment_name).filter(Boolean))],
    };

    return studio;
  },

  fetchManageProfile: async (studioId) => {
    const [rows] = await pool.query(
      `
      SELECT 
        s.id,
        s.name AS studioName,
        s.description,
        s.avatar_link AS avatarImage,
        s.location,
        s.email,
        s.phone,
        s.website,
        s.instagram,
        s.soundCloud AS soundcloud,
        s.youtube,
        s.studio_rules AS rules,
        s.cancellation_policy AS cancellationPolicy,

        -- Gallery
        GROUP_CONCAT(DISTINCT g.link) AS galleryImages,

        -- Amenities (⚠️ using equipement table because no "amenities")
        GROUP_CONCAT(DISTINCT a.name) AS amenities,

        -- Equipment
        GROUP_CONCAT(DISTINCT eq2.name) AS equipment,

        -- Studio Types
        GROUP_CONCAT(DISTINCT t.name) AS studioTypes,

        -- Languages
        GROUP_CONCAT(DISTINCT l.name) AS languages,

        -- Genres
        GROUP_CONCAT(DISTINCT gnr.name) AS preferredGenres

      FROM studio s
      -- Gallery
      LEFT JOIN studio_gallery sg ON sg.studio_id = s.id
      LEFT JOIN gallery g ON g.id = sg.gallery_id

      -- Amenities
      LEFT JOIN studio_amenities sa ON sa.studio_id = s.id
      LEFT JOIN amenities a ON a.id = sa.amenitie_id


      -- Equipment
      LEFT JOIN studio_equipement se ON se.studio_id = s.id
      LEFT JOIN equipement eq2 ON eq2.id = se.equipement_id

      -- Types
      LEFT JOIN studio_type st ON st.studio_id = s.id
      LEFT JOIN type t ON t.id = st.type_id

      -- Languages
      LEFT JOIN studio_language sl ON sl.studio_id = s.id
      LEFT JOIN language l ON l.id = sl.language_id

      -- Genres
      LEFT JOIN studio_genre sg2 ON sg2.studio_id = s.id
      LEFT JOIN genre gnr ON gnr.id = sg2.genre_id

      WHERE s.id = ?
      GROUP BY s.id
      `,
      [studioId]
    );

    if (rows.length === 0) return null;

    const studioRow = rows[0];

    // Fetch services separately (with tags)
    const [services] = await pool.query(
      `
      SELECT 
        srv.id,
        srv.name,
        srv.description,
        srv.price,
        srv.price_type AS priceType,
        srv.duration,
        srv.max_capacity AS maxCapacity,
        srv.available_timing AS availableTimes,
        GROUP_CONCAT(DISTINCT tg.name) AS tags
      FROM studio_service ss
      JOIN service srv ON srv.id = ss.service_id
      LEFT JOIN service_tag st ON st.service_id = srv.id
      LEFT JOIN tag tg ON tg.id = st.tag_id
      WHERE ss.studio_id = ?
      GROUP BY srv.id
      `,
      [studioId]
    );

    // Fetch schedule separately
    const [scheduleRows] = await pool.query(
      `
      SELECT sch.day, sch.start_time, sch.end_time
      FROM studio_schedule ss
      JOIN schedule sch ON sch.id = ss.schedule_id
      WHERE ss.studio_id = ?
      `,
      [studioId]
    );

    const schedule = {};
    scheduleRows.forEach(row => {
      schedule[row.day] = {
        open: !!row.start_time && !!row.end_time,
        start: row.start_time,
        end: row.end_time,
      };
    });

    const studioProfile = {
      studioName: studioRow.studioName,
      description: studioRow.description,
      avatarImage: studioRow.avatarImage,
      galleryImages: studioRow.galleryImages ? studioRow.galleryImages.split(",") : [],
      location: studioRow.location,
      contact: {
        email: studioRow.email,
        phone: studioRow.phone,
        website: studioRow.website,
        instagram: studioRow.instagram,
        soundcloud: studioRow.soundcloud,
        youtube: studioRow.youtube,
      },
      schedule,
      services,
      additionalInfo: {
        amenities: studioRow.amenities ? studioRow.amenities.split(",") : [],
        rules: studioRow.rules,
        cancellationPolicy: studioRow.cancellationPolicy,
      },
      equipment: studioRow.equipment ? studioRow.equipment.split(",") : [],
      studioTypes: studioRow.studioTypes ? studioRow.studioTypes.split(",") : [],
      languages: studioRow.languages ? studioRow.languages.split(",") : [],
      preferredGenres: studioRow.preferredGenres ? studioRow.preferredGenres.split(",") : [],
    };

    return studioProfile;
  },


  fetchSettings: async (userId) => {
    const [rows] = await pool.query(
      `SELECT * FROM studio_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  getStudioSettings: async(userId) => {
    // 1️⃣ Fetch studio settings + language + notifications
    const [studioRows] = await pool.query(
      `SELECT s.visibility, s.show_reviews_public, s.currency, s.time_format, s.timezone,
              l.name AS language,
              ns.booking_reminder_id, ns.artist_review_reminder_id, ns.payout_updates_id
      FROM studio_settings s
      LEFT JOIN language l ON s.language_id = l.id
      LEFT JOIN notification_settings ns ON s.notification_settings_id = ns.id
      WHERE s.user_id = ?`,
      [userId]
    );
    const studioSettings = studioRows[0];

    // 2️⃣ Fetch payout methods
    const [payoutMethodsRows] = await pool.query(
      `SELECT pmu.id, pm.name AS type, pm.number, pm.email
      FROM payout_method_user pmu
      JOIN payout_method pm ON pmu.payout_method_id = pm.id
      WHERE pmu.user_id = ?`,
      [userId]
    );
    const payoutMethods = payoutMethodsRows.map(pm => ({
      id: pm.id,
      type: pm.type,
      last4: pm.number ? pm.number.slice(-4) : undefined,
      email: pm.email,
      primary: false // mark first as primary or add column later
    }));

    // 3️⃣ Fetch payout history
    const [historyRows] = await pool.query(
      `SELECT id, transaction_date AS date, amount, status
      FROM transactions
      WHERE studio_id = (SELECT id FROM studio WHERE user_id = ?)
      ORDER BY transaction_date DESC`,
      [userId]
    );
    const payoutHistory = historyRows.map(h => ({
      id: h.id,
      date: h.date,
      amount: h.amount,
      method: "bank", // you can JOIN payout_method if you link transactions
      status: h.status
    }));

    // 4️⃣ Fetch connected accounts
    const [accountRows] = await pool.query(
      `SELECT a.id, a.account AS provider, a.status
      FROM connected_account_user cau
      JOIN account a ON cau.account_id = a.id
      WHERE cau.user_id = ?`,
      [userId]
    );
    const connectedAccounts = accountRows.map(a => ({
      id: a.id,
      provider: a.provider,
      connected: a.status === "connected"
    }));

    // 5️⃣ Fetch notifications (expand joins if needed)
    const notifications = {
      bookingConfirmation: { email: false, sms: false, push: false }, // no table → default
      bookingReminder: { email: true, sms: false, push: true }, // from booking_reminder table
      bookingAttendance: { email: false, sms: false, push: false }, // no table → default
      artistReview: { email: true, sms: false, push: true }, // from artist_review_reminder
      platformNews: { email: false, sms: false, push: false }, // no table → default
      payoutUpdates: { email: true, sms: false, push: true } // from payout_updates
    };

    // 6️⃣ Map final object
    return {
      payoutMethods,
      payoutHistory,
      connectedAccounts,
      notifications,
      privacySettings: {
        profileVisibility: studioSettings?.visibility || "public",
        showReviews: !!studioSettings?.show_reviews_public,
        analyticsTracking: false // no column in DB → default
      },
      securitySettings: {
        twoFactorAuth: false // no column in DB → default
      },
      regionalSettings: {
        language: studioSettings?.language || "English",
        timezone: studioSettings?.timezone,
        currency: studioSettings?.currency,
        timeFormat: studioSettings?.time_format
      }
    };
  },

  updateStudioSettings: async (userId, data) => {
    const {
      privacySettings,
      regionalSettings,
      notifications,
      payoutMethods,
      connectedAccounts
    } = data;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE studio_settings
        SET visibility = ?, show_reviews_public = ?, currency = ?, time_format = ?, timezone = ?,
            language_id = (SELECT id FROM language WHERE name = ? LIMIT 1)
        WHERE user_id = ?`,
        [
          privacySettings.profileVisibility,
          privacySettings.showReviews ? 1 : 0,
          regionalSettings.currency,
          regionalSettings.timeFormat,
          regionalSettings.timezone,
          regionalSettings.language,
          userId
        ]
      );
      // 2️⃣ Update notification_settings children
      // booking reminder
      if (notifications?.bookingReminder) {
        const [ns] = await conn.query(
          `SELECT notification_settings_id FROM studio_settings WHERE user_id = ?`,
          [userId]
        );
        const nsId = ns[0]?.notification_settings_id;

        if (nsId) {
          const { email, sms, push } = notifications.bookingReminder;
          // Update booking_reminder row
          const [remRow] = await conn.query(
            `SELECT booking_reminder_id FROM notification_settings WHERE id = ?`,
            [nsId]
          );
          if (remRow[0]?.booking_reminder_id) {
            await conn.query(
              `UPDATE booking_reminder SET email=?, sms=?, notification=? WHERE id=?`,
              [email ? 1 : 0, sms ? 1 : 0, push ? 1 : 0, remRow[0].booking_reminder_id]
            );
          }
        }
      }

      // Example: same logic for artistReview + payoutUpdates…

      // 3️⃣ Update payout methods
      if (payoutMethods?.length) {
        for (let pm of payoutMethods) {
          await conn.query(
            `UPDATE payout_method pm
            JOIN payout_method_user pmu ON pmu.payout_method_id = pm.id
            SET pm.email = ?, pm.number = ?
            WHERE pmu.id = ? AND pmu.user_id = ?`,
            [pm.email || null, pm.number || null, pm.id, userId]
          );
        }
      }

      // 4️⃣ Update connected accounts
      if (connectedAccounts?.length) {
        for (let acc of connectedAccounts) {
          await conn.query(
            `UPDATE account a
            JOIN connected_account_user cau ON cau.account_id = a.id
            SET a.status = ?
            WHERE a.id = ? AND cau.user_id = ?`,
            [acc.connected ? "connected" : "disconnected", acc.id, userId]
          );
        }
      }

      await conn.commit();
      return { success: true };
    } catch (err) {
      await conn.rollback();
      throw new Error("Failed to update settings");
    } finally {
      conn.release();
    }
  },


  fetchPayoutMethod: async (userId) => {
    const [rows] = await pool.query(
      `SELECT pmu.*, pm.*
       FROM payout_method_user pmu
       JOIN payout_method pm ON pmu.payout_method_id = pm.id
       WHERE pmu.user_id = ?`,
      [userId]
    );
    return rows;
  },

  fetchPayoutHistory: async (studioId) => {
    const [rows] = await pool.query(
      `SELECT * FROM transactions WHERE studio_id = ? AND status = 'completed'`,
      [studioId]
    );
    return rows;
  },

  fetchConnectedAccount: async (userId) => {
    const [rows] = await pool.query(
      `SELECT cau.*, a.*
       FROM connected_account_user cau
       JOIN account a ON cau.account_id = a.id
       WHERE cau.user_id = ?`,
      [userId]
    );
    return rows;
  },

  fetchNotifications: async (userId) => {
    const [rows] = await pool.query(
      `SELECT * FROM notification WHERE user_id = ?`,
      [userId]
    );
    return rows;
  },

  fetchProfileVisibility: async (userId) => {
    const [rows] = await pool.query(
      `SELECT visibility FROM studio_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] ? rows[0].visibility : null;
  },

  fetchContentVisibility: async (userId) => {
    const [rows] = await pool.query(
      `SELECT show_reviews_public FROM studio_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] ? rows[0].show_reviews_public : null;
  },

  fetchLanguageTimezoneCurrencyFormat: async (userId) => {
    const [rows] = await pool.query(
      `SELECT language_id, timezone, currency, time_format
       FROM studio_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  // ---- CREATE ----
  postService: async (studioId, serviceData) => {
    // First insert the service
    const [serviceResult] = await pool.query(
      `INSERT INTO service (name, price_type, price, duration, max_capacity, available_timing, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        serviceData.name,
        serviceData.price_type,
        serviceData.price,
        serviceData.duration,
        serviceData.max_capacity,
        serviceData.available_timing,
        serviceData.description,
      ]
    );

    const serviceId = serviceResult.insertId;

    // Then link it to studio_service
    await pool.query(
      `INSERT INTO studio_service (studio_id, service_id) VALUES (?, ?)`,
      [studioId, serviceId]
    );

    // Return the created service id or data
    return { id: serviceId, ...serviceData };
  },

  // ---- UPDATE ----
  updateService: async (serviceId, data) => {
    const fields = [];
    const values = [];

    // Dynamically build SET part
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(serviceId);

    const sql = `UPDATE service SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  updateProfile: async (studioId, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(studioId);

    const sql = `UPDATE studio SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },


  updateBookingStatus: async (bookingId, status) => {
    try {
      console.log("Updating booking:", bookingId, "to status:", status.status);

      // 1. Update the booking status
      const sql = 'UPDATE booking SET status = ? WHERE id = ?';
      const [result] = await pool.query(sql, [status.status, bookingId]);

      // 2. If booking confirmed → fetch artist_id & studio_id
      if (status.status === 'Confirmed') {
        const [[booking]] = await pool.query(
          `SELECT user_id AS artistId, studio_id AS studioId
          FROM booking
          WHERE id = ?`,
          [bookingId]
        );

        if (booking) {
          // 3. Update gamification for artist and studio
          await GamificationModel.updateGamification(booking.artistId, "artist");
          await GamificationModel.updateGamification(booking.studioId, "studio");
        }
      }

      // Return the number of affected rows
      return result.affectedRows;

    } catch (error) {
      console.error('Error updating booking status:', error);
      throw new Error(`Failed to update booking status: ${error.message}`);
    }
  },


  addService: async (serviceData) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        name,
        price_type,
        price,
        duration,
        max_capacity,
        available_timing,
        description,
        studio_id
      } = serviceData;

      // Insert the new service into the service table
      const [result] = await conn.query(
        `INSERT INTO service 
         (name, price_type, price, duration, max_capacity, available_timing, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, price_type, price, duration, max_capacity, available_timing, description]
      );

      const serviceId = result.insertId;

      // Insert the relationship into the studio_service table
      await conn.query(
        `INSERT INTO studio_service (studio_id, service_id) VALUES (?, ?)`,
        [studio_id, serviceId]
      );

      await conn.commit();
      return { 
        success: true, 
        message: "Service added successfully", 
        serviceId: serviceId 
      };
    } catch (error) {
      await conn.rollback();
      console.error("Error adding service:", error);
      throw new Error(`Failed to add service: ${error.message}`);
    } finally {
      conn.release();
    }
  },

  // Update an existing service
  updateService: async (serviceId, studioId, updateData) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check if the service belongs to the studio
      const [serviceRows] = await conn.query(
        'SELECT id FROM service WHERE id = ?',
        [serviceId]
      );

      if (serviceRows.length === 0) {
        throw new Error('Service not found or does not belong to this studio');
      }

      // Build the update query dynamically based on provided fields
      const updateFields = [];
      const updateValues = [];

      // List of allowed fields to update
      const allowedFields = [
        'name', 'price_type', 'price', 'duration', 
        'max_capacity', 'available_timing', 'description'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add serviceId to the values array
      updateValues.push(serviceId);
      //updateValues.push(studioId);

      // Execute the update
      const [result] = await conn.query(
        `UPDATE service SET ${updateFields.join(', ')} 
         WHERE id = ?`,
        updateValues
      );

      await conn.commit();
      return { 
        success: true, 
        message: "Service updated successfully", 
        affectedRows: result.affectedRows 
      };
    } catch (error) {
      await conn.rollback();
      console.error("Error updating service:", error);
      throw new Error(`Failed to update service: ${error.message}`);
    } finally {
      conn.release();
    }
  },

  // In your backend studio controller file
  updateStudioProfile: async (studioId, updateData) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update main studio information
      const studioFields = [
        'name', 'location', 'description', 'avatar_link', 'email', 
        'phone', 'website', 'instagram', 'soundCloud', 'youtube',
        'studio_rules', 'cancellation_policy'
      ];
      
      const studioUpdates = {};
      studioFields.forEach(field => {
        if (updateData[field] !== undefined) {
          studioUpdates[field] = updateData[field];
        }
      });

      if (Object.keys(studioUpdates).length > 0) {
        await conn.query(
          'UPDATE studio SET ? WHERE id = ?',
          [studioUpdates, studioId]
        );
      }

      // 2. Update amenities
      if (updateData.amenities !== undefined) {
        // First, clear existing amenities
        await conn.query(
          'DELETE FROM studio_amenities WHERE studio_id = ?',
          [studioId]
        );
        
        // Then add new ones
        if (updateData.amenities.length > 0) {
          // Get amenity IDs from names
          const amenityPlaceholders = updateData.amenities.map(() => '?').join(',');
          const [amenityRows] = await conn.query(
            `SELECT id FROM amenities WHERE name IN (${amenityPlaceholders})`,
            updateData.amenities
          );
          
          // Insert new amenities
          const amenityValues = amenityRows.map(row => [studioId, row.id]);
          if (amenityValues.length > 0) {
            await conn.query(
              'INSERT INTO studio_amenities (studio_id, amenitie_id) VALUES ?',
              [amenityValues]
            );
          }
        }
      }

      // 3. Update equipment
      if (updateData.equipment !== undefined) {
        // First, clear existing equipment
        await conn.query(
          'DELETE FROM studio_equipement WHERE studio_id = ?',
          [studioId]
        );
        
        // Then add new ones
        if (updateData.equipment.length > 0) {
          // Get equipment IDs from names
          const equipmentPlaceholders = updateData.equipment.map(() => '?').join(',');
          const [equipmentRows] = await conn.query(
            `SELECT id FROM equipement WHERE name IN (${equipmentPlaceholders})`,
            updateData.equipment
          );
          
          // Insert new equipment
          const equipmentValues = equipmentRows.map(row => [studioId, row.id]);
          if (equipmentValues.length > 0) {
            await conn.query(
              'INSERT INTO studio_equipement (studio_id, equipement_id) VALUES ?',
              [equipmentValues]
            );
          }
        }
      }

      await conn.commit();
      return { success: true, message: "Studio profile updated successfully" };
    } catch (error) {
      await conn.rollback();
      console.error("Error updating studio profile:", error);
      throw new Error(`Failed to update studio profile: ${error.message}`);
    } finally {
      conn.release();
    }
  },

  updateSettings: async (userId, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(userId);

    const sql = `UPDATE studio_settings SET ${fields.join(', ')} WHERE user_id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  updatePayoutMethod: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);

    const sql = `UPDATE payout_method SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  updatePayoutHistory: async (transactionId, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(transactionId);

    const sql = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  updateConnectedAccount: async (accountId, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(accountId);

    const sql = `UPDATE account SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  updateNotification: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);

    const sql = `UPDATE notification SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  updateProfileVisibility: async (userId, visibility) => {
    const [result] = await pool.query(
      `UPDATE studio_settings SET visibility = ? WHERE user_id = ?`,
      [visibility, userId]
    );
    return result;
  },

  updateContentVisibility: async (userId, showReviews) => {
    const [result] = await pool.query(
      `UPDATE studio_settings SET show_reviews_public = ? WHERE user_id = ?`,
      [showReviews, userId]
    );
    return result;
  },

  updateLanguageTimezoneCurrencyFormat: async (userId, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(userId);

    const sql = `UPDATE studio_settings SET ${fields.join(', ')} WHERE user_id = ?`;
    const [result] = await pool.query(sql, values);

    return result;
  },

  // ---- DELETE ----
  deleteService: async (serviceId) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // First delete the link from studio_service
      await conn.query(
        `DELETE FROM studio_service WHERE service_id = ?`,
        [serviceId]
      );

      // Then delete the service itself
      const [result] = await conn.query(
        `DELETE FROM service WHERE id = ?`,
        [serviceId]
      );

      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // -- Fetch gamification --
  fetchGamification: async (studioId) => {
    const [rows] = await pool.query(
      `
      SELECT 
        g.id AS gamification_id,
        g.user_id,
        g.user_type,
        g.points,
        g.normal_level,
        g.xp_level,
        g.last_level_up,
        g.created_at,
        g.updated_at,
        GROUP_CONCAT(DISTINCT p.name) AS perks,
        GROUP_CONCAT(DISTINCT r.reward_name) AS rewards
      FROM gamification g
      LEFT JOIN gamification_perks gp ON g.id = gp.gamification_id
      LEFT JOIN perks p ON gp.perk_id = p.id
      LEFT JOIN gamification_rewards gr ON g.id = gr.gamification_id
      LEFT JOIN rewards r ON gr.reward_id = r.id
      WHERE g.user_id = ?
      GROUP BY g.id
      `,
      [studioId]
    );

    return rows[0] || null; // return single object
  },

};
