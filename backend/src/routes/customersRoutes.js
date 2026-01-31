/**
 * Customers Routes - API endpoints for customer management
 * Protected routes with JWT authentication and validation
 */

const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { authenticateToken } = require('../middleware/auth');
const { validateCustomer } = require('../middleware/validation');

// All customers routes require authentication
router.use(authenticateToken);

// Customers routes
router.get('/', customersController.getAllCustomers);
router.get('/analytics', customersController.getCustomerAnalytics);
router.get('/:id', customersController.getCustomerById);
router.post('/', validateCustomer, customersController.createCustomer);
router.put('/:id', validateCustomer, customersController.updateCustomer);
router.delete('/:id', customersController.deleteCustomer);

module.exports = router;
