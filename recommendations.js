import { db } from './db.js';

/**
 * LEVEL-2 PERSONALIZED RECOMMENDATION ENGINE
 * 
 * Scoring Logic:
 * - Analyzes listening history with recency weighting
 * - Prioritizes songs from frequently played artists/albums
 * - Excludes recently played songs to avoid repetition
 * - Falls back to popular songs if history is sparse
 */

/**
 * Get personalized song recommendations
 * @param {number} limit - Maximum number of recommendations (default: 20)
 * @returns {Promise<Array>} Array of recommended songs with scores
 */
export async function getPersonalizedRecommendations(limit = 20) {
    try {
        // Step 1: Analyze listening patterns
        const patterns = await analyzeListeningPatterns();
        
        // Step 2: Get recently played song IDs to exclude
        const recentlyPlayedIds = await getRecentlyPlayedSongIds(10);
        
        // Step 3: Generate candidate songs with scores
        const candidates = await generateCandidates(patterns, recentlyPlayedIds);
        
        // Step 4: Rank and return top recommendations
        return candidates
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
            
    } catch (error) {
        console.error('❌ Recommendation error:', error.message);
        // Fallback: return popular songs
        return await getFallbackRecommendations(limit);
    }
}

/**
 * Analyze listening history to identify patterns
 * Uses exponential decay for recency weighting
 */
async function analyzeListeningPatterns() {
    const [rows] = await db.query(`
        SELECT 
            s.artist,
            s.album,
            s.id as songId,
            h.playedAt,
            DATEDIFF(NOW(), h.playedAt) as daysAgo
        FROM history h
        JOIN songs s ON s.id = h.songId
        ORDER BY h.playedAt DESC
        LIMIT 200
    `);
    
    if (rows.length === 0) {
        return {
            topArtists: new Map(),
            topAlbums: new Map(),
            topSongs: new Map()
        };
    }
    
    // Calculate weighted scores (recency decay: 0.95^days)
    const artistScores = new Map();
    const albumScores = new Map();
    const songScores = new Map();
    
    for (const row of rows) {
        const recencyWeight = Math.pow(0.95, row.daysAgo);
        
        // Artist scores
        const artistScore = artistScores.get(row.artist) || 0;
        artistScores.set(row.artist, artistScore + recencyWeight);
        
        // Album scores (if album exists)
        if (row.album) {
            const albumScore = albumScores.get(row.album) || 0;
            albumScores.set(row.album, albumScore + recencyWeight);
        }
        
        // Song scores
        const songScore = songScores.get(row.songId) || 0;
        songScores.set(row.songId, songScore + recencyWeight);
    }
    
    return {
        topArtists: artistScores,
        topAlbums: albumScores,
        topSongs: songScores
    };
}

/**
 * Get IDs of recently played songs to exclude from recommendations
 */
async function getRecentlyPlayedSongIds(count = 10) {
    const [rows] = await db.query(`
        SELECT DISTINCT songId
        FROM history
        ORDER BY playedAt DESC
        LIMIT ?
    `, [count]);
    
    return rows.map(row => row.songId);
}

/**
 * Generate candidate songs with relevance scores
 */
async function generateCandidates(patterns, excludeIds) {
    const { topArtists, topAlbums, topSongs } = patterns;
    
    // If no history, return popular fallback
    if (topArtists.size === 0) {
        return await getFallbackRecommendations(20);
    }
    
    // Get all songs except recently played
    const excludeClause = excludeIds.length > 0 
        ? `WHERE s.id NOT IN (${excludeIds.join(',')})` 
        : '';
    
    const [songs] = await db.query(`
        SELECT 
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration
        FROM songs s
        ${excludeClause}
    `);
    
    // Calculate relevance score for each song
    const scoredSongs = songs.map(song => {
        let score = 0;
        
        // Priority 1: Same artist as frequently played (weight: 10)
        const artistScore = topArtists.get(song.artist) || 0;
        score += artistScore * 10;
        
        // Priority 2: Same album as frequently played (weight: 5)
        if (song.album) {
            const albumScore = topAlbums.get(song.album) || 0;
            score += albumScore * 5;
        }
        
        // Priority 3: Popular fallback (weight: 1)
        // Songs from known artists get base popularity boost
        if (artistScore > 0) {
            score += 1;
        }
        
        return {
            ...song,
            score: Math.round(score * 100) / 100 // Round to 2 decimals
        };
    });
    
    return scoredSongs.filter(song => song.score > 0);
}

/**
 * Fallback recommendations when history is empty
 * Returns songs ordered by play count
 */
async function getFallbackRecommendations(limit = 20) {
    const [rows] = await db.query(`
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
        LEFT JOIN history h ON h.songId = s.id
        GROUP BY s.id
        ORDER BY playCount DESC, s.id DESC
        LIMIT ?
    `, [limit]);
    
    return rows.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        audioUrl: song.audioUrl,
        artworkUrl: song.artworkUrl,
        duration: song.duration,
        score: song.playCount
    }));
}

/**
 * Get statistics about listening patterns (useful for debugging)
 */
export async function getListeningStats() {
    const [artistStats] = await db.query(`
        SELECT 
            s.artist,
            COUNT(*) as playCount,
            COUNT(DISTINCT s.id) as uniqueSongs
        FROM history h
        JOIN songs s ON s.id = h.songId
        GROUP BY s.artist
        ORDER BY playCount DESC
        LIMIT 10
    `);
    
    const [albumStats] = await db.query(`
        SELECT 
            s.album,
            s.artist,
            COUNT(*) as playCount
        FROM history h
        JOIN songs s ON s.id = h.songId
        WHERE s.album IS NOT NULL
        GROUP BY s.album, s.artist
        ORDER BY playCount DESC
        LIMIT 10
    `);
    
    const [songStats] = await db.query(`
        SELECT 
            s.title,
            s.artist,
            COUNT(*) as playCount
        FROM history h
        JOIN songs s ON s.id = h.songId
        GROUP BY s.id
        ORDER BY playCount DESC
        LIMIT 10
    `);
    
    return {
        topArtists: artistStats,
        topAlbums: albumStats,
        topSongs: songStats
    };
}
