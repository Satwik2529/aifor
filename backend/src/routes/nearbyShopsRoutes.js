const express = require('express');
const router = express.Router();
const nearbyShopsController = require('../controllers/nearbyShopsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Nearby Shops Routes
 * Allows customers to find shops within a specified radius
 */

// Protected route - requires authentication
router.get('/', authenticateToken, nearbyShopsController.getNearbyShops);

module.exports = router;
