const chatbotController = require('./src/controllers/chatbotController');

console.log('🧪 TESTING CHATBOT BASIC FUNCTIONALITY');
console.log('=======================================');

// Test 1: Check if controller exists
console.log('1. Controller exists:', !!chatbotController);
console.log('2. Chat method exists:', typeof chatbotController.chat);

// Test 2: Check if handler functions exist
console.log('3. handleRetailerChat exists:', typeof require('./src/controllers/retailerChatHandler').handleRetailerChat);

// Test 3: Simple response test
async function testBasicResponse() {
    try {
        console.log('\n🧪 Testing basic response...');
        
        // Mock request object
        const mockReq = {
            body: {
                message: 'hello',
                language: 'en'
            },
            user: {
                _id: 'test-user-id'
            }
        };
        
        // Mock response object
        let responseData = null;
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    responseData = data;
                    console.log(`Response status: ${code}`);
                    console.log('Response data:', data);
                }
            }),
            json: (data) => {
                responseData = data;
                console.log('Response data:', data);
            }
        };
        
        // This will fail due to authentication, but we can see the structure
        await chatbotController.chat(mockReq, mockRes);
        
    } catch (error) {
        console.log('Expected error (no auth):', error.message);
    }
}

testBasicResponse();

console.log('\n✅ Basic structure test complete');
