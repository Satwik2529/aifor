const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const passwordController = require('../controllers/passwordController');
const { authenticateToken } = require('../middleware/auth');
const { validateCustomerRegistration, validateCustomerLogin } = require('../middleware/validation');

/**
 * Customer Authentication Routes
 * Handles customer user registration, login, profile management, and password reset
 */

// Public routes
router.post('/register', validateCustomerRegistration, customerAuthController.register);
router.post('/login', validateCustomerLogin, customerAuthController.login);

// Password reset routes (public) - Customer uses email
router.post('/forgot-password', passwordController.forgotPasswordCustomer);
router.post('/reset-password/:token', passwordController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, customerAuthController.getProfile);
router.put('/profile', authenticateToken, customerAuthController.updateProfile);

module.exports = router;
