/**
 * Customer Chatbot Routes
 * API endpoints for customer-side AI chatbot interactions
 */

const express = require('express');
const router = express.Router();
const customerChatbotController = require('../controllers/customerChatbotController');
const { authenticateToken } = require('../middleware/auth');

// All customer chatbot routes require authentication
router.use(authenticateToken);

// @route   POST /api/chatbot/customer/chat
// @desc    Send message to AI chatbot
// @access  Private (Customer)
router.post('/chat', customerChatbotController.chat);

// @route   POST /api/chatbot/customer/order
// @desc    Place order with confirmed items
// @access  Private (Customer)
router.post('/order', customerChatbotController.placeOrder);

// @route   GET /api/chatbot/customer/status
// @desc    Get chatbot status and available features
// @access  Private (Customer)
router.get('/status', customerChatbotController.getStatus);

// @route   POST /api/chatbot/customer/voice
// @desc    Process voice input (speech-to-text)
// @access  Private (Customer)
router.post('/voice', customerChatbotController.voiceInput);

// @route   POST /api/chatbot/customer/speak
// @desc    Convert text to speech
// @access  Private (Customer)
router.post('/speak', customerChatbotController.textToSpeech);

// @route   POST /api/chatbot/customer/recipe
// @desc    Generate cooking instructions for ingredients
// @access  Private (Customer)
router.post('/recipe', customerChatbotController.generateRecipe);

module.exports = router;
