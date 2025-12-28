import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/', (req, res) => {
    res.send("Music API is running 🎵 (v2 - Debug Mode)");
});

app.get('/api/songs', async (req, res) => {
    try {
        // Robust strategy: Select ALL columns so we get whatever the DB has.
        const [rows] = await db.query('SELECT * FROM songs ORDER BY id DESC');

        // Normalize data before sending to frontend
        const normalizedRows = rows.map(song => {
            return {
                ...song,
                // Guarantee audioUrl exists, regardless of DB column name
                audioUrl: song.audioUrl || song.audio_url,
                artworkUrl: song.artworkUrl || song.artwork_url,

                // Remove raw DB columns to keep response clean and secure
                audio_url: undefined,
                artwork_url: undefined
            };
        });

        res.json(normalizedRows);
    } catch (error) {
        console.error("Error fetching songs:", error);
        res.status(500).json({ error: 'Failed to fetch songs', details: error.message });
    }
});

app.post('/api/songs', async (req, res) => {
    // 1. Normalize Input: Accept camelCase OR snake_case from frontend
    const { title, artist, album, duration } = req.body;
    const audioUrl = req.body.audioUrl || req.body.audio_url;
    const artworkUrl = req.body.artworkUrl || req.body.artwork_url;

    console.log("📝 Received Add Song Request:");
    console.log("   Title:", title);
    console.log("   Audio URL Length:", audioUrl ? audioUrl.length : 'MISSING');
    console.log("   Artwork URL Length:", artworkUrl ? artworkUrl.length : 'MISSING');

    // Validate URLs
    if (!audioUrl) {
        return res.status(400).json({ error: "Missing audioUrl" });
    }

    try {
        // 2. Try Inserting (Default to camelCase columns first, standard for some ORMs)
        // Note: We use the NORMALIZED variables (audioUrl, artworkUrl) which contain the actual strings.
        const [result] = await db.query(
            'INSERT INTO songs (title, artist, album, audioUrl, artworkUrl, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [title, artist, album, audioUrl, artworkUrl, duration]
        );
        console.log("   ✅ Inserted into camelCase columns. ID:", result.insertId);
        res.status(201).json({ id: result.insertId, title, artist, album, audioUrl, artworkUrl, duration });
    } catch (error) {
        // 3. Fallback to snake_case columns
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            try {
                console.log("   ⚠️ camelCase columns missing. Retrying with snake_case...");
                const [result] = await db.query(
                    'INSERT INTO songs (title, artist, album, audio_url, artwork_url, duration) VALUES (?, ?, ?, ?, ?, ?)',
                    [title, artist, album, audioUrl, artworkUrl, duration] // Use the correctly verified values
                );
                console.log("   ✅ Inserted into snake_case columns. ID:", result.insertId);
                return res.status(201).json({ id: result.insertId, title, artist, album, audioUrl, artworkUrl, duration });
            } catch (e) {
                console.error("   ❌ Insert Logic Failed (snake_case):", e.message);
                return res.status(500).json({ error: 'Failed to add song (schema mismatch)', details: e.message });
            }
        }
        console.error("   ❌ Insert Logic Failed:", error.message);
        res.status(500).json({ error: 'Failed to add song', details: error.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT h.*, s.title, s.artist 
            FROM history h 
            JOIN songs s ON h.songId = s.id 
            ORDER BY h.playedAt DESC
        `);
        res.json(rows);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.warn("History table missing, returning empty list.");
            return res.json([]);
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
