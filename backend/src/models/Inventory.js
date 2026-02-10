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
    // Supports fractional quantities (e.g., 2.5 kg, 0.25 litre)
  },
  unit: {
    type: String,
    enum: ['kg', 'litre', 'piece'],
    default: 'piece',
    trim: true
    // Base unit for the item (all quantities stored in this unit)
  },
  price_per_unit: {
    type: Number,
    required: [true, 'Price per unit is required'],
    min: [0, 'Price cannot be negative']
  },
  cost_price: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative']
  },
  selling_price: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative'],
    validate: {
      validator: function(value) {
        // Only validate if both cost_price and selling_price are set
        if (this.cost_price && value) {
          return value > this.cost_price;
        }
        return true;
      },
      message: 'Selling price must be higher than cost price to ensure profit'
    }
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
  },
  expiry_date: {
    type: Date,
    default: null
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
    cost_price: this.cost_price,
    selling_price: this.selling_price,
    price_per_unit: this.selling_price, // For backward compatibility
    total_cost_value: this.stock_qty * this.cost_price,
    total_selling_value: this.stock_qty * this.selling_price,
    profit_per_unit: this.selling_price - this.cost_price,
    total_potential_profit: this.stock_qty * (this.selling_price - this.cost_price),
    createdAt: this.createdAt
  };
});

// Virtual for profit margin calculation
inventorySchema.virtual('profitMargin').get(function() {
  if (this.selling_price === 0) return 0;
  return ((this.selling_price - this.cost_price) / this.selling_price * 100).toFixed(2);
});

// Virtual for low stock check
inventorySchema.virtual('isLowStock').get(function() {
  return this.stock_qty <= this.min_stock_level; // Compare against user-defined minimum stock level
});

// Virtual for expiry status
inventorySchema.virtual('expiryStatus').get(function() {
  if (!this.expiry_date) return null;
  
  const now = new Date();
  const expiryDate = new Date(this.expiry_date);
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { status: 'expired', daysUntilExpiry, severity: 'critical' };
  } else if (daysUntilExpiry <= 7) {
    return { status: 'expiring_soon', daysUntilExpiry, severity: 'high' };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'expiring_this_month', daysUntilExpiry, severity: 'medium' };
  } else {
    return { status: 'fresh', daysUntilExpiry, severity: 'low' };
  }
});

// Virtual for checking if item is expiring soon (within 7 days)
inventorySchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiry_date) return false;
  const expiryStatus = this.expiryStatus;
  return expiryStatus && (expiryStatus.status === 'expiring_soon' || expiryStatus.status === 'expired');
});

module.exports = mongoose.model('Inventory', inventorySchema);
