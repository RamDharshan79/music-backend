import { db } from '../db.js';

/**
 * DAILY MIXES SERVICE
 * Spotify-style auto-generated daily mixes using pure logic (no ML)
 * Mixes are virtual and regenerate daily
 */

/**
 * Generate all daily mixes
 * @returns {Promise<Array>} Array of daily mix objects
 */
export async function generateAllDailyMixes() {
    const mixes = await Promise.all([
        generateDailyMix1(), // Favorite Artists
        generateDailyMix2(), // Recently Loved
        generateDailyMix3(), // Discovery
        generateDailyMix4()  // Chill / Randomized
    ]);
    
    // Filter out empty mixes
    return mixes.filter(mix => mix.songs.length > 0);
}

/**
 * DAILY MIX 1: Favorite Artists
 * Songs from most frequently played artists
 */
async function generateDailyMix1() {
    // Step 1: Get top artists by play count
    const [topArtists] = await db.query(`
        SELECT 
            s.artist,
            COUNT(*) as playCount
        FROM history h
        JOIN songs s ON s.id = h.songId
        GROUP BY s.artist
        ORDER BY playCount DESC
        LIMIT 5
    `);
    
    if (topArtists.length === 0) {
        return createEmptyMix('daily-1', 'Daily Mix 1', 'Your favorite artists');
    }
    
    // Step 2: Get songs from these artists, excluding recently played (last 24h)
    const artistNames = topArtists.map(a => a.artist);
    const placeholders = artistNames.map(() => '?').join(',');
    
    const [songs] = await db.query(`
        SELECT DISTINCT
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
        WHERE s.artist IN (${placeholders})
        AND s.id NOT IN (
            SELECT songId 
            FROM history 
            WHERE playedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
        GROUP BY s.id
        ORDER BY playCount DESC, RAND(${getDailySeed()})
        LIMIT 25
    `, artistNames);
    
    return {
        id: 'daily-1',
        title: 'Daily Mix 1',
        subtitle: 'Your favorite artists',
        description: `Featuring ${topArtists.slice(0, 3).map(a => a.artist).join(', ')} and more`,
        songs,
        count: songs.length
    };
}

/**
 * DAILY MIX 2: Recently Loved
 * Songs played multiple times in last 7 days
 */
async function generateDailyMix2() {
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
        HAVING playCount >= 2
        ORDER BY playCount DESC, lastPlayed DESC
        LIMIT 25
    `);
    
    return {
        id: 'daily-2',
        title: 'Daily Mix 2',
        subtitle: 'Recently Loved',
        description: 'Songs you\'ve been playing on repeat',
        songs,
        count: songs.length
    };
}

/**
 * DAILY MIX 3: Discovery
 * Songs NOT played by user from familiar artists/albums
 */
async function generateDailyMix3() {
    // Step 1: Get user's listening history (artists and albums)
    const [userPatterns] = await db.query(`
        SELECT DISTINCT
            s.artist,
            s.album
        FROM history h
        JOIN songs s ON s.id = h.songId
        WHERE s.artist IS NOT NULL
    `);
    
    if (userPatterns.length === 0) {
        // Fallback: return popular songs
        return await generateDiscoveryFallback();
    }
    
    // Step 2: Get songs from these artists/albums that user hasn't played
    const artists = [...new Set(userPatterns.map(p => p.artist))];
    const albums = [...new Set(userPatterns.map(p => p.album).filter(a => a))];
    
    const artistPlaceholders = artists.map(() => '?').join(',');
    const albumPlaceholders = albums.length > 0 ? albums.map(() => '?').join(',') : "'__NONE__'";
    
    const params = [...artists, ...albums];
    
    const albumCondition = albums.length > 0 
        ? `OR s.album IN (${albumPlaceholders})`
        : '';
    
    const [songs] = await db.query(`
        SELECT DISTINCT
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration,
            CASE 
                WHEN s.artist IN (${artistPlaceholders}) THEN 2
                WHEN s.album IN (${albumPlaceholders}) THEN 1
                ELSE 0
            END as relevanceScore
        FROM songs s
        WHERE (
            s.artist IN (${artistPlaceholders})
            ${albumCondition}
        )
        AND s.id NOT IN (
            SELECT songId FROM history
        )
        ORDER BY relevanceScore DESC, RAND(${getDailySeed()})
        LIMIT 25
    `, [...params, ...artists, ...albums]);
    
    // If not enough discovery songs, add popular songs
    if (songs.length < 25) {
        const [popularSongs] = await db.query(`
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
            WHERE s.id NOT IN (
                SELECT songId FROM history
            )
            GROUP BY s.id
            ORDER BY playCount DESC, RAND(${getDailySeed()})
            LIMIT ?
        `, [25 - songs.length]);
        
        songs.push(...popularSongs);
    }
    
    return {
        id: 'daily-3',
        title: 'Daily Mix 3',
        subtitle: 'Discovery',
        description: 'New songs from artists you love',
        songs,
        count: songs.length
    };
}

/**
 * Fallback for Discovery mix when no history exists
 */
async function generateDiscoveryFallback() {
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
        LEFT JOIN history h ON h.songId = s.id
        GROUP BY s.id
        ORDER BY playCount DESC, RAND(${getDailySeed()})
        LIMIT 25
    `);
    
    return {
        id: 'daily-3',
        title: 'Daily Mix 3',
        subtitle: 'Discovery',
        description: 'Popular songs to explore',
        songs,
        count: songs.length
    };
}

/**
 * DAILY MIX 4: Chill / Randomized
 * 40% recently played artists + 60% random popular songs
 */
async function generateDailyMix4() {
    const mix4Songs = [];
    
    // Part 1: 40% from recently played artists (10 songs)
    const [recentArtistSongs] = await db.query(`
        SELECT DISTINCT
            s.id,
            s.title,
            s.artist,
            s.album,
            s.audioUrl,
            s.artworkUrl,
            s.duration
        FROM songs s
        WHERE s.artist IN (
            SELECT DISTINCT s2.artist
            FROM history h
            JOIN songs s2 ON s2.id = h.songId
            WHERE h.playedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY h.playedAt DESC
            LIMIT 10
        )
        ORDER BY RAND(${getDailySeed()})
        LIMIT 10
    `);
    
    mix4Songs.push(...recentArtistSongs);
    
    // Part 2: 60% random popular songs (15 songs)
    const excludeIds = mix4Songs.map(s => s.id);
    const excludePlaceholders = excludeIds.length > 0 
        ? excludeIds.map(() => '?').join(',')
        : '0';
    
    const excludeCondition = excludeIds.length > 0 
        ? `AND s.id NOT IN (${excludePlaceholders})`
        : '';
    
    const [popularSongs] = await db.query(`
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
        ${excludeCondition}
        GROUP BY s.id
        ORDER BY playCount DESC, RAND(${getDailySeed()})
        LIMIT 15
    `, excludeIds);
    
    mix4Songs.push(...popularSongs);
    
    // Deterministic shuffle using daily seed
    const shuffled = deterministicShuffle(mix4Songs, getDailySeed());
    
    return {
        id: 'daily-4',
        title: 'Daily Mix 4',
        subtitle: 'Chill Vibes',
        description: 'A relaxed mix of familiar and popular tracks',
        songs: shuffled,
        count: shuffled.length
    };
}

/**
 * Get daily seed for deterministic randomization
 * Changes once per day
 */
function getDailySeed() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + 
                 (today.getMonth() + 1) * 100 + 
                 today.getDate();
    return seed;
}

/**
 * Deterministic shuffle using seed
 * Same seed = same shuffle order
 */
function deterministicShuffle(array, seed) {
    const shuffled = [...array];
    let currentSeed = seed;
    
    // Seeded random number generator
    const seededRandom = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return currentSeed / 233280;
    };
    
    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

/**
 * Create empty mix structure
 */
function createEmptyMix(id, title, subtitle) {
    return {
        id,
        title,
        subtitle,
        description: 'Start listening to get personalized recommendations',
        songs: [],
        count: 0
    };
}

/**
 * Get statistics about daily mixes (for debugging)
 */
export async function getDailyMixStats() {
    const [historyCount] = await db.query(
        'SELECT COUNT(*) as count FROM history'
    );
    
    const [uniqueArtists] = await db.query(`
        SELECT COUNT(DISTINCT s.artist) as count
        FROM history h
        JOIN songs s ON s.id = h.songId
    `);
    
    const [recentPlays] = await db.query(`
        SELECT COUNT(*) as count
        FROM history
        WHERE playedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    return {
        totalPlays: historyCount[0].count,
        uniqueArtists: uniqueArtists[0].count,
        recentPlays: recentPlays[0].count,
        dailySeed: getDailySeed(),
        generatedAt: new Date().toISOString()
    };
}
