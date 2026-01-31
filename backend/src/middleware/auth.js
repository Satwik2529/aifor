const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT tokens
 * Used for securing API endpoints and user identification
 * Future: Integration with role-based access control
 */

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
    
    // Try to find user in both User (retailer) and CustomerUser models
    let user = await User.findById(decoded.userId).select('-password');
    let userType = 'retailer';
    
    if (!user) {
      user = await CustomerUser.findById(decoded.userId).select('-password');
      userType = 'customer';
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

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_jwt_secret_here',
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
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
  optionalAuth
};
