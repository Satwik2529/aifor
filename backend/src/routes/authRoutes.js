const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const passwordController = require('../controllers/passwordController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateProfileUpdate } = require('../middleware/validation');
const { loginLimiter, passwordResetLimiter, registrationLimiter } = require('../middleware/rateLimiter');

/**
 * Authentication Routes
 * Handles user registration, login, profile management, and password reset
 */

// Public routes
router.post('/register', registrationLimiter, validateRegistration, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);

// Google OAuth route
router.post('/google-login', loginLimiter, googleAuthController.googleLogin);

// Password reset routes (public) - Retailer uses phone number
router.post('/forgot-password', passwordResetLimiter, passwordController.forgotPasswordRetailer);
router.post('/reset-password/:token', passwordResetLimiter, passwordController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, authController.updateProfile);

module.exports = router;
