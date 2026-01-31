/**
 * Conversational Action Routes - Phase 7
 * API endpoints for AI-powered conversational database operations
 */

const express = require('express');
const router = express.Router();
const conversationalActionController = require('../controllers/conversationalActionController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// @route   POST /api/conversational/parse
// @desc    Parse user message to extract intent and structured data
// @access  Private
router.post('/parse', conversationalActionController.parseIntent);

// @route   POST /api/conversational/execute
// @desc    Execute confirmed action (add sale, expense, inventory update)
// @access  Private
router.post('/execute', conversationalActionController.executeAction);

module.exports = router;
