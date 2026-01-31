const mongoose = require('mongoose');

/**
 * Expense Model - Business expense tracking
 * Fields: user_id, amount, description, category, date
 * Used for tracking business expenses and budget management
 * Future: Integration with AI for expense categorization and insights
 */
const expenseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  is_sales_expense: {
    type: Boolean,
    default: false,
    comment: 'True if this expense is directly related to sales (marketing, commissions, shipping, etc.)'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
expenseSchema.index({ user_id: 1, date: -1 });
expenseSchema.index({ user_id: 1, category: 1 });

// Virtual for expense summary
expenseSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    amount: this.amount,
    description: this.description,
    category: this.category,
    is_sales_expense: this.is_sales_expense,
    date: this.date,
    createdAt: this.createdAt
  };
});

module.exports = mongoose.model('Expense', expenseSchema);
