import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Store, Phone, Mail, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Nearby Shops Page
 * Allows customers to find shops within a specified radius
 */
const NearbyShops = () => {
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedRadius, setSelectedRadius] = useState(10); // Default 10km
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  API_URL = API_URL.replace(/\/api$/, '');

  // Get user's current location on mount
  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    toast.loading('Getting your location...', { id: 'location' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        toast.success('Location captured!', { id: 'location' });
        setGettingLocation(false);
        // Automatically search for shops
        searchNearbyShops(location.latitude, location.longitude, selectedRadius);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Could not get location';
        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please enable location access.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable';
        } else if (error.code === 3) {
          errorMessage = 'Location request timeout';
        }
        toast.error(errorMessage, { id: 'location' });
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const searchNearbyShops = async (lat, lon, radius) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/nearby-shops?latitude=${lat}&longitude=${lon}&radius=${radius}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        setShops(result.data.shops);
        if (result.data.shops.length === 0) {
          toast('No shops found in this radius. Try increasing the search radius.', { icon: 'ℹ️' });
        } else {
          toast.success(`Found ${result.data.shops.length} shops nearby!`);
        }
      } else {
        toast.error(result.message || 'Failed to fetch nearby shops');
      }
    } catch (error) {
      console.error('Nearby shops error:', error);
      toast.error('Network error fetching shops');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (radius) => {
    setSelectedRadius(radius);
    if (userLocation) {
      searchNearbyShops(userLocation.latitude, userLocation.longitude, radius);
    }
  };

  const getDirections = (shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${shop.latitude},${shop.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary-600" />
          Nearby Shops
        </h1>
        <p className="text-gray-600">Find shops near your location</p>
      </div>

      {/* Location Status */}
      {!userLocation && !gettingLocation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 mb-3">
            📍 Location not set. Please allow location access to find nearby shops.
          </p>
          <button
            onClick={getUserLocation}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            <span>Get My Location</span>
          </button>
        </div>
      )}

      {gettingLocation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-800">Getting your location...</p>
          </div>
        </div>
      )}

      {userLocation && (
        <>
          {/* Radius Selector */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Radius</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[5, 10, 20, 50].map((radius) => (
                <button
                  key={radius}
                  onClick={() => handleRadiusChange(radius)}
                  disabled={loading}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    selectedRadius === radius
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {radius} km
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Searching for shops...</p>
              </div>
            </div>
          )}

          {/* Shops List */}
          {!loading && shops.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Found {shops.length} shop{shops.length !== 1 ? 's' : ''} within {selectedRadius}km
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Shop Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-100 p-3 rounded-full">
                          <Store className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {shop.shop_name || shop.name}
                          </h3>
                          <p className="text-sm text-gray-600">{shop.name}</p>
                        </div>
                      </div>
                      <div className="bg-green-100 px-3 py-1 rounded-full">
                        <p className="text-sm font-semibold text-green-700">
                          {shop.distance} km
                        </p>
                      </div>
                    </div>

                    {/* Shop Details */}
                    <div className="space-y-2 mb-4">
                      {shop.locality && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{shop.locality}</span>
                        </div>
                      )}
                      {shop.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{shop.phone}</span>
                        </div>
                      )}
                      {shop.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{shop.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    {shop.address && (shop.address.street || shop.address.city) && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700">
                          {[
                            shop.address.street,
                            shop.address.city,
                            shop.address.state,
                            shop.address.pincode
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => getDirections(shop)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>Directions</span>
                      </button>
                      <a
                        href={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Shops Found */}
          {!loading && shops.length === 0 && userLocation && (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No shops found
              </h3>
              <p className="text-gray-600 mb-4">
                Try increasing the search radius to find more shops.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NearbyShops;
