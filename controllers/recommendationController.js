import * as recommendationService from '../services/recommendationService.js';

/**
 * RECOMMENDATION CONTROLLER
 * Handles HTTP requests and responses for recommendation features
 */

/**
 * GET /api/recommendations/because/:songId
 * "Because you played X" recommendations
 */
export async function getBecauseYouPlayed(req, res) {
    try {
        const songId = parseInt(req.params.songId);
        const limit = parseInt(req.query.limit) || 10;
        
        if (isNaN(songId)) {
            return res.status(400).json({ error: 'Invalid song ID' });
        }
        
        const recommendations = await recommendationService.getBecauseYouPlayedRecommendations(
            songId,
            limit
        );
        
        res.json({
            songId,
            recommendations,
            count: recommendations.length
        });
        
    } catch (error) {
        console.error('❌ Because you played error:', error.message);
        
        if (error.message === 'Song not found') {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
}

/**
 * POST /api/shuffle/smart
 * Smart shuffle with weighted reordering
 */
export async function smartShuffle(req, res) {
    try {
        const { queue } = req.body;
        
        if (!Array.isArray(queue)) {
            return res.status(400).json({ 
                error: 'Invalid input: queue must be an array of song IDs' 
            });
        }
        
        if (queue.length === 0) {
            return res.json({ queue: [] });
        }
        
        // Validate all IDs are numbers
        const songIds = queue.map(id => parseInt(id));
        if (songIds.some(id => isNaN(id))) {
            return res.status(400).json({ 
                error: 'Invalid input: all queue items must be valid song IDs' 
            });
        }
        
        const shuffledQueue = await recommendationService.smartShuffle(songIds);
        
        res.json({
            queue: shuffledQueue,
            originalCount: queue.length,
            shuffledCount: shuffledQueue.length
        });
        
    } catch (error) {
        console.error('❌ Smart shuffle error:', error.message);
        res.status(500).json({ error: 'Failed to shuffle queue' });
    }
}

/**
 * GET /api/playlists/auto/top
 * Auto-generated playlist: Top songs
 */
export async function getTopPlaylist(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const songs = await recommendationService.getTopSongsPlaylist(limit);
        
        res.json({
            playlist: {
                id: 'auto-top',
                name: 'Top Songs',
                description: 'Your most played songs',
                type: 'auto-generated',
                virtual: true
            },
            songs,
            count: songs.length
        });
        
    } catch (error) {
        console.error('❌ Top playlist error:', error.message);
        res.status(500).json({ error: 'Failed to generate top playlist' });
    }
}

/**
 * GET /api/playlists/auto/recent
 * Auto-generated playlist: Recent songs
 */
export async function getRecentPlaylist(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const songs = await recommendationService.getRecentSongsPlaylist(limit);
        
        res.json({
            playlist: {
                id: 'auto-recent',
                name: 'Recently Played',
                description: 'Songs you played in the last 7 days',
                type: 'auto-generated',
                virtual: true
            },
            songs,
            count: songs.length
        });
        
    } catch (error) {
        console.error('❌ Recent playlist error:', error.message);
        res.status(500).json({ error: 'Failed to generate recent playlist' });
    }
}
