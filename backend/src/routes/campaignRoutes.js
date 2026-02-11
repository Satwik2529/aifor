const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Campaign Routes - Discount and campaign management
 * Base path: /api/campaigns
 */

// Protected routes (require authentication)
router.get('/recommendations', authenticateToken, campaignController.getDiscountRecommendations);
router.post('/apply', authenticateToken, campaignController.applyDiscount);
router.post('/remove', authenticateToken, campaignController.removeDiscount);
router.get('/active', authenticateToken, campaignController.getActiveCampaigns);
router.get('/analytics', authenticateToken, campaignController.getCampaignAnalytics);
router.post('/toggle-status', authenticateToken, campaignController.toggleCampaignStatus);

// Public routes (for customers)
router.get('/hot-deals', campaignController.getHotDeals);
router.post('/track-click', campaignController.trackCampaignClick);

module.exports = router;
