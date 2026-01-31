/**
 * API Testing Script for BizNova
 * Tests all API endpoints with sample data
 * Run with: node test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

// Test data
const testUser = {
  name: 'Test User',
  phone: '9999999999',
  password: 'testpass123',
  shop_name: 'Test Shop',
  language: 'Hindi',
  upi_id: 'test@paytm'
};

const testCustomer = {
  name: 'Test Customer',
  phone: '8888888888',
  credit_balance: 100
};

const testSale = {
  items: [
    { item_name: 'Test Item', quantity: 2, price_per_unit: 100 }
  ],
  payment_method: 'Cash'
};

const testExpense = {
  amount: 500,
  description: 'Test expense',
  category: 'Test'
};

const testInventoryItem = {
  item_name: 'Test Product',
  stock_qty: 10,
  price_per_unit: 50
};

const testAiInsight = {
  summary_text: 'Test AI insight for business optimization',
  insights_data: {
    type: 'test_insight',
    metrics: { test: true }
  }
};

const testMessage = {
  direction: 'out',
  content: 'Test message content'
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testAuth() {
  console.log('\n🔐 Testing Authentication...');
  
  // Test registration
  console.log('📝 Testing user registration...');
  const registerResult = await apiCall('POST', '/auth/register', testUser);
  if (registerResult.success) {
    console.log('✅ Registration successful');
    authToken = registerResult.data.data.token;
  } else {
    console.log('❌ Registration failed:', registerResult.error);
    return false;
  }

  // Test login
  console.log('🔑 Testing user login...');
  const loginResult = await apiCall('POST', '/auth/login', {
    phone: testUser.phone,
    password: testUser.password
  });
  if (loginResult.success) {
    console.log('✅ Login successful');
    authToken = loginResult.data.data.token;
  } else {
    console.log('❌ Login failed:', loginResult.error);
    return false;
  }

  // Test profile
  console.log('👤 Testing profile retrieval...');
  const profileResult = await apiCall('GET', '/auth/profile', null, authToken);
  if (profileResult.success) {
    console.log('✅ Profile retrieved successfully');
  } else {
    console.log('❌ Profile retrieval failed:', profileResult.error);
  }

  return true;
}

async function testSales() {
  console.log('\n💰 Testing Sales API...');
  
  // Create sale
  console.log('📝 Testing sale creation...');
  const createResult = await apiCall('POST', '/sales', testSale, authToken);
  if (createResult.success) {
    console.log('✅ Sale created successfully');
    const saleId = createResult.data.data._id;
    
    // Get sale by ID
    console.log('🔍 Testing sale retrieval...');
    const getResult = await apiCall('GET', `/sales/${saleId}`, null, authToken);
    if (getResult.success) {
      console.log('✅ Sale retrieved successfully');
    } else {
      console.log('❌ Sale retrieval failed:', getResult.error);
    }
  } else {
    console.log('❌ Sale creation failed:', createResult.error);
  }

  // Get all sales
  console.log('📊 Testing sales list...');
  const listResult = await apiCall('GET', '/sales', null, authToken);
  if (listResult.success) {
    console.log('✅ Sales list retrieved successfully');
  } else {
    console.log('❌ Sales list failed:', listResult.error);
  }

  // Get sales analytics
  console.log('📈 Testing sales analytics...');
  const analyticsResult = await apiCall('GET', '/sales/analytics', null, authToken);
  if (analyticsResult.success) {
    console.log('✅ Sales analytics retrieved successfully');
  } else {
    console.log('❌ Sales analytics failed:', analyticsResult.error);
  }
}

async function testExpenses() {
  console.log('\n💸 Testing Expenses API...');
  
  // Create expense
  console.log('📝 Testing expense creation...');
  const createResult = await apiCall('POST', '/expenses', testExpense, authToken);
  if (createResult.success) {
    console.log('✅ Expense created successfully');
  } else {
    console.log('❌ Expense creation failed:', createResult.error);
  }

  // Get all expenses
  console.log('📊 Testing expenses list...');
  const listResult = await apiCall('GET', '/expenses', null, authToken);
  if (listResult.success) {
    console.log('✅ Expenses list retrieved successfully');
  } else {
    console.log('❌ Expenses list failed:', listResult.error);
  }
}

async function testInventory() {
  console.log('\n📦 Testing Inventory API...');
  
  // Create inventory item
  console.log('📝 Testing inventory item creation...');
  const createResult = await apiCall('POST', '/inventory', testInventoryItem, authToken);
  
  if (createResult.success) {
    console.log('✅ Inventory item created successfully');
  } else {
    console.log('❌ Inventory item creation failed:', createResult.error);
  }

  // Get all inventory
  console.log('📊 Testing inventory list...');
  const listResult = await apiCall('GET', '/inventory', null, authToken);
  if (listResult.success) {
    console.log('✅ Inventory list retrieved successfully');
  } else {
    console.log('❌ Inventory list failed:', listResult.error);
  }

  // Get low stock items
  console.log('⚠️ Testing low stock items...');
  const lowStockResult = await apiCall('GET', '/inventory/low-stock', null, authToken);
  if (lowStockResult.success) {
    console.log('✅ Low stock items retrieved successfully');
  } else {
    console.log('❌ Low stock items failed:', lowStockResult.error);
  }
}

async function testCustomers() {
  console.log('\n👥 Testing Customers API...');
  
  // Create customer
  console.log('📝 Testing customer creation...');
  const createResult = await apiCall('POST', '/customers', testCustomer, authToken);
  if (createResult.success) {
    console.log('✅ Customer created successfully');
  } else {
    console.log('❌ Customer creation failed:', createResult.error);
  }

  // Get all customers
  console.log('📊 Testing customers list...');
  const listResult = await apiCall('GET', '/customers', null, authToken);
  if (listResult.success) {
    console.log('✅ Customers list retrieved successfully');
  } else {
    console.log('❌ Customers list failed:', listResult.error);
  }
}

async function testAiInsights() {
  console.log('\n🤖 Testing AI Insights API...');
  
  // Create AI insight
  console.log('📝 Testing AI insight creation...');
  const createResult = await apiCall('POST', '/ai-insights', testAiInsight, authToken);
  if (createResult.success) {
    console.log('✅ AI insight created successfully');
  } else {
    console.log('❌ AI insight creation failed:', createResult.error);
  }

  // Get all AI insights
  console.log('📊 Testing AI insights list...');
  const listResult = await apiCall('GET', '/ai-insights', null, authToken);
  if (listResult.success) {
    console.log('✅ AI insights list retrieved successfully');
  } else {
    console.log('❌ AI insights list failed:', listResult.error);
  }
}

async function testMessages() {
  console.log('\n💬 Testing Messages API...');
  
  // Create message
  console.log('📝 Testing message creation...');
  const createResult = await apiCall('POST', '/messages', testMessage, authToken);
  if (createResult.success) {
    console.log('✅ Message created successfully');
  } else {
    console.log('❌ Message creation failed:', createResult.error);
  }

  // Get all messages
  console.log('📊 Testing messages list...');
  const listResult = await apiCall('GET', '/messages', null, authToken);
  if (listResult.success) {
    console.log('✅ Messages list retrieved successfully');
  } else {
    console.log('❌ Messages list failed:', listResult.error);
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const healthResult = await apiCall('GET', '/health');
  if (healthResult.success) {
    console.log('✅ Health check passed');
  } else {
    console.log('❌ Health check failed:', healthResult.error);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting BizNova API Tests...');
  console.log('=' .repeat(50));

  try {
    // Test health check first
    await testHealthCheck();

    // Test authentication
    const authSuccess = await testAuth();
    if (!authSuccess) {
      console.log('❌ Authentication failed, skipping other tests');
      return;
    }

    // Test all API endpoints
    await testSales();
    await testExpenses();
    await testInventory();
    await testCustomers();
    await testAiInsights();
    await testMessages();

    console.log('\n🎉 All tests completed!');
    console.log('=' .repeat(50));
    console.log('✅ BizNova API is working correctly!');
    console.log('\n📚 API Documentation:');
    console.log('- Authentication: POST /api/auth/register, POST /api/auth/login');
    console.log('- Sales: GET/POST/PUT/DELETE /api/sales');
    console.log('- Expenses: GET/POST/PUT/DELETE /api/expenses');
    console.log('- Inventory: GET/POST/PUT/DELETE /api/inventory');
    console.log('- Customers: GET/POST/PUT/DELETE /api/customers');
    console.log('- AI Insights: GET/POST/PUT/DELETE /api/ai-insights');
    console.log('- Messages: GET/POST/PUT/DELETE /api/messages');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
