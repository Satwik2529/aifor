const express = require('express');
const router = express.Router();
const profitAnalyticsController = require('../controllers/profitAnalyticsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Profit Analytics Routes
 * All routes require authentication
 * Provides accurate profit calculations with COGS and expense breakdown
 */

// @route   GET /api/profit-analytics
// @desc    Get comprehensive profit analysis
// @access  Private
router.get('/', authenticateToken, profitAnalyticsController.getProfitAnalysis);

// @route   GET /api/profit-analytics/sales-breakdown
// @desc    Get detailed sales breakdown with COGS per item
// @access  Private
router.get('/sales-breakdown', authenticateToken, profitAnalyticsController.getSalesBreakdown);

// @route   GET /api/profit-analytics/expenses-breakdown
// @desc    Get expenses breakdown (sales vs operating)
// @access  Private
router.get('/expenses-breakdown', authenticateToken, profitAnalyticsController.getExpensesBreakdown);

// @route   GET /api/profit-analytics/inventory-status
// @desc    Get inventory status with remaining value
// @access  Private
router.get('/inventory-status', authenticateToken, profitAnalyticsController.getInventoryStatus);

// @route   GET /api/profit-analytics/time-series
// @desc    Get sales vs expenses time series data
// @access  Private
router.get('/time-series', authenticateToken, profitAnalyticsController.getSalesVsExpensesTimeSeries);

// @route   GET /api/profit-analytics/sales-by-category
// @desc    Get sales aggregated by category
// @access  Private
router.get('/sales-by-category', authenticateToken, profitAnalyticsController.getSalesByCategory);

// @route   GET /api/profit-analytics/top-products
// @desc    Get top selling products
// @access  Private
router.get('/top-products', authenticateToken, profitAnalyticsController.getTopProducts);

// @route   GET /api/profit-analytics/performance-insights
// @desc    Get performance insights with month-over-month comparisons
// @access  Private
router.get('/performance-insights', authenticateToken, profitAnalyticsController.getPerformanceInsights);

module.exports = router;
