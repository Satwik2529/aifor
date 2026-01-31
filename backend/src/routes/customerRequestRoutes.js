const express = require('express');
const router = express.Router();
const customerRequestController = require('../controllers/customerRequestController');
const { authenticateToken } = require('../middleware/auth');
const { validateCustomerRequest } = require('../middleware/validation');

/**
 * Customer Request Routes
 * Handles customer requests/messages to retailers
 */

// Get all retailers (for customer selection)
router.get('/retailers', authenticateToken, customerRequestController.getAllRetailers);

// Inventory routes - check stock availability
router.get('/retailer/:retailer_id/inventory', authenticateToken, customerRequestController.getRetailerInventory);
router.post('/retailer/:retailer_id/check-availability', authenticateToken, customerRequestController.checkItemAvailability);

// Customer routes - create and view their own requests
router.post('/', authenticateToken, validateCustomerRequest, customerRequestController.createRequest);
router.get('/customer', authenticateToken, customerRequestController.getCustomerRequests);

// Retailer routes - view and manage requests sent to them
router.get('/retailer', authenticateToken, customerRequestController.getRetailerRequests);
router.put('/:id/status', authenticateToken, customerRequestController.updateRequestStatus);
router.post('/:id/bill', authenticateToken, customerRequestController.generateBill);

// Common routes - view single request
router.get('/:id', authenticateToken, customerRequestController.getRequestById);

module.exports = router;
