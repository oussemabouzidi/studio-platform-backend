// models/artist.js
import pool from '../database.js'
import GamificationModel from './gamification.js';
import { attachBookingService } from "./bookingService.js";



const ArtistModel = {
  /** ===================== FETCH METHODS ===================== **/

  // Fetch all studios
  async getAllStudios() {
    const sql = `
      SELECT 
  s.id,
  s.name,
  s.avatar_link,
  s.location,
  ROUND(AVG(r.rating), 2) AS rating,
  GROUP_CONCAT(DISTINCT t.name) AS types,
  GROUP_CONCAT(DISTINCT g.name) AS genres,
  GROUP_CONCAT(DISTINCT e.name) AS equipment,
  GROUP_CONCAT(DISTINCT l.name) AS languages,
  gf.normal_level
FROM studio s
LEFT JOIN review r ON s.id = r.studio_id
LEFT JOIN studio_type st ON s.id = st.studio_id
LEFT JOIN type t ON st.type_id = t.id
LEFT JOIN studio_genre sg ON s.id = sg.studio_id
LEFT JOIN genre g ON sg.genre_id = g.id
LEFT JOIN studio_equipement se ON s.id = se.studio_id
LEFT JOIN equipement e ON se.equipement_id = e.id
LEFT JOIN studio_language sl ON s.id = sl.studio_id
LEFT JOIN language l ON sl.language_id = l.id
LEFT JOIN gamification gf ON gf.user_id = s.id AND gf.user_type = 'studio'
GROUP BY s.id

    `;

    const [rows] = await pool.query(sql);

    return rows.map(studio => ({
      id: studio.id,
      name: studio.name,
      avatar: studio.avatar_link || null,
      coverPhoto: '/studio/cover.jpg',
      rating: studio.rating !== null ? Number(studio.rating) : 0,
      location: studio.location || null,
      types: studio.types ? studio.types.split(',') : [],
      genres: studio.genres ? studio.genres.split(',') : [],
      price: 75,
      amenities: [],
      equipment: studio.equipment ? studio.equipment.split(',') : [],
      languages: studio.languages ? studio.languages.split(',') : [],
      availability: [],
      level: studio.normal_level || 1 // <-- gamification level included here
    }));
  },


  // Fetch all bookings for this artist
  async getBookingsByArtist(artistId) {
    const baseSelect = `
      SELECT 
        b.id AS booking_id,
        b.booking_date,
        b.booking_time,
        b.nbr_guests,
        b.studio_id,
        s.name AS studio_name,
        s.location,
        s.description,
        s.avatar_link,
        s.email,
        s.phone,
        s.website,
        s.instagram,
        s.soundCloud,
        s.youtube,
        s.studio_rules,
        s.cancellation_policy,
        srv.name AS service_name,
        srv.price,
        srv.duration,
        bs.status
      FROM booking b
      JOIN studio s ON b.studio_id = s.id
    `;

    const sqlWithBookingService = `
      ${baseSelect}
      LEFT JOIN booking_service bs ON b.id = bs.booking_id
      LEFT JOIN service srv ON bs.service_id = srv.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;

    const sqlLegacy = `
      ${baseSelect}
      LEFT JOIN service srv ON b.service_id = srv.id
      LEFT JOIN (
        SELECT id AS booking_id, NULL AS status
        FROM booking
      ) bs ON b.id = bs.booking_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;

    const sqlMinimal = `
      SELECT 
        b.id AS booking_id,
        b.booking_date,
        b.booking_time,
        b.nbr_guests,
        b.studio_id,
        s.name AS studio_name,
        s.location,
        s.description,
        s.avatar_link,
        s.email,
        s.phone,
        s.website,
        s.instagram,
        s.soundCloud,
        s.youtube,
        s.studio_rules,
        s.cancellation_policy
      FROM booking b
      JOIN studio s ON b.studio_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `;

    try {
      const [rows] = await pool.query(sqlWithBookingService, [artistId]);
      return rows;
    } catch (error) {
      const msg = String(error?.message || "");
      if (msg.includes("booking_service")) {
        try {
          const [rows] = await pool.query(sqlLegacy, [artistId]);
          return rows;
        } catch (e2) {
          const [rows] = await pool.query(sqlMinimal, [artistId]);
          return rows;
        }
      }

      if (msg.includes("b.service_id")) {
        const [rows] = await pool.query(sqlMinimal, [artistId]);
        return rows;
      }

      throw error;
    }
  },  

  // Fetch all related reviews
  async getReviewsByArtist(artistId) {
    const sql = `
      SELECT r.*, s.* 
      FROM review r 
      JOIN studio s ON r.studio_id = s.id
      WHERE r.artist_id = ?`;
    const [rows] = await pool.query(sql, [artistId]);
    return rows;
  },

  // Fetch points
  async getPoints(artistId) {
    const sql = `SELECT * FROM points WHERE artist_id = ?`;
    const [rows] = await pool.query(sql, [artistId]);
    return rows[0] || null;
  },

  // Fetch notifications
  async getNotifications(artistId) {
    const sql = `SELECT * FROM notification WHERE user_id = ?`;
    const [rows] = await pool.query(sql, [artistId]);
    return rows;
  },

  // Fetch favorite studios
  async getFavoriteStudios(artistId) {
    const sql = `
      SELECT 
        s.id,
        s.name,
        s.avatar_link,
        s.location,
        ROUND(AVG(r.rating), 2) AS rating,
        GROUP_CONCAT(DISTINCT t.name) AS types,
        GROUP_CONCAT(DISTINCT g.name) AS genres,
        GROUP_CONCAT(DISTINCT e.name) AS equipment,
        GROUP_CONCAT(DISTINCT l.name) AS languages
      FROM favorite_studio fs
      JOIN studio s ON fs.studio_id = s.id
      LEFT JOIN review r ON s.id = r.studio_id
      LEFT JOIN studio_type st ON s.id = st.studio_id
      LEFT JOIN type t ON st.type_id = t.id
      LEFT JOIN studio_genre sg ON s.id = sg.studio_id
      LEFT JOIN genre g ON sg.genre_id = g.id
      LEFT JOIN studio_equipement se ON s.id = se.studio_id
      LEFT JOIN equipement e ON se.equipement_id = e.id
      LEFT JOIN studio_language sl ON s.id = sl.studio_id
      LEFT JOIN language l ON sl.language_id = l.id
      WHERE fs.artist_id = ?
      GROUP BY s.id
    `;

    const [rows] = await pool.query(sql, [artistId]);

    return rows.map(studio => ({
      id: studio.id,
      name: studio.name,
      avatar: studio.avatar_link || null,
      coverPhoto: '/studio/cover.jpg', // static or dynamic if added in DB
      rating: studio.rating !== null ? Number(studio.rating) : 0,
      location: studio.location || null,
      types: studio.types ? studio.types.split(',') : [],
      genres: studio.genres ? studio.genres.split(',') : [],
      price: 75, // can be fetched dynamically if needed
      amenities: [], // add join if stored
      equipment: studio.equipment ? studio.equipment.split(',') : [],
      languages: studio.languages ? studio.languages.split(',') : [],
      availability: [] // can fetch from schedule if needed
    }));
  },

  // Fetch studio details
  async fetchStudioDetails(studioId) {
    // 1️⃣ Base studio info
    const [studioRows] = await pool.query(
      `
      SELECT 
        s.id,
        s.name,
        s.avatar_link AS avatar,
        s.description,
        s.location,
        s.email,
        s.phone,
        s.website,
        s.instagram,
        s.soundCloud AS soundcloud,
        s.youtube,
        s.studio_rules,
        s.cancellation_policy,
        (
          SELECT AVG(r.rating) 
          FROM review r 
          WHERE r.studio_id = s.id
        ) AS rating
      FROM studio s
      WHERE s.id = ?
      `,
      [studioId]
    );

    if (!studioRows.length) return null;
    const studio = studioRows[0];

    // 2️⃣ Relations (genres, types, amenities, equipment, languages)
    const [[genres], [types], [amenities], [equipment], [languages], [availability]] = await Promise.all([
      pool.query(`
        SELECT g.name 
        FROM studio_genre sg 
        JOIN genre g ON sg.genre_id = g.id
        WHERE sg.studio_id = ?`, [studioId]),

      pool.query(`
        SELECT t.name 
        FROM studio_type st 
        JOIN type t ON st.type_id = t.id
        WHERE st.studio_id = ?`, [studioId]),

      pool.query(`
        SELECT a.name 
        FROM studio_amenities sa 
        JOIN amenities a ON sa.amenitie_id = a.id
        WHERE sa.studio_id = ?`, [studioId]),

      pool.query(`
        SELECT e.name 
        FROM studio_equipement se 
        JOIN equipement e ON se.equipement_id = e.id
        WHERE se.studio_id = ?`, [studioId]),

      pool.query(`
        SELECT l.name 
        FROM studio_language sl 
        JOIN language l ON sl.language_id = l.id
        WHERE sl.studio_id = ?`, [studioId]),

      pool.query(`
        SELECT CONCAT(sc.day, ' ', sc.start_time, '-', sc.end_time) AS slot
        FROM studio_schedule ss
        JOIN schedule sc ON ss.schedule_id = sc.id
        WHERE ss.studio_id = ?`, [studioId])
    ]);

    // 3️⃣ Services with tags
    const [servicesRows] = await pool.query(
      `
      SELECT 
        sv.id,
        sv.name,
        sv.description,
        sv.price,
        sv.price_type,
        sv.duration,
        sv.max_capacity,
        sv.available_timing
      FROM studio_service ss
      JOIN service sv ON ss.service_id = sv.id
      WHERE ss.studio_id = ?
      `,
      [studioId]
    );

    // Attach tags
    for (let service of servicesRows) {
      const [tags] = await pool.query(
        `SELECT t.name 
        FROM service_tag st 
        JOIN tag t ON st.tag_id = t.id
        WHERE st.service_id = ?`,
        [service.id]
      );
      service.tags = tags.map(t => t.name).join(", ");
    }

    // 4️⃣ Format into your frontend type
    return {
      id: studio.id,
      name: studio.name,
      avatar: studio.avatar,
      coverPhoto: "", // you don’t have cover photo column, maybe use `studio_gallery` later
      rating: studio.rating || 0,
      location: studio.location,
      types: types.map(t => t.name),
      genres: genres.map(g => g.name),
      price: servicesRows.length ? servicesRows[0].price : 0, // or avg price
      amenities: amenities.map(a => a.name),
      equipment: equipment.map(e => e.name),
      languages: languages.map(l => l.name),
      availability: availability.map(a => a.slot),
      description: studio.description,
      contact: {
        email: studio.email,
        phone: studio.phone,
        website: studio.website,
        instagram: studio.instagram,
        soundcloud: studio.soundcloud,
        youtube: studio.youtube,
      },
      services: servicesRows.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: String(s.price),
        priceType: s.price_type,
        duration: s.duration,
        maxCapacity: String(s.max_capacity),
        availableTimes: s.available_timing,
        tags: s.tags
      })),
      rules: studio.studio_rules,
      cancellationPolicy: studio.cancellation_policy
    };
  },

  // Fetch studio by id
  async getStudioById(studioId) {
    const sql = `SELECT * FROM studio WHERE id = ?`;
    const [rows] = await pool.query(sql, [studioId]);
    return rows[0] || null;
  },

  async getMiniProfile(artistId) {
    const sql = `
      SELECT
        a.full_name AS fullName,
        a.artist_name AS artistName,
        a.avatar_link AS avatarImage,
        a.location AS location
      FROM artist a
      WHERE a.id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [artistId]);
    if (!rows.length) return null;

    const r = rows[0];
    return {
      fullName: r.fullName,
      artistName: r.artistName,
      avatarImage: r.avatarImage,
      location: r.location,
      genres: [],
      instruments: [],
    };
  },

  async getProfile(artistId) {
  const sql = `
    SELECT 
      a.full_name AS fullName,
      a.artist_name AS artistName,
      a.avatar_link AS avatarImage,
      a.bio,
      a.location,
      a.email,
      a.phone,
      a.instagram,
      a.soundCloud,
      a.youtube,
      a.experience_level AS experienceLevel,
      a.years_experience AS yearsOfExperience,
      a.availabilitie AS availability,
      
      -- genres
      g.genres,
      -- instruments
      i.instruments,
      -- languages
      l.languages,
      -- collaborators
      c.collaborators,
      -- portfolio
      p.portfolio,
      -- demos
      d.demos

    FROM artist a

    LEFT JOIN (
      SELECT ag.artist_id, GROUP_CONCAT(DISTINCT g.name) AS genres
      FROM artist_genre ag
      JOIN genre g ON ag.genre_id = g.id
      GROUP BY ag.artist_id
    ) g ON a.id = g.artist_id

    LEFT JOIN (
      SELECT ai.artist_id, GROUP_CONCAT(DISTINCT i.name) AS instruments
      FROM artist_instruments ai
      JOIN instruments i ON ai.instrument_id = i.id
      GROUP BY ai.artist_id
    ) i ON a.id = i.artist_id

    LEFT JOIN (
      SELECT al.artist_id, GROUP_CONCAT(DISTINCT l.name) AS languages
      FROM artist_language al
      JOIN language l ON al.language_id = l.id
      GROUP BY al.artist_id
    ) l ON a.id = l.artist_id

    LEFT JOIN (
      SELECT ac.artist_id, GROUP_CONCAT(DISTINCT c.name) AS collaborators
      FROM artist_colaborators ac
      JOIN colaborators c ON ac.colaborators_id = c.id
      GROUP BY ac.artist_id
    ) c ON a.id = c.artist_id

    LEFT JOIN (
      SELECT ap.artist_id, JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'url', p.url, 'title', p.title, 'type', p.type)) AS portfolio
      FROM artist_portfolio ap
      JOIN portfolio p ON ap.portfolio_id = p.id
      GROUP BY ap.artist_id
    ) p ON a.id = p.artist_id

    LEFT JOIN (
      SELECT ad.artist_id, JSON_ARRAYAGG(JSON_OBJECT('name', d.name, 'file', d.file)) AS demos
      FROM artist_demo ad
      JOIN demo d ON ad.demo_id = d.id
      GROUP BY ad.artist_id
    ) d ON a.id = d.artist_id

    WHERE a.id = ?
  `;

  const [rows] = await pool.query(sql, [artistId]);
  if (!rows.length) return null;

  const r = rows[0];

  return {
    fullName: r.fullName,
    artistName: r.artistName,
    avatarImage: r.avatarImage,
    bio: r.bio,
    location: r.location,
    contact: {
      email: r.email,
      phone: r.phone,
      instagram: r.instagram,
      soundcloud: r.soundCloud,
      youtube: r.youtube
    },
    genres: r.genres ? r.genres.split(',') : [],
    instruments: r.instruments ? r.instruments.split(',') : [],
    collaborators: r.collaborators ? r.collaborators.split(',') : [],
    languages: r.languages ? r.languages.split(',') : [],
    experienceLevel: r.experienceLevel,
    yearsOfExperience: r.yearsOfExperience,
    availability: r.availability,
    demo: Array.isArray(r.demos) ? r.demos : r.demos ? JSON.parse(r.demos) : [],
    portfolio: Array.isArray(r.portfolio) ? r.portfolio : r.portfolio ? JSON.parse(r.portfolio) : []
  };
  },

  async updatePortfolioItem({ artistId, portfolioId, url, type, title }) {
    try {
      const sql = `
        UPDATE portfolio p
        JOIN artist_portfolio ap ON ap.portfolio_id = p.id
        SET p.url = ?, p.type = ?, p.title = ?
        WHERE p.id = ? AND ap.artist_id = ?
      `;

      const values = [url, type, title, portfolioId, artistId];
      const [result] = await pool.query(sql, values);

      if (!result.affectedRows) return null;
      return { id: portfolioId, url, type, title };
    } catch (error) {
      throw new Error(`Error updating portfolio item: ${error.message}`);
    }
  },


  async getSettings(userId) {
    // 1️⃣ Fetch studio settings and notification_settings
    const [studioSettingsRows] = await pool.query(
      `SELECT s.visibility, s.show_reviews_public, s.currency, s.time_format, s.timezone,
              l.name AS language,
              ns.booking_reminder_id, ns.artist_review_reminder_id, ns.payout_updates_id
      FROM studio_settings s
      LEFT JOIN language l ON s.language_id = l.id
      LEFT JOIN notification_settings ns ON s.notification_settings_id = ns.id
      WHERE s.user_id = ?`,
      [userId]
    );

    const studioSettings = studioSettingsRows[0];

    // 2️⃣ Fetch notification settings details
    let notifications = {
      bookingConfirmation: { email: true, sms: false, push: true },
      bookingReminder: { email: true, sms: false, push: true },
      platformNews: { email: true, sms: false, push: true }
    };

    if (studioSettings?.booking_reminder_id) {
      const [bookingRows] = await pool.query(
        `SELECT email, sms, notification FROM booking_reminder WHERE id = ?`,
        [studioSettings.booking_reminder_id]
      );
      if (bookingRows[0]) {
        notifications.bookingReminder = {
          email: !!bookingRows[0].email,
          sms: !!bookingRows[0].sms,
          push: !!bookingRows[0].notification,
        };
      }
    }

    if (studioSettings?.artist_review_reminder_id) {
      const [reviewRows] = await pool.query(
        `SELECT email, sms, notification FROM artist_review_reminder WHERE id = ?`,
        [studioSettings.artist_review_reminder_id]
      );
      if (reviewRows[0]) {
        notifications.bookingConfirmation = {
          email: !!reviewRows[0].email,
          sms: !!reviewRows[0].sms,
          push: !!reviewRows[0].notification,
        };
      }
    }

    if (studioSettings?.payout_updates_id) {
      const [payoutRows] = await pool.query(
        `SELECT email, sms, notification FROM payout_updates WHERE id = ?`,
        [studioSettings.payout_updates_id]
      );
      if (payoutRows[0]) {
        notifications.platformNews = {
          email: !!payoutRows[0].email,
          sms: !!payoutRows[0].sms,
          push: !!payoutRows[0].notification,
        };
      }
    }

    // 3️⃣ Fetch payout/payment methods
    const [paymentRows] = await pool.query(
      `SELECT pm.id, pm.name AS type, pm.number AS last4, pm.email, pu.user_id
      FROM payout_method_user pu
      JOIN payout_method pm ON pu.payout_method_id = pm.id
      WHERE pu.user_id = ?`,
      [userId]
    );

    const paymentMethods = paymentRows.map(pm => ({
      id: pm.id,
      type: pm.type,
      last4: pm.last4?.slice(-4) || '',
      expiry: '', // not in DB, set default or add column
      primary: true, // default for now
    }));

    // 4️⃣ Fetch connected accounts
    const [connectedRows] = await pool.query(
      `SELECT a.id, a.account AS provider, cau.user_id, a.status
      FROM connected_account_user cau
      JOIN account a ON cau.account_id = a.id
      WHERE cau.user_id = ?`,
      [userId]
    );

    const connectedAccounts = connectedRows.map(a => ({
      id: a.id,
      provider: a.provider,
      connected: a.status === 'connected',
    }));

    // 5️⃣ Fetch invoices (transactions + studio)
    const [invoiceRows] = await pool.query(
      `SELECT t.id, t.transaction_date AS date, s.name AS studio, t.amount, 0 AS fee
      FROM transactions t
      LEFT JOIN studio s ON t.studio_id = s.id
      WHERE t.artist_id = ?`,
      [userId]
    );

    const invoices = invoiceRows.map(inv => ({
      id: inv.id,
      date: inv.date,
      studio: inv.studio,
      amount: inv.amount,
      fee: inv.fee
    }));

    // 6️⃣ Compose the final SettingsState
    const settings = {
      activeTab: 'general',
      showPassword: false,
      paymentMethods,
      invoices,
      connectedAccounts,
      notifications,
      privacySettings: {
        profileVisibility: studioSettings?.visibility || 'public',
        showReviews: !!studioSettings?.show_reviews_public,
        analyticsTracking: true // default, can add DB column if needed
      },
      securitySettings: {
        twoFactorAuth: false // default, add DB column if needed
      },
      regionalSettings: {
        language: studioSettings?.language || 'English',
        timezone: studioSettings?.timezone || 'London',
        currency: studioSettings?.currency || 'USD',
        timeFormat: studioSettings?.time_format || '24-hour'
      }
    };

    return settings;
  },

  // Fetch payment method
  async getPaymentMethod(userId) {
    const sql = `
      SELECT pu.*, pm.*
      FROM payment_user pu
      JOIN payment_method pm ON pu.payout_method_id = pm.id
      WHERE pu.user_id = ?`;
    const [rows] = await pool.query(sql, [userId]);
    return rows;
  },

  // Fetch payment history (transactions)
  async getPaymentHistory(artistId) {
    const sql = `SELECT * FROM transactions WHERE artist_id = ?`;
    const [rows] = await pool.query(sql, [artistId]);
    return rows;
  },

  // Fetch connected account
  async getConnectedAccount(userId) {
    const sql = `
      SELECT cau.*, a.*
      FROM connected_account_user cau
      JOIN account a ON cau.account_id = a.id
      WHERE cau.user_id = ?`;
    const [rows] = await pool.query(sql, [userId]);
    return rows;
  },



  // Fetch profile visibility
  async getProfileVisibility(userId) {
    const sql = `
      SELECT visibility 
      FROM artist_settings 
      WHERE user_id = ? 
      LIMIT 1`;
    const [rows] = await pool.query(sql, [userId]);
    return rows[0] || null;
  },

  // Fetch content visibility
  async getContentVisibility(userId) {
    const sql = `
      SELECT show_reviews_public 
      FROM artist_settings 
      WHERE user_id = ? 
      LIMIT 1`;
    const [rows] = await pool.query(sql, [userId]);
    return rows[0] || null;
  },

  // Fetch language, timezone, currency, time format
  async getLocalizationSettings(userId) {
    const sql = `
      SELECT language_id, currency, time_format 
      FROM artist_settings 
      WHERE user_id = ? 
      LIMIT 1`;
    const [rows] = await pool.query(sql, [userId]);
    return rows[0] || null;
  },

  /** ===================== UPDATE METHODS ===================== **/

  async updatePaymentMethod(id, data) {
    // Assuming data is an object with columns to update for payout_method
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(id);
    const sql = `UPDATE payment_method SET ${fields} WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    return result;
  },

  async updatePaymentHistory(id, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(id);
    const sql = `UPDATE transactions SET ${fields} WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    return result;
  },

  async updateConnectedAccount(id, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(id);
    const sql = `UPDATE account SET ${fields} WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    return result;
  },

  async updateProfileVisibility(userId, visibility) {
    const sql = `UPDATE artist_settings SET visibility = ? WHERE user_id = ?`;
    const [result] = await pool.query(sql, [visibility, userId]);
    return result;
  },

  async updateContentVisibility(userId, status) {
    const sql = `UPDATE artist_settings SET show_reviews_public = ? WHERE user_id = ?`;
    const [result] = await pool.query(sql, [status, userId]);
    return result;
  },

  async updateLocalizationSettings(userId, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(userId);
    const sql = `UPDATE artist_settings SET ${fields} WHERE user_id = ?`;
    const [result] = await pool.query(sql, values);
    return result;
  },


  async updateArtistSettings(userId, settingsData) {
    console.log("Received settings data:", JSON.stringify(settingsData, null, 2));
    
    const {
        privacySettings,
        regionalSettings,
        notifications,
        connectedAccounts
    } = settingsData;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Debug: Log the SQL query and parameters
        const privacyQuery = `UPDATE studio_settings 
             SET visibility = ?, 
                 show_reviews_public = ?,
                 currency = ?,
                 time_format = ?,
                 timezone = ?,
                 language_id = (SELECT id FROM language WHERE name = ? LIMIT 1)
             WHERE user_id = ?`;
        
        const privacyParams = [
            privacySettings.profileVisibility,
            privacySettings.showReviews ? 1 : 0,
            regionalSettings.currency,
            regionalSettings.timeFormat,
            regionalSettings.timezone,
            regionalSettings.language,
            userId
        ];
        
        console.log("Privacy query:", privacyQuery);
        console.log("Privacy params:", privacyParams);
        
        await conn.query(privacyQuery, privacyParams);

          // 1️⃣ Update studio_settings (privacy and regional settings)
          await conn.query(
              `UPDATE studio_settings 
              SET visibility = ?, 
                  show_reviews_public = ?,
                  currency = ?,
                  time_format = ?,
                  timezone = ?,
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

          // 2️⃣ Get notification settings ID
          const [nsRows] = await conn.query(
              `SELECT notification_settings_id FROM studio_settings WHERE user_id = ?`,
              [userId]
          );
          const nsId = nsRows[0]?.notification_settings_id;

          if (nsId) {
              // Update booking_reminder
              if (notifications.bookingReminder) {
                  const [brRows] = await conn.query(
                      `SELECT booking_reminder_id FROM notification_settings WHERE id = ?`,
                      [nsId]
                  );
                  if (brRows[0]?.booking_reminder_id) {
                      await conn.query(
                          `UPDATE booking_reminder 
                          SET email = ?, sms = ?, notification = ?
                          WHERE id = ?`,
                          [
                              notifications.bookingReminder.email ? 1 : 0,
                              notifications.bookingReminder.sms ? 1 : 0,
                              notifications.bookingReminder.push ? 1 : 0,
                              brRows[0].booking_reminder_id
                          ]
                      );
                  }
              }

              // Update artist_review_reminder for bookingConfirmation
              if (notifications.bookingConfirmation) {
                  const [arrRows] = await conn.query(
                      `SELECT artist_review_reminder_id FROM notification_settings WHERE id = ?`,
                      [nsId]
                  );
                  if (arrRows[0]?.artist_review_reminder_id) {
                      await conn.query(
                          `UPDATE artist_review_reminder 
                          SET email = ?, sms = ?, notification = ?
                          WHERE id = ?`,
                          [
                              notifications.bookingConfirmation.email ? 1 : 0,
                              notifications.bookingConfirmation.sms ? 1 : 0,
                              notifications.bookingConfirmation.push ? 1 : 0,
                              arrRows[0].artist_review_reminder_id
                          ]
                      );
                  }
              }

              // Update payout_updates for platformNews
              if (notifications.platformNews) {
                  const [puRows] = await conn.query(
                      `SELECT payout_updates_id FROM notification_settings WHERE id = ?`,
                      [nsId]
                  );
                  if (puRows[0]?.payout_updates_id) {
                      await conn.query(
                          `UPDATE payout_updates 
                          SET email = ?, sms = ?, notification = ?
                          WHERE id = ?`,
                          [
                              notifications.platformNews.email ? 1 : 0,
                              notifications.platformNews.sms ? 1 : 0,
                              notifications.platformNews.push ? 1 : 0,
                              puRows[0].payout_updates_id
                          ]
                      );
                  }
              }
          }

          // 3️⃣ Update connected accounts
          for (const account of connectedAccounts) {
              await conn.query(
                  `UPDATE account 
                  SET status = ?
                  WHERE id IN (
                      SELECT account_id 
                      FROM connected_account_user 
                      WHERE user_id = ? AND id = ?
                  )`,
                  [
                      account.connected ? 'connected' : 'disconnected',
                      userId,
                      account.id
                  ]
              );
          }
          await conn.commit();
        return { success: true, message: "Settings updated successfully" };
    } catch (error) {
        await conn.rollback();
        console.error("SQL Error:", error.message);
        console.error("Full error:", error);
        throw new Error(`Failed to update settings: ${error.message}`);
    } finally {
        conn.release();
    }
  },


  
  async updateArtistProfile(artistId, profileData) {
    const {
      fullName,
      artistName,
      avatarImage,
      bio,
      location,
      contact,
      genres,
      instruments,
      collaborators,
      languages,
      experienceLevel,
      yearsOfExperience,
      availability,
      demo,
      portfolio,
    } = profileData ?? {};

    const normalizeString = (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === "string") return value.trim();
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      return null;
    };

    const normalizeStringArray = (value) => {
      if (value === undefined) return undefined;
      if (value === null) return [];
      if (Array.isArray(value)) return value.map((v) => normalizeString(v)).filter(Boolean);
      if (typeof value === "string") {
        return value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return [];
    };

    const ensureObject = (value) =>
      value && typeof value === "object" && !Array.isArray(value) ? value : {};

    const normalizedContact = ensureObject(contact);
    const normalizedGenres = normalizeStringArray(genres);
    const normalizedInstruments = normalizeStringArray(instruments);
    const normalizedLanguages = normalizeStringArray(languages);
    const normalizedCollaborators = normalizeStringArray(collaborators);

    const normalizedPortfolio =
      portfolio === undefined
        ? undefined
        : Array.isArray(portfolio)
          ? portfolio
              .map((item) => (item && typeof item === "object" ? item : null))
              .filter(Boolean)
              .map((item) => ({
                id: Number.isFinite(Number(item.id ?? item.portfolioId))
                  ? Number(item.id ?? item.portfolioId)
                  : null,
                url: normalizeString(item.url),
                type: normalizeString(item.type),
                title: normalizeString(item.title),
              }))
              .filter((item) => item.url && item.type && item.title)
          : [];

    const normalizedDemo =
      demo === undefined
        ? undefined
        : Array.isArray(demo)
          ? demo
              .map((item) => (item && typeof item === "object" ? item : null))
              .filter(Boolean)
              .map((item) => ({
                name: normalizeString(item.name ?? item.title) ?? "Demo track",
                file: normalizeString(item.file),
              }))
              .filter((item) => item.file)
          : [];

    // Basic validation (fail fast before touching the DB: prevents partial updates on non-transactional tables).
    const email = normalizeString(normalizedContact.email);
    const phone = normalizeString(normalizedContact.phone);
    const instagram = normalizeString(normalizedContact.instagram);
    const soundcloud = normalizeString(normalizedContact.soundcloud ?? normalizedContact.soundCloud);
    const youtube = normalizeString(normalizedContact.youtube);

    const tooLong = (label, value, max) => {
      if (value === undefined || value === null) return;
      if (String(value).length > max) {
        const err = new Error(`${label} is too long (max ${max} characters).`);
        err.statusCode = 400;
        throw err;
      }
    };

    tooLong("fullName", normalizeString(fullName), 255);
    tooLong("artistName", normalizeString(artistName), 255);
    tooLong("location", normalizeString(location), 255);
    tooLong("email", email, 255);
    tooLong("phone", phone, 255);
    tooLong("instagram", instagram, 255);
    tooLong("soundcloud", soundcloud, 255);
    tooLong("youtube", youtube, 255);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update main artist table
      await conn.query(
        `UPDATE artist 
        SET full_name = COALESCE(?, full_name), 
            artist_name = COALESCE(?, artist_name), 
            avatar_link = COALESCE(?, avatar_link), 
            bio = COALESCE(?, bio), 
            location = COALESCE(?, location),
            email = COALESCE(?, email), 
            phone = COALESCE(?, phone), 
            instagram = COALESCE(?, instagram), 
            soundCloud = COALESCE(?, soundCloud), 
            youtube = COALESCE(?, youtube),
            experience_level = COALESCE(?, experience_level), 
            years_experience = COALESCE(?, years_experience), 
            availabilitie = COALESCE(?, availabilitie)
        WHERE id = ?`,
        [
          normalizeString(fullName) ?? null,
          normalizeString(artistName) ?? null,
          normalizeString(avatarImage) ?? null,
          normalizeString(bio) ?? null,
          normalizeString(location) ?? null,
          email ?? null,
          phone ?? null,
          instagram ?? null,
          soundcloud ?? null,
          youtube ?? null,
          normalizeString(experienceLevel) ?? null,
          yearsOfExperience === undefined ? null : yearsOfExperience,
          normalizeString(availability) ?? null,
          artistId,
        ]
      );

      // 2. Update genres (delete existing and insert new)
      if (normalizedGenres !== undefined) {
        await conn.query("DELETE FROM artist_genre WHERE artist_id = ?", [artistId]);
        for (const genre of normalizedGenres) {
          // Check if genre exists, if not create it
          const [genreRows] = await conn.query("SELECT id FROM genre WHERE name = ?", [genre]);
          let genreId;

          if (genreRows.length === 0) {
            const [insertResult] = await conn.query("INSERT INTO genre (name) VALUES (?)", [
              genre,
            ]);
            genreId = insertResult.insertId;
          } else {
            genreId = genreRows[0].id;
          }

          await conn.query("INSERT INTO artist_genre (artist_id, genre_id) VALUES (?, ?)", [
            artistId,
            genreId,
          ]);
        }
      }

      // 3. Update instruments (similar to genres)
      if (normalizedInstruments !== undefined) {
        await conn.query("DELETE FROM artist_instruments WHERE artist_id = ?", [artistId]);
        for (const instrument of normalizedInstruments) {
          const [instrumentRows] = await conn.query("SELECT id FROM instruments WHERE name = ?", [
            instrument,
          ]);
          let instrumentId;

          if (instrumentRows.length === 0) {
            const [insertResult] = await conn.query("INSERT INTO instruments (name) VALUES (?)", [
              instrument,
            ]);
            instrumentId = insertResult.insertId;
          } else {
            instrumentId = instrumentRows[0].id;
          }

          await conn.query(
            "INSERT INTO artist_instruments (artist_id, instrument_id) VALUES (?, ?)",
            [artistId, instrumentId]
          );
        }
      }

      // 4. Update languages
      if (normalizedLanguages !== undefined) {
        await conn.query("DELETE FROM artist_language WHERE artist_id = ?", [artistId]);
        for (const language of normalizedLanguages) {
          const [languageRows] = await conn.query("SELECT id FROM language WHERE name = ?", [
            language,
          ]);
          let languageId;

          if (languageRows.length === 0) {
            const [insertResult] = await conn.query("INSERT INTO language (name) VALUES (?)", [
              language,
            ]);
            languageId = insertResult.insertId;
          } else {
            languageId = languageRows[0].id;
          }

          await conn.query("INSERT INTO artist_language (artist_id, language_id) VALUES (?, ?)", [
            artistId,
            languageId,
          ]);
        }
      }

      // 5. Update collaborators
      if (normalizedCollaborators !== undefined) {
        await conn.query("DELETE FROM artist_colaborators WHERE artist_id = ?", [artistId]);
        for (const collaborator of normalizedCollaborators) {
          const [collabRows] = await conn.query("SELECT id FROM colaborators WHERE name = ?", [
            collaborator,
          ]);
          let collabId;

          if (collabRows.length === 0) {
            const [insertResult] = await conn.query("INSERT INTO colaborators (name) VALUES (?)", [
              collaborator,
            ]);
            collabId = insertResult.insertId;
          } else {
            collabId = collabRows[0].id;
          }

          await conn.query(
            "INSERT INTO artist_colaborators (artist_id, colaborators_id) VALUES (?, ?)",
            [artistId, collabId]
          );
        }
      }

      // 6. Update portfolio
      if (normalizedPortfolio !== undefined) {
        const [existingRows] = await conn.query(
          "SELECT portfolio_id FROM artist_portfolio WHERE artist_id = ?",
          [artistId],
        );

        const existingIds = new Set(
          (existingRows || [])
            .map((r) => Number(r.portfolio_id))
            .filter((id) => Number.isFinite(id)),
        );

        const keptIds = new Set();

        for (const item of normalizedPortfolio) {
          const portfolioId = Number(item.id);
          if (Number.isFinite(portfolioId) && existingIds.has(portfolioId)) {
            await conn.query(
              "UPDATE portfolio SET url = ?, type = ?, title = ? WHERE id = ?",
              [item.url, item.type, item.title, portfolioId],
            );
            keptIds.add(portfolioId);
            continue;
          }

          const [portfolioResult] = await conn.query(
            "INSERT INTO portfolio (url, type, title) VALUES (?, ?, ?)",
            [item.url, item.type, item.title],
          );

          const newId = portfolioResult.insertId;
          keptIds.add(newId);
          await conn.query("INSERT INTO artist_portfolio (artist_id, portfolio_id) VALUES (?, ?)", [
            artistId,
            newId,
          ]);
        }

        const toUnlink = Array.from(existingIds).filter((id) => !keptIds.has(id));
        if (toUnlink.length) {
          const placeholders = toUnlink.map(() => "?").join(",");
          await conn.query(
            `DELETE FROM artist_portfolio WHERE artist_id = ? AND portfolio_id IN (${placeholders})`,
            [artistId, ...toUnlink],
          );

          await conn.query(
            `DELETE p FROM portfolio p
             WHERE p.id IN (${placeholders})
             AND NOT EXISTS (
               SELECT 1 FROM artist_portfolio ap2 WHERE ap2.portfolio_id = p.id
             )`,
            toUnlink,
          );
        }
      }

      // 7. Update demos
      if (normalizedDemo !== undefined) {
        await conn.query("DELETE FROM artist_demo WHERE artist_id = ?", [artistId]);
        for (const item of normalizedDemo) {
          const [demoResult] = await conn.query("INSERT INTO demo (name, file) VALUES (?, ?)", [
            item.name,
            item.file,
          ]);

          await conn.query("INSERT INTO artist_demo (artist_id, demo_id) VALUES (?, ?)", [
            artistId,
            demoResult.insertId,
          ]);
        }
      }

      await conn.commit();
      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      await conn.rollback();
      console.error("Error updating profile:", error);
      const err = new Error(`Failed to update profile: ${error.message}`);
      if (error?.statusCode) err.statusCode = error.statusCode;
      if (error?.code) err.code = error.code;
      throw err;
    } finally {
      conn.release();
    }
  },


  /** ===================== CREATE / POST METHODS ===================== **/

  // In your BookingModel or similar model file
  async createBooking (bookingData) {
    try {
      const { user_id, studio_id, booking_date, booking_time, nbr_guests, service_id, status } = bookingData;
      
      const sql = `
        INSERT INTO booking (user_id, studio_id, booking_date, booking_time, nbr_guests)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const values = [user_id, studio_id, booking_date, booking_time, nbr_guests];
      const [result] = await pool.query(sql, values);

      const bookingId = result.insertId;

      if (service_id) {
        try {
          await attachBookingService({
            bookingId,
            studioId: studio_id,
            serviceId: service_id,
            status: status || "Pending",
          });
        } catch (e) {
          console.error("Failed to attach booking service:", e);
        }
      }

      return { id: bookingId, ...bookingData };
    } catch (error) {
      throw new Error(`Error creating booking: ${error.message}`);
    }
  },


  async createReview (Data) {
    try {
      const { artist_id, studio_id, rating, comment, review_date} = Data;
      
      const sql = `
        INSERT INTO review (artist_id, studio_id, rating, comment, review_date)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const values = [artist_id, studio_id, rating, comment, review_date];
      const [result] = await pool.query(sql, values);

      await GamificationModel.updateGamification(Number(artist_id), "artist");
      await GamificationModel.updateGamification(Number(studio_id), "studio");
      
      return { id: result.insertId, ...Data };
    } catch (error) {
      throw new Error(`Error creating review: ${error.message}`);
    }
  },

  async updateReview({ artistId, reviewId, rating, comment }) {
    try {
      const sql = `
        UPDATE review
        SET rating = ?, comment = ?
        WHERE id = ? AND artist_id = ?
      `;

      const values = [rating, comment, reviewId, artistId];
      const [result] = await pool.query(sql, values);

      if (!result.affectedRows) return null;

      return { id: reviewId, artist_id: artistId, rating, comment };
    } catch (error) {
      throw new Error(`Error updating review: ${error.message}`);
    }
  },

  async deleteReview({ artistId, reviewId }) {
    try {
      const [result] = await pool.query(
        `DELETE FROM review WHERE id = ? AND artist_id = ?`,
        [reviewId, artistId],
      );

      return { deleted: result.affectedRows > 0 };
    } catch (error) {
      throw new Error(`Error deleting review: ${error.message}`);
    }
  },

  async addFavorite(data){
    try {
      const { artist_id, studio_id} = data;

      const [existingRows] = await pool.query(
        `SELECT id FROM favorite_studio WHERE artist_id = ? AND studio_id = ? LIMIT 1`,
        [artist_id, studio_id],
      );
      if (existingRows.length) {
        return { id: existingRows[0].id, ...data };
      }
       
      const sql = `
        INSERT INTO favorite_studio (artist_id, studio_id)
        VALUES (?, ?)
      `;
      
      const values = [artist_id, studio_id];
      const [result] = await pool.query(sql, values);
      
      return { id: result.insertId, ...data };
    } catch (error) {
      throw new Error(`Error adding favorite: ${error.message}`);
    }
  },

  async updateProfile(artistId, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(artistId);
    const sql = `UPDATE artist SET ${fields} WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    return result;
  },

  async updateSettings(userId, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(userId);
    const sql = `UPDATE artist_settings SET ${fields} WHERE user_id = ?`;
    const [result] = await pool.query(sql, values);
    return result;
  },

  // -- Fetch gamification --
  fetchGamification: async (userId, userType = "artist") => {
    try {
      // Ensure row exists (and normalize computed fields) so clients don't get 404 for new users.
      await GamificationModel.updateGamification(Number(userId), userType);
    } catch (e) {
      // If schema isn't available yet, we'll still attempt a read below.
    }

    const baseSelect = `
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
        (SELECT COUNT(*) FROM booking b WHERE b.user_id = g.user_id AND b.booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)) AS bookings_last6,
        (SELECT COUNT(*) FROM booking b WHERE b.user_id = g.user_id) AS bookings_all,
        (SELECT COUNT(*) FROM review rv WHERE rv.artist_id = g.user_id AND rv.review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)) AS reviews_last6,
        (SELECT COUNT(*) FROM review rv WHERE rv.artist_id = g.user_id) AS reviews_all,
        GROUP_CONCAT(DISTINCT p.name) AS perks,
        GROUP_CONCAT(DISTINCT r.reward_name) AS rewards
      FROM gamification g
      LEFT JOIN gamification_perks gp ON g.id = gp.gamification_id
      LEFT JOIN perks p ON gp.perk_id = p.id
      LEFT JOIN gamification_rewards gr ON g.id = gr.gamification_id
      LEFT JOIN rewards r ON gr.reward_id = r.id
      WHERE g.user_id = ? AND g.user_type = ?
      GROUP BY g.id
    `;

    const minimalSelect = `
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
        (SELECT COUNT(*) FROM booking b WHERE b.user_id = g.user_id AND b.booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)) AS bookings_last6,
        (SELECT COUNT(*) FROM booking b WHERE b.user_id = g.user_id) AS bookings_all,
        (SELECT COUNT(*) FROM review rv WHERE rv.artist_id = g.user_id AND rv.review_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)) AS reviews_last6,
        (SELECT COUNT(*) FROM review rv WHERE rv.artist_id = g.user_id) AS reviews_all
      FROM gamification g
      WHERE g.user_id = ? AND g.user_type = ?
      LIMIT 1
    `;

    try {
      const [rows] = await pool.query(baseSelect, [userId, userType]);
      return rows[0] || null;
    } catch (error) {
      const msg = String(error?.message || "");
      if (
        msg.includes("gamification_perks") ||
        msg.includes("gamification_rewards") ||
        msg.includes("perks") ||
        msg.includes("rewards")
      ) {
        const [rows] = await pool.query(minimalSelect, [userId, userType]);
        return rows[0] || null;
      }
      throw error;
    }
  },
};

export default ArtistModel;
