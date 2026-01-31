const chatbotController = require('./src/controllers/chatbotController');

console.log('🔍 DEBUGGING CHATBOT CONTROLLER');
console.log('=================================');

// Check if the controller is properly instantiated
console.log('Controller:', chatbotController);
console.log('Controller type:', typeof chatbotController);
console.log('Controller methods:', Object.keys(chatbotController));

// Check if the methods exist
console.log('Has chat method:', typeof chatbotController.chat);
console.log('Has getStatus method:', typeof chatbotController.getStatus);
console.log('Has speechToText method:', typeof chatbotController.speechToText);
console.log('Has textToSpeech method:', typeof chatbotController.textToSpeech);

// Try to access the methods
try {
    console.log('chat method:', chatbotController.chat);
    console.log('getStatus method:', chatbotController.getStatus);
} catch (error) {
    console.error('Error accessing methods:', error);
}
