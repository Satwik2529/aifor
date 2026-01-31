const mongoose = require('mongoose');

/**
 * Notification Model - User notifications for requests and completions
 */
const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  user_type: {
    type: String,
    enum: ['retailer', 'customer'],
    required: true
  },
  type: {
    type: String,
    enum: ['new_request', 'request_completed', 'request_cancelled', 'bill_generated'],
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

// Index for efficient queries
notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, createdAt: -1 });

// Mark as read
notificationSchema.methods.markAsRead = function() {
  this.is_read = true;
  this.read_at = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
