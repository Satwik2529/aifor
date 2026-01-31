const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { validationResult } = require('express-validator');

/**
 * Customers Controller - Customer Management with CRUD Operations
 * Handles customer database management and analytics
 * Future: Integration with WhatsApp for customer communication and loyalty programs
 */

const customersController = {
  // Get all customers for authenticated user
  getAllCustomers: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, search } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (search) {
        filter.$or = [
          { name: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') }
        ];
      }

      const customers = await Customer.find(filter)
        .sort({ name: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await Customer.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Customers retrieved successfully',
        data: customers,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customers',
        error: error.message
      });
    }
  },

  // Get customer by ID
  getCustomerById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const customer = await Customer.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          error: 'Customer does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer retrieved successfully',
        data: customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer',
        error: error.message
      });
    }
  },

  // Create new customer
  createCustomer: async (req, res) => {
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
      const { name, phone, credit_balance } = req.body;

      // Check if customer already exists for this user
      const existingCustomer = await Customer.findOne({ 
        user_id: userId, 
        phone 
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Customer already exists',
          error: 'A customer with this phone number already exists'
        });
      }

      // Create new customer
      const customer = new Customer({
        user_id: userId,
        name,
        phone,
        credit_balance: credit_balance || 0
      });

      await customer.save();
      await customer.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating customer',
        error: error.message
      });
    }
  },

  // Update customer
  updateCustomer: async (req, res) => {
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
      const { name, phone, credit_balance } = req.body;

      const customer = await Customer.findOneAndUpdate(
        { _id: id, user_id: userId },
        { name, phone, credit_balance },
        { new: true, runValidators: true }
      ).populate('user_id', 'name shop_name');

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          error: 'Customer does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating customer',
        error: error.message
      });
    }
  },

  // Delete customer
  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const customer = await Customer.findOneAndDelete({ _id: id, user_id: userId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          error: 'Customer does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
        data: { deletedCustomerId: id }
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting customer',
        error: error.message
      });
    }
  },

  // Get customer analytics
  getCustomerAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      // Build date filter for sales
      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.date = {};
        if (start_date) dateFilter.date.$gte = new Date(start_date);
        if (end_date) dateFilter.date.$lte = new Date(end_date);
      }

      // Get total customers
      const totalCustomers = await Customer.countDocuments({ user_id: userId });

      // Get new customers in period
      const newCustomersFilter = { user_id: userId };
      if (start_date) {
        newCustomersFilter.createdAt = { $gte: new Date(start_date) };
      }
      const newCustomers = await Customer.countDocuments(newCustomersFilter);

      // Get customers with credit balance
      const customersWithCredit = await Customer.countDocuments({
        user_id: userId,
        credit_balance: { $gt: 0 }
      });

      // Get top customers by total sales (if we had customer tracking in sales)
      const topCustomers = await Customer.find({ user_id: userId })
        .sort({ credit_balance: -1 })
        .limit(5)
        .select('name phone credit_balance');

      res.status(200).json({
        success: true,
        message: 'Customer analytics retrieved successfully',
        data: {
          totalCustomers,
          newCustomers,
          customersWithCredit,
          topCustomers,
          period: { start_date, end_date }
        }
      });
    } catch (error) {
      console.error('Customer analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer analytics',
        error: error.message
      });
    }
  }
};

module.exports = customersController;
