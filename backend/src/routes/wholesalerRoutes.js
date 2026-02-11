const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const wholesalerController = require('../controllers/wholesalerController');

// Retailer routes - discover and order from wholesalers
router.get('/nearby', authenticateToken, wholesalerController.getNearbyWholesalers);
router.get('/ai-recommendation', authenticateToken, wholesalerController.getAIRecommendation);
router.post('/orders', authenticateToken, wholesalerController.createOrder);
router.get('/orders/retailer', authenticateToken, wholesalerController.getRetailerOrders);
router.post('/orders/:orderId/add-to-my-inventory', authenticateToken, wholesalerController.addToMyInventory);
router.get('/:wholesalerId/inventory', authenticateToken, wholesalerController.getWholesalerInventory);

// Wholesaler routes - manage orders and inventory
router.get('/orders/wholesaler', authenticateToken, wholesalerController.getWholesalerOrders);
router.patch('/orders/:orderId/status', authenticateToken, wholesalerController.updateOrderStatus);
router.get('/inventory/my', authenticateToken, wholesalerController.getMyInventory);
router.post('/inventory/:action', authenticateToken, wholesalerController.manageInventory);
router.post('/inventory/update', authenticateToken, wholesalerController.updateInventoryPrice);
router.get('/ai-insights', authenticateToken, wholesalerController.getWholesalerAIInsights);
router.post('/ai-assistant', authenticateToken, wholesalerController.aiInventoryAssistant);
router.post('/send-campaign', authenticateToken, wholesalerController.sendAICampaign);
router.post('/apply-discount', authenticateToken, wholesalerController.applyDiscountToProduct);

// Retailer routes - view offers and place orders
router.get('/offers/all', authenticateToken, wholesalerController.getAllActiveOffers);
router.get('/:wholesalerId/offers', authenticateToken, wholesalerController.getActiveOffers);

module.exports = router;
