const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

/**
 * Authentication Controller
 * Handles user registration, login, and authentication
 * Uses bcrypt for password hashing and JWT for token generation
 * Future: Integration with OAuth providers and password reset
 */

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ VALIDATION ERRORS:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, phone, password, shop_name, language, upi_id, email, locality, latitude, longitude, address, role, wholesalerProfile } = req.body;

      console.log('📝 REGISTRATION REQUEST:', {
        name,
        phone,
        role: role || 'retailer',
        hasWholesalerProfile: !!wholesalerProfile,
        hasShopName: !!shop_name,
        hasUpiId: !!upi_id
      });

      // Check if user already exists (phone in both collections)
      const existingUser = await User.findOne({ phone });
      const existingCustomer = await CustomerUser.findOne({ phone });

      if (existingUser || existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered',
          error: 'Phone number already in use'
        });
      }

      // Check email if provided (case-insensitive, both collections)
      if (email) {
        const existingUserEmail = await User.findOne({ email: email.toLowerCase() });
        const existingCustomerEmail = await CustomerUser.findOne({ email: email.toLowerCase() });

        if (existingUserEmail || existingCustomerEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email already registered',
            error: 'Email already in use'
          });
        }
      }

      // Determine user role (default to retailer if not specified)
      const userRole = role || 'retailer';

      // Create new user with location data
      const userData = {
        name,
        phone,
        password,
        email: email ? email.toLowerCase() : undefined,
        role: userRole,
        locality: locality || null,
        latitude: latitude || null,
        longitude: longitude || null,
        address: address || {}
      };

      // Add role-specific fields
      if (userRole === 'retailer') {
        userData.shop_name = shop_name;
        userData.language = language;
        userData.upi_id = upi_id;
      } else if (userRole === 'wholesaler') {
        userData.wholesalerProfile = wholesalerProfile;
        // Set location in GeoJSON format for geospatial queries
        if (latitude && longitude) {
          userData.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
          };
        }
      }

      const user = new User(userData);
      await user.save();

      console.log('✅ USER REGISTERED:', {
        userId: user._id,
        role: user.role,
        userRole: userRole,
        name: user.name,
        hasWholesalerProfile: !!user.wholesalerProfile
      });

      // Generate JWT token with correct userType
      const userType = userRole === 'wholesaler' ? 'wholesaler' : 'retailer';
      const token = generateToken(user._id, userType);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.profile,
          token,
          userType
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  // Login user
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

      const { phone, password } = req.body;

      // Find user by phone
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: 'Phone number or password incorrect'
        });
      }

      // Ensure user has a role (migration for old users)
      if (!user.role) {
        user.role = 'retailer';
        await user.save();
      }

      // Check if account is locked
      if (user.isLocked()) {
        const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
          error: 'Account locked'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();

        const attemptsRemaining = Math.max(0, 5 - (user.loginAttempts + 1));

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          error: 'Phone number or password incorrect',
          attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : undefined,
          ...(attemptsRemaining === 0 && { lockMessage: 'Account will be locked for 30 minutes' })
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0 || user.lockUntil) {
        await user.resetLoginAttempts();
      }

      // Determine userType based on role
      const userType = user.role === 'wholesaler' ? 'wholesaler' : 'retailer';

      console.log('🔐 LOGIN SUCCESS:', {
        userId: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        userType: userType,
        hasWholesalerProfile: !!user.wholesalerProfile
      });

      // Generate JWT token with correct userType
      const token = generateToken(user._id, userType);

      const responseData = {
        success: true,
        message: 'Login successful',
        data: {
          user: user.profile,
          token,
          userType
        }
      };

      console.log('📤 Sending response with userType:', userType);

      res.status(200).json(responseData);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: {
          user: req.user.profile
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

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.user._id;
      const updateData = {};

      // Common fields
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.phone) updateData.phone = req.body.phone;
      if (req.body.language) updateData.language = req.body.language;
      if (req.body.upi_id !== undefined) updateData.upi_id = req.body.upi_id;
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

      // Retailer-specific fields
      if (req.body.shop_name !== undefined) updateData.shop_name = req.body.shop_name;
      if (req.body.shop_description !== undefined) updateData.shop_description = req.body.shop_description;
      if (req.body.business_type) updateData.business_type = req.body.business_type;
      if (req.body.gst_number !== undefined) updateData.gst_number = req.body.gst_number;

      // Wholesaler-specific fields
      if (req.body.wholesalerProfile) {
        updateData.wholesalerProfile = {};
        if (req.body.wholesalerProfile.businessName !== undefined) {
          updateData.wholesalerProfile.businessName = req.body.wholesalerProfile.businessName;
        }
        if (req.body.wholesalerProfile.businessType !== undefined) {
          updateData.wholesalerProfile.businessType = req.body.wholesalerProfile.businessType;
        }
        if (req.body.wholesalerProfile.gstNumber !== undefined) {
          updateData.wholesalerProfile.gstNumber = req.body.wholesalerProfile.gstNumber;
        }
        if (req.body.wholesalerProfile.minOrderValue !== undefined) {
          updateData.wholesalerProfile.minOrderValue = req.body.wholesalerProfile.minOrderValue;
        }
        if (req.body.wholesalerProfile.deliveryRadiusKm !== undefined) {
          updateData.wholesalerProfile.deliveryRadiusKm = req.body.wholesalerProfile.deliveryRadiusKm;
        }
        if (req.body.wholesalerProfile.avgDeliveryTime !== undefined) {
          updateData.wholesalerProfile.avgDeliveryTime = req.body.wholesalerProfile.avgDeliveryTime;
        }
        if (req.body.wholesalerProfile.paymentModes !== undefined) {
          updateData.wholesalerProfile.paymentModes = req.body.wholesalerProfile.paymentModes;
        }
        if (req.body.wholesalerProfile.description !== undefined) {
          updateData.wholesalerProfile.description = req.body.wholesalerProfile.description;
        }
      }

      console.log('✅ Parsed update data:', updateData);

      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        console.error('❌ User not found');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('✅ Profile updated successfully');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            shop_name: user.shop_name,
            shop_description: user.shop_description,
            business_type: user.business_type,
            gst_number: user.gst_number,
            address: user.address,
            avatar: user.avatar,
            language: user.language,
            upi_id: user.upi_id,
            // Wholesaler profile
            wholesalerProfile: user.wholesalerProfile,
            // Location fields
            locality: user.locality,
            latitude: user.latitude,
            longitude: user.longitude,
            has_gps: !!(user.latitude && user.longitude),
            updatedAt: user.updatedAt
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
  },

  // Update user location
  updateLocation: async (req, res) => {
    try {
      const userId = req.user._id;
      const { latitude, longitude, accuracy, locality } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      const updateData = {
        latitude,
        longitude,
        locality: locality || null
      };

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('📍 Location updated for user:', user.email || user.phone);

      res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        data: {
          latitude: user.latitude,
          longitude: user.longitude,
          locality: user.locality,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Location update error:', error);
      res.status(500).json({
        success: false,
        message: 'Location update failed',
        error: error.message
      });
    }
  }
};

module.exports = authController;
