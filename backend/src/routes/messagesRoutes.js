/**
 * Messages Routes - API endpoints for WhatsApp and communication management
 * Protected routes with JWT authentication and validation
 */

const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validation');

// All messages routes require authentication
router.use(authenticateToken);

// Messages routes
router.get('/', messagesController.getAllMessages);
router.get('/recent', messagesController.getRecentMessages);
router.get('/analytics', messagesController.getMessageAnalytics);
router.get('/:id', messagesController.getMessageById);
router.post('/', validateMessage, messagesController.createMessage);
router.put('/:id', validateMessage, messagesController.updateMessage);
router.delete('/:id', messagesController.deleteMessage);

module.exports = router;
