const Inventory = require('../models/Inventory');
const { validationResult } = require('express-validator');

/**
 * Inventory Controller - Inventory Management with CRUD Operations
 * Handles stock management, low stock alerts, and inventory analytics
 * Future: Integration with AI for demand forecasting and automated reordering
 */

const inventoryController = {
  // Get all inventory items for authenticated user
  getAllInventory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, search, low_stock } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (search) {
        filter.item_name = new RegExp(search, 'i');
      }
      
      if (low_stock === 'true') {
        filter.$expr = { $lte: ['$stock_qty', '$min_stock_level'] };
      }

      const inventory = await Inventory.find(filter)
        .sort({ item_name: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await Inventory.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Inventory retrieved successfully',
        data: inventory,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory',
        error: error.message
      });
    }
  },

  // Get inventory item by ID
  getInventoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const item = await Inventory.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
          error: 'Item does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Inventory item retrieved successfully',
        data: item
      });
    } catch (error) {
      console.error('Get inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory item',
        error: error.message
      });
    }
  },

  // Create new inventory item
  createInventoryItem: async (req, res) => {
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
      const { item_name, stock_qty, price_per_unit, min_stock_level, category, description } = req.body;

      // Check if item already exists for this user
      const existingItem = await Inventory.findOne({ 
        user_id: userId, 
        item_name: { $regex: new RegExp(`^${item_name}$`, 'i') }
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: 'Item already exists',
          error: 'An item with this name already exists in your inventory'
        });
      }

      // Create new inventory item
      const item = new Inventory({
        user_id: userId,
        item_name,
        stock_qty,
        price_per_unit,
        min_stock_level: min_stock_level || 5,
        category: category || 'Other',
        description: description || ''
      });

      await item.save();
      await item.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: item
      });
    } catch (error) {
      console.error('Create inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating inventory item',
        error: error.message
      });
    }
  },

  // Update inventory item
  updateInventoryItem: async (req, res) => {
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
      const { item_name, stock_qty, price_per_unit, min_stock_level, category, description } = req.body;

      const item = await Inventory.findOneAndUpdate(
        { _id: id, user_id: userId },
        { item_name, stock_qty, price_per_unit, min_stock_level, category, description },
        { new: true, runValidators: true }
      ).populate('user_id', 'name shop_name');

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
          error: 'Item does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Inventory item updated successfully',
        data: item
      });
    } catch (error) {
      console.error('Update inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating inventory item',
        error: error.message
      });
    }
  },

  // Delete inventory item
  deleteInventoryItem: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const item = await Inventory.findOneAndDelete({ _id: id, user_id: userId });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
          error: 'Item does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Inventory item deleted successfully',
        data: { deletedItemId: id }
      });
    } catch (error) {
      console.error('Delete inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting inventory item',
        error: error.message
      });
    }
  },

  // Get low stock items
  getLowStockItems: async (req, res) => {
    try {
      const userId = req.user._id;
      const { threshold = 5 } = req.query;

      const lowStockItems = await Inventory.find({
        user_id: userId,
        stock_qty: { $lte: parseInt(threshold) }
      })
      .sort({ stock_qty: 1 })
      .populate('user_id', 'name shop_name');

      res.status(200).json({
        success: true,
        message: 'Low stock items retrieved successfully',
        data: lowStockItems,
        count: lowStockItems.length,
        threshold: parseInt(threshold)
      });
    } catch (error) {
      console.error('Get low stock items error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching low stock items',
        error: error.message
      });
    }
  },

  // Get inventory analytics
  getInventoryAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;

      // Get total inventory value
      const totalValue = await Inventory.aggregate([
        { $match: { user_id: userId } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$stock_qty', '$price_per_unit'] } } } }
      ]);

      // Get low stock count (comparing with min_stock_level)
      const lowStockCount = await Inventory.countDocuments({
        user_id: userId,
        $expr: { $lte: ['$stock_qty', '$min_stock_level'] }
      });

      // Get total items count
      const totalItems = await Inventory.countDocuments({ user_id: userId });

      // Get top items by value
      const topItems = await Inventory.find({ user_id: userId })
        .sort({ $expr: { $multiply: ['$stock_qty', '$price_per_unit'] } })
        .limit(5)
        .select('item_name stock_qty price_per_unit');

      res.status(200).json({
        success: true,
        message: 'Inventory analytics retrieved successfully',
        data: {
          totalValue: totalValue[0]?.total || 0,
          totalItems,
          lowStockCount,
          topItems
        }
      });
    } catch (error) {
      console.error('Inventory analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory analytics',
        error: error.message
      });
    }
  }
};

module.exports = inventoryController;
