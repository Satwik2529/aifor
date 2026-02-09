import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, User, Building, Brain, Mail, MapPin, Store, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * Unified Register Page with Retailer/Customer Tabs
 * Handles registration for both user types
 */
const RegisterNew = () => {
  const { t } = useTranslation();
  const [userType, setUserType] = useState('retailer'); // 'retailer' or 'customer'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Retailer specific
    shop_name: '',
    language: 'Hindi',
    upi_id: '',
    // Customer specific
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    // Location fields (for both)
    locality: '',
    latitude: null,
    longitude: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('not_set'); // 'not_set', 'loading', 'success', 'error'
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported by your browser');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('loading');
    toast.loading('Capturing location...', { id: 'gps-loading' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGpsStatus('success');
        toast.success('Location captured successfully!', { id: 'gps-loading' });
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsStatus('error');
        toast.error('Could not get location. Please enter manually.', { id: 'gps-loading' });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleTabChange = (type) => {
    setUserType(type);
    // Keep common fields and location fields, reset specific fields
    setFormData({
      name: formData.name,
      phone: formData.phone,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      locality: formData.locality,
      latitude: formData.latitude,
      longitude: formData.longitude,
      shop_name: '',
      language: 'Hindi',
      upi_id: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: ''
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Common validations
    if (!formData.name.trim()) {
      toast.error(t('auth.register.errors.nameRequired'));
      return;
    }

    if (!formData.phone.trim()) {
      toast.error(t('auth.register.errors.phoneRequired'));
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error(t('auth.register.errors.invalidPhone'));
      return;
    }

    if (!formData.password) {
      toast.error(t('auth.register.errors.passwordRequired'));
      return;
    }

    if (formData.password.length < 6) {
      toast.error(t('auth.register.errors.passwordTooShort'));
      return;
    }

    if (!formData.confirmPassword) {
      toast.error(t('auth.register.errors.confirmPasswordRequired'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.register.errors.passwordMismatch'));
      return;
    }

    // Retailer specific validations
    if (userType === 'retailer') {
      if (!formData.shop_name.trim()) {
        toast.error(t('auth.register.errors.shopNameRequired'));
        return;
      }

      if (!formData.upi_id.trim()) {
        toast.error(t('auth.register.errors.upiRequired'));
        return;
      }

      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(formData.upi_id)) {
        toast.error(t('auth.register.errors.invalidUpi'));
        return;
      }
    }

    // Customer specific validations
    if (userType === 'customer') {
      if (!formData.email.trim()) {
        toast.error(t('auth.register.errors.emailRequired'));
        return;
      }

      if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
        toast.error(t('auth.register.errors.invalidEmail'));
        return;
      }
    }

    // Terms and conditions validation
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms and Conditions to continue');
      return;
    }

    setIsLoading(true);

    try {
      if (userType === 'retailer') {
        const { confirmPassword, email, address, ...registrationData } = formData;
        const result = await register(registrationData);
        if (result.success) {
          // Remember me functionality
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedPhone', formData.phone);
          }
          
          toast.success(t('auth.register.success'));
          if (registrationData.latitude && registrationData.longitude) {
            toast.success('📍 Your store is now discoverable by nearby customers!');
          }
          // Delay navigation to show toast
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          toast.error(result.message || t('auth.register.errors.registrationFailed'));
        }
      } else {
        // Customer registration - API call
        let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        // Remove /api suffix if present to avoid double /api/api/
        API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
        
        const registrationData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          locality: formData.locality,
          latitude: formData.latitude,
          longitude: formData.longitude
        };
        
        console.log('Sending registration data:', registrationData);
        
        const response = await fetch(`${API_BASE_URL}/api/customer-auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });

        const result = await response.json();

        console.log('Registration response:', result);
        console.log('Response status:', response.status);

        if (result.success) {
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('userType', 'customer');
          
          // Remember me functionality
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', formData.email);
          }
          
          toast.success(t('auth.register.success'));
          if (formData.latitude && formData.longitude) {
            toast.success('📍 You can now find nearby stores!');
          }
          // Delay navigation to show toast
          setTimeout(() => navigate('/customer-dashboard'), 1000);
        } else {
          toast.error(result.message || t('auth.register.errors.registrationFailed'));
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(t('auth.register.errors.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-black dark:to-gray-900 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-primary-600 p-2 sm:p-3 rounded-full shadow-lg">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.register.title')}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t('auth.register.subtitle')}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-1 flex space-x-1">
          <button
            type="button"
            onClick={() => handleTabChange('retailer')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${userType === 'retailer'
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
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${userType === 'customer'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
          >
            <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{t('auth.login.customer')}</span>
          </button>
        </div>

        {/* Registration Form */}
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 bg-white dark:bg-black border border-transparent dark:border-gray-800 rounded-lg shadow-md p-6 sm:p-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-white">
                Full Name *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field pl-10 text-sm"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field pl-10 text-sm"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* GPS Location Section - Common for both */}
            <div className="md:col-span-2 bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                    {userType === 'retailer' ? 'Store Location' : 'Your Location'}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {userType === 'retailer'
                      ? 'Help customers find your store easily!'
                      : 'Find nearby stores within your area!'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestGPSLocation}
                  disabled={gpsStatus === 'loading'}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${gpsStatus === 'success'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : gpsStatus === 'loading'
                        ? 'bg-gray-100 text-gray-500 cursor-wait'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {gpsStatus === 'loading' ? '📍 Capturing...' : gpsStatus === 'success' ? '✅ GPS Set' : '📍 Capture GPS'}
                </button>
              </div>

              {gpsStatus === 'success' && formData.latitude && formData.longitude && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 mb-3">
                  <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                    ✅ GPS Location Captured Successfully!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {gpsStatus === 'error' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ Could not capture GPS. Please enter your locality manually below.
                  </p>
                </div>
              )}

              {!formData.latitude && !formData.longitude && gpsStatus === 'not_set' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ GPS not set. {userType === 'retailer' ? 'Set location to be discovered by nearby customers.' : 'Set location to find nearby stores.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="locality" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Locality / Area Name
                  </label>
                  <input
                    id="locality"
                    name="locality"
                    type="text"
                    value={formData.locality}
                    onChange={handleChange}
                    className="input-field text-sm mt-1"
                    placeholder="e.g., Banjara Hills, Jubilee Hills"
                  />
                </div>
              </div>
            </div>

            {/* Conditional Fields based on userType */}
            {userType === 'customer' && (
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10 text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            )}

            {userType === 'retailer' && (
              <>
                <div>
                  <label htmlFor="shop_name" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Shop/Business Name *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      id="shop_name"
                      name="shop_name"
                      type="text"
                      value={formData.shop_name}
                      onChange={handleChange}
                      className="input-field pl-10 text-sm"
                      placeholder="Your shop/business name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="language" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Preferred Language
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="input-field text-sm"
                  >
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Punjabi">Punjabi</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="upi_id" className="block text-xs sm:text-sm font-medium text-gray-700">
                    UPI ID *
                  </label>
                  <input
                    id="upi_id"
                    name="upi_id"
                    type="text"
                    value={formData.upi_id}
                    onChange={handleChange}
                    className="input-field text-sm"
                    placeholder="yourname@paytm"
                  />
                </div>
              </>
            )}

            {userType === 'customer' && (
              <>
                <div className="md:col-span-2">
                  <label htmlFor="address.street" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      id="address.street"
                      name="address.street"
                      type="text"
                      value={formData.address.street}
                      onChange={handleChange}
                      className="input-field pl-10 text-sm"
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address.city" className="block text-xs sm:text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    id="address.city"
                    name="address.city"
                    type="text"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="input-field text-sm"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label htmlFor="address.state" className="block text-xs sm:text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    id="address.state"
                    name="address.state"
                    type="text"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="input-field text-sm"
                    placeholder="State"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address.pincode" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Pincode
                  </label>
                  <input
                    id="address.pincode"
                    name="address.pincode"
                    type="text"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    className="input-field text-sm"
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                </div>
              </>
            )}

            {/* Password Fields */}
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10 text-sm"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10 text-sm"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-xs sm:text-sm text-gray-900 dark:text-gray-300">
              I agree to the{' '}
              <button type="button" className="text-primary-600 hover:text-primary-500">
                Terms and Conditions
              </button>{' '}
              and{' '}
              <button type="button" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </button>
            </label>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-900 dark:text-gray-300">
              Remember me
            </label>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? t('auth.register.creatingAccount') : t('auth.register.createAccountButton')}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <span className="text-xs sm:text-sm text-gray-600">
              {t('auth.register.haveAccount')}{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                {t('auth.register.signInLink')}
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterNew;
