import * as dailyMixesService from '../services/dailyMixes.service.js';

/**
 * DAILY MIXES CONTROLLER
 * Handles HTTP requests for Spotify-style daily mixes
 */

/**
 * GET /api/mixes/daily
 * Generate all daily mixes
 */
export async function getDailyMixes(req, res) {
    try {
        const mixes = await dailyMixesService.generateAllDailyMixes();
        
        res.json({
            mixes,
            count: mixes.length,
            generatedAt: new Date().toISOString(),
            note: 'Mixes refresh daily and are not saved in database'
        });
        
    } catch (error) {
        console.error('❌ Daily mixes error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate daily mixes',
            details: error.message 
        });
    }
}

/**
 * GET /api/mixes/daily/stats
 * Get statistics about daily mixes (debugging)
 */
export async function getDailyMixStats(req, res) {
    try {
        const stats = await dailyMixesService.getDailyMixStats();
        
        res.json({
            stats,
            message: 'Daily mix generation statistics'
        });
        
    } catch (error) {
        console.error('❌ Daily mix stats error:', error.message);
        res.status(500).json({ 
            error: 'Failed to get daily mix stats',
            details: error.message 
        });
    }
}
