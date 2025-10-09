import pool from "../database.js";

const AuthModel = {
  async connect(email, password) {
    try {
      // 1. Check if user exists
      const [userRows] = await pool.query(
        "SELECT id FROM user_profile WHERE email = ? AND password = ?",
        [email, password]
      );

      if (userRows.length === 0) {
        // No user found
        return { success: false, message: "Invalid credentials" };
      }

      const userId = userRows[0].id;

      // 2. Check if user is a studio
      const [studioRows] = await pool.query(
        "SELECT id FROM studio WHERE user_id = ?",
        [userId]
      );

      if (studioRows.length > 0) {
        return {
          success: true,
          user_id: userId,
          role: "studio",
          studio_id: studioRows[0].id
        };
      }

      // 3. Check if user is an artist
      const [artistRows] = await pool.query(
        "SELECT id FROM artist WHERE user_id = ?",
        [userId]
      );

      if (artistRows.length > 0) {
        return {
          success: true,
          user_id: userId,
          role: "artist",
          artist_id: artistRows[0].id
        };
      }

      // 4. If no role found
      return { success: true, user_id: userId, role: "user" };

    } catch (err) {
      console.error("Auth error:", err);
      return { success: false, message: "Server error" };
    }
  },

  createAccount: async (firstName, lastName, email, password) => {
    const query = `
      INSERT INTO user_profile (first_name, last_name, email, password)
      VALUES (?, ?, ?, ?);
    `;
    const values = [firstName, lastName, email, password];

    try {
      const [result] = await pool.query(query, values);
      return result.insertId; // return the new user ID
    } catch (error) {
      console.error("Error creating account:", error);
      throw error;
    }
  },

  async createArtist(userId, formData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Insert main artist record
      const experienceLevelMap = {
        'beginner': 'beginner',
        'intermediate': 'intermediate',
        'pro': 'professional'
      };

      const [artistResult] = await connection.query(`
        INSERT INTO artist (
          user_id, avatar_link, full_name, artist_name, location, bio, 
          email, phone, instagram, soundCloud, youtube, experience_level, 
          years_experience, availabilitie, status, verified, spotify
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
      `, [
        userId,
        formData.avatarImage, // Store the file name/path as provided
        formData.fullName,
        formData.artistName,
        formData.location,
        formData.bio,
        formData.contact.email,
        formData.contact.phone,
        formData.contact.instagram,
        formData.contact.soundcloud,
        formData.contact.youtube,
        experienceLevelMap[formData.experienceLevel] || 'beginner',
        formData.yearsOfExperience,
        formData.availability,
        formData.contact.spotify
      ]);

      const artistId = artistResult.insertId;

      // 2. Process genres
      for (const genreName of formData.genres) {
        let genreId = await this.getOrCreateId(connection, 'genre', genreName);
        await connection.query(
          'INSERT INTO artist_genre (artist_id, genre_id) VALUES (?, ?)',
          [artistId, genreId]
        );
      }

      // 3. Process instruments
      for (const instrumentName of formData.instruments) {
        let instrumentId = await this.getOrCreateId(connection, 'instruments', instrumentName);
        await connection.query(
          'INSERT INTO artist_instruments (artist_id, instrument_id) VALUES (?, ?)',
          [artistId, instrumentId]
        );
      }

      // 4. Process languages
      for (const languageName of formData.languages) {
        let languageId = await this.getOrCreateId(connection, 'language', languageName);
        await connection.query(
          'INSERT INTO artist_language (artist_id, language_id) VALUES (?, ?)',
          [artistId, languageId]
        );
      }

      // 5. Process collaborators
      for (const collaboratorName of formData.collaborators) {
        let collaboratorId = await this.getOrCreateId(connection, 'colaborators', collaboratorName);
        await connection.query(
          'INSERT INTO artist_colaborators (artist_id, colaborators_id) VALUES (?, ?)',
          [artistId, collaboratorId]
        );
      }

      // 6. Process demos - store file names only
      for (const demo of formData.demos) {
        const [demoResult] = await connection.query(
          'INSERT INTO demo (name, file) VALUES (?, ?)',
          [demo.title, demo.file] // Store the file name/path as provided
        );
        
        await connection.query(
          'INSERT INTO artist_demo (artist_id, demo_id) VALUES (?, ?)',
          [artistId, demoResult.insertId]
        );
      }

      // 7. Process portfolio items
      for (const portfolioItem of formData.portfolio) {
        const [portfolioResult] = await connection.query(
          'INSERT INTO portfolio (url, type, title) VALUES (?, ?, ?)',
          [portfolioItem.url, portfolioItem.type, portfolioItem.title]
        );
        
        await connection.query(
          'INSERT INTO artist_portfolio (artist_id, portfolio_id) VALUES (?, ?)',
          [artistId, portfolioResult.insertId]
        );
      }

      await connection.commit();
      return { success: true, artistId };

    } catch (error) {
      await connection.rollback();
      console.error("Error creating artist:", error);
      return { success: false, error: error.message };
    } finally {
      connection.release();
    }
  },

  async createStudio(userId, formData) {
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 1. Insert main studio record
        const [studioResult] = await connection.query(`
          INSERT INTO studio (
            user_id, name, location, description, avatar_link, 
            email, phone, website, instagram, soundCloud, youtube,
            studio_rules, cancellation_policy, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
          userId,
          formData.studioName,
          formData.location,
          formData.description,
          formData.avatarImage,
          formData.contact.email,
          formData.contact.phone,
          formData.contact.website,
          formData.contact.instagram,
          formData.contact.soundcloud,
          formData.contact.youtube,
          formData.additionalInfo.rules,
          formData.additionalInfo.cancellationPolicy
        ]);

        const studioId = studioResult.insertId;

        // 2. Process amenities
        for (const amenity of formData.additionalInfo.amenities) {
          let amenityId = await this.getOrCreateId(connection, 'amenities', amenity);
          await connection.query(
            'INSERT INTO studio_amenities (studio_id, amenitie_id) VALUES (?, ?)',
            [studioId, amenityId]
          );
        }

        // 3. Process equipment
        for (const equipmentName of formData.equipment) {
          let equipmentId = await this.getOrCreateId(connection, 'equipement', equipmentName);
          await connection.query(
            'INSERT INTO studio_equipement (studio_id, equipement_id) VALUES (?, ?)',
            [studioId, equipmentId]
          );
        }

        // 4. Process gallery images
        for (const galleryImage of formData.galleryImages) {
          const [galleryResult] = await connection.query(
            'INSERT INTO gallery (link) VALUES (?)',
            [galleryImage]
          );
          
          await connection.query(
            'INSERT INTO studio_gallery (studio_id, gallery_id) VALUES (?, ?)',
            [studioId, galleryResult.insertId]
          );
        }

        // 5. Process schedule (using junction table)
        for (const [day, scheduleData] of Object.entries(formData.schedule)) {
          if (scheduleData.open) {
            const [scheduleResult] = await connection.query(`
              INSERT INTO schedule (day, start_time, end_time)
              VALUES (?, ?, ?)
            `, [
              day,
              scheduleData.start,
              scheduleData.end
            ]);

            const scheduleId = scheduleResult.insertId;

            await connection.query(`
              INSERT INTO studio_schedule (studio_id, schedule_id)
              VALUES (?, ?)
            `, [
              studioId,
              scheduleId
            ]);
          }
        }

        // 6. Process services
        for (const service of formData.services) {
          // Convert duration to time format if needed
          let durationTime = null;
          if (service.duration) {
            const hours = Math.floor(service.duration / 60);
            const minutes = service.duration % 60;
            durationTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          }

          const [serviceResult] = await connection.query(`
            INSERT INTO service (
              name, price_type, price, duration, max_capacity, 
              available_timing, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            service.name,
            service.priceType,
            service.price,
            durationTime,
            service.maxCapacity,
            service.availableTimes,
            service.description
          ]);

          const serviceId = serviceResult.insertId;

          // Link service to studio using a junction table
          await connection.query(
            'INSERT INTO studio_service (studio_id, service_id) VALUES (?, ?)',
            [studioId, serviceId]
          );
        }

        await connection.commit();
        return { success: true, studioId };

      } catch (error) {
        await connection.rollback();
        console.error("Error creating studio:", error);
        return { success: false, error: error.message };
      } finally {
        connection.release();
      }
  },

  async getOrCreateId(connection, tableName, name) {
    // Check if the record already exists
    const [rows] = await connection.query(
      `SELECT id FROM ${tableName} WHERE name = ?`,
      [name]
    );

    if (rows.length > 0) {
      return rows[0].id;
    }

    // If not, create it
    const [result] = await connection.query(
      `INSERT INTO ${tableName} (name) VALUES (?)`,
      [name]
    );

    return result.insertId;
  },

  async getOrCreateId(connection, tableName, name) {
    // Check if the record already exists
    const [rows] = await connection.query(
      `SELECT id FROM ${tableName} WHERE name = ?`,
      [name]
    );

    if (rows.length > 0) {
      return rows[0].id;
    }

    // If not, create it
    const [result] = await connection.query(
      `INSERT INTO ${tableName} (name) VALUES (?)`,
      [name]
    );

    return result.insertId;
  },

};

export default AuthModel;
