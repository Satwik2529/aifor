const mongoose = require('mongoose');

/**
 * CustomerRequest Model - Messages from customers to retailers
 * Fields: customerId, retailerId, items, notes, status, billDetails
 * Used for customer order requests and retailer processing
 */
const customerRequestSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerUser',
    required: [true, 'Customer ID is required']
  },
  retailer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Retailer ID is required']
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
      default: 0,
      min: [0, 'Price cannot be negative']
    },
    total_price: {
      type: Number,
      default: 0,
      min: [0, 'Total price cannot be negative']
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'billed', 'completed', 'cancelled'],
    default: 'pending'
  },
  bill_details: {
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative']
    },
    generated_at: {
      type: Date
    }
  },
  processed_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  cancelled_at: {
    type: Date
  },
  cancellation_reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  sales_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
customerRequestSchema.index({ retailer_id: 1, status: 1 });
customerRequestSchema.index({ customer_id: 1 });
customerRequestSchema.index({ createdAt: -1 });

// Virtual for request summary
customerRequestSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    customer_id: this.customer_id,
    retailer_id: this.retailer_id,
    items_count: this.items.length,
    status: this.status,
    total: this.bill_details.total,
    createdAt: this.createdAt
  };
});

// Method to calculate bill
customerRequestSchema.methods.calculateBill = function(taxRate = 0) {
  let subtotal = 0;
  
  this.items.forEach(item => {
    item.total_price = item.price_per_unit * item.quantity;
    subtotal += item.total_price;
  });
  
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  
  this.bill_details = {
    subtotal,
    tax,
    total,
    generated_at: new Date()
  };
  
  return this.bill_details;
};

module.exports = mongoose.model('CustomerRequest', customerRequestSchema);
