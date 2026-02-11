const mongoose = require('mongoose');

/**
 * Campaign Model - Discount campaigns for inventory items
 * Supports: Expiry-based, Slow Velocity, Clearance, Festival, Flash Sales
 */
const campaignSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  inventory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Inventory ID is required']
  },
  campaign_type: {
    type: String,
    enum: ['expiry_based', 'slow_velocity', 'clearance', 'festival', 'flash_sale'],
    required: true
  },
  discount_percentage: {
    type: Number,
    required: true,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  original_price: {
    type: Number,
    required: true
  },
  discounted_price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'rejected'],
    default: 'pending'
  },
  start_date: {
    type: Date,
    default: Date.now
  },
  end_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true // e.g., "Expires in 3 days", "Low sales velocity"
  },
  ai_confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8 // AI confidence in this discount recommendation
  },
  // Analytics
  views_count: {
    type: Number,
    default: 0
  },
  clicks_count: {
    type: Number,
    default: 0
  },
  sales_count: {
    type: Number,
    default: 0
  },
  revenue_generated: {
    type: Number,
    default: 0
  },
  // Metadata
  created_by: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'ai'
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
campaignSchema.index({ user_id: 1, status: 1 });
campaignSchema.index({ inventory_id: 1, status: 1 });
campaignSchema.index({ end_date: 1 });

// Virtual for campaign effectiveness
campaignSchema.virtual('effectiveness').get(function() {
  if (this.views_count === 0) return 0;
  return ((this.sales_count / this.views_count) * 100).toFixed(2);
});

// Virtual for ROI calculation
campaignSchema.virtual('roi').get(function() {
  const potentialLoss = this.original_price - this.discounted_price;
  if (potentialLoss === 0) return 0;
  return ((this.revenue_generated / potentialLoss) * 100).toFixed(2);
});

// Virtual for days remaining
campaignSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.end_date);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
});

// Auto-complete expired campaigns
campaignSchema.pre('save', function(next) {
  if (this.status === 'active' && new Date() > this.end_date) {
    this.status = 'completed';
  }
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
