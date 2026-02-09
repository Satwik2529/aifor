const User = require('../models/User');

/**
 * Nearby Shops Controller
 * Finds shops within a specified radius using Haversine formula
 */

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in kilometers
};

const nearbyShopsController = {
  // Get nearby shops
  getNearbyShops: async (req, res) => {
    try {
      const { latitude, longitude, radius } = req.query;

      // Validate required parameters
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // Parse and validate coordinates
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const searchRadius = radius ? parseFloat(radius) : 10; // Default 10km

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      if (isNaN(searchRadius) || searchRadius <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid radius'
        });
      }

      console.log(`🔍 Searching for shops within ${searchRadius}km of [${lat}, ${lon}]`);

      // Find all retailers with location data
      const retailers = await User.find({
        role: 'retailer',
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null }
      }).select('name shop_name email phone address locality latitude longitude avatar_url');

      // Calculate distance for each retailer and filter by radius
      const shopsWithDistance = retailers
        .map(shop => {
          const distance = calculateDistance(lat, lon, shop.latitude, shop.longitude);
          return {
            id: shop._id,
            name: shop.name,
            shop_name: shop.shop_name,
            email: shop.email,
            phone: shop.phone,
            address: shop.address,
            locality: shop.locality,
            latitude: shop.latitude,
            longitude: shop.longitude,
            avatar_url: shop.avatar_url,
            distance: parseFloat(distance.toFixed(2)) // Round to 2 decimal places
          };
        })
        .filter(shop => shop.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)

      console.log(`✅ Found ${shopsWithDistance.length} shops within ${searchRadius}km`);

      res.status(200).json({
        success: true,
        message: `Found ${shopsWithDistance.length} shops within ${searchRadius}km`,
        data: {
          shops: shopsWithDistance,
          searchLocation: {
            latitude: lat,
            longitude: lon
          },
          radius: searchRadius,
          count: shopsWithDistance.length
        }
      });
    } catch (error) {
      console.error('❌ Nearby shops error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby shops',
        error: error.message
      });
    }
  }
};

module.exports = nearbyShopsController;
