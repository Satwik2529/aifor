/**
 * Sales Routes - API endpoints for sales management
 * Protected routes with JWT authentication and validation
 */

const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticateToken } = require('../middleware/auth');
const { validateSale } = require('../middleware/validation');

// All sales routes require authentication
router.use(authenticateToken);

// Sales routes
router.get('/', salesController.getAllSales);
router.get('/analytics', salesController.getSalesAnalytics);
router.get('/today/summary', salesController.getTodaysSales);
router.get('/:id', salesController.getSalesById);
router.post('/', validateSale, salesController.createSales);
router.put('/:id', validateSale, salesController.updateSales);
router.delete('/:id', salesController.deleteSales);

module.exports = router;
