import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import { runMigrations } from './migrate.js';

dotenv.config();

// Run migrations on startup
await runMigrations();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get('/', (req, res) => {
    res.send("Music API is running 🎵");
});

/* =========================
   GET SONGS
========================= */
app.get('/api/songs', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                id,
                title,
                artist,
                album,
                audioUrl,
                artworkUrl,
                duration,
                createdAt
            FROM songs
            ORDER BY id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("❌ Failed to fetch songs:", error.message);
        res.status(500).json({
            error: 'Failed to fetch songs',
            details: error.message
        });
    }
});

/* =========================
   ADD SONG
========================= */
app.post('/api/songs', async (req, res) => {
    const { title, artist, album, audioUrl, artworkUrl, duration } = req.body;

    if (!title || !artist || !audioUrl) {
        return res.status(400).json({
            error: "Missing required fields: title, artist, audioUrl"
        });
    }

    try {
        const [result] = await db.query(
            `
            INSERT INTO songs
            (title, artist, album, audioUrl, artworkUrl, duration)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                title,
                artist,
                album || null,
                audioUrl,
                artworkUrl || null,
                duration || null
            ]
        );

        res.status(201).json({
            id: result.insertId,
            title,
            artist,
            album,
            audioUrl,
            artworkUrl,
            duration
        });
    } catch (error) {
        console.error("❌ Failed to add song:", error.message);
        res.status(500).json({
            error: "Failed to add song",
            details: error.message
        });
    }
});

/* =========================
   PLAY HISTORY
========================= */
app.get('/api/history', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                h.id,
                h.songId,
                h.playedAt,
                s.title,
                s.artist
            FROM history h
            JOIN songs s ON h.songId = s.id
            ORDER BY h.playedAt DESC
        `);

        res.json(rows);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json([]);
        }
        console.error("❌ Failed to fetch history:", error.message);
        res.status(500).json({
            error: 'Failed to fetch history',
            details: error.message
        });
    }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});