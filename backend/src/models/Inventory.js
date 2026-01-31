const mongoose = require('mongoose');

/**
 * Inventory Model - Stock management for business items
 * Fields: user_id, item_name, stock_qty, price_per_unit
 * Used for tracking inventory levels and stock management
 * Future: Integration with AI for demand forecasting and low stock alerts
 */
const inventorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  item_name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  stock_qty: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  price_per_unit: {
    type: Number,
    required: [true, 'Price per unit is required'],
    min: [0, 'Price cannot be negative']
  },
  min_stock_level: {
    type: Number,
    min: [0, 'Minimum stock level cannot be negative'],
    default: 5
  },
  category: {
    type: String,
    enum: [
      'Electronics',
      'Clothing',
      'Food & Beverages',
      'Books',
      'Home & Garden',
      'Sports',
      'Beauty & Health',
      'Automotive',
      'Office Supplies',
      'Other'
    ],
    default: 'Other',
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
inventorySchema.index({ user_id: 1, item_name: 1 }, { unique: true });
inventorySchema.index({ user_id: 1, stock_qty: 1 });

// Virtual for inventory summary
inventorySchema.virtual('summary').get(function() {
  return {
    id: this._id,
    item_name: this.item_name,
    stock_qty: this.stock_qty,
    price_per_unit: this.price_per_unit,
    total_value: this.stock_qty * this.price_per_unit,
    createdAt: this.createdAt
  };
});

// Virtual for low stock check
inventorySchema.virtual('isLowStock').get(function() {
  return this.stock_qty <= this.min_stock_level; // Compare against user-defined minimum stock level
});

module.exports = mongoose.model('Inventory', inventorySchema);
