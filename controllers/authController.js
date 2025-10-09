import AuthModel from "../models/auth.js";
// controllers/authController.js
import pool from "../database.js"; // mysql2/promise pool
import crypto from "crypto";


// SQL queries
const selectByProviderSql =
  "SELECT * FROM user_profile WHERE provider = ? AND providerId = ? LIMIT 1";
const selectByEmailSql =
  "SELECT * FROM user_profile WHERE email = ? LIMIT 1";
const linkProviderSql =
  "UPDATE user_profile SET provider = ?, providerId = ? WHERE id = ?";
const insertUserSql =
  "INSERT INTO user_profile (email, password, first_name, last_name, type, provider, providerId) VALUES (?, ?, ?, ?, '', ?, ?)";
const selectByIdSql =
  "SELECT * FROM user_profile WHERE id = ? LIMIT 1";

const selectArtistByUserSql =
  "SELECT id FROM artist WHERE user_id = ? LIMIT 1";
const selectStudioByUserSql =
  "SELECT id FROM studio WHERE user_id = ? LIMIT 1";



const authController = {
    login : async (req, res) => {
        const { email, password } = req.body;
        const result = await AuthModel.connect(email, password);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    },

    register : async (req, res) => {
        try {
            const { firstName, lastName, email, password } = req.body;

            const userId = await AuthModel.createAccount(firstName, lastName, email, password);

            res.status(201).json({
            message: "Account created successfully",
            userId,
            });
        } catch (error) {
            res.status(500).json({ error: "Failed to create account" });
        }
    },

    createAccount: async (req, res) => {
        try {
            // In a real app, you'd get userId from authentication middleware
            // For now, we'll assume it's passed in the request body
            const { userId, ...formData } = req.body;
            
            if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
            }
            
            // Create the artist profile
            const result = await AuthModel.createArtist(userId, formData);
            
            if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Artist profile created successfully',
                artistId: result.artistId
            });
            } else {
            res.status(500).json({
                success: false,
                message: 'Failed to create artist profile',
                error: result.error
            });
            }
        } catch (error) {
            console.error('Error in artist creation route:', error);
            res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
            });
        }
    },

    createStudio: async (req, res) => {
        try {
            const { userId, ...formData } = req.body;
            
            if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
            }
            
            // Create the studio profile
            const result = await AuthModel.createStudio(userId, formData);
            
            if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Studio profile created successfully',
                studioId: result.studioId
            });
            } else {
            res.status(500).json({
                success: false,
                message: 'Failed to create studio profile',
                error: result.error
            });
            }
        } catch (error) {
            console.error('Error in studio creation route:', error);
            res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
            });
        }
    },

    getArtistById : async (req, res) => {
        try {
            const artistId = req.params.id;
            
            // Basic implementation to get artist details
            const [artistRows] = await pool.query(
            'SELECT * FROM artist WHERE id = ?',
            [artistId]
            );
            
            if (artistRows.length > 0) {
            const artist = artistRows[0];
            
            // Get related data
            const [genres] = await pool.query(`
                SELECT g.name FROM genre g
                JOIN artist_genre ag ON g.id = ag.genre_id
                WHERE ag.artist_id = ?
            `, [artistId]);
            
            // Similarly get instruments, languages, etc.
            
            res.json({ 
                success: true, 
                artist: {
                ...artist,
                genres: genres.map(g => g.name)
                // Add other related data here
                } 
            });
            } else {
            res.status(404).json({ success: false, message: 'Artist not found' });
            }
        } catch (error) {
            console.error('Error fetching artist:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    getStudioById : async (req, res) => {
        try {
            const studioId = req.params.id;
            
            // Basic implementation to get studio details
            const [studioRows] = await pool.query(
            'SELECT * FROM studio WHERE id = ?',
            [studioId]
            );
            
            if (studioRows.length > 0) {
            const studio = studioRows[0];
            
            // Get related data
            const [amenities] = await pool.query(`
                SELECT a.name FROM amenities a
                JOIN studio_amenities sa ON a.id = sa.amenitie_id
                WHERE sa.studio_id = ?
            `, [studioId]);
            
            // Similarly get equipment, services, etc.
            
            res.json({ 
                success: true, 
                studio: {
                ...studio,
                amenities: amenities.map(a => a.name)
                // Add other related data here
                } 
            });
            } else {
            res.status(404).json({ success: false, message: 'Studio not found' });
            }
        } catch (error) {
            console.error('Error fetching studio:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
    }},

    oauthLogin: async (req, res) => {
        try {
        const { email, name, provider, providerId } = req.body;

        // 1. Check if user already exists
        const [userRows] = await pool.query(
            "SELECT id FROM user_profile WHERE email = ?",
            [email]
        );

        let userId;

        if (userRows.length > 0) {
            // User exists
            userId = userRows[0].id;
        } else {
            // User does not exist → create account
            const names = name.split(" ");
            const firstName = names[0];
            const lastName = names.slice(1).join(" ") || " ";
            
            userId = await AuthModel.createAccount(firstName, lastName, email, providerId); // You can store providerId as password temporarily or create a separate field
        }

        // Optionally, you can check roles like in normal login
        const [studioRows] = await pool.query(
            "SELECT id FROM studio WHERE user_id = ?",
            [userId]
        );

        const [artistRows] = await pool.query(
            "SELECT id FROM artist WHERE user_id = ?",
            [userId]
        );

        let role = "user";
        let extra = {};
        if (studioRows.length > 0) {
            role = "studio";
            extra.studio_id = studioRows[0].id;
        } else if (artistRows.length > 0) {
            role = "artist";
            extra.artist_id = artistRows[0].id;
        }

        res.json({
            success: true,
            user_id: userId,
            role,
            ...extra
        });

        } catch (err) {
        console.error("OAuth login error:", err);
        res.status(500).json({ success: false, message: "Server error" });
        }
    },


    oauthConnect: async (req, res) => {
        try {
        const { email, name, provider, providerId } = req.body;
        if (!provider || !providerId) {
            return res.status(400).json({ success: false, error: "provider and providerId are required" });
        }

        // 1) lookup by provider+providerId
        const [byProv] = await pool.query(selectByProviderSql, [provider, providerId]);
        let user = byProv[0];

        // 2) if not found, try by email and link
        if (!user && email) {
            const [byEmail] = await pool.query(selectByEmailSql, [email]);
            const candidate = byEmail[0];
            if (candidate) {
            await pool.query(linkProviderSql, [provider, providerId, candidate.id]);
            const [fresh] = await pool.query(selectByIdSql, [candidate.id]);
            user = fresh[0];
            }
        }

        // 3) if still not found, create user (generate placeholder password)
        if (!user) {
            const parts = (name || "").trim().split(/\s+/);
            const firstName = parts[0] || "";
            const lastName = parts.slice(1).join(" ") || "";
            const placeholderPassword = crypto.randomBytes(32).toString("hex"); // hash server-side if needed

            const [insert] = await pool.query(insertUserSql, [
            email || "",
            placeholderPassword,
            firstName,
            lastName,
            provider,
            providerId
            ]);
            const newId = insert.insertId;
            const [fresh] = await pool.query(selectByIdSql, [newId]);
            user = fresh[0];
        }

        // Determine role and onboarding
        const role = user?.type || null; // 'artist' | 'studio' | '' -> normalize
        let artistId = null;
        let studioId = null;

        if (role === "artist") {
            const [artistRows] = await pool.query(selectArtistByUserSql, [user.id]);
            artistId = artistRows[0]?.id || null;
        } else if (role === "studio") {
            const [studioRows] = await pool.query(selectStudioByUserSql, [user.id]);
            studioId = studioRows[0]?.id || null;
        }

        const normalizedRole = role === "" ? null : role;
        const needsOnboarding = !normalizedRole && !artistId && !studioId;

        return res.json({
            success: true,
            userId: user.id,
            role: normalizedRole,
            artistId,
            studioId,
            needsOnboarding
        });
        } catch (err) {
        console.error("oauthConnect error", err);
        return res.status(500).json({ success: false, error: "internal_error" });
        }
    }
}


export default authController;