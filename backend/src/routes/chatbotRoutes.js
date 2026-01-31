/**
 * Chatbot Routes - API endpoints for AI chatbot interactions
 */

const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken } = require('../middleware/auth');

// All chatbot routes require authentication
router.use(authenticateToken);

// @route   POST /api/chatbot/chat
// @desc    Send message to AI chatbot
// @access  Private
router.post('/chat', chatbotController.chat);

// @route   GET /api/chatbot/status
// @desc    Get chatbot health status
// @access  Private
router.get('/status', chatbotController.getStatus);

// @route   POST /api/chatbot/stt
// @desc    Convert speech to text (voice transcription)
// @access  Private
router.post('/stt', chatbotController.speechToText);

// @route   POST /api/chatbot/tts
// @desc    Convert text to speech
// @access  Private
router.post('/tts', chatbotController.textToSpeech);

module.exports = router;
