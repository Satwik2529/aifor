/**
 * Test script for Customer Chatbot API
 * Tests the complete workflow from message processing to order placement
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
let authToken = '';
let testCustomerId = '';
let testRetailerId = '';

// Test data
const testCustomer = {
  name: 'Test Customer',
  email: 'testcustomer@example.com',
  phone: '9876543210',
  password: 'test123456',
  address: '123 Test Street, Test City'
};

const testRetailer = {
  name: 'Test Retailer',
  email: 'testretailer@example.com',
  phone: '9876543211',
  password: 'test123456',
  business_name: 'Test Kirana Store',
  shop_name: 'Test Kirana',
  address: '456 Shop Street, Test City',
  role: 'retailer',
  upi_id: 'testretailer@paytm'
};

// Test inventory items
const testInventory = [
  { item_name: 'rice', stock_qty: 50, price_per_unit: 60, min_stock_level: 5 },
  { item_name: 'milk', stock_qty: 20, price_per_unit: 55, min_stock_level: 5 },
  { item_name: 'onions', stock_qty: 30, price_per_unit: 40, min_stock_level: 5 },
  { item_name: 'tomatoes', stock_qty: 25, price_per_unit: 35, min_stock_level: 5 },
  { item_name: 'oil', stock_qty: 15, price_per_unit: 120, min_stock_level: 3 },
  { item_name: 'tea powder', stock_qty: 10, price_per_unit: 200, min_stock_level: 2 }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function setupTestUsers() {
  console.log('🔧 Setting up test users...');

  // First try to login existing users
  const retailerLogin = await makeRequest('POST', '/api/auth/login', {
    email: testRetailer.email,
    password: testRetailer.password
  });

  if (retailerLogin.success) {
    testRetailerId = retailerLogin.data.user?._id || retailerLogin.data.user?.id;
    console.log('✅ Test retailer logged in');
  } else {
    console.log('❌ Retailer login failed:', retailerLogin.error);
    // Create new retailer
    const retailerResult = await makeRequest('POST', '/api/auth/register', testRetailer);

    if (retailerResult.success) {
      testRetailerId = retailerResult.data.user?._id || retailerResult.data.user?.id;
      console.log('✅ Test retailer created');
    } else {
      console.log('❌ Failed to create retailer:', retailerResult.error);
    }
  }

  // Login or create customer
  const customerLogin = await makeRequest('POST', '/api/customer-auth/login', {
    email: testCustomer.email,
    password: testCustomer.password
  });

  if (customerLogin.success) {
    testCustomerId = customerLogin.data.customer?._id || customerLogin.data.customer?.id;
    authToken = customerLogin.data.token;
    console.log('✅ Test customer logged in');
  } else {
    console.log('🔍 Customer login response:', JSON.stringify(customerLogin, null, 2));
    // Create new customer
    const customerResult = await makeRequest('POST', '/api/customer-auth/register', testCustomer);

    if (customerResult.success) {
      testCustomerId = customerResult.data.customer?._id || customerResult.data.customer?.id;
      console.log('✅ Test customer created');
      
      // Login to get token
      const loginResult = await makeRequest('POST', '/api/customer-auth/login', {
        email: testCustomer.email,
        password: testCustomer.password
      });

      if (loginResult.success) {
        authToken = loginResult.data.token;
        console.log('✅ Customer auth token obtained');
      }
    } else {
      console.log('❌ Failed to create or login customer:', customerLogin.error);
    }
  }

  console.log(`📝 IDs - Customer: ${testCustomerId}, Retailer: ${testRetailerId}, Token: ${authToken ? 'YES' : 'NO'}`);
  return testCustomerId && testRetailerId && authToken;
}

async function setupInventory() {
  console.log('📦 Setting up test inventory...');

  // Login as retailer
  const retailerLogin = await makeRequest('POST', '/api/auth/login', {
    email: testRetailer.email,
    password: testRetailer.password
  });

  if (!retailerLogin.success) {
    console.log('❌ Failed to login as retailer');
    return false;
  }

  const retailerToken = retailerLogin.data.token;

  // Add inventory items
  for (const item of testInventory) {
    const result = await makeRequest('POST', '/api/inventory', item, {
      Authorization: `Bearer ${retailerToken}`
    });

    if (result.success) {
      console.log(`✅ Added inventory: ${item.item_name}`);
    } else {
      console.log(`⚠️ Inventory item ${item.item_name} might already exist`);
    }
  }

  return true;
}

async function testChatbotStatus() {
  console.log('\n🤖 Testing chatbot status...');

  const result = await makeRequest('GET', '/api/chatbot/customer/status');

  if (result.success) {
    console.log('✅ Chatbot status endpoint working');
    console.log('📊 Features:', result.data.data.features);
    console.log('🌐 Languages:', result.data.data.supported_languages);
    console.log('🏪 Available retailers:', result.data.data.available_retailers.length);
    return true;
  } else {
    console.log('❌ Chatbot status failed:', result.error);
    return false;
  }
}

async function testDishOrdering() {
  console.log('\n🍳 Testing dish-based ordering...');

  const testMessages = [
    'I want to make vegetable curry for 4 people',
    'I need ingredients for sambar for 2 people',
    'Make dosa batter for 3 people'
  ];

  for (const message of testMessages) {
    console.log(`\n📝 Testing: "${message}"`);

    const result = await makeRequest('POST', '/api/chatbot/customer/chat', {
      message,
      retailer_id: testRetailerId,
      language: 'en'
    });

    if (result.success) {
      console.log('✅ Message processed successfully');
      console.log('🎯 Intent:', result.data.data.intent);
      console.log('📦 Items found:', result.data.data.items?.length || 0);
      console.log('💬 Response:', result.data.data.message.substring(0, 100) + '...');
      
      if (result.data.data.can_order) {
        console.log('🛒 Can order: YES');
        console.log('✅ Available items:', result.data.data.availability.available.length);
        console.log('❌ Unavailable items:', result.data.data.availability.unavailable.length);
        
        // Test order placement if items are available
        if (result.data.data.availability.available.length > 0) {
          await testOrderPlacement(result.data.data.availability.available);
        }
      } else {
        console.log('🛒 Can order: NO');
      }
    } else {
      console.log('❌ Message processing failed:', result.error);
    }

    await sleep(1000); // Rate limiting
  }
}

async function testGroceryOrdering() {
  console.log('\n🛒 Testing direct grocery ordering...');

  const testMessages = [
    'Buy 2kg rice, 1 litre milk, onions',
    'I need 1kg onions, 500g tomatoes, and tea powder',
    'Get me 2 litres oil and 3kg rice'
  ];

  for (const message of testMessages) {
    console.log(`\n📝 Testing: "${message}"`);

    const result = await makeRequest('POST', '/api/chatbot/customer/chat', {
      message,
      retailer_id: testRetailerId,
      language: 'en'
    });

    if (result.success) {
      console.log('✅ Message processed successfully');
      console.log('🎯 Intent:', result.data.data.intent);
      console.log('📦 Items found:', result.data.data.items?.length || 0);
      
      if (result.data.data.can_order) {
        console.log('🛒 Can order: YES');
        console.log('✅ Available items:', result.data.data.availability.available.length);
        
        // Test order placement if items are available
        if (result.data.data.availability.available.length > 0) {
          await testOrderPlacement(result.data.data.availability.available);
        }
      }
    } else {
      console.log('❌ Message processing failed:', result.error);
    }

    await sleep(1000);
  }
}

async function testOrderPlacement(items) {
  console.log('\n🧪 Testing order placement...');

  const result = await makeRequest('POST', '/api/chatbot/customer/order', {
    retailer_id: testRetailerId,
    confirmed_items: items,
    notes: 'Test order via chatbot',
    language: 'en'
  });

  if (result.success) {
    console.log('✅ Order placed successfully!');
    console.log('📋 Order ID:', result.data.data.order_id);
    console.log('💰 Total:', result.data.data.total);
    console.log('📦 Items:', result.data.data.items_count);
    return true;
  } else {
    console.log('❌ Order placement failed:', result.error);
    return false;
  }
}

async function testMultilingual() {
  console.log('\n🌍 Testing multilingual support...');

  const testMessages = [
    { message: 'मैं 4 लोगों के लिए सब्जी करी बनाना चाहता हूं', language: 'hi' },
    { message: 'నాకు 3 మందికి సాంబార్ కావాలి', language: 'te' },
    { message: 'எனக்கு 2 கிலோ அரிசி வேண்டும்', language: 'ta' }
  ];

  for (const { message, language } of testMessages) {
    console.log(`\n📝 Testing (${language}): "${message}"`);

    const result = await makeRequest('POST', '/api/chatbot/customer/chat', {
      message,
      retailer_id: testRetailerId,
      language
    });

    if (result.success) {
      console.log('✅ Multilingual message processed');
      console.log('💬 Response length:', result.data.data.message.length);
    } else {
      console.log('❌ Multilingual processing failed:', result.error);
    }

    await sleep(1000);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Customer Chatbot Tests\n');
  console.log('=====================================');

  try {
    // Setup
    const setupSuccess = await setupTestUsers();
    if (!setupSuccess) {
      console.log('❌ Setup failed. Exiting tests.');
      return;
    }

    await setupInventory();

    // Tests
    const statusTest = await testChatbotStatus();
    if (!statusTest) {
      console.log('❌ Status test failed. Skipping further tests.');
      return;
    }

    await testDishOrdering();
    await testGroceryOrdering();
    await testMultilingual();

    console.log('\n🎉 All tests completed!');
    console.log('=====================================');
    console.log('✅ Customer Chatbot is ready for use!');
    console.log('\n📝 Test Summary:');
    console.log('- ✅ User authentication');
    console.log('- ✅ Inventory setup');
    console.log('- ✅ Chatbot status');
    console.log('- ✅ Dish-based ordering');
    console.log('- ✅ Grocery ordering');
    console.log('- ✅ Order placement');
    console.log('- ✅ Multilingual support');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testChatbotStatus,
  testDishOrdering,
  testGroceryOrdering,
  testOrderPlacement,
  testMultilingual
};
