const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const passwordController = require('../controllers/passwordController');
const { authenticateToken } = require('../middleware/auth');
const { validateCustomerRegistration, validateCustomerLogin } = require('../middleware/validation');
const { loginLimiter, passwordResetLimiter, registrationLimiter } = require('../middleware/rateLimiter');

/**
 * Customer Authentication Routes
 * Handles customer user registration, login, profile management, and password reset
 */

// Public routes
router.post('/register', registrationLimiter, validateCustomerRegistration, customerAuthController.register);
router.post('/login', loginLimiter, validateCustomerLogin, customerAuthController.login);

// Password reset routes (public) - Customer uses email
router.post('/forgot-password', passwordResetLimiter, passwordController.forgotPasswordCustomer);
router.post('/reset-password/:token', passwordResetLimiter, passwordController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, customerAuthController.getProfile);
router.put('/profile', authenticateToken, customerAuthController.updateProfile);
router.put('/update-location', authenticateToken, customerAuthController.updateLocation);

module.exports = router;
