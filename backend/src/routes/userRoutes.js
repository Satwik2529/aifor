/**
 * User Routes - API endpoints for user management
 * Protected routes with JWT authentication
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

// All user routes require authentication
router.use(authenticateToken);

// User routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', validateProfileUpdate, userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
