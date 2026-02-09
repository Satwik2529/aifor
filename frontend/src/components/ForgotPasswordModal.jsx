import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Forgot Password Modal Component
 * Handles password reset for both Retailers (phone) and Customers (email)
 */
const ForgotPasswordModal = ({ isOpen, onClose, userType = 'retailer' }) => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  API_URL = API_URL.replace(/\/api$/, ''); // Remove /api suffix to avoid /api/api/

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate based on user type
    if (userType === 'retailer') {
      if (!phone) {
        toast.error('Please enter your phone number');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }
    } else {
      if (!email) {
        toast.error('Please enter your email address');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = userType === 'retailer' 
        ? `${API_URL}/api/auth/forgot-password`
        : `${API_URL}/api/customer-auth/forgot-password`;
        
      const requestBody = userType === 'retailer' 
        ? { phone }
        : { email };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (result.success) {
        setIsSuccess(true);
        
        // Development mode - show link directly
        if (result.devMode && result.resetLink) {
          console.log('🔗 DEV MODE: Reset link:', result.resetLink);
          toast.success('✅ Reset link generated! Check console or click notification.', { duration: 10000 });
          
          // Open reset link in new tab after 2 seconds
          setTimeout(() => {
            const confirmOpen = window.confirm('Open password reset page?\n\n' + result.resetLink);
            if (confirmOpen) {
              window.location.href = result.resetLink.replace('http://localhost:3000', '');
            }
          }, 2000);
        } else {
          toast.success('✅ Password reset link sent! Check your email.');
        }
        
        // Auto close after 5 seconds
        setTimeout(() => {
          handleClose();
        }, 5000);
      } else {
        toast.error(result.message || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPhone('');
    setIsSuccess(false);
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={handleClose}>
      <div className="bg-white dark:bg-black rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-200 animate-scaleIn border border-transparent dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                🔐 Forgot Password
              </h2>
              <p className="text-primary-100 text-sm mt-1">We'll send you a reset link</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {userType === 'retailer' 
                      ? 'Enter your registered phone number and we\'ll send a password reset link to your email.'
                      : 'Enter your email address and we\'ll send you a link to reset your password.'}
                  </p>
                  
                  {userType === 'retailer' ? (
                    <>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Enter your 10-digit phone number"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          disabled={isLoading}
                          autoFocus
                          maxLength={10}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Reset link will be sent to your registered email address
                      </p>
                    </>
                  ) : (
                    <>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          disabled={isLoading}
                          autoFocus
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Security Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">🔒 Security Notice:</span> The reset link will expire in 15 minutes for your security.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-medium"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (userType === 'retailer' ? !phone : !email)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 animate-fadeIn">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Sent!</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {userType === 'retailer' 
                    ? 'We\'ve sent a password reset link to your registered email address.'
                    : 'We\'ve sent a password reset link to:'}
                </p>
                {userType === 'customer' && (
                  <p className="text-primary-600 font-semibold mb-6">{email}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please check your email inbox and follow the instructions to reset your password.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default ForgotPasswordModal;
