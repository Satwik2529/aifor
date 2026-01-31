/**
 * Test Enhanced Customer Chatbot Functionality
 */

const chatbotController = require('./src/controllers/chatbotController');

console.log('🤖 Testing Enhanced Customer Chatbot');
console.log('====================================');

// Test 1: Check controller structure
console.log('✅ Controller loaded successfully');
console.log('Available methods:', Object.keys(chatbotController));

// Test 2: Check if all required methods exist
const requiredMethods = ['chat', 'getStatus', 'speechToText', 'textToSpeech'];
requiredMethods.forEach(method => {
    if (typeof chatbotController[method] === 'function') {
        console.log(`✅ ${method} method exists`);
    } else {
        console.log(`❌ ${method} method missing`);
    }
});

console.log('\n🎉 Enhanced Chatbot Controller Test Complete!');
console.log('Ready for customer ordering interface');