import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Brain, Mail, Store, User as UserIcon, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { signInWithGoogle, isConfigured } from '../config/supabase';

/**
 * Unified Login Page with Retailer/Customer/Wholesaler Tabs
 * Handles authentication for all user types
 */
const LoginNew = () => {
  const { t } = useTranslation();
  const [userType, setUserType] = useState('retailer'); // 'retailer', 'customer', or 'wholesaler'
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const isSupabaseConfigured = isConfigured();

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

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      toast.error('Google Sign-In is not configured. Please contact administrator.');
      return;
    }

    setIsGoogleLoading(true);

    try {
      // Request location permission and WAIT for response before redirecting
      const getLocation = () => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }

          toast.loading('Requesting location permission...', { id: 'location-request' });

          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Store location temporarily
              const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString()
              };
              localStorage.setItem('pendingGoogleLocation', JSON.stringify(locationData));
              toast.success('Location captured!', { id: 'location-request' });
              resolve(locationData);
            },
            (error) => {
              toast.dismiss('location-request');
              if (error.code === 1) {
                toast('Location permission denied - continuing without location', { icon: 'ℹ️' });
              } else if (error.code === 2) {
                toast('Location unavailable - continuing without location', { icon: 'ℹ️' });
              } else if (error.code === 3) {
                toast('Location request timeout - continuing without location', { icon: 'ℹ️' });
              }
              resolve(null); // Continue without location
            },
            {
              enableHighAccuracy: true,
              timeout: 10000, // 10 seconds timeout
              maximumAge: 0
            }
          );
        });
      };

      // Wait for location (or timeout/denial) before proceeding
      await getLocation();

      // Store the intended userType before redirecting to Google
      localStorage.setItem('pendingGoogleUserType', userType);

      const result = await signInWithGoogle();
      if (!result.success) {
        toast.error(result.error || 'Google sign in failed');
        setIsGoogleLoading(false);
      }
      // If successful, user will be redirected to Google OAuth page
      // Then back to /auth/callback
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to initiate Google sign in');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userType === 'retailer' || userType === 'wholesaler') {
      // Validate retailer/wholesaler fields
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
      if (userType === 'retailer' || userType === 'wholesaler') {
        const result = await login({ phone: formData.phone, password: formData.password });
        if (result.success) {
          toast.success(t('auth.login.success'));

          // Get userType from multiple sources for reliability
          const loggedInUserType = result.data?.userType || localStorage.getItem('userType') || 'retailer';

          console.log('🔍 Login Navigation Check:', {
            resultUserType: result.data?.userType,
            localStorageUserType: localStorage.getItem('userType'),
            finalUserType: loggedInUserType,
            willNavigateTo: loggedInUserType === 'wholesaler' ? '/wholesaler-dashboard' : '/dashboard'
          });

          // Navigate based on userType
          if (loggedInUserType === 'wholesaler') {
            console.log('✅ Navigating to wholesaler dashboard');
            setTimeout(() => navigate('/wholesaler-dashboard'), 1000);
          } else {
            console.log('✅ Navigating to retailer dashboard');
            setTimeout(() => navigate('/dashboard'), 1000);
          }
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
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-1 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleTabChange('retailer')}
            className={`flex flex-col items-center justify-center space-y-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 ${userType === 'retailer'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
          >
            <Store className="h-4 w-4" />
            <span>Retailer</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('wholesaler')}
            className={`flex flex-col items-center justify-center space-y-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 ${userType === 'wholesaler'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
          >
            <Package className="h-4 w-4" />
            <span>Wholesaler</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('customer')}
            className={`flex flex-col items-center justify-center space-y-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 ${userType === 'customer'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Customer</span>
          </button>
        </div>

        {/* Login Form */}
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 bg-white dark:bg-black border border-transparent dark:border-gray-800 rounded-lg shadow-md p-6 sm:p-8" onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            {(userType === 'retailer' || userType === 'wholesaler') ? (
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

          {/* Google Sign In - Only show if Supabase is configured */}
          {isSupabaseConfigured && (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full flex items-center justify-center gap-3 py-2 sm:py-3 px-4 border-2 border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {isGoogleLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

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
