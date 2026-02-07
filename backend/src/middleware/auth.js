const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT tokens
 * Used for securing API endpoints and user identification
 * Includes role-based access control
 */

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Try to find user based on userType in token
    let user;
    let userType = decoded.userType || 'retailer'; // Default to retailer for backward compatibility
    
    if (userType === 'customer') {
      user = await CustomerUser.findById(decoded.userId).select('-password');
    } else {
      user = await User.findById(decoded.userId).select('-password');
    }
    
    // If not found with specified type, try the other collection
    if (!user) {
      if (userType === 'customer') {
        user = await User.findById(decoded.userId).select('-password');
        userType = 'retailer';
      } else {
        user = await CustomerUser.findById(decoded.userId).select('-password');
        userType = 'customer';
      }
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found',
        error: 'User does not exist'
      });
    }

    // Add user and userType to request object
    req.user = user;
    req.userType = userType;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'Token verification failed'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'Please login again'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

// Generate JWT token with userType
const generateToken = (userId, userType = 'retailer') => {
  return jwt.sign(
    { userId, userType },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

// Role-based middleware - Require Retailer
const requireRetailer = (req, res, next) => {
  if (req.userType !== 'retailer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      error: 'Retailer account required'
    });
  }
  next();
};

// Role-based middleware - Require Customer
const requireCustomer = (req, res, next) => {
  if (req.userType !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      error: 'Customer account required'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
        req.userType = decoded.userType || 'retailer';
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  requireRetailer,
  requireCustomer,
  optionalAuth
};
