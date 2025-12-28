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
    res.send("Music API is running 🎵");
});

app.get('/api/songs', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, title, artist, album, audio_url as audioUrl, artwork_url as artworkUrl, duration FROM songs ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

app.post('/api/songs', async (req, res) => {
    const { title, artist, album, audioUrl, artworkUrl, duration } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO songs (title, artist, album, audio_url, artwork_url, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [title, artist, album, audioUrl, artworkUrl, duration]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add song' });
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
