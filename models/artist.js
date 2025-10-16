// models/artist.js
import pool from '../database.js'
import GamificationModel from './gamification.js';



const ArtistModel = {
  /** ===================== CONNECTION TEST ===================== **/
  
  // Test database connection
  async testConnection() {
    try {
      const { rows } = await pool.query('SELECT NOW() as current_time');
      return { success: true, time: rows[0].current_time };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

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
  STRING_AGG(DISTINCT t.name, ',') AS types,
  STRING_AGG(DISTINCT g.name, ',') AS genres,
  STRING_AGG(DISTINCT e.name, ',') AS equipment,
  STRING_AGG(DISTINCT l.name, ',') AS languages,
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
GROUP BY s.id, s.name, s.avatar_link, s.location, gf.normal_level

    `;

    const { rows } = await pool.query(sql);

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
    const sql = `
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
        srv.duration
      FROM booking b
      JOIN studio s ON b.studio_id = s.id
      LEFT JOIN service srv ON b.service_id = srv.id
      WHERE b.user_id = $1
    `;
    
    const { rows } = await pool.query(sql, [artistId]);
    return rows;
  },  

  // Fetch all related reviews
  async getReviewsByArtist(artistId) {
    const sql = `
      SELECT r.*, s.* 
      FROM review r 
      JOIN studio s ON r.studio_id = s.id
      WHERE r.artist_id = $1`;
    const { rows } = await pool.query(sql, [artistId]);
    return rows;
  },

  // Fetch points
  async getPoints(artistId) {
    const sql = `SELECT * FROM points WHERE artist_id = $1`;
    const { rows } = await pool.query(sql, [artistId]);
    return rows[0] || null;
  },

  // Fetch notifications
  async getNotifications(artistId) {
    const sql = `SELECT * FROM notification WHERE user_id = $1`;
    const { rows } = await pool.query(sql, [artistId]);
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
        STRING_AGG(DISTINCT t.name, ',') AS types,
        STRING_AGG(DISTINCT g.name, ',') AS genres,
        STRING_AGG(DISTINCT e.name, ',') AS equipment,
        STRING_AGG(DISTINCT l.name, ',') AS languages
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
      WHERE fs.artist_id = $1
      GROUP BY s.id, s.name, s.avatar_link, s.location
    `;

    const { rows } = await pool.query(sql, [artistId]);

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
    const { rows: studioRows } = await pool.query(
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
      WHERE s.id = $1
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
        WHERE sg.studio_id = $1`, [studioId]),

      pool.query(`
        SELECT t.name 
        FROM studio_type st 
        JOIN type t ON st.type_id = t.id
        WHERE st.studio_id = $1`, [studioId]),

      pool.query(`
        SELECT a.name 
        FROM studio_amenities sa 
        JOIN amenities a ON sa.amenitie_id = a.id
        WHERE sa.studio_id = $1`, [studioId]),

      pool.query(`
        SELECT e.name 
        FROM studio_equipement se 
        JOIN equipement e ON se.equipement_id = e.id
        WHERE se.studio_id = $1`, [studioId]),

      pool.query(`
        SELECT l.name 
        FROM studio_language sl 
        JOIN language l ON sl.language_id = l.id
        WHERE sl.studio_id = $1`, [studioId]),

      pool.query(`
        SELECT CONCAT(sc.day, ' ', sc.start_time::text, '-', sc.end_time::text) AS slot
        FROM studio_schedule ss
        JOIN schedule sc ON ss.schedule_id = sc.id
        WHERE ss.studio_id = $1`, [studioId])
    ]);

    // 3️⃣ Services with tags
    const { rows: servicesRows } = await pool.query(
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
      WHERE ss.studio_id = $1
      `,
      [studioId]
    );

    // Attach tags
    for (let service of servicesRows) {
      const { rows: tags } = await pool.query(
        `SELECT t.name 
        FROM service_tag st 
        JOIN tag t ON st.tag_id = t.id
        WHERE st.service_id = $1`,
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
    const sql = `SELECT * FROM studio WHERE id = $1`;
    const { rows } = await pool.query(sql, [studioId]);
    return rows[0] || null;
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
      SELECT ag.artist_id, STRING_AGG(DISTINCT g.name, ',') AS genres
      FROM artist_genre ag
      JOIN genre g ON ag.genre_id = g.id
      GROUP BY ag.artist_id
    ) g ON a.id = g.artist_id

    LEFT JOIN (
      SELECT ai.artist_id, STRING_AGG(DISTINCT i.name, ',') AS instruments
      FROM artist_instruments ai
      JOIN instruments i ON ai.instrument_id = i.id
      GROUP BY ai.artist_id
    ) i ON a.id = i.artist_id

    LEFT JOIN (
      SELECT al.artist_id, STRING_AGG(DISTINCT l.name, ',') AS languages
      FROM artist_language al
      JOIN language l ON al.language_id = l.id
      GROUP BY al.artist_id
    ) l ON a.id = l.artist_id

    LEFT JOIN (
      SELECT ac.artist_id, STRING_AGG(DISTINCT c.name, ',') AS collaborators
      FROM artist_colaborators ac
      JOIN colaborators c ON ac.colaborators_id = c.id
      GROUP BY ac.artist_id
    ) c ON a.id = c.artist_id

    LEFT JOIN (
      SELECT ap.artist_id, json_agg(json_build_object('url', p.url, 'title', p.title, 'type', p.type)) AS portfolio
      FROM artist_portfolio ap
      JOIN portfolio p ON ap.portfolio_id = p.id
      GROUP BY ap.artist_id
    ) p ON a.id = p.artist_id

    LEFT JOIN (
      SELECT ad.artist_id, json_agg(json_build_object('name', d.name, 'file', d.file)) AS demos
      FROM artist_demo ad
      JOIN demo d ON ad.demo_id = d.id
      GROUP BY ad.artist_id
    ) d ON a.id = d.artist_id

    WHERE a.id = $1
  `;

  const { rows } = await pool.query(sql, [artistId]);
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


  async getSettings(userId) {
    // 1️⃣ Fetch studio settings and notification_settings
    const [studioSettingsRows] = await pool.query(
      `SELECT s.visibility, s.show_reviews_public, s.currency, s.time_format, s.timezone,
              l.name AS language,
              ns.booking_reminder_id, ns.artist_review_reminder_id, ns.payout_updates_id
      FROM studio_settings s
      LEFT JOIN language l ON s.language_id = l.id
      LEFT JOIN notification_settings ns ON s.notification_settings_id = ns.id
      WHERE s.user_id = $1`,
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
        `SELECT email, sms, notification FROM booking_reminder WHERE id = $1`,
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
        `SELECT email, sms, notification FROM artist_review_reminder WHERE id = $1`,
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
        `SELECT email, sms, notification FROM payout_updates WHERE id = $1`,
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
      WHERE pu.user_id = $1`,
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
      WHERE cau.user_id = $1`,
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
      WHERE t.artist_id = $1`,
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
      WHERE pu.user_id = $1`;
    const { rows } = await pool.query(sql, [userId]);
    return rows;
  },

  // Fetch payment history (transactions)
  async getPaymentHistory(artistId) {
    const sql = `SELECT * FROM transactions WHERE artist_id = $1`;
    const { rows } = await pool.query(sql, [artistId]);
    return rows;
  },

  // Fetch connected account
  async getConnectedAccount(userId) {
    const sql = `
      SELECT cau.*, a.*
      FROM connected_account_user cau
      JOIN account a ON cau.account_id = a.id
      WHERE cau.user_id = $1`;
    const { rows } = await pool.query(sql, [userId]);
    return rows;
  },



  // Fetch profile visibility
  async getProfileVisibility(userId) {
    const sql = `
      SELECT visibility 
      FROM artist_settings 
      WHERE user_id = $1 
      LIMIT 1`;
    const { rows } = await pool.query(sql, [userId]);
    return rows[0] || null;
  },

  // Fetch content visibility
  async getContentVisibility(userId) {
    const sql = `
      SELECT show_reviews_public 
      FROM artist_settings 
      WHERE user_id = $1 
      LIMIT 1`;
    const { rows } = await pool.query(sql, [userId]);
    return rows[0] || null;
  },

  // Fetch language, timezone, currency, time format
  async getLocalizationSettings(userId) {
    const sql = `
      SELECT language_id, currency, time_format 
      FROM artist_settings 
      WHERE user_id = $1 
      LIMIT 1`;
    const { rows } = await pool.query(sql, [userId]);
    return rows[0] || null;
  },

  /** ===================== UPDATE METHODS ===================== **/

  async updatePaymentMethod(id, data) {
    // Assuming data is an object with columns to update for payout_method
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(data);
    const sql = `UPDATE payment_method SET ${fields} WHERE id = $${values.length + 1}`;
    const result = await pool.query(sql, [...values, id]);
    return result;
  },

  async updatePaymentHistory(id, data) {
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(data);
    const sql = `UPDATE transactions SET ${fields} WHERE id = $${values.length + 1}`;
    const result = await pool.query(sql, [...values, id]);
    return result;
  },

  async updateConnectedAccount(id, data) {
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(data);
    const sql = `UPDATE account SET ${fields} WHERE id = $${values.length + 1}`;
    const result = await pool.query(sql, [...values, id]);
    return result;
  },

  async updateProfileVisibility(userId, visibility) {
    const sql = `UPDATE artist_settings SET visibility = $1 WHERE user_id = $2`;
    const result = await pool.query(sql, [visibility, userId]);
    return result;
  },

  async updateContentVisibility(userId, status) {
    const sql = `UPDATE artist_settings SET show_reviews_public = $1 WHERE user_id = $2`;
    const result = await pool.query(sql, [status, userId]);
    return result;
  },

  async updateLocalizationSettings(userId, data) {
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(data);
    const sql = `UPDATE artist_settings SET ${fields} WHERE user_id = $${values.length + 1}`;
    const result = await pool.query(sql, [...values, userId]);
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

    const conn = await pool.connect();
    try {
        await conn.query('BEGIN');

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
          const { rows: nsRows } = await conn.query(
              `SELECT notification_settings_id FROM studio_settings WHERE user_id = $1`,
              [userId]
          );
          const nsId = nsRows[0]?.notification_settings_id;

          if (nsId) {
              // Update booking_reminder
              if (notifications.bookingReminder) {
                  const { rows: brRows } = await conn.query(
                      `SELECT booking_reminder_id FROM notification_settings WHERE id = $1`,
                      [nsId]
                  );
                  if (brRows[0]?.booking_reminder_id) {
                      await conn.query(
                          `UPDATE booking_reminder 
                          SET email = $1, sms = $2, notification = $3
                          WHERE id = $4`,
                          [
                              notifications.bookingReminder.email ? true : false,
                              notifications.bookingReminder.sms ? true : false,
                              notifications.bookingReminder.push ? true : false,
                              brRows[0].booking_reminder_id
                          ]
                      );
                  }
              }

              // Update artist_review_reminder for bookingConfirmation
              if (notifications.bookingConfirmation) {
                  const { rows: arrRows } = await conn.query(
                      `SELECT artist_review_reminder_id FROM notification_settings WHERE id = $1`,
                      [nsId]
                  );
                  if (arrRows[0]?.artist_review_reminder_id) {
                      await conn.query(
                          `UPDATE artist_review_reminder 
                          SET email = $1, sms = $2, notification = $3
                          WHERE id = $4`,
                          [
                              notifications.bookingConfirmation.email ? true : false,
                              notifications.bookingConfirmation.sms ? true : false,
                              notifications.bookingConfirmation.push ? true : false,
                              arrRows[0].artist_review_reminder_id
                          ]
                      );
                  }
              }

              // Update payout_updates for platformNews
              if (notifications.platformNews) {
                  const { rows: puRows } = await conn.query(
                      `SELECT payout_updates_id FROM notification_settings WHERE id = $1`,
                      [nsId]
                  );
                  if (puRows[0]?.payout_updates_id) {
                      await conn.query(
                          `UPDATE payout_updates 
                          SET email = $1, sms = $2, notification = $3
                          WHERE id = $4`,
                          [
                              notifications.platformNews.email ? true : false,
                              notifications.platformNews.sms ? true : false,
                              notifications.platformNews.push ? true : false,
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
          await conn.query('COMMIT');
        return { success: true, message: "Settings updated successfully" };
    } catch (error) {
        await conn.query('ROLLBACK');
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
      portfolio
    } = profileData;

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      // 1. Update main artist table
      await conn.query(
        `UPDATE artist 
        SET full_name = ?, artist_name = ?, avatar_link = ?, bio = ?, location = ?,
            email = ?, phone = ?, instagram = ?, soundCloud = ?, youtube = ?,
            experience_level = ?, years_experience = ?, availabilitie = ?
        WHERE id = ?`,
        [
          fullName,
          artistName,
          avatarImage,
          bio,
          location,
          contact.email,
          contact.phone,
          contact.instagram,
          contact.soundcloud,
          contact.youtube,
          experienceLevel,
          yearsOfExperience,
          availability,
          artistId
        ]
      );

      // 2. Update genres (delete existing and insert new)
      await conn.query('DELETE FROM artist_genre WHERE artist_id = $1', [artistId]);
      for (const genre of genres) {
        // Check if genre exists, if not create it
        let { rows: genreRows } = await conn.query('SELECT id FROM genre WHERE name = $1', [genre]);
        let genreId;
        
        if (genreRows.length === 0) {
          const { rows } = await conn.query('INSERT INTO genre (name) VALUES ($1) RETURNING id', [genre]);
          genreId = rows[0].id;
        } else {
          genreId = genreRows[0].id;
        }
        
        await conn.query('INSERT INTO artist_genre (artist_id, genre_id) VALUES ($1, $2)', [artistId, genreId]);
      }

      // 3. Update instruments (similar to genres)
      await conn.query('DELETE FROM artist_instruments WHERE artist_id = $1', [artistId]);
      for (const instrument of instruments) {
        let { rows: instrumentRows } = await conn.query('SELECT id FROM instruments WHERE name = $1', [instrument]);
        let instrumentId;
        
        if (instrumentRows.length === 0) {
          const { rows } = await conn.query('INSERT INTO instruments (name) VALUES ($1) RETURNING id', [instrument]);
          instrumentId = rows[0].id;
        } else {
          instrumentId = instrumentRows[0].id;
        }
        
        await conn.query('INSERT INTO artist_instruments (artist_id, instrument_id) VALUES ($1, $2)', [artistId, instrumentId]);
      }

      // 4. Update languages
      await conn.query('DELETE FROM artist_language WHERE artist_id = $1', [artistId]);
      for (const language of languages) {
        let { rows: languageRows } = await conn.query('SELECT id FROM language WHERE name = $1', [language]);
        let languageId;
        
        if (languageRows.length === 0) {
          const { rows } = await conn.query('INSERT INTO language (name) VALUES ($1) RETURNING id', [language]);
          languageId = rows[0].id;
        } else {
          languageId = languageRows[0].id;
        }
        
        await conn.query('INSERT INTO artist_language (artist_id, language_id) VALUES ($1, $2)', [artistId, languageId]);
      }

      // 5. Update collaborators
      await conn.query('DELETE FROM artist_colaborators WHERE artist_id = $1', [artistId]);
      for (const collaborator of collaborators) {
        let { rows: collabRows } = await conn.query('SELECT id FROM colaborators WHERE name = $1', [collaborator]);
        let collabId;
        
        if (collabRows.length === 0) {
          const { rows } = await conn.query('INSERT INTO colaborators (name) VALUES ($1) RETURNING id', [collaborator]);
          collabId = rows[0].id;
        } else {
          collabId = collabRows[0].id;
        }
        
        await conn.query('INSERT INTO artist_colaborators (artist_id, colaborators_id) VALUES ($1, $2)', [artistId, collabId]);
      }

      // 6. Update portfolio
      await conn.query('DELETE FROM artist_portfolio WHERE artist_id = $1', [artistId]);
      for (const item of portfolio) {
        // Insert into portfolio table
        const { rows: portfolioResult } = await conn.query(
          'INSERT INTO portfolio (url, type, title) VALUES ($1, $2, $3) RETURNING id',
          [item.url, item.type, item.title]
        );
        
        // Link to artist
        await conn.query(
          'INSERT INTO artist_portfolio (artist_id, portfolio_id) VALUES ($1, $2)',
          [artistId, portfolioResult[0].id]
        );
      }

      // 7. Update demos
      await conn.query('DELETE FROM artist_demo WHERE artist_id = $1', [artistId]);
      for (const item of demo) {
        // Insert into demo table
        const { rows: demoResult } = await conn.query(
          'INSERT INTO demo (name, file) VALUES ($1, $2) RETURNING id',
          [item.name, item.file]
        );
        
        // Link to artist
        await conn.query(
          'INSERT INTO artist_demo (artist_id, demo_id) VALUES ($1, $2)',
          [artistId, demoResult[0].id]
        );
      }

      await conn.query('COMMIT');
      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      await conn.query('ROLLBACK');
      console.error("Error updating profile:", error);
      throw new Error(`Failed to update profile: ${error.message}`);
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
        INSERT INTO booking (user_id, studio_id, booking_date, booking_time, nbr_guests, service_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const values = [user_id, studio_id, booking_date, booking_time, nbr_guests, service_id, status];
      const { rows } = await pool.query(sql, values);
      
      return { id: rows[0].id, ...bookingData };
    } catch (error) {
      throw new Error(`Error creating booking: ${error.message}`);
    }
  },


  async createReview (Data) {
    try {
      const { artist_id, studio_id, rating, comment, review_date} = Data;
      
      const sql = `
        INSERT INTO review (artist_id, studio_id, rating, comment, review_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      const values = [artist_id, studio_id, rating, comment, review_date];
      const { rows } = await pool.query(sql, values);

      await GamificationModel.updateGamification(Number(artist_id), "artist");
      await GamificationModel.updateGamification(Number(studio_id), "studio");
      
      return { id: rows[0].id, ...Data };
    } catch (error) {
      throw new Error(`Error creating review: ${error.message}`);
    }
  },

  async addFavorite(data){
    try {
      const { artist_id, studio_id} = data;
      
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

export default ArtistModel;
