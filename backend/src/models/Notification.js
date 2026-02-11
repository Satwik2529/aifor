const mongoose = require('mongoose');

/**
 * Notification Model - User notifications for requests, orders, and completions
 */
const notificationSchema = new mongoose.Schema({
  // Support both old field names and new field names
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'user_type_ref'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  user_type_ref: {
    type: String,
    enum: ['User', 'CustomerUser']
  },
  user_type: {
    type: String,
    enum: ['retailer', 'customer', 'wholesaler']
  },
  type: {
    type: String,
    enum: [
      'new_request', 
      'request_completed', 
      'request_cancelled', 
      'bill_generated',
      'payment_confirmed', 
      'order', 
      'promotion', 
      'alert', 
      'system',
      // Advanced alert types
      'low_stock',
      'out_of_stock',
      'pending_orders',
      'sales_drop',
      'high_expenses',
      'festival_reminder',
      'festival_upcoming',
      // Hot deals and important info
      'hot_deal',
      'campaign_created',
      'important_info'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerRequest'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual to get the actual user ID (supports both field names)
notificationSchema.virtual('userId').get(function () {
  return this.user || this.user_id;
});

// Index for efficient queries
notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

// Mark as read
notificationSchema.methods.markAsRead = function () {
  this.is_read = true;
  this.read_at = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
