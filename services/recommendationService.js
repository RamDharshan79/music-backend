import { db } from '../db.js';

/**
 * RECOMMENDATION SERVICE
 * Pure logic-based recommendations without ML
 */

/**
 * "Because you played X" - Find similar songs
 * Priority: Same artist > Same album > Popular fallback
 */
export async function getBecauseYouPlayedRecommendations(songId, limit = 10) {
    // Step 1: Get the original song details
    const [originalSong] = await db.query(
        'SELECT id, title, artist, album FROM songs WHERE id = ?',
        [songId]
    );
    
    if (originalSong.length === 0) {
        throw new Error('Song not found');
    }
    
    const song = originalSong[0];
    
    // Step 2: Find similar songs with priority scoring
    // Priority 1: Same artist (score: 100)
    // Priority 2: Same album (score: 50)
    // Priority 3: Popular songs (score: play count)
    const [recommendations] = await db.query(`
        SELECT 
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration,
            CASE
                WHEN s.artist = ? AND s.album = ? THEN 150
                WHEN s.artist = ? THEN 100
                WHEN s.album = ? AND s.album IS NOT NULL THEN 50
                ELSE 0
            END + COALESCE(COUNT(h.id), 0) as score
        FROM songs s
        LEFT JOIN history h ON h.songId = s.id
        WHERE s.id != ?
        GROUP BY s.id
        HAVING score > 0
        ORDER BY score DESC, s.id DESC
        LIMIT ?
    `, [song.artist, song.album, song.artist, song.album, songId, limit]);
    
    // If no similar songs found, return popular songs as fallback
    if (recommendations.length === 0) {
        return await getPopularSongsFallback(songId, limit);
    }
    
    return recommendations;
}

/**
 * Fallback: Return popular songs when no similar songs found
 */
async function getPopularSongsFallback(excludeSongId, limit) {
    const [songs] = await db.query(`
        SELECT 
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration,
            COUNT(h.id) as score
        FROM songs s
        LEFT JOIN history h ON h.songId = s.id
        WHERE s.id != ?
        GROUP BY s.id
        ORDER BY score DESC, s.id DESC
        LIMIT ?
    `, [excludeSongId, limit]);
    
    return songs;
}

/**
 * Smart Shuffle - Weighted reordering based on listening patterns
 * Increases weight for: frequently played, recently played artists
 * Decreases weight for: recently played songs (last 10)
 */
export async function smartShuffle(songIds) {
    if (!songIds || songIds.length === 0) {
        return [];
    }
    
    // Step 1: Get song details with play counts
    const placeholders = songIds.map(() => '?').join(',');
    const [songs] = await db.query(`
        SELECT 
            s.id,
            s.artist,
            COUNT(h.id) as playCount
        FROM songs s
        LEFT JOIN history h ON h.songId = s.id
        WHERE s.id IN (${placeholders})
        GROUP BY s.id
    `, songIds);
    
    // Step 2: Get recently played songs (last 10) to penalize
    const [recentlyPlayed] = await db.query(`
        SELECT DISTINCT songId
        FROM history
        ORDER BY playedAt DESC
        LIMIT 10
    `);
    const recentSongIds = new Set(recentlyPlayed.map(r => r.songId));
    
    // Step 3: Get recently played artists (last 30 days) for boost
    const [recentArtists] = await db.query(`
        SELECT s.artist, COUNT(*) as recentPlays
        FROM history h
        JOIN songs s ON s.id = h.songId
        WHERE h.playedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY s.artist
    `);
    const artistBoost = new Map(
        recentArtists.map(a => [a.artist, a.recentPlays])
    );
    
    // Step 4: Calculate weights for each song
    const weightedSongs = songs.map(song => {
        let weight = 10; // Base weight
        
        // Boost: Frequently played songs (+1 per play, max +20)
        weight += Math.min(song.playCount, 20);
        
        // Boost: Recently played artists (+5 per recent play, max +15)
        const artistBoostValue = artistBoost.get(song.artist) || 0;
        weight += Math.min(artistBoostValue * 5, 15);
        
        // Penalty: Recently played songs (-30)
        if (recentSongIds.has(song.id)) {
            weight -= 30;
        }
        
        // Add randomness for variety (±5)
        weight += (Math.random() * 10) - 5;
        
        return {
            id: song.id,
            weight: Math.max(weight, 1) // Ensure positive weight
        };
    });
    
    // Step 5: Sort by weight (descending) and return IDs
    return weightedSongs
        .sort((a, b) => b.weight - a.weight)
        .map(s => s.id);
}

/**
 * Auto-Generated Playlist: Top Songs
 * Most played songs overall
 */
export async function getTopSongsPlaylist(limit = 50) {
    const [songs] = await db.query(`
        SELECT 
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration,
            COUNT(h.id) as playCount
        FROM songs s
        INNER JOIN history h ON h.songId = s.id
        GROUP BY s.id
        ORDER BY playCount DESC, s.id DESC
        LIMIT ?
    `, [limit]);
    
    return songs;
}

/**
 * Auto-Generated Playlist: Recent Songs
 * Songs played in last 7 days
 */
export async function getRecentSongsPlaylist(limit = 50) {
    const [songs] = await db.query(`
        SELECT 
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration,
            COUNT(h.id) as playCount,
            MAX(h.playedAt) as lastPlayed
        FROM songs s
        INNER JOIN history h ON h.songId = s.id
        WHERE h.playedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY s.id
        ORDER BY lastPlayed DESC, playCount DESC
        LIMIT ?
    `, [limit]);
    
    return songs;
}
