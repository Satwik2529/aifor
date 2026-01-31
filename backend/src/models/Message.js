const mongoose = require('mongoose');

/**
 * Message Model - Store WhatsApp and communication messages
 * Fields: user_id, direction, content, timestamp
 * Used for tracking customer communications and WhatsApp integration
 * Future: Integration with WhatsApp API for automated customer communication
 */
const messageSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  direction: {
    type: String,
    required: [true, 'Message direction is required'],
    enum: {
      values: ['in', 'out'],
      message: 'Direction must be either "in" or "out"'
    }
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
messageSchema.index({ user_id: 1, timestamp: -1 });
messageSchema.index({ user_id: 1, direction: 1 });

// Virtual for message summary
messageSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    direction: this.direction,
    content: this.content.length > 50 ? this.content.substring(0, 50) + '...' : this.content,
    timestamp: this.timestamp,
    createdAt: this.createdAt
  };
});

module.exports = mongoose.model('Message', messageSchema);
