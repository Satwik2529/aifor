const Inventory = require('../models/Inventory');
const { validationResult } = require('express-validator');
const { normalize, isValidQuantity, normalizeQuantity } = require('../utils/quantityHelper');

/**
 * Inventory Controller - Inventory Management with CRUD Operations
 * Handles stock management, low stock alerts, and inventory analytics
 * Supports fractional quantities for retail items (kg, litre, piece)
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
      console.log('=== Create Inventory Debug ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { 
        item_name, 
        stock_qty, 
        cost_price, 
        selling_price, 
        price_per_unit, // For backward compatibility
        min_stock_level, 
        category, 
        description,
        unit // NEW: Support for kg, litre, piece
      } = req.body;

      console.log('Extracted values:');
      console.log('  item_name:', item_name);
      console.log('  stock_qty:', stock_qty, '(type:', typeof stock_qty, ')');
      console.log('  cost_price:', cost_price);
      console.log('  selling_price:', selling_price);
      console.log('  unit:', unit);

      // Validate quantity
      if (stock_qty === undefined || stock_qty === null || stock_qty === '') {
        console.log('❌ Stock quantity is missing or empty');
        return res.status(400).json({
          success: false,
          message: 'Stock quantity is required',
          error: 'Please provide a valid stock quantity'
        });
      }

      const parsedQty = parseFloat(stock_qty);
      console.log('  parsed stock_qty:', parsedQty, '(type:', typeof parsedQty, ')');
      
      if (!isValidQuantity(parsedQty)) {
        console.log('❌ Invalid quantity:', parsedQty);
        return res.status(400).json({
          success: false,
          message: 'Invalid stock quantity',
          error: `Stock quantity must be a positive number greater than 0. Received: ${stock_qty} (parsed as: ${parsedQty})`
        });
      }

      // Normalize quantity to prevent floating-point errors
      const normalizedQty = normalize(parsedQty);
      console.log('  normalized stock_qty:', normalizedQty);

      // Handle backward compatibility - if only price_per_unit is provided
      let finalCostPrice = cost_price;
      let finalSellingPrice = selling_price;

      console.log('Price validation:');
      console.log('  cost_price:', cost_price, '(type:', typeof cost_price, ')');
      console.log('  selling_price:', selling_price, '(type:', typeof selling_price, ')');
      console.log('  price_per_unit:', price_per_unit, '(type:', typeof price_per_unit, ')');

      if (!cost_price && !selling_price && price_per_unit) {
        console.log('  Using backward compatibility mode');
        // Backward compatibility: assume price_per_unit is selling price
        // Set cost price to 80% of selling price (20% profit margin)
        finalSellingPrice = price_per_unit;
        finalCostPrice = price_per_unit * 0.8;
      } else if (!cost_price || !selling_price) {
        console.log('❌ Missing cost_price or selling_price');
        return res.status(400).json({
          success: false,
          message: 'Both cost_price and selling_price are required',
          error: 'Please provide both cost price and selling price for the item'
        });
      }

      console.log('Final prices:');
      console.log('  finalCostPrice:', finalCostPrice);
      console.log('  finalSellingPrice:', finalSellingPrice);

      // Validate that selling price is higher than cost price
      if (finalSellingPrice <= finalCostPrice) {
        console.log('❌ Selling price not higher than cost price');
        return res.status(400).json({
          success: false,
          message: 'Selling price must be higher than cost price',
          error: 'Selling price should be greater than cost price to ensure profit'
        });
      }

      console.log('✅ Price validation passed');

      // Check if item already exists for this user
      console.log('Checking for existing item...');
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
        stock_qty: normalizedQty,
        cost_price: finalCostPrice,
        selling_price: finalSellingPrice,
        price_per_unit: finalSellingPrice, // For backward compatibility
        min_stock_level: min_stock_level || 5,
        category: category || 'Other',
        description: description || '',
        unit: unit || 'piece' // Default to piece for backward compatibility
      });

      await item.save();
      await item.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: item,
        profit_info: {
          profit_per_unit: finalSellingPrice - finalCostPrice,
          profit_margin: ((finalSellingPrice - finalCostPrice) / finalSellingPrice * 100).toFixed(2) + '%'
        }
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
      const { 
        item_name, 
        stock_qty, 
        cost_price, 
        selling_price, 
        price_per_unit, // For backward compatibility
        min_stock_level, 
        category, 
        description,
        unit // NEW: Support for kg, litre, piece
      } = req.body;

      // Validate quantity if provided
      if (stock_qty !== undefined && stock_qty !== null && stock_qty !== '') {
        const parsedQty = parseFloat(stock_qty);
        
        if (!isValidQuantity(parsedQty)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid stock quantity',
            error: 'Stock quantity must be a positive number greater than 0'
          });
        }
      }

      // Handle backward compatibility and validation
      let updateData = { item_name, min_stock_level, category, description, unit };
      
      // Normalize stock quantity if provided
      if (stock_qty !== undefined && stock_qty !== null && stock_qty !== '') {
        const parsedQty = parseFloat(stock_qty);
        updateData.stock_qty = normalize(parsedQty);
      }

      if (cost_price !== undefined || selling_price !== undefined) {
        // New pricing structure
        if (cost_price !== undefined) updateData.cost_price = cost_price;
        if (selling_price !== undefined) updateData.selling_price = selling_price;
        
        // Validate that selling price is higher than cost price
        const currentItem = await Inventory.findOne({ _id: id, user_id: userId });
        const finalCostPrice = cost_price !== undefined ? cost_price : currentItem.cost_price;
        const finalSellingPrice = selling_price !== undefined ? selling_price : currentItem.selling_price;
        
        if (finalSellingPrice <= finalCostPrice) {
          return res.status(400).json({
            success: false,
            message: 'Selling price must be higher than cost price',
            error: 'Selling price should be greater than cost price to ensure profit'
          });
        }
        
        updateData.price_per_unit = finalSellingPrice; // For backward compatibility
      } else if (price_per_unit !== undefined) {
        // Backward compatibility
        updateData.selling_price = price_per_unit;
        updateData.price_per_unit = price_per_unit;
      }

      const item = await Inventory.findOneAndUpdate(
        { _id: id, user_id: userId },
        updateData,
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
        data: item,
        profit_info: {
          profit_per_unit: item.selling_price - item.cost_price,
          profit_margin: ((item.selling_price - item.cost_price) / item.selling_price * 100).toFixed(2) + '%'
        }
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
