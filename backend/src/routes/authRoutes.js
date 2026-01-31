const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateProfileUpdate } = require('../middleware/validation');

/**
 * Authentication Routes
 * Handles user registration, login, profile management, and password reset
 */

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Password reset routes (public) - Retailer uses phone number
router.post('/forgot-password', passwordController.forgotPasswordRetailer);
router.post('/reset-password/:token', passwordController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, authController.updateProfile);

module.exports = router;
