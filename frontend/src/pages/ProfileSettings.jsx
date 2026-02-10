import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building2, FileText, Briefcase, Hash, Save, Navigation, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

/**
 * Profile Settings Page
 * Allows both Retailers and Customers to view and edit their profile information
 */
const ProfileSettings = () => {
  const { user: authUser, updateProfile: updateAuthProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userType, setUserType] = useState('retailer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    avatar: '',
    // Retailer-specific
    shop_name: '',
    shop_description: '',
    business_type: 'Retail',
    gst_number: '',
    language: 'Hindi',
    upi_id: '',
    // Wholesaler-specific
    wholesalerProfile: {
      businessName: '',
      businessType: '',
      gstNumber: '',
      minOrderValue: '',
      deliveryRadius: '',
      paymentModes: [],
      description: ''
    }
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  API_URL = API_URL.replace(/\/api$/, '');

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUserType = localStorage.getItem('userType') || 'retailer';
      setUserType(storedUserType);

      const endpoint = storedUserType === 'customer'
        ? `${API_URL}/api/customer-auth/profile`
        : `${API_URL}/api/auth/profile`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        const profileData = storedUserType === 'customer' ? result.data.customer : result.data.user;
        setFormData({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          address: profileData.address || { street: '', city: '', state: '', pincode: '' },
          avatar: profileData.avatar || '',
          shop_name: profileData.shop_name || '',
          shop_description: profileData.shop_description || '',
          business_type: profileData.business_type || 'Retail',
          gst_number: profileData.gst_number || '',
          language: profileData.language || 'Hindi',
          upi_id: profileData.upi_id || '',
          wholesalerProfile: profileData.wholesalerProfile || {
            businessName: '',
            businessType: '',
            gstNumber: '',
            minOrderValue: '',
            deliveryRadius: '',
            paymentModes: [],
            description: ''
          }
        });
        setLastUpdated(profileData.updatedAt);
        
        // Set location data if available
        if (profileData.latitude && profileData.longitude) {
          setLocationData({
            latitude: profileData.latitude,
            longitude: profileData.longitude,
            locality: profileData.locality,
            updatedAt: profileData.updatedAt
          });
        }
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else if (name.startsWith('wholesalerProfile.')) {
      const field = name.split('.')[1];

      // Handle payment modes checkboxes
      if (field === 'paymentModes') {
        const mode = value;
        setFormData(prev => ({
          ...prev,
          wholesalerProfile: {
            ...prev.wholesalerProfile,
            paymentModes: checked
              ? [...prev.wholesalerProfile.paymentModes, mode]
              : prev.wholesalerProfile.paymentModes.filter(m => m !== mode)
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          wholesalerProfile: {
            ...prev.wholesalerProfile,
            [field]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // For retailers, use AuthContext which updates both state and localStorage
      if (userType === 'retailer') {
        const result = await updateAuthProfile(formData);

        if (result.success) {
          toast.success('✅ Profile updated successfully!');
          setLastUpdated(new Date().toISOString());
          // Refresh profile data
          await fetchProfile();
        } else {
          toast.error(result.message || 'Failed to update profile');
        }
      } else {
        // For customers, direct API call
        const token = localStorage.getItem('token');
        const endpoint = `${API_URL}/api/customer-auth/profile`;

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
          toast.success('✅ Profile updated successfully!');
          setLastUpdated(new Date().toISOString());
          // Update localStorage for customer
          const userData = result.data.customer;
          // Profile updated successfully - no need to store in localStorage
          // Refresh profile data
          await fetchProfile();
        } else {
          toast.error(result.message || 'Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Network error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setUpdatingLocation(true);
    toast.loading('Capturing location...', { id: 'location-update' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = localStorage.getItem('token');
          const endpoint = userType === 'customer'
            ? `${API_URL}/api/customer-auth/update-location`
            : `${API_URL}/api/auth/update-location`;

          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            })
          });

          const result = await response.json();

          if (result.success) {
            setLocationData({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              locality: result.data.locality || locationData?.locality,
              updatedAt: new Date().toISOString()
            });
            toast.success('📍 Location updated successfully!', { id: 'location-update' });
          } else {
            toast.error(result.message || 'Failed to update location', { id: 'location-update' });
          }
        } catch (error) {
          console.error('Location update error:', error);
          toast.error('Network error updating location', { id: 'location-update' });
        } finally {
          setUpdatingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Could not get location';
        if (error.code === 1) {
          errorMessage = 'Location permission denied';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable';
        } else if (error.code === 3) {
          errorMessage = 'Location request timeout';
        }
        toast.error(errorMessage, { id: 'location-update' });
        setUpdatingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your personal and business information</p>
        {lastUpdated && (
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address {userType === 'customer' && '*'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  readOnly={userType === 'customer'}
                />
              </div>
              {userType === 'customer' && (
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {/* Language (Retailer only) */}
            {userType === 'retailer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            )}
          </div>
        </div>

        {/* Address Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Address Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Street */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter street address"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter city"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter state"
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="6-digit pincode"
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Location Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary-600" />
            Location Information
          </h2>

          {locationData && locationData.latitude && locationData.longitude ? (
            <div className="space-y-4">
              {/* Location Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Latitude</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {locationData.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Longitude</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {locationData.longitude.toFixed(6)}
                    </p>
                  </div>
                  {locationData.locality && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-600 mb-1">Locality</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {locationData.locality}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                    <p className="text-sm text-gray-900">
                      {new Date(locationData.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleUpdateLocation}
                  disabled={updatingLocation}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      <span>Update Location</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in Google Maps</span>
                </a>
              </div>

              {/* Info Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ {userType === 'retailer' 
                    ? 'Your store is discoverable by nearby customers!' 
                    : 'You can find nearby stores in your area!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* No Location Set */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  ⚠️ Location not set. {userType === 'retailer'
                    ? 'Set your location to be discovered by nearby customers.'
                    : 'Set your location to find nearby stores.'}
                </p>
                <button
                  type="button"
                  onClick={handleUpdateLocation}
                  disabled={updatingLocation}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Capturing...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      <span>Capture Location</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Business Information Card (Retailer Only) */}
        {userType === 'retailer' && authUser?.role !== 'wholesaler' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-600" />
              Business Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter shop name"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Briefcase className="inline h-4 w-4 mr-1" />
                  Business Type
                </label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Both">Both</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Shop Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Shop Description
                </label>
                <textarea
                  name="shop_description"
                  value={formData.shop_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your business..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.shop_description.length}/500 characters
                </p>
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Hash className="inline h-4 w-4 mr-1" />
                  GST Number
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI ID
                </label>
                <input
                  type="text"
                  name="upi_id"
                  value={formData.upi_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="yourname@upi"
                />
              </div>
            </div>
          </div>
        )}

        {/* Wholesaler Business Information Card */}
        {userType === 'retailer' && authUser?.role === 'wholesaler' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-600" />
              Wholesaler Business Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="wholesalerProfile.businessName"
                  value={formData.wholesalerProfile.businessName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter business name"
                  required
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Briefcase className="inline h-4 w-4 mr-1" />
                  Business Type
                </label>
                <select
                  name="wholesalerProfile.businessType"
                  value={formData.wholesalerProfile.businessType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select type</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Importer">Importer</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Supplier">Supplier</option>
                </select>
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Hash className="inline h-4 w-4 mr-1" />
                  GST Number
                </label>
                <input
                  type="text"
                  name="wholesalerProfile.gstNumber"
                  value={formData.wholesalerProfile.gstNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>

              {/* Min Order Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Order Value (₹)
                </label>
                <input
                  type="number"
                  name="wholesalerProfile.minOrderValue"
                  value={formData.wholesalerProfile.minOrderValue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 5000"
                  min="0"
                />
              </div>

              {/* Delivery Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Radius (km)
                </label>
                <input
                  type="number"
                  name="wholesalerProfile.deliveryRadius"
                  value={formData.wholesalerProfile.deliveryRadius}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 50"
                  min="0"
                />
              </div>

              {/* Payment Modes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accepted Payment Modes
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Credit'].map(mode => (
                    <label key={mode} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="wholesalerProfile.paymentModes"
                        value={mode}
                        checked={formData.wholesalerProfile.paymentModes.includes(mode)}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Business Description
                </label>
                <textarea
                  name="wholesalerProfile.description"
                  value={formData.wholesalerProfile.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your wholesale business, products, and services..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.wholesalerProfile.description.length}/500 characters
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={fetchProfile}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
