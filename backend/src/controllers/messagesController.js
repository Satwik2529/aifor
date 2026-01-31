const Message = require('../models/Message');
const { validationResult } = require('express-validator');

/**
 * Messages Controller - WhatsApp and communication message management
 * Handles storing and retrieving customer communication messages
 * Future: Integration with WhatsApp API for automated customer communication
 */

const messagesController = {
  // Get all messages for authenticated user
  getAllMessages: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 20, direction, start_date, end_date } = req.query;
      
      // Build filter object
      const filter = { user_id: userId };
      
      if (direction) {
        filter.direction = direction;
      }
      
      if (start_date || end_date) {
        filter.timestamp = {};
        if (start_date) filter.timestamp.$gte = new Date(start_date);
        if (end_date) filter.timestamp.$lte = new Date(end_date);
      }

      const messages = await Message.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user_id', 'name shop_name');

      const total = await Message.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching messages',
        error: error.message
      });
    }
  },

  // Get message by ID
  getMessageById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const message = await Message.findOne({ _id: id, user_id: userId })
        .populate('user_id', 'name shop_name');

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
          error: 'Message does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message retrieved successfully',
        data: message
      });
    } catch (error) {
      console.error('Get message error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching message',
        error: error.message
      });
    }
  },

  // Create new message
  createMessage: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user._id;
      const { direction, content, timestamp } = req.body;

      // Create new message
      const message = new Message({
        user_id: userId,
        direction,
        content,
        timestamp: timestamp || new Date()
      });

      await message.save();
      await message.populate('user_id', 'name shop_name');

      res.status(201).json({
        success: true,
        message: 'Message created successfully',
        data: message
      });
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating message',
        error: error.message
      });
    }
  },

  // Update message
  updateMessage: async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user._id;
      const { direction, content, timestamp } = req.body;

      const message = await Message.findOneAndUpdate(
        { _id: id, user_id: userId },
        { direction, content, timestamp },
        { new: true, runValidators: true }
      ).populate('user_id', 'name shop_name');

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
          error: 'Message does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message updated successfully',
        data: message
      });
    } catch (error) {
      console.error('Update message error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating message',
        error: error.message
      });
    }
  },

  // Delete message
  deleteMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const message = await Message.findOneAndDelete({ _id: id, user_id: userId });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
          error: 'Message does not exist or does not belong to you'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
        data: { deletedMessageId: id }
      });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting message',
        error: error.message
      });
    }
  },

  // Get recent messages (for dashboard)
  getRecentMessages: async (req, res) => {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const messages = await Message.find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .populate('user_id', 'name shop_name');

      res.status(200).json({
        success: true,
        message: 'Recent messages retrieved successfully',
        data: messages,
        count: messages.length
      });
    } catch (error) {
      console.error('Get recent messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recent messages',
        error: error.message
      });
    }
  },

  // Get message analytics
  getMessageAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      // Build date filter
      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.timestamp = {};
        if (start_date) dateFilter.timestamp.$gte = new Date(start_date);
        if (end_date) dateFilter.timestamp.$lte = new Date(end_date);
      }

      // Get total messages
      const totalMessages = await Message.countDocuments(dateFilter);

      // Get messages by direction
      const messagesByDirection = await Message.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$direction', count: { $sum: 1 } } }
      ]);

      // Get daily message trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyMessages = await Message.aggregate([
        { $match: { user_id: userId, timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Message analytics retrieved successfully',
        data: {
          totalMessages,
          messagesByDirection,
          dailyMessages,
          period: { start_date, end_date }
        }
      });
    } catch (error) {
      console.error('Message analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching message analytics',
        error: error.message
      });
    }
  }
};

module.exports = messagesController;
