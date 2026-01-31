import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Brain, Mail, Store, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

/**
 * Unified Login Page with Retailer/Customer Tabs
 * Handles authentication for both user types
 */
const LoginNew = () => {
  const { t } = useTranslation();
  const [userType, setUserType] = useState('retailer'); // 'retailer' or 'customer'
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    // Retailer fields
    phone: '',
    // Customer fields
    email: '',
    // Common
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleTabChange = (type) => {
    setUserType(type);
    // Clear form when switching tabs
    setFormData({
      phone: '',
      email: '',
      password: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userType === 'retailer') {
      // Validate retailer fields
      if (!formData.phone.trim()) {
        toast.error(t('auth.login.errors.phoneRequired'));
        return;
      }
      if (!formData.password) {
        toast.error(t('auth.login.errors.passwordRequired'));
        return;
      }
    } else {
      // Validate customer fields
      if (!formData.email.trim()) {
        toast.error(t('auth.login.errors.emailRequired'));
        return;
      }
      if (!formData.password) {
        toast.error(t('auth.login.errors.passwordRequired'));
        return;
      }
    }

    setIsLoading(true);

    try {
      if (userType === 'retailer') {
        const result = await login({ phone: formData.phone, password: formData.password });
        if (result.success) {
          toast.success(t('auth.login.success'));
          // Delay navigation to show toast
          setTimeout(() => navigate('/'), 1000);
        } else {
          toast.error(result.message || t('auth.login.errors.loginFailed'));
        }
      } else {
        // Customer login - API call
        let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        // Remove /api suffix if present to avoid double /api/api/
        API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
        const response = await fetch(`${API_BASE_URL}/api/customer-auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });

        const result = await response.json();

        if (result.success) {
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('userType', 'customer');
          localStorage.setItem('user', JSON.stringify(result.data.customer));
          toast.success(t('auth.login.success'));
          // Delay navigation to show toast
          setTimeout(() => navigate('/customer-dashboard'), 1000);
        } else {
          toast.error(result.message || t('auth.login.errors.loginFailed'));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('auth.login.errors.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-black dark:to-gray-900 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-primary-600 p-2 sm:p-3 rounded-full shadow-lg">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.login.title')}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-1 flex space-x-1">
          <button
            type="button"
            onClick={() => handleTabChange('retailer')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              userType === 'retailer'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Store className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{t('auth.login.retailer')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('customer')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              userType === 'customer'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{t('auth.login.customer')}</span>
          </button>
        </div>

        {/* Login Form */}
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 bg-white dark:bg-black border border-transparent dark:border-gray-800 rounded-lg shadow-md p-6 sm:p-8" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            {userType === 'retailer' ? (
              <div>
                <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white">
                  {t('auth.login.phoneLabel')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field pl-10 text-sm"
                    placeholder={t('auth.login.phonePlaceholder')}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white">
                  {t('auth.login.emailLabel')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10 text-sm"
                    placeholder={t('auth.login.emailPlaceholder')}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white">
                {t('auth.login.passwordLabel')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10 text-sm"
                  placeholder={t('auth.login.passwordPlaceholder')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-900 dark:text-white">
                {t('common.rememberMe')}
              </label>
            </div>
            <div className="text-xs sm:text-sm">
              <button 
                type="button" 
                onClick={() => setShowForgotPassword(true)}
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                {t('common.forgotPassword')}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? t('auth.login.signingIn') : t('auth.login.signInButton')}
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                {t('auth.login.signUpLink')}
              </Link>
            </span>
          </div>
        </form>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          userType={userType}
        />
      </div>
    </div>
  );
};

export default LoginNew;
