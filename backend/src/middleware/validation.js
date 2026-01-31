const { body } = require('express-validator');

/**
 * Validation Middleware
 * Express-validator rules for request validation
 * Used for validating user input and preventing invalid data
 * Future: Custom validation rules for business-specific requirements
 */

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('shop_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Shop name cannot exceed 100 characters'),
  
  body('language')
    .optional()
    .isIn(['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Marathi', 'Kannada', 'Malayalam', 'Punjabi'])
    .withMessage('Invalid language selection'),
  
  body('upi_id')
    .trim()
    .notEmpty()
    .withMessage('UPI ID is required')
    .matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/)
    .withMessage('Please enter a valid UPI ID (e.g., yourname@paytm)')
];

// User login validation
const validateLogin = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Profile update validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('shop_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Shop name cannot exceed 100 characters'),
  
  body('language')
    .optional()
    .isIn(['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Marathi', 'Kannada', 'Malayalam', 'Punjabi'])
    .withMessage('Invalid language selection'),
  
  body('upi_id')
    .optional({ checkFalsy: true })
    .matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/)
    .withMessage('Please enter a valid UPI ID')
];

// Customer validation
const validateCustomer = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Customer phone number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian phone number'),
  
  body('credit_balance')
    .optional()
    .isNumeric()
    .withMessage('Credit balance must be a number')
    .isFloat({ min: 0 })
    .withMessage('Credit balance cannot be negative')
];

// Sale validation
const validateSale = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.item_name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 100 })
    .withMessage('Item name cannot exceed 100 characters'),
  
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('items.*.price_per_unit')
    .isNumeric()
    .withMessage('Price per unit must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price per unit cannot be negative'),
  
  body('payment_method')
    .isIn(['Cash', 'UPI', 'Credit'])
    .withMessage('Payment method must be Cash, UPI, or Credit')
];

// Expense validation
const validateExpense = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Amount cannot be negative'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters')
];

// Inventory validation
const validateInventory = [
  body('item_name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 100 })
    .withMessage('Item name cannot exceed 100 characters'),
  
  body('stock_qty')
    .isNumeric()
    .withMessage('Stock quantity must be a number')
    .isInt({ min: 0 })
    .withMessage('Stock quantity cannot be negative'),
  
  body('price_per_unit')
    .isNumeric()
    .withMessage('Price per unit must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price per unit cannot be negative')
];

// AI Insight validation
const validateAiInsight = [
  body('summary_text')
    .trim()
    .notEmpty()
    .withMessage('Summary text is required')
    .isLength({ max: 1000 })
    .withMessage('Summary text cannot exceed 1000 characters'),
  
  body('insights_data')
    .notEmpty()
    .withMessage('Insights data is required')
];

// Message validation
const validateMessage = [
  body('direction')
    .isIn(['in', 'out'])
    .withMessage('Direction must be either "in" or "out"'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 1000 })
    .withMessage('Message content cannot exceed 1000 characters')
];

// Customer user registration validation
const validateCustomerRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian phone number'),
  
  body('address.street')
    .optional()
    .trim(),
  
  body('address.city')
    .optional()
    .trim(),
  
  body('address.state')
    .optional()
    .trim(),
  
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Please enter a valid 6-digit pincode')
];

// Customer user login validation
const validateCustomerLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Customer request validation
const validateCustomerRequest = [
  body('retailer_id')
    .notEmpty()
    .withMessage('Retailer ID is required')
    .isMongoId()
    .withMessage('Invalid retailer ID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.item_name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 100 })
    .withMessage('Item name cannot exceed 100 characters'),
  
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateCustomer,
  validateSale,
  validateExpense,
  validateInventory,
  validateAiInsight,
  validateMessage,
  validateCustomerRegistration,
  validateCustomerLogin,
  validateCustomerRequest
};
