const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const { validationResult } = require('express-validator');

/**
 * Sales Controller - Sales Management with CRUD Operations
 * Handles sales transaction recording and analytics
 * Future: Integration with AI for sales insights and predictions
 */

const salesController = {
  // Get all sales for authenticated user
  getAllSales: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, payment_method, start_date, end_date } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (payment_method) {
        filter.payment_method = payment_method;
      }
      
      if (start_date || end_date) {
        filter.date = {};
        if (start_date) filter.date.$gte = new Date(start_date);
        if (end_date) filter.date.$lte = new Date(end_date);
      }

      const sales = await Sale.find(filter)
        .sort({ date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await Sale.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Sales retrieved successfully',
        data: sales,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sales',
        error: error.message
      });
    }
  },

  // Get sales by ID
  getSalesById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const sale = await Sale.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found',
          error: 'Sale does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Sale retrieved successfully',
        data: sale
      });
    } catch (error) {
      console.error('Get sale error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sale',
        error: error.message
      });
    }
  },

  // Create new sales record
  createSales: async (req, res) => {
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
      const { items, payment_method, date, customer_name, customer_phone } = req.body;

      // Validate and prepare items with cost prices from inventory
      const saleItems = [];
      for (const item of items) {
        // Find inventory item
        const inventoryItem = await Inventory.findOne({
          user_id: userId,
          item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') }
        });

        if (!inventoryItem) {
          return res.status(404).json({
            success: false,
            message: `Item '${item.item_name}' not found in inventory`,
            error: 'Please add this item to inventory first'
          });
        }

        // Check if sufficient stock available
        if (inventoryItem.stock_qty < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for '${item.item_name}'`,
            error: `Only ${inventoryItem.stock_qty} units available, but ${item.quantity} requested`
          });
        }

        // Add cost price from inventory for COGS calculation
        saleItems.push({
          item_name: item.item_name,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit, // Selling price
          cost_per_unit: inventoryItem.price_per_unit // Cost price from inventory
        });
      }

      // Create new sale
      const sale = new Sale({
        user_id: userId,
        items: saleItems,
        payment_method,
        date: date || new Date(),
        customer_name: customer_name || 'Walk-in Customer',
        customer_phone: customer_phone || ''
      });

      await sale.save();

      // Deduct inventory quantities
      for (const item of saleItems) {
        await Inventory.findOneAndUpdate(
          {
            user_id: userId,
            item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') }
          },
          {
            $inc: { stock_qty: -item.quantity }
          }
        );
      }

      await sale.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Sale created successfully and inventory updated',
        data: sale
      });
    } catch (error) {
      console.error('Create sale error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating sale',
        error: error.message
      });
    }
  },

  // Update sales record
  updateSales: async (req, res) => {
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
      const { items, payment_method, date, customer_name, customer_phone } = req.body;

      // Find the sale first
      const sale = await Sale.findOne({ _id: id, user_id: userId });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found',
          error: 'Sale does not exist or does not belong to you'
        });
      }

      // Update fields
      if (items) sale.items = items;
      if (payment_method) sale.payment_method = payment_method;
      if (date) sale.date = date;
      if (customer_name !== undefined) sale.customer_name = customer_name;
      if (customer_phone !== undefined) sale.customer_phone = customer_phone;

      // Save to trigger pre-save middleware that recalculates totals
      await sale.save();
      
      // Populate user details
      await sale.populate('user_id', 'name shop_name');

      res.status(200).json({
        success: true,
        message: 'Sale updated successfully',
        data: sale
      });
    } catch (error) {
      console.error('Update sale error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating sale',
        error: error.message
      });
    }
  },

  // Delete sales record
  deleteSales: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const sale = await Sale.findOneAndDelete({ _id: id, user_id: userId });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found',
          error: 'Sale does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Sale deleted successfully',
        data: { deletedSaleId: id }
      });
    } catch (error) {
      console.error('Delete sale error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting sale',
        error: error.message
      });
    }
  },

  // Get sales analytics
  getSalesAnalytics: async (req, res) => {
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

      // Get total revenue
      const totalRevenue = await Sale.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);

      // Get sales by payment method
      const salesByPayment = await Sale.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$payment_method', total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
      ]);

      // Get daily sales trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailySales = await Sale.aggregate([
        { $match: { user_id: userId, date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$total_amount' } } },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Sales analytics retrieved successfully',
        data: {
          totalRevenue: totalRevenue[0]?.total || 0,
          salesByPayment,
          dailySales,
          period: { start_date, end_date }
        }
      });
    } catch (error) {
      console.error('Sales analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sales analytics',
        error: error.message
      });
    }
  },

  // Get today's sales summary
  getTodaysSales: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Get today's date range (start of day to end of day)
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Get today's sales
      const todaysSales = await Sale.find({
        user_id: userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      // Calculate totals
      const totalRevenue = todaysSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const totalCOGS = todaysSales.reduce((sum, sale) => sum + (sale.total_cogs || 0), 0);
      const grossProfit = totalRevenue - totalCOGS;
      const salesCount = todaysSales.length;
      const totalItems = todaysSales.reduce((sum, sale) => sum + sale.items.length, 0);

      res.status(200).json({
        success: true,
        message: 'Today\'s sales retrieved successfully',
        data: {
          totalRevenue,
          totalCOGS,
          grossProfit,
          salesCount,
          totalItems,
          sales: todaysSales
        }
      });
    } catch (error) {
      console.error('Get today\'s sales error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching today\'s sales',
        error: error.message
      });
    }
  }
};

module.exports = salesController;
