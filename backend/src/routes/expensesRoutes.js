/**
 * Expenses Routes - API endpoints for expense management
 * Protected routes with JWT authentication and validation
 */

const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expensesController');
const { authenticateToken } = require('../middleware/auth');
const { validateExpense } = require('../middleware/validation');

// All expenses routes require authentication
router.use(authenticateToken);

// Expenses routes
router.get('/', expensesController.getAllExpenses);
router.get('/analytics', expensesController.getExpenseAnalytics);
router.get('/:id', expensesController.getExpenseById);
router.post('/', validateExpense, expensesController.createExpense);
router.put('/:id', validateExpense, expensesController.updateExpense);
router.delete('/:id', expensesController.deleteExpense);

module.exports = router;
