const Expense = require('../models/Expense');
const { validationResult } = require('express-validator');

/**
 * Expenses Controller - Expense Management with CRUD Operations
 * Handles expense tracking, categorization, and analytics
 * Future: Integration with AI for expense categorization and budget insights
 */

const expensesController = {
  // Get all expenses for authenticated user
  getAllExpenses: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, category, start_date, end_date } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (category) {
        filter.category = new RegExp(category, 'i');
      }
      
      if (start_date || end_date) {
        filter.date = {};
        if (start_date) filter.date.$gte = new Date(start_date);
        if (end_date) filter.date.$lte = new Date(end_date);
      }

      const expenses = await Expense.find(filter)
        .sort({ date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await Expense.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Expenses retrieved successfully',
        data: expenses,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expenses',
        error: error.message
      });
    }
  },

  // Get expense by ID
  getExpenseById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const expense = await Expense.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found',
          error: 'Expense does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Expense retrieved successfully',
        data: expense
      });
    } catch (error) {
      console.error('Get expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expense',
        error: error.message
      });
    }
  },

  // Create new expense record
  createExpense: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { amount, description, category, date, is_sales_expense } = req.body;

      // Create new expense
      const expense = new Expense({
        user_id: userId,
        amount,
        description,
        category,
        date: date || new Date(),
        is_sales_expense: is_sales_expense || false
      });

      await expense.save();
      await expense.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: expense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating expense',
        error: error.message
      });
    }
  },

  // Update expense record
  updateExpense: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user._id;
      const { amount, description, category, date, is_sales_expense } = req.body;

      const expense = await Expense.findOneAndUpdate(
        { _id: id, user_id: userId },
        { amount, description, category, date, is_sales_expense },
        { new: true, runValidators: true }
      ).populate('user_id', 'name shop_name');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found',
          error: 'Expense does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: expense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating expense',
        error: error.message
      });
    }
  },

  // Delete expense record
  deleteExpense: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const expense = await Expense.findOneAndDelete({ _id: id, user_id: userId });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found',
          error: 'Expense does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Expense deleted successfully',
        data: { deletedExpenseId: id }
      });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting expense',
        error: error.message
      });
    }
  },

  // Get expense analytics
  getExpenseAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      // Build date filter
      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.date = {};
        if (start_date) dateFilter.date.$gte = new Date(start_date);
        if (end_date) dateFilter.date.$lte = new Date(end_date);
      }

      // Get total expenses
      const totalExpenses = await Expense.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Get expenses by category
      const categoryBreakdown = await Expense.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]);

      // Get monthly trends (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const monthlyTrends = await Expense.aggregate([
        { $match: { user_id: userId, date: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Expense analytics retrieved successfully',
        data: {
          totalExpenses: totalExpenses[0]?.total || 0,
          categoryBreakdown,
          monthlyTrends,
          period: { start_date, end_date }
        }
      });
    } catch (error) {
      console.error('Expense analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expense analytics',
        error: error.message
      });
    }
  }
};

module.exports = expensesController;
