/**
 * Test Customer Registration
 * Quick test to verify customer registration endpoint
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testCustomerRegistration() {
  console.log('\n🧪 Testing Customer Registration');
  console.log('API URL:', API_URL);
  
  const testData = {
    name: 'Test Customer',
    email: `test${Date.now()}@example.com`, // Unique email
    password: 'test123',
    phone: '', // Empty phone
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    locality: '',
    latitude: null,
    longitude: null
  };
  
  console.log('\n📤 Sending data:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await axios.post(`${API_URL}/api/customer-auth/register`, testData);
    
    console.log('\n✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.log('\n❌ Registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.errors) {
      console.log('\n📋 Validation Errors:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.msg} (${err.param})`);
      });
    }
    
    return false;
  }
}

// Run test
testCustomerRegistration().then(success => {
  if (success) {
    console.log('\n🎉 Test passed!');
    process.exit(0);
  } else {
    console.log('\n💔 Test failed!');
    process.exit(1);
  }
});
