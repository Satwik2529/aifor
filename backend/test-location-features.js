/**
 * Test Location Features
 * Tests location update and nearby shops endpoints
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test credentials - update these with your test account
const RETAILER_CREDENTIALS = {
  phone: '9876543210',
  password: 'test123'
};

const CUSTOMER_CREDENTIALS = {
  email: 'customer@test.com',
  password: 'test123'
};

// Test location data
const TEST_LOCATION = {
  latitude: 26.249273,
  longitude: 78.169700,
  locality: 'Test Area'
};

let retailerToken = '';
let customerToken = '';

// Helper function to log results
const log = (title, data) => {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
  console.log(JSON.stringify(data, null, 2));
};

// Test 1: Login as retailer
async function testRetailerLogin() {
  try {
    console.log('\n🔐 Test 1: Retailer Login');
    const response = await axios.post(`${API_URL}/api/auth/login`, RETAILER_CREDENTIALS);
    
    if (response.data.success) {
      retailerToken = response.data.data.token;
      console.log('✅ Retailer login successful');
      console.log('Token:', retailerToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Retailer login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Retailer login error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 2: Update retailer location
async function testRetailerUpdateLocation() {
  try {
    console.log('\n📍 Test 2: Update Retailer Location');
    const response = await axios.put(
      `${API_URL}/api/auth/update-location`,
      TEST_LOCATION,
      {
        headers: { Authorization: `Bearer ${retailerToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Retailer location updated successfully');
      log('Response Data', response.data);
      return true;
    } else {
      console.log('❌ Update failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Update error:', error.response?.data?.message || error.message);
    console.log('Status:', error.response?.status);
    console.log('URL:', error.config?.url);
    return false;
  }
}

// Test 3: Get retailer profile (verify location)
async function testRetailerProfile() {
  try {
    console.log('\n👤 Test 3: Get Retailer Profile');
    const response = await axios.get(
      `${API_URL}/api/auth/profile`,
      {
        headers: { Authorization: `Bearer ${retailerToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Profile retrieved successfully');
      const user = response.data.data.user;
      console.log('Location Data:');
      console.log('  Latitude:', user.latitude);
      console.log('  Longitude:', user.longitude);
      console.log('  Locality:', user.locality);
      console.log('  Has GPS:', user.has_gps);
      return true;
    } else {
      console.log('❌ Profile fetch failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Profile error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 4: Login as customer
async function testCustomerLogin() {
  try {
    console.log('\n🔐 Test 4: Customer Login');
    const response = await axios.post(`${API_URL}/api/customer-auth/login`, CUSTOMER_CREDENTIALS);
    
    if (response.data.success) {
      customerToken = response.data.data.token;
      console.log('✅ Customer login successful');
      console.log('Token:', customerToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Customer login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Customer login error:', error.response?.data?.message || error.message);
    console.log('💡 Tip: Create a customer account first or update CUSTOMER_CREDENTIALS');
    return false;
  }
}

// Test 5: Update customer location
async function testCustomerUpdateLocation() {
  try {
    console.log('\n📍 Test 5: Update Customer Location');
    const customerLocation = {
      latitude: 26.250000,
      longitude: 78.171000,
      locality: 'Customer Area'
    };
    
    const response = await axios.put(
      `${API_URL}/api/customer-auth/update-location`,
      customerLocation,
      {
        headers: { Authorization: `Bearer ${customerToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Customer location updated successfully');
      log('Response Data', response.data);
      return true;
    } else {
      console.log('❌ Update failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Update error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 6: Get nearby shops
async function testNearbyShops() {
  try {
    console.log('\n🏪 Test 6: Get Nearby Shops');
    const response = await axios.get(
      `${API_URL}/api/nearby-shops`,
      {
        params: {
          latitude: 26.250000,
          longitude: 78.171000,
          radius: 10
        },
        headers: { Authorization: `Bearer ${customerToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Nearby shops retrieved successfully');
      console.log(`Found ${response.data.data.count} shops within ${response.data.data.radius}km`);
      
      if (response.data.data.shops.length > 0) {
        console.log('\nShops:');
        response.data.data.shops.forEach((shop, index) => {
          console.log(`  ${index + 1}. ${shop.shop_name || shop.name} - ${shop.distance}km away`);
        });
      } else {
        console.log('⚠️  No shops found in this radius');
      }
      return true;
    } else {
      console.log('❌ Nearby shops failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Nearby shops error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test 7: Test different radii
async function testDifferentRadii() {
  try {
    console.log('\n📏 Test 7: Test Different Radii');
    const radii = [5, 10, 20, 50];
    
    for (const radius of radii) {
      const response = await axios.get(
        `${API_URL}/api/nearby-shops`,
        {
          params: {
            latitude: 26.250000,
            longitude: 78.171000,
            radius: radius
          },
          headers: { Authorization: `Bearer ${customerToken}` }
        }
      );
      
      if (response.data.success) {
        console.log(`  ${radius}km: ${response.data.data.count} shops found`);
      }
    }
    return true;
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Starting Location Features Tests');
  console.log('API URL:', API_URL);
  
  const results = {
    retailerLogin: false,
    retailerUpdateLocation: false,
    retailerProfile: false,
    customerLogin: false,
    customerUpdateLocation: false,
    nearbyShops: false,
    differentRadii: false
  };
  
  // Retailer tests
  results.retailerLogin = await testRetailerLogin();
  if (results.retailerLogin) {
    results.retailerUpdateLocation = await testRetailerUpdateLocation();
    results.retailerProfile = await testRetailerProfile();
  }
  
  // Customer tests
  results.customerLogin = await testCustomerLogin();
  if (results.customerLogin) {
    results.customerUpdateLocation = await testCustomerUpdateLocation();
    results.nearbyShops = await testNearbyShops();
    results.differentRadii = await testDifferentRadii();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log('\n' + `${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Location features are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
