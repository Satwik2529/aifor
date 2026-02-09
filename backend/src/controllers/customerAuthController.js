const CustomerUser = require('../models/CustomerUser');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

/**
 * Customer Authentication Controller
 * Handles customer user registration, login, and profile management
 * Separate from retailer authentication
 */

const customerAuthController = {
  // Register new customer
  register: async (req, res) => {
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

      const { name, email, password, phone, address, locality, latitude, longitude } = req.body;

      // Check if customer already exists with email (case-insensitive, both collections)
      const normalizedEmail = email.toLowerCase();
      const existingCustomer = await CustomerUser.findOne({ email: normalizedEmail });
      const existingRetailer = await User.findOne({ email: normalizedEmail });
      
      if (existingCustomer || existingRetailer) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
          error: 'Email already in use'
        });
      }
      
      // Check phone if provided (both collections)
      if (phone) {
        const existingCustomerPhone = await CustomerUser.findOne({ phone });
        const existingRetailerPhone = await User.findOne({ phone });
        
        if (existingCustomerPhone || existingRetailerPhone) {
          return res.status(400).json({
            success: false,
            message: 'Phone number already registered',
            error: 'Phone number already in use'
          });
        }
      }

      // Create new customer with location data
      const customer = new CustomerUser({
        name,
        email: normalizedEmail,
        password,
        phone,
        address: address || {},
        locality: locality || null,
        latitude: latitude || null,
        longitude: longitude || null
      });

      await customer.save();

      // Generate JWT token with userType
      const token = generateToken(customer._id, 'customer');

      res.status(201).json({
        success: true,
        message: 'Customer registered successfully',
        data: {
          customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            avatar: customer.avatar,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          },
          token,
          userType: 'customer'
        }
      });
    } catch (error) {
      console.error('Customer registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  // Login customer
  login: async (req, res) => {
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

      const { email, password } = req.body;

      // Find customer by email (case-insensitive)
      const normalizedEmail = email.toLowerCase();
      const customer = await CustomerUser.findOne({ email: normalizedEmail });
      
      if (!customer) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: 'Email or password incorrect'
        });
      }

      // Check if account is locked
      if (customer.isLocked()) {
        const lockTimeRemaining = Math.ceil((customer.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
          error: 'Account locked'
        });
      }

      // Check password
      const isPasswordValid = await customer.comparePassword(password);
      if (!isPasswordValid) {
        // Increment login attempts
        await customer.incLoginAttempts();
        
        const attemptsRemaining = Math.max(0, 5 - (customer.loginAttempts + 1));
        
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: 'Email or password incorrect',
          attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : undefined,
          ...(attemptsRemaining === 0 && { lockMessage: 'Account will be locked for 30 minutes' })
        });
      }

      // Reset login attempts on successful login
      if (customer.loginAttempts > 0 || customer.lockUntil) {
        await customer.resetLoginAttempts();
      }

      // Generate JWT token with userType
      const token = generateToken(customer._id, 'customer');

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            avatar: customer.avatar,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          },
          token,
          userType: 'customer'
        }
      });
    } catch (error) {
      console.error('Customer login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  },

  // Get current customer profile
  getProfile: async (req, res) => {
    try {
      const customer = await CustomerUser.findById(req.user._id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Customer profile retrieved successfully',
        data: {
          customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            avatar: customer.avatar,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          },
          userType: 'customer'
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        error: error.message
      });
    }
  },

  // Update customer profile
  updateProfile: async (req, res) => {
    try {
      console.log('📝 ============ UPDATE CUSTOMER PROFILE ============');
      console.log('Customer ID:', req.user._id);
      console.log('Update data:', req.body);

      const customerId = req.user._id;
      const updateData = {};

      // Common fields
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.phone) updateData.phone = req.body.phone;
      if (req.body.avatar !== undefined) updateData.avatar = req.body.avatar;

      // Location fields (GPS)
      if (req.body.locality !== undefined) updateData.locality = req.body.locality;
      if (req.body.latitude !== undefined) updateData.latitude = req.body.latitude;
      if (req.body.longitude !== undefined) updateData.longitude = req.body.longitude;

      // Address fields
      if (req.body.address) {
        updateData.address = {
          street: req.body.address.street || '',
          city: req.body.address.city || '',
          state: req.body.address.state || '',
          pincode: req.body.address.pincode || ''
        };
      }

      console.log('✅ Parsed update data:', updateData);

      // Update customer
      const customer = await CustomerUser.findByIdAndUpdate(
        customerId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!customer) {
        console.error('❌ Customer not found');
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      console.log('✅ Customer profile updated successfully');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            avatar: customer.avatar,
            // Location fields
            locality: customer.locality,
            latitude: customer.latitude,
            longitude: customer.longitude,
            has_gps: !!(customer.latitude && customer.longitude),
            updatedAt: customer.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('❌ Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Profile update failed',
        error: error.message
      });
    }
  }
};

module.exports = customerAuthController;
