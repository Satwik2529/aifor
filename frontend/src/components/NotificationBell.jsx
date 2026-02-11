import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Package, ShoppingCart, XCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * NotificationBell Component
 * Shows notification icon with badge and dropdown list
 * Now with dark mode support
 */
const NotificationBell = ({ isDarkMode }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  API_URL = API_URL.replace(/\/api$/, '');
  const token = localStorage.getItem('token');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setUnreadCount(result.data.unread_count);
      }
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/notifications?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unread_count);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);

    // Navigate based on notification type
    const userType = localStorage.getItem('userType');
    
    switch (notification.type) {
      case 'hot_deal':
        // Navigate to nearby shops for customers
        if (userType === 'customer') {
          navigate('/customer/nearby-shops');
        }
        setShowDropdown(false);
        break;
        
      case 'new_request':
        // Navigate to customer requests for retailers
        if (userType === 'retailer') {
          navigate('/dashboard/customers');
        } else if (userType === 'customer') {
          navigate('/customer-dashboard');
        }
        setShowDropdown(false);
        break;
        
      case 'request_completed':
      case 'request_cancelled':
      case 'bill_generated':
      case 'payment_confirmed':
        // Navigate to orders/requests page
        if (userType === 'customer') {
          navigate('/customer-dashboard');
        } else if (userType === 'retailer') {
          navigate('/dashboard/customers');
        }
        setShowDropdown(false);
        break;
        
      case 'promotion':
        // Navigate to wholesaler offers
        navigate('/dashboard/wholesalers');
        setShowDropdown(false);
        break;
        
      case 'order':
        // Navigate to wholesaler orders
        navigate('/dashboard/wholesalers');
        setShowDropdown(false);
        break;
        
      case 'campaign_created':
        // Navigate to discount campaigns
        navigate('/dashboard/discount-campaigns');
        setShowDropdown(false);
        break;
        
      case 'low_stock':
      case 'out_of_stock':
        // Navigate to inventory
        navigate('/dashboard/inventory');
        setShowDropdown(false);
        break;
        
      case 'pending_orders':
        // Navigate to customer requests
        navigate('/dashboard/customers');
        setShowDropdown(false);
        break;
        
      default:
        // Default navigation based on user type
        if (userType === 'customer') {
          navigate('/customer-dashboard');
        } else if (userType === 'wholesaler') {
          navigate('/wholesaler-dashboard');
        } else {
          navigate('/dashboard');
        }
        setShowDropdown(false);
        break;
    }
  };

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        // Update local state
        setNotifications(notifications.map(n =>
          n._id === notificationId ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  // Get icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'new_request':
        return <ShoppingCart className="h-5 w-5 text-blue-600" />;
      case 'request_completed':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'request_cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'bill_generated':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'order':
        return <Package className="h-5 w-5 text-indigo-600" />;
      case 'promotion':
        return <span className="text-2xl">🎁</span>;
      case 'hot_deal':
        return <span className="text-2xl">🔥</span>;
      case 'campaign_created':
        return <span className="text-2xl">📢</span>;
      case 'important_info':
        return <span className="text-2xl">ℹ️</span>;
      case 'alert':
        return <span className="text-2xl">⚠️</span>;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  // Get background color for notification type
  const getNotificationBg = (notification, isDarkMode) => {
    if (!notification.is_read) {
      if (notification.type === 'hot_deal') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-orange-900/50 to-red-900/50 border-l-4 border-orange-500 hover:from-orange-800/60 hover:to-red-800/60' 
          : 'bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 hover:from-orange-100 hover:to-red-100';
      }
      if (notification.type === 'promotion') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-pink-900/40 to-purple-900/40 border-l-4 border-pink-500 hover:from-pink-800/50 hover:to-purple-800/50' 
          : 'bg-gradient-to-r from-pink-50 to-purple-50 border-l-4 border-pink-500 hover:from-pink-100 hover:to-purple-100';
      }
      if (notification.type === 'campaign_created') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-l-4 border-blue-500 hover:from-blue-800/50 hover:to-indigo-800/50' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 hover:from-blue-100 hover:to-indigo-100';
      }
      if (notification.type === 'important_info') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-cyan-900/40 to-teal-900/40 border-l-4 border-cyan-500 hover:from-cyan-800/50 hover:to-teal-800/50' 
          : 'bg-gradient-to-r from-cyan-50 to-teal-50 border-l-4 border-cyan-500 hover:from-cyan-100 hover:to-teal-100';
      }
      if (notification.type === 'new_request') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-l-4 border-blue-500 hover:from-blue-800/40 hover:to-blue-700/40' 
          : 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 hover:from-blue-100 hover:to-blue-200';
      }
      if (notification.type === 'request_completed' || notification.type === 'payment_confirmed') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-green-900/30 to-green-800/30 border-l-4 border-green-500 hover:from-green-800/40 hover:to-green-700/40' 
          : 'bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 hover:from-green-100 hover:to-green-200';
      }
      if (notification.type === 'request_cancelled') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-red-900/30 to-red-800/30 border-l-4 border-red-500 hover:from-red-800/40 hover:to-red-700/40' 
          : 'bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 hover:from-red-100 hover:to-red-200';
      }
      if (notification.type === 'bill_generated') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-purple-900/30 to-purple-800/30 border-l-4 border-purple-500 hover:from-purple-800/40 hover:to-purple-700/40' 
          : 'bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 hover:from-purple-100 hover:to-purple-200';
      }
      if (notification.type === 'alert' || notification.type === 'low_stock' || notification.type === 'out_of_stock') {
        return isDarkMode 
          ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-l-4 border-yellow-500 hover:from-yellow-800/40 hover:to-orange-800/40' 
          : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 hover:from-yellow-100 hover:to-orange-100';
      }
      return isDarkMode ? 'bg-blue-900/30 hover:bg-blue-800/40' : 'bg-blue-50 hover:bg-blue-100';
    }
    return isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  };

  // Get text style for notification type
  const getNotificationTextStyle = (notification) => {
    if (!notification.is_read) {
      if (notification.type === 'hot_deal') {
        return 'font-bold text-orange-900 dark:text-orange-100';
      }
      if (notification.type === 'promotion') {
        return 'font-bold text-pink-900 dark:text-pink-100';
      }
      if (notification.type === 'important_info') {
        return 'font-bold text-cyan-900 dark:text-cyan-100';
      }
      return 'font-semibold';
    }
    return '';
  };

  // Auto-fetch unread count every 30 seconds
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [token]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (showDropdown && token) {
      fetchNotifications();
    }
  }, [showDropdown, token]);

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={handleBellClick}
        className={`relative p-2 rounded-full transition-all transform hover:scale-110 ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border z-[9999] max-h-[80vh] overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Bell className={`h-12 w-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-all ${getNotificationBg(notification, isDarkMode)} ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm ${getNotificationTextStyle(notification)} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1 animate-pulse"></span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${notification.type === 'promotion' || notification.type === 'hot_deal' || notification.type === 'campaign_created' ? 'font-medium' : ''} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`p-3 border-t text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
