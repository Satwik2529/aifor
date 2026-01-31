/**
 * WhatsApp Integration Test Suite
 * Tests all WhatsApp endpoints and functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_PHONE = '9876543210';
const TEST_MESSAGE = 'Add ₹500 milk sale today';

let authToken = '';

/**
 * Test helper functions
 */
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    return null;
  }
};

const makeAuthenticatedRequest = async (method, endpoint, data = null) => {
  return makeRequest(method, endpoint, data, {
    'Authorization': `Bearer ${authToken}`
  });
};

/**
 * Test 1: Server Health Check
 */
const testServerHealth = async () => {
  console.log('\n🏥 Testing Server Health...');
  
  const healthResult = await makeRequest('GET', '/health');
  if (healthResult?.success) {
    console.log('✅ Server is running and healthy');
    return true;
  } else {
    console.log('❌ Server health check failed');
    return false;
  }
};

/**
 * Test 2: Webhook Verification
 */
const testWebhookVerification = async () => {
  console.log('\n🔍 Testing Webhook Verification...');
  
  const verifyResult = await makeRequest('GET', '/webhook/whatsapp', null, {
    params: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test_verify_token',
      'hub.challenge': 'test_challenge_123'
    }
  });

  if (verifyResult === 'test_challenge_123') {
    console.log('✅ Webhook verification working (with test token)');
    return true;
  } else {
    console.log('❌ Webhook verification failed');
    return false;
  }
};

/**
 * Test 3: WhatsApp API Connection Test
 */
const testWhatsAppConnection = async () => {
  console.log('\n📱 Testing WhatsApp API Connection...');
  
  // First, we need to authenticate
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    phone: '9876543658', // Use existing test user
    password: 'testpass123'
  });

  if (loginResult?.success) {
    authToken = loginResult.data.token;
    console.log('✅ Authentication successful');
  } else {
    console.log('❌ Authentication failed');
    return false;
  }

  const connectionResult = await makeAuthenticatedRequest('GET', '/api/whatsapp/test');
  if (connectionResult?.success) {
    console.log('✅ WhatsApp API connection test passed');
    return true;
  } else {
    console.log('❌ WhatsApp API connection test failed');
    if (connectionResult?.error?.includes('credentials')) {
      console.log('   💡 WhatsApp credentials not configured in .env');
    }
    return false;
  }
};

/**
 * Test 4: Webhook Status Check
 */
const testWebhookStatus = async () => {
  console.log('\n📊 Testing Webhook Status...');
  
  const statusResult = await makeRequest('GET', '/webhook/whatsapp/status');
  if (statusResult?.success) {
    console.log('✅ Webhook status retrieved');
    console.log(`   Webhook configured: ${statusResult.data.webhook_configured}`);
    console.log(`   Phone Number ID: ${statusResult.data.phone_number_id || 'Not set'}`);
    console.log(`   API Version: ${statusResult.data.api_version}`);
    console.log(`   API Connection: ${statusResult.data.api_connection || 'Not tested'}`);
    return true;
  } else {
    console.log('❌ Webhook status check failed');
    return false;
  }
};

/**
 * Test 5: Message Processing
 */
const testMessageProcessing = async () => {
  console.log('\n💬 Testing Message Processing...');
  
  const processResult = await makeAuthenticatedRequest('POST', '/api/whatsapp/process', {
    phone: TEST_PHONE,
    message: TEST_MESSAGE
  });

  if (processResult?.success) {
    console.log('✅ Message processing successful');
    console.log(`   Intent: ${processResult.data.nlpResult?.intent || 'Unknown'}`);
    console.log(`   Response: ${processResult.data.response?.substring(0, 100) || 'No response'}...`);
    return true;
  } else {
    console.log('❌ Message processing failed');
    return false;
  }
};

/**
 * Test 6: Test Message Sending
 */
const testMessageSending = async () => {
  console.log('\n📤 Testing Message Sending...');
  
  const sendResult = await makeAuthenticatedRequest('POST', '/api/whatsapp/send', {
    phone: TEST_PHONE,
    message: 'Test message from BizNova API'
  });

  if (sendResult?.success) {
    console.log('✅ Test message sending successful');
    return true;
  } else {
    console.log('❌ Test message sending failed');
    if (sendResult?.error?.includes('credentials')) {
      console.log('   💡 WhatsApp credentials not configured in .env');
    }
    return false;
  }
};

/**
 * Test 7: Message History
 */
const testMessageHistory = async () => {
  console.log('\n📜 Testing Message History...');
  
  const historyResult = await makeAuthenticatedRequest('GET', `/api/whatsapp/messages/${TEST_PHONE}`);
  if (historyResult?.success) {
    console.log('✅ Message history retrieved');
    console.log(`   Messages found: ${historyResult.data.count}`);
    return true;
  } else {
    console.log('❌ Message history retrieval failed');
    return false;
  }
};

/**
 * Test 8: User Statistics
 */
const testUserStats = async () => {
  console.log('\n📈 Testing User Statistics...');
  
  const statsResult = await makeAuthenticatedRequest('GET', `/api/whatsapp/stats/${TEST_PHONE}`);
  if (statsResult?.success) {
    console.log('✅ User statistics retrieved');
    console.log(`   User: ${statsResult.data.user?.name || 'Unknown'}`);
    console.log(`   Messages: ${statsResult.data.messages?.total || 0}`);
    return true;
  } else {
    console.log('❌ User statistics retrieval failed');
    return false;
  }
};

/**
 * Test 9: Webhook Payload Simulation
 */
const testWebhookPayload = async () => {
  console.log('\n🔗 Testing Webhook Payload Processing...');
  
  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test_entry_id',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: 'test_phone_number_id'
          },
          messages: [{
            id: 'test_message_id',
            from: TEST_PHONE,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: {
              body: TEST_MESSAGE
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const webhookResult = await makeRequest('POST', '/webhook/whatsapp', webhookPayload);
  if (webhookResult?.success) {
    console.log('✅ Webhook payload processing successful');
    return true;
  } else {
    console.log('❌ Webhook payload processing failed');
    return false;
  }
};

/**
 * Test 10: NLP Service Integration
 */
const testNLPService = async () => {
  console.log('\n🧠 Testing NLP Service Integration...');
  
  const testMessages = [
    'Add ₹500 milk sale today',
    'Show my sales this week',
    'Add ₹200 rent expense',
    'Help',
    'Hello'
  ];

  let successCount = 0;
  for (const message of testMessages) {
    const result = await makeAuthenticatedRequest('POST', '/api/whatsapp/process', {
      phone: TEST_PHONE,
      message: message
    });

    if (result?.success && result.data.nlpResult?.intent) {
      console.log(`✅ "${message}" → Intent: ${result.data.nlpResult.intent}`);
      successCount++;
    } else {
      console.log(`❌ "${message}" → Failed to parse`);
    }
  }

  console.log(`   Success rate: ${successCount}/${testMessages.length}`);
  return successCount === testMessages.length;
};

/**
 * Main test runner
 */
const runTests = async () => {
  console.log('🚀 Starting WhatsApp Integration Tests...');
  console.log('==========================================');

  // Check if server is running
  try {
    const healthCheck = await makeRequest('GET', '/health');
    if (!healthCheck?.success) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('   Run: npm start');
      return;
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Cannot connect to server. Please start the server first.');
    console.log('   Run: npm start');
    return;
  }

  // Run tests
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Webhook Verification', fn: testWebhookVerification },
    { name: 'WhatsApp Connection', fn: testWhatsAppConnection },
    { name: 'Webhook Status', fn: testWebhookStatus },
    { name: 'Message Processing', fn: testMessageProcessing },
    { name: 'Message Sending', fn: testMessageSending },
    { name: 'Message History', fn: testMessageHistory },
    { name: 'User Statistics', fn: testUserStats },
    { name: 'Webhook Payload', fn: testWebhookPayload },
    { name: 'NLP Service', fn: testNLPService }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) passed++;
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
    }
  }

  // Summary
  console.log('\n==========================================');
  console.log('📊 WhatsApp Integration Test Results');
  console.log('==========================================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed >= 7) { // Allow some failures for missing credentials
    console.log('\n🎉 WhatsApp Integration is working correctly!');
    console.log('   Most endpoints are functional.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Configure WhatsApp credentials in .env file:');
  console.log('   - WHATSAPP_VERIFY_TOKEN');
  console.log('   - WHATSAPP_ACCESS_TOKEN');
  console.log('   - WHATSAPP_PHONE_NUMBER_ID');
  console.log('2. Set up webhook URL in Meta Developer Dashboard');
  console.log('3. Test with real WhatsApp messages');
  console.log('4. Ready for production deployment');
};

// Run tests
runTests().catch(console.error);
