const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Notification Routes
 * Base path: /api/notifications
 */

// Get all notifications for current user
router.get('/', authenticateToken, notificationController.getNotifications);

// Get unread count
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

// Mark all as read
router.put('/mark-all-read', authenticateToken, notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;
