const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');
const notificationController = require('./notificationController');

/**
 * Broadcast Controller - Send notifications to multiple users
 */
const broadcastController = {
  /**
   * Send notification to all customers
   */
  sendToAllCustomers: async (req, res) => {
    try {
      const { title, message, type = 'important_info' } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, message'
        });
      }

      // Get all active customers
      const customers = await CustomerUser.find({ is_active: true });

      let successCount = 0;
      let failCount = 0;

      // Send notification to each customer
      for (const customer of customers) {
        try {
          await notificationController.createNotification(
            customer._id,
            'customer',
            type,
            title,
            message,
            null
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to customer ${customer._id}:`, error);
          failCount++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Notifications sent to ${successCount} customers`,
        data: {
          total: customers.length,
          success: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error('Send to all customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending notifications',
        error: error.message
      });
    }
  },

  /**
   * Send notification to all retailers
   */
  sendToAllRetailers: async (req, res) => {
    try {
      const { title, message, type = 'important_info' } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, message'
        });
      }

      // Get all retailers
      const retailers = await User.find({ role: 'retailer' });

      let successCount = 0;
      let failCount = 0;

      // Send notification to each retailer
      for (const retailer of retailers) {
        try {
          await notificationController.createNotification(
            retailer._id,
            'retailer',
            type,
            title,
            message,
            null
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to retailer ${retailer._id}:`, error);
          failCount++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Notifications sent to ${successCount} retailers`,
        data: {
          total: retailers.length,
          success: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error('Send to all retailers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending notifications',
        error: error.message
      });
    }
  },

  /**
   * Send notification to all wholesalers
   */
  sendToAllWholesalers: async (req, res) => {
    try {
      const { title, message, type = 'important_info' } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, message'
        });
      }

      // Get all wholesalers
      const wholesalers = await User.find({ role: 'wholesaler' });

      let successCount = 0;
      let failCount = 0;

      // Send notification to each wholesaler
      for (const wholesaler of wholesalers) {
        try {
          await notificationController.createNotification(
            wholesaler._id,
            'wholesaler',
            type,
            title,
            message,
            null
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to wholesaler ${wholesaler._id}:`, error);
          failCount++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Notifications sent to ${successCount} wholesalers`,
        data: {
          total: wholesalers.length,
          success: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error('Send to all wholesalers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending notifications',
        error: error.message
      });
    }
  },

  /**
   * Send notification to all users (customers, retailers, wholesalers)
   */
  sendToAllUsers: async (req, res) => {
    try {
      const { title, message, type = 'important_info' } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, message'
        });
      }

      let totalSuccess = 0;
      let totalFail = 0;

      // Send to customers
      const customers = await CustomerUser.find({ is_active: true });
      for (const customer of customers) {
        try {
          await notificationController.createNotification(
            customer._id,
            'customer',
            type,
            title,
            message,
            null
          );
          totalSuccess++;
        } catch (error) {
          totalFail++;
        }
      }

      // Send to retailers
      const retailers = await User.find({ role: 'retailer' });
      for (const retailer of retailers) {
        try {
          await notificationController.createNotification(
            retailer._id,
            'retailer',
            type,
            title,
            message,
            null
          );
          totalSuccess++;
        } catch (error) {
          totalFail++;
        }
      }

      // Send to wholesalers
      const wholesalers = await User.find({ role: 'wholesaler' });
      for (const wholesaler of wholesalers) {
        try {
          await notificationController.createNotification(
            wholesaler._id,
            'wholesaler',
            type,
            title,
            message,
            null
          );
          totalSuccess++;
        } catch (error) {
          totalFail++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Notifications sent to ${totalSuccess} users`,
        data: {
          total: customers.length + retailers.length + wholesalers.length,
          success: totalSuccess,
          failed: totalFail,
          breakdown: {
            customers: customers.length,
            retailers: retailers.length,
            wholesalers: wholesalers.length
          }
        }
      });
    } catch (error) {
      console.error('Send to all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending notifications',
        error: error.message
      });
    }
  }
};

module.exports = broadcastController;
