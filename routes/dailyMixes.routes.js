import express from 'express';
import * as dailyMixesController from '../controllers/dailyMixes.controller.js';

const router = express.Router();

/**
 * DAILY MIXES ROUTES
 * Spotify-style auto-generated daily mixes
 */

// Get all daily mixes
router.get('/daily', dailyMixesController.getDailyMixes);

// Get daily mix statistics (debugging)
router.get('/daily/stats', dailyMixesController.getDailyMixStats);

export default router;
