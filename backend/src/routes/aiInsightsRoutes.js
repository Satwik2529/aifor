/**
 * AI Insights Routes - API endpoints for AI-generated insights management
 * Protected routes with JWT authentication and validation
 */

const express = require('express');
const router = express.Router();
const aiInsightsController = require('../controllers/aiInsightsController');
const { authenticateToken } = require('../middleware/auth');
const { validateAiInsight } = require('../middleware/validation');

// All AI insights routes require authentication
router.use(authenticateToken);

// AI insights routes
router.get('/', aiInsightsController.getAllInsights);
router.get('/latest', aiInsightsController.getLatestInsights);
router.get('/:id', aiInsightsController.getInsightById);
router.post('/', validateAiInsight, aiInsightsController.createInsight);
router.put('/:id', validateAiInsight, aiInsightsController.updateInsight);
router.delete('/:id', aiInsightsController.deleteInsight);

// ==================== GEMINI AI-POWERED FEATURES ====================

// @route   GET /api/ai-insights/demand-forecast
// @desc    Generate AI-powered demand forecasting analysis
// @access  Private
router.get('/generate/demand-forecast', aiInsightsController.generateDemandForecast);

// @route   GET /api/ai-insights/revenue-optimization
// @desc    Generate AI-powered revenue optimization strategies
// @access  Private
router.get('/generate/revenue-optimization', aiInsightsController.generateRevenueOptimization);

// @route   GET /api/ai-insights/expense-forecast
// @desc    Generate AI-powered expense forecasting with seasonal analysis
// @access  Private
router.get('/generate/expense-forecast', aiInsightsController.generateExpenseForecast);

// @route   POST /api/ai-insights/chat
// @desc    Chat with AI assistant about business
// @access  Private
router.post('/chat', aiInsightsController.chatWithAI);

module.exports = router;
