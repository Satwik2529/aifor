const AiInsight = require('../models/AiInsight');
const { validationResult } = require('express-validator');
const geminiService = require('../services/geminiService');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');

/**
 * AI Insights Controller - AI-generated business insights using Google Gemini
 * Handles AI-powered demand forecasting, revenue optimization, and expense forecasting
 */

const aiInsightsController = {
  // Get all AI insights for authenticated user
  getAllInsights: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, type } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (type) {
        filter['insights_data.type'] = type;
      }

      const insights = await AiInsight.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await AiInsight.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'AI insights retrieved successfully',
        data: insights,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get AI insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching AI insights',
        error: error.message
      });
    }
  },

  // Get AI insight by ID
  getInsightById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const insight = await AiInsight.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!insight) {
        return res.status(404).json({
          success: false,
          message: 'AI insight not found',
          error: 'Insight does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'AI insight retrieved successfully',
        data: insight
      });
    } catch (error) {
      console.error('Get AI insight error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching AI insight',
        error: error.message
      });
    }
  },

  // Create new AI insight
  createInsight: async (req, res) => {
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
      const { summary_text, insights_data } = req.body;

      // Create new AI insight
      const insight = new AiInsight({
        user_id: userId,
        summary_text,
        insights_data
      });

      await insight.save();
      await insight.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'AI insight created successfully',
        data: insight
      });
    } catch (error) {
      console.error('Create AI insight error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating AI insight',
        error: error.message
      });
    }
  },

  // Update AI insight
  updateInsight: async (req, res) => {
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
      const { summary_text, insights_data } = req.body;

      const insight = await AiInsight.findOneAndUpdate(
        { _id: id, user_id: userId },
        { summary_text, insights_data },
        { new: true, runValidators: true }
      ).populate('user_id', 'name shop_name');

      if (!insight) {
        return res.status(404).json({
          success: false,
          message: 'AI insight not found',
          error: 'Insight does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'AI insight updated successfully',
        data: insight
      });
    } catch (error) {
      console.error('Update AI insight error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating AI insight',
        error: error.message
      });
    }
  },

  // Delete AI insight
  deleteInsight: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const insight = await AiInsight.findOneAndDelete({ _id: id, user_id: userId });

      if (!insight) {
        return res.status(404).json({
          success: false,
          message: 'AI insight not found',
          error: 'Insight does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'AI insight deleted successfully',
        data: { deletedInsightId: id }
      });
    } catch (error) {
      console.error('Delete AI insight error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting AI insight',
        error: error.message
      });
    }
  },

  // Get latest AI insights (for dashboard)
  getLatestInsights: async (req, res) => {
    try {
      const userId = req.user._id;
      const { limit = 5 } = req.query;

      const insights = await AiInsight.find({ user_id: userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('user_id', 'name shop_name');

      res.status(200).json({
        success: true,
        message: 'Latest AI insights retrieved successfully',
        data: insights,
        count: insights.length
      });
    } catch (error) {
      console.error('Get latest insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching latest insights',
        error: error.message
      });
    }
  },

  // ==================== GEMINI AI-POWERED FEATURES ====================

  /**
   * Demand Forecasting - Analyze sales trends and predict stock requirements
   */
  generateDemandForecast: async (req, res) => {
    try {
      const userId = req.user._id;
      const { days = 30 } = req.query;

      console.log('🤖 Generating demand forecast for user:', userId.toString());

      // Get recent sales data
      const salesStartDate = new Date();
      salesStartDate.setDate(salesStartDate.getDate() - days);

      const salesData = await Sale.find({
        user_id: userId,
        createdAt: { $gte: salesStartDate }
      })
        .select('items total_amount createdAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // Get current inventory
      const inventoryData = await Inventory.find({ user_id: userId })
        .select('item_name stock_qty price_per_unit min_stock_level category')
        .lean();

      if (salesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No sales data available for analysis. Please add some sales first.'
        });
      }

      // Generate AI analysis using Gemini
      const aiAnalysis = await geminiService.analyzeDemandForecast(salesData, inventoryData);

      res.status(200).json({
        success: true,
        message: 'Demand forecast generated successfully',
        data: {
          analysis: aiAnalysis,
          metadata: {
            salesAnalyzed: salesData.length,
            inventoryItems: inventoryData.length,
            periodDays: days,
            generatedAt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Demand forecast error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating demand forecast',
        error: error.message
      });
    }
  },

  /**
   * Revenue Optimization - Analyze pricing and suggest profit maximization strategies
   */
  generateRevenueOptimization: async (req, res) => {
    try {
      const userId = req.user._id;

      console.log('🤖 Generating revenue optimization for user:', userId.toString());

      // Get recent sales (last 60 days for better price analysis)
      const salesStartDate = new Date();
      salesStartDate.setDate(salesStartDate.getDate() - 60);

      const salesData = await Sale.find({
        user_id: userId,
        createdAt: { $gte: salesStartDate }
      })
        .select('items total_amount profit_margin createdAt')
        .sort({ createdAt: -1 })
        .limit(150)
        .lean();

      // Get inventory with pricing
      const inventoryData = await Inventory.find({ user_id: userId })
        .select('item_name stock_qty price_per_unit category')
        .lean();

      // Calculate profit metrics
      const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
      const avgOrderValue = totalRevenue / (salesData.length || 1);
      const profitData = {
        totalRevenue,
        avgOrderValue,
        salesCount: salesData.length,
        periodDays: 60
      };

      if (salesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No sales data available for analysis.'
        });
      }

      // Generate AI analysis using Gemini
      const aiAnalysis = await geminiService.analyzeRevenueOptimization(salesData, inventoryData, profitData);

      res.status(200).json({
        success: true,
        message: 'Revenue optimization strategies generated successfully',
        data: {
          analysis: aiAnalysis,
          metadata: {
            salesAnalyzed: salesData.length,
            inventoryItems: inventoryData.length,
            totalRevenue,
            avgOrderValue: Math.round(avgOrderValue),
            generatedAt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Revenue optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating revenue optimization',
        error: error.message
      });
    }
  },

  /**
   * Expense Forecasting - Predict future expenses with seasonal considerations
   */
  generateExpenseForecast: async (req, res) => {
    try {
      const userId = req.user._id;

      console.log('🤖 Generating expense forecast for user:', userId.toString());

      // Get last 90 days of expenses
      const expensesStartDate = new Date();
      expensesStartDate.setDate(expensesStartDate.getDate() - 90);

      const expensesData = await Expense.find({
        user_id: userId,
        createdAt: { $gte: expensesStartDate }
      })
        .select('amount description category is_sales_expense createdAt')
        .sort({ createdAt: -1 })
        .lean();

      if (expensesData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No expense data available for analysis.'
        });
      }

      // Determine current season in India
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const currentMonth = now.toLocaleString('en-US', { month: 'long' });
      
      let currentSeason = '';
      if (month >= 3 && month <= 6) {
        currentSeason = 'Summer (March-June) - High AC costs, pre-monsoon preparation';
      } else if (month >= 7 && month <= 9) {
        currentSeason = 'Monsoon (July-September) - Logistics challenges, festival preparations';
      } else if (month >= 10 && month <= 11) {
        currentSeason = 'Festival Season (October-November) - Diwali, increased operational costs';
      } else {
        currentSeason = 'Winter (December-February) - Mild weather, post-festival period';
      }

      // Generate AI analysis using Gemini
      const aiAnalysis = await geminiService.analyzeExpenseForecast(expensesData, currentMonth, currentSeason);

      // Calculate summary stats
      const totalExpenses = expensesData.reduce((sum, exp) => sum + exp.amount, 0);
      const salesExpenses = expensesData.filter(e => e.is_sales_expense).reduce((sum, exp) => sum + exp.amount, 0);
      const operatingExpenses = totalExpenses - salesExpenses;

      res.status(200).json({
        success: true,
        message: 'Expense forecast generated successfully',
        data: {
          analysis: aiAnalysis,
          metadata: {
            expensesAnalyzed: expensesData.length,
            totalExpenses,
            salesExpenses,
            operatingExpenses,
            currentMonth,
            currentSeason,
            periodDays: 90,
            generatedAt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Expense forecast error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating expense forecast',
        error: error.message
      });
    }
  },

  /**
   * General AI Chat for business questions
   */
  chatWithAI: async (req, res) => {
    try {
      const userId = req.user._id;
      const { message, context } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      console.log('🤖 AI Chat request from user:', userId.toString());

      // Generate AI response
      const aiResponse = await geminiService.chat(message, context || {});

      res.status(200).json({
        success: true,
        message: 'AI response generated successfully',
        data: {
          response: aiResponse,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing AI chat',
        error: error.message
      });
    }
  }
};

module.exports = aiInsightsController;
