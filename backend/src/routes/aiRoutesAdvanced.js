/**
 * Advanced AI Routes with Full Integration
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiControllerAdvanced');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/ai/status
 * @desc    Get AI service configuration status
 * @access  Private
 */
router.get('/status', aiController.getAIStatus);

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with AI assistant (OpenAI or fallback)
 * @access  Private
 */
router.post('/chat', aiController.chatWithAI);

/**
 * @route   GET /api/ai/insights
 * @desc    Get AI-powered business insights
 * @access  Private
 */
router.get('/insights', aiController.getBusinessInsights);

/**
 * @route   POST /api/ai/generate-image
 * @desc    Generate image using DALL·E or Stability AI
 * @access  Private
 */
router.post('/generate-image', aiController.generateImage);

/**
 * @route   POST /api/ai/text-to-speech
 * @desc    Convert text to speech using ElevenLabs
 * @access  Private
 */
router.post('/text-to-speech', aiController.textToSpeech);

/**
 * @route   POST /api/ai/speech-to-text
 * @desc    Convert speech to text using Deepgram
 * @access  Private
 */
router.post('/speech-to-text', upload.single('audio'), aiController.speechToText);

module.exports = router;
