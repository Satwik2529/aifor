const Notification = require('../models/Notification');
const CustomerUser = require('../models/CustomerUser');

/**
 * Notification Controller - Manage user notifications
 */
const notificationController = {
  // Create a notification
  createNotification: async (userId, userType, type, title, message, requestId = null) => {
    try {
      const notification = new Notification({
        user_id: userId,
        user_type: userType,
        type,
        title,
        message,
        request_id: requestId
      });
      
      await notification.save();
      console.log(`🔔 Notification created for ${userType}:`, title);
      return notification;
    } catch (error) {
      console.error('❌ Create notification error:', error);
      throw error;
    }
  },

  // Get all notifications for a user
  getNotifications: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 20, unread_only = 'false' } = req.query;
      
      const query = { user_id: userId };
      if (unread_only === 'true') {
        query.is_read = false;
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const notifications = await Notification.find(query)
        .populate('request_id', 'items status customer_id retailer_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ 
        user_id: userId, 
        is_read: false 
      });
      
      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications,
          unread_count: unreadCount,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications',
        error: error.message
      });
    }
  },

  // Get unread count
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const count = await Notification.countDocuments({
        user_id: userId,
        is_read: false
      });
      
      res.status(200).json({
        success: true,
        data: { unread_count: count }
      });
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: error.message
      });
    }
  },

  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const notification = await Notification.findOne({
        _id: id,
        user_id: userId
      });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      if (!notification.is_read) {
        await notification.markAsRead();
      }
      
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
      });
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  },

  // Mark all as read
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const result = await Notification.updateMany(
        { user_id: userId, is_read: false },
        { $set: { is_read: true, read_at: new Date() } }
      );
      
      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: { updated_count: result.modifiedCount }
      });
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all as read',
        error: error.message
      });
    }
  },

  // Delete notification
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const notification = await Notification.findOneAndDelete({
        _id: id,
        user_id: userId
      });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message
      });
    }
  }
};

module.exports = notificationController;
