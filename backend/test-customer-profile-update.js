/**
 * Test Customer Profile Update
 * Tests the customer profile update endpoint
 */

const API_URL = 'http://localhost:5000';

// Test customer credentials
const testCustomer = {
  email: 'test.customer@example.com',
  password: 'password123',
  name: 'Test Customer'
};

async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  return await response.json();
}

async function makeAuthRequest(method, endpoint, token, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  return await response.json();
}

async function testCustomerProfileUpdate() {
  console.log('🧪 ============ CUSTOMER PROFILE UPDATE TEST ============\n');

  try {
    // Step 1: Login or Register
    console.log('📝 Step 1: Login/Register customer...');
    let loginResult = await makeRequest('POST', '/api/customer-auth/login', {
      email: testCustomer.email,
      password: testCustomer.password
    });

    if (!loginResult.success) {
      console.log('   Customer not found, registering...');
      const registerResult = await makeRequest('POST', '/api/customer-auth/register', {
        name: testCustomer.name,
        email: testCustomer.email,
        password: testCustomer.password,
        phone: '9876543210'
      });

      if (!registerResult.success) {
        console.error('❌ Registration failed:', registerResult);
        return;
      }

      loginResult = registerResult;
    }

    const token = loginResult.data.token;
    console.log('✅ Logged in successfully');
    console.log('   Token:', token.substring(0, 20) + '...');
    console.log('   Customer:', loginResult.data.customer.name);
    console.log('');

    // Step 2: Get current profile
    console.log('📝 Step 2: Get current profile...');
    const profileResult = await makeAuthRequest('GET', '/api/customer-auth/profile', token);
    
    if (!profileResult.success) {
      console.error('❌ Failed to get profile:', profileResult);
      return;
    }

    console.log('✅ Current profile:');
    console.log('   Name:', profileResult.data.customer.name);
    console.log('   Email:', profileResult.data.customer.email);
    console.log('   Phone:', profileResult.data.customer.phone);
    console.log('   Address:', JSON.stringify(profileResult.data.customer.address));
    console.log('');

    // Step 3: Update profile
    console.log('📝 Step 3: Update profile...');
    const updateData = {
      name: 'Updated Customer Name',
      phone: '9999999999',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      }
    };

    console.log('   Update data:', JSON.stringify(updateData, null, 2));
    
    const updateResult = await makeAuthRequest('PUT', '/api/customer-auth/profile', token, updateData);
    
    if (!updateResult.success) {
      console.error('❌ Profile update failed:', updateResult);
      return;
    }

    console.log('✅ Profile updated successfully!');
    console.log('   Updated customer:', JSON.stringify(updateResult.data.customer, null, 2));
    console.log('');

    // Step 4: Verify update
    console.log('📝 Step 4: Verify update...');
    const verifyResult = await makeAuthRequest('GET', '/api/customer-auth/profile', token);
    
    if (!verifyResult.success) {
      console.error('❌ Failed to verify:', verifyResult);
      return;
    }

    console.log('✅ Verified profile:');
    console.log('   Name:', verifyResult.data.customer.name);
    console.log('   Phone:', verifyResult.data.customer.phone);
    console.log('   Address:', JSON.stringify(verifyResult.data.customer.address));
    console.log('');

    // Check if updates were applied
    const nameMatch = verifyResult.data.customer.name === updateData.name;
    const phoneMatch = verifyResult.data.customer.phone === updateData.phone;
    const addressMatch = verifyResult.data.customer.address.city === updateData.address.city;

    if (nameMatch && phoneMatch && addressMatch) {
      console.log('✅ ============ ALL TESTS PASSED ============');
    } else {
      console.log('❌ ============ SOME UPDATES FAILED ============');
      console.log('   Name match:', nameMatch);
      console.log('   Phone match:', phoneMatch);
      console.log('   Address match:', addressMatch);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
  }
}

// Run test
testCustomerProfileUpdate();
