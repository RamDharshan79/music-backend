import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import { getPersonalizedRecommendations, getListeningStats } from './recommendations.js';
import recommendationRoutes from './routes/recommendations.js';
import dailyMixesRoutes from './routes/dailyMixes.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount recommendation routes
app.use('/api/recommendations', recommendationRoutes);

// Mount daily mixes routes
app.use('/api/mixes', dailyMixesRoutes);

/* =========================
   🔍 DEBUG ROUTE (PROOF)
========================= */
app.get('/api/debug/routes', (req, res) => {
    res.json({
        status: 'OK',
        routesLoaded: true,
        timestamp: new Date().toISOString()
    });
});

/* =========================
   HEALTH CHECK
========================= */
app.get('/', (req, res) => {
    res.send('Music API is running 🎵');
});

/* =========================
   SONGS
========================= */

// Get all songs
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
                duration
            FROM songs
            ORDER BY id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('❌ Failed to fetch songs:', error.message);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

// Add song
app.post('/api/songs', async (req, res) => {
    const { title, artist, album, audioUrl, artworkUrl, duration } = req.body;

    if (!title || !artist || !audioUrl) {
        return res.status(400).json({
            error: 'Missing required fields: title, artist, audioUrl'
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
        console.error('❌ Failed to add song:', error.message);
        res.status(500).json({ error: 'Failed to add song' });
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
                s.artist,
                s.audioUrl,
                s.artworkUrl
            FROM history h
            JOIN songs s ON s.id = h.songId
            ORDER BY h.playedAt DESC
        `);
        res.json(rows);
    } catch {
        res.json([]);
    }
});

app.post('/api/history', async (req, res) => {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ error: 'songId required' });

    await db.query(
        'INSERT INTO history (songId) VALUES (?)',
        [songId]
    );

    res.json({ success: true });
});

/* =========================
   RECOMMENDATIONS
========================= */

// Get personalized recommendations
app.get('/api/recommendations/personalized', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const recommendations = await getPersonalizedRecommendations(limit);
        
        res.json({
            recommendations,
            count: recommendations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Failed to get recommendations:', error.message);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});

// Get listening statistics (debug/analytics endpoint)
app.get('/api/recommendations/stats', async (req, res) => {
    try {
        const stats = await getListeningStats();
        res.json(stats);
    } catch (error) {
        console.error('❌ Failed to get stats:', error.message);
        res.status(500).json({ error: 'Failed to get listening stats' });
    }
});

/* =========================
   PUSH NOTIFICATIONS
========================= */

app.post('/api/push/register', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token || typeof token !== 'string' || token.trim() === '') {
            return res.status(400).json({ error: 'Invalid token' });
        }
        
        await db.query(
            'INSERT IGNORE INTO push_tokens (token) VALUES (?)',
            [token.trim()]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Push token registration error:', error.message);
        res.status(500).json({ error: 'Failed to register push token' });
    }
});

/* =========================
   PLAYLISTS
========================= */

// Create playlist
app.post('/api/playlists', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name required' });

    const [result] = await db.query(
        'INSERT INTO playlists (name) VALUES (?)',
        [name]
    );

    res.json({ id: result.insertId, name });
});

// ✅ FIXED: Get all playlists
app.get('/api/playlists', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM playlists ORDER BY id DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('❌ Failed to fetch playlists:', error.message);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Add song to playlist
app.post('/api/playlists/:playlistId/songs', async (req, res) => {
    const { playlistId } = req.params;
    const { songId } = req.body;

    if (!songId) {
        return res.status(400).json({ error: 'Missing songId' });
    }

    await db.query(
        `
        INSERT IGNORE INTO playlist_songs (playlist_id, song_id)
        VALUES (?, ?)
        `,
        [playlistId, songId]
    );

    res.json({ success: true });
});

// Get songs in playlist
app.get('/api/playlists/:playlistId/songs', async (req, res) => {
    const { playlistId } = req.params;

    const [rows] = await db.query(`
        SELECT
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration
        FROM songs s
        JOIN playlist_songs ps ON ps.song_id = s.id
        WHERE ps.playlist_id = ?
        ORDER BY ps.id DESC
    `, [playlistId]);

    res.json(rows);
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});