/**
 * Test Location Update Fix
 * Verifies that updating location properly sets GeoJSON location field
 * Run: node test-location-update.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function testLocationUpdate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB');

    // Find a retailer
    const retailer = await User.findOne({ role: 'retailer' });

    if (!retailer) {
      console.log('⚠️ No retailer found. Create one first.');
      process.exit(0);
    }

    console.log('\n📋 Testing Location Update for Retailer:');
    console.log('ID:', retailer._id);
    console.log('Name:', retailer.name);
    console.log('Shop:', retailer.shop_name);

    console.log('\n📍 Before Update:');
    console.log('Latitude:', retailer.latitude);
    console.log('Longitude:', retailer.longitude);
    console.log('Location (GeoJSON):', retailer.location);

    // Update location
    const testLat = 28.6139; // Delhi
    const testLng = 77.2090;

    console.log('\n🔄 Updating location...');
    retailer.latitude = testLat;
    retailer.longitude = testLng;
    retailer.locality = 'Test Locality';

    // This should trigger the pre-save hook
    await retailer.save();

    console.log('\n📍 After Update:');
    console.log('Latitude:', retailer.latitude);
    console.log('Longitude:', retailer.longitude);
    console.log('Locality:', retailer.locality);
    console.log('Location (GeoJSON):', retailer.location);

    // Verify GeoJSON is correct
    if (retailer.location && 
        retailer.location.type === 'Point' &&
        retailer.location.coordinates[0] === testLng &&
        retailer.location.coordinates[1] === testLat) {
      console.log('\n✅ SUCCESS: GeoJSON location is correctly set!');
      console.log('   Coordinates: [lng, lat] =', retailer.location.coordinates);
    } else {
      console.log('\n❌ FAILED: GeoJSON location is not correct!');
      console.log('   Expected: [', testLng, ',', testLat, ']');
      console.log('   Got:', retailer.location?.coordinates);
    }

    // Test geospatial query
    console.log('\n🔍 Testing Geospatial Query...');
    const nearbyRetailers = await User.find({
      role: 'retailer',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [testLng, testLat]
          },
          $maxDistance: 10000 // 10km
        }
      }
    }).limit(5);

    console.log('Found', nearbyRetailers.length, 'retailers within 10km');
    nearbyRetailers.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.shop_name || r.name} - [${r.location?.coordinates}]`);
    });

    if (nearbyRetailers.length > 0) {
      console.log('\n✅ Geospatial query works!');
    } else {
      console.log('\n⚠️ No retailers found in geospatial query');
      console.log('   Make sure 2dsphere index exists on location field');
    }

    await mongoose.connection.close();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testLocationUpdate();
