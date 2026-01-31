/**
 * Inventory Routes - API endpoints for inventory management
 * Protected routes with JWT authentication and validation
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');
const { validateInventory } = require('../middleware/validation');

// All inventory routes require authentication
router.use(authenticateToken);

// Inventory routes
router.get('/', inventoryController.getAllInventory);
router.get('/analytics', inventoryController.getInventoryAnalytics);
router.get('/low-stock', inventoryController.getLowStockItems);
router.get('/:id', inventoryController.getInventoryById);
router.post('/', validateInventory, inventoryController.createInventoryItem);
router.put('/:id', validateInventory, inventoryController.updateInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;
