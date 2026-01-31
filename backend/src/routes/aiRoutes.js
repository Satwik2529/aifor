/**
 * AI Routes - API endpoints for AI services integration
 * Protected routes with JWT authentication
 * Future implementation will include GPT-4o, Whisper, and DALL·E integration
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

// All AI routes require authentication
router.use(authenticateToken);

// AI routes
router.get('/insights', aiController.getBusinessInsights);
router.get('/daily-digest', aiController.getDailyDigest);
router.post('/voice-input', aiController.processVoiceInput);
router.post('/generate-image', aiController.generateImage);
router.post('/chat', aiController.chatWithAI);

module.exports = router;
