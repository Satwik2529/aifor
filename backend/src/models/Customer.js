const mongoose = require('mongoose');

/**
 * Customer Model - Customer management for business owners
 * Fields: user_id, name, phone, credit_balance
 * Used for tracking customer information and credit transactions
 * Future: Integration with WhatsApp for customer communication
 */
const customerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  credit_balance: {
    type: Number,
    default: 0,
    min: [0, 'Credit balance cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
customerSchema.index({ user_id: 1, phone: 1 }, { unique: true });

// Virtual for customer summary
customerSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    credit_balance: this.credit_balance,
    createdAt: this.createdAt
  };
});

module.exports = mongoose.model('Customer', customerSchema);
