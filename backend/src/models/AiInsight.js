const mongoose = require('mongoose');

/**
 * AI Insight Model - Store AI-generated business insights
 * Fields: user_id, summary_text, insights_data, createdAt
 * Used for storing AI-generated business recommendations and insights
 * Future: Integration with GPT-4o for daily business digest and recommendations
 */
const aiInsightSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  summary_text: {
    type: String,
    required: [true, 'Summary text is required'],
    trim: true,
    maxlength: [1000, 'Summary text cannot exceed 1000 characters']
  },
  insights_data: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Insights data is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
aiInsightSchema.index({ user_id: 1, createdAt: -1 });

// Virtual for insight summary
aiInsightSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    summary_text: this.summary_text,
    insights_type: this.insights_data?.type || 'general',
    createdAt: this.createdAt
  };
});

module.exports = mongoose.model('AiInsight', aiInsightSchema);
