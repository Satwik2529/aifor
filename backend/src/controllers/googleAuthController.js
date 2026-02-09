const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');
const jwt = require('jsonwebtoken');

/**
 * Google OAuth Controller
 * Handles Google sign-in for both retailers and customers
 */

// Generate JWT token
const generateToken = (userId, userType = 'retailer') => {
  return jwt.sign({ userId, userType }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Google Login/Register
const googleLogin = async (req, res) => {
  try {
    const { email, name, google_id, avatar_url, intended_user_type } = req.body;

    console.log('🔐 Google login attempt:', { email, name, google_id, intended_user_type });

    if (!email || !google_id) {
      return res.status(400).json({
        success: false,
        message: 'Email and Google ID are required'
      });
    }

    // Try to find existing user by email or google_id (check both retailers and customers)
    let user = await User.findOne({ $or: [{ email }, { google_id }] });
    let userType = 'retailer';

    if (!user) {
      // Check if customer exists
      user = await CustomerUser.findOne({ $or: [{ email }, { google_id }] });
      userType = 'customer';
    }

    if (user) {
      // User exists - update Google info if not already set
      if (!user.google_id) {
        user.google_id = google_id;
        user.avatar_url = avatar_url || user.avatar_url;
        await user.save();
        console.log('✅ Updated existing user with Google info');
      }

      // Generate token
      const token = generateToken(user._id, userType);

      console.log('✅ Google login successful for existing user:', user.email, 'as', userType);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            shop_name: user.shop_name || user.business_name,
            avatar_url: user.avatar_url || user.avatar,
            userType: userType
          },
          token
        }
      });
    }

    // New user - check one more time to prevent race condition
    const existingRetailer = await User.findOne({ email });
    const existingCustomer = await CustomerUser.findOne({ email });
    
    if (existingRetailer || existingCustomer) {
      console.log('⚠️  User already exists (race condition detected), logging in instead');
      const existingUser = existingRetailer || existingCustomer;
      const existingUserType = existingRetailer ? 'retailer' : 'customer';
      const token = generateToken(existingUser._id, existingUserType);
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            shop_name: existingUser.shop_name,
            avatar_url: existingUser.avatar_url || existingUser.avatar,
            userType: existingUserType
          },
          token
        }
      });
    }

    // New user - create based on intended_user_type
    if (intended_user_type === 'customer') {
        // Create as customer
        const newCustomer = new CustomerUser({
          name: name || email.split('@')[0],
          email: email,
          password: google_id, // Use Google ID as password
          // Don't set phone - let it be undefined for Google users
          google_id: google_id,
          avatar: avatar_url || ''
        });

        await newCustomer.save();

        // Generate token
        const token = generateToken(newCustomer._id, 'customer');

        console.log('✅ New customer created via Google:', newCustomer.email);

        return res.status(201).json({
          success: true,
          message: 'Customer account created successfully',
          data: {
            user: {
              _id: newCustomer._id,
              name: newCustomer.name,
              email: newCustomer.email,
              phone: newCustomer.phone,
              avatar_url: newCustomer.avatar,
              userType: 'customer'
            },
            token
          }
        });
      } else {
        // Create as retailer (default)
        const newUser = new User({
          name: name || email.split('@')[0],
          email: email,
          // Don't set phone - let it be undefined (sparse index allows multiple undefined)
          password: google_id, // Use Google ID as password
          shop_name: `${name}'s Shop` || 'My Shop',
          google_id: google_id,
          avatar_url: avatar_url,
          language: 'English'
        });

        await newUser.save();

        // Generate token
        const token = generateToken(newUser._id, 'retailer');

        console.log('✅ New retailer created via Google:', newUser.email);

        return res.status(201).json({
          success: true,
          message: 'Retailer account created successfully',
          data: {
            user: {
              _id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              phone: newUser.phone,
              shop_name: newUser.shop_name,
              avatar_url: newUser.avatar_url,
              userType: 'retailer'
            },
            token
          }
        });
      }
  } catch (error) {
    console.error('❌ Google login error:', error);
    
    // Handle duplicate key errors (race condition)
    if (error.code === 11000) {
      console.log('⚠️  Duplicate key error, attempting to login existing user...');
      
      try {
        // Find the existing user
        let existingUser = await User.findOne({ $or: [{ email }, { google_id }] });
        let userType = 'retailer';
        
        if (!existingUser) {
          existingUser = await CustomerUser.findOne({ $or: [{ email }, { google_id }] });
          userType = 'customer';
        }
        
        if (existingUser) {
          const token = generateToken(existingUser._id, userType);
          
          return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
              user: {
                _id: existingUser._id,
                name: existingUser.name,
                email: existingUser.email,
                phone: existingUser.phone,
                shop_name: existingUser.shop_name,
                avatar_url: existingUser.avatar_url || existingUser.avatar,
                userType: userType
              },
              token
            }
          });
        }
      } catch (retryError) {
        console.error('❌ Retry failed:', retryError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Google login failed',
      error: error.message
    });
  }
};

module.exports = {
  googleLogin
};
