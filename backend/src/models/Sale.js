const mongoose = require('mongoose');

/**
 * Sale Model - Sales transaction tracking
 * Fields: user_id, date, items, total_amount, payment_method
 * Used for recording sales transactions and revenue tracking
 * Future: Integration with AI for sales insights and predictions
 */
const saleSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  items: [{
    item_name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot exceed 100 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    price_per_unit: {
      type: Number,
      required: [true, 'Selling price per unit is required'],
      min: [0, 'Price cannot be negative']
    },
    cost_per_unit: {
      type: Number,
      required: [true, 'Cost per unit is required for COGS calculation'],
      min: [0, 'Cost cannot be negative']
    }
  }],
  total_amount: {
    type: Number,
    min: [0, 'Total amount cannot be negative'],
    default: 0
  },
  total_cogs: {
    type: Number,
    min: [0, 'COGS cannot be negative'],
    default: 0
  },
  gross_profit: {
    type: Number,
    default: 0
  },
  payment_method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Credit'],
      message: 'Payment method must be Cash, Card, UPI, Bank Transfer, or Credit'
    }
  },
  customer_name: {
    type: String,
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters'],
    default: 'Walk-in Customer'
  },
  customer_phone: {
    type: String,
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
saleSchema.index({ user_id: 1, date: -1 });
saleSchema.index({ user_id: 1, payment_method: 1 });

// Virtual for sale summary
saleSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    date: this.date,
    total_amount: this.total_amount,
    payment_method: this.payment_method,
    items_count: this.items.length,
    createdAt: this.createdAt
  };
});

// Calculate totals before saving
saleSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate revenue
    this.total_amount = this.items.reduce((total, item) => {
      return total + (item.quantity * item.price_per_unit);
    }, 0);
    
    // Calculate COGS
    this.total_cogs = this.items.reduce((total, item) => {
      return total + (item.quantity * item.cost_per_unit);
    }, 0);
    
    // Calculate Gross Profit (Revenue - COGS)
    this.gross_profit = this.total_amount - this.total_cogs;
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
