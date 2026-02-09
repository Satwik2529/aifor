/**
 * Test Customer Profile Update - Fresh Customer
 * Tests the complete flow with a new customer
 */

const API_URL = 'http://localhost:5000';

// Fresh test customer
const testCustomer = {
  email: `fresh.customer.${Date.now()}@example.com`,
  password: 'password123',
  name: 'Fresh Customer',
  phone: '8888888888'
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

async function testFreshCustomer() {
  console.log('🧪 ============ FRESH CUSTOMER PROFILE TEST ============\n');

  try {
    // Step 1: Register new customer
    console.log('📝 Step 1: Register new customer...');
    console.log('   Email:', testCustomer.email);
    
    const registerResult = await makeRequest('POST', '/api/customer-auth/register', testCustomer);

    if (!registerResult.success) {
      console.error('❌ Registration failed:', registerResult);
      return;
    }

    const token = registerResult.data.token;
    console.log('✅ Customer registered successfully');
    console.log('   Token:', token.substring(0, 20) + '...');
    console.log('   Customer:', registerResult.data.customer.name);
    console.log('   Has avatar field:', 'avatar' in registerResult.data.customer);
    console.log('   Has updatedAt field:', 'updatedAt' in registerResult.data.customer);
    console.log('');

    // Step 2: Get profile
    console.log('📝 Step 2: Get initial profile...');
    const profileResult = await makeAuthRequest('GET', '/api/customer-auth/profile', token);
    
    if (!profileResult.success) {
      console.error('❌ Failed to get profile:', profileResult);
      return;
    }

    console.log('✅ Initial profile:');
    console.log('   Name:', profileResult.data.customer.name);
    console.log('   Email:', profileResult.data.customer.email);
    console.log('   Phone:', profileResult.data.customer.phone);
    console.log('   Avatar:', profileResult.data.customer.avatar);
    console.log('   Has updatedAt:', 'updatedAt' in profileResult.data.customer);
    console.log('');

    // Step 3: Update profile with new data
    console.log('📝 Step 3: Update profile with new data...');
    const updateData = {
      name: 'Updated Fresh Customer',
      phone: '7777777777',
      address: {
        street: '456 New Street',
        city: 'New City',
        state: 'New State',
        pincode: '654321'
      }
    };

    console.log('   Update data:', JSON.stringify(updateData, null, 2));
    
    const updateResult = await makeAuthRequest('PUT', '/api/customer-auth/profile', token, updateData);
    
    if (!updateResult.success) {
      console.error('❌ Profile update failed:', updateResult);
      return;
    }

    console.log('✅ Profile updated successfully!');
    console.log('   Response has avatar:', 'avatar' in updateResult.data.customer);
    console.log('   Response has updatedAt:', 'updatedAt' in updateResult.data.customer);
    console.log('   Updated customer:', JSON.stringify(updateResult.data.customer, null, 2));
    console.log('');

    // Step 4: Verify update by fetching again
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
    console.log('   Avatar:', verifyResult.data.customer.avatar);
    console.log('   UpdatedAt:', verifyResult.data.customer.updatedAt);
    console.log('');

    // Check if updates were applied
    const nameMatch = verifyResult.data.customer.name === updateData.name;
    const phoneMatch = verifyResult.data.customer.phone === updateData.phone;
    const addressMatch = verifyResult.data.customer.address.city === updateData.address.city;
    const hasAvatar = 'avatar' in verifyResult.data.customer;
    const hasUpdatedAt = 'updatedAt' in verifyResult.data.customer;

    console.log('📊 Verification Results:');
    console.log('   ✅ Name updated:', nameMatch);
    console.log('   ✅ Phone updated:', phoneMatch);
    console.log('   ✅ Address updated:', addressMatch);
    console.log('   ✅ Avatar field present:', hasAvatar);
    console.log('   ✅ UpdatedAt field present:', hasUpdatedAt);
    console.log('');

    if (nameMatch && phoneMatch && addressMatch && hasAvatar && hasUpdatedAt) {
      console.log('✅ ============ ALL TESTS PASSED ============');
    } else {
      console.log('❌ ============ SOME TESTS FAILED ============');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
  }
}

// Run test
testFreshCustomer();
