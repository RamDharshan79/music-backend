import express from 'express';
import * as recommendationController from '../controllers/recommendationController.js';

const router = express.Router();

/**
 * RECOMMENDATION ROUTES
 * Level-2 personalized recommendations without ML
 */

// "Because you played X" recommendations
router.get('/because/:songId', recommendationController.getBecauseYouPlayed);

// Smart shuffle (weighted reordering)
router.post('/shuffle/smart', recommendationController.smartShuffle);

// Auto-generated playlists (virtual, not saved in DB)
router.get('/playlists/auto/top', recommendationController.getTopPlaylist);
router.get('/playlists/auto/recent', recommendationController.getRecentPlaylist);

export default router;
