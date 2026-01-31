const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'models/gemini-pro',
    'models/gemini-1.5-flash'
];

async function testModel(modelName) {
    try {
        console.log(`\nTesting: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "Hello"');
        const response = await result.response;
        console.log(`✅ ${modelName} WORKS!`);
        console.log(`Response: ${response.text()}`);
        return true;
    } catch (error) {
        console.log(`❌ ${modelName} FAILED: ${error.message}`);
        return false;
    }
}

async function findWorkingModel() {
    console.log('🔍 Testing Gemini Models...\n');

    for (const modelName of modelsToTest) {
        const works = await testModel(modelName);
        if (works) {
            console.log(`\n🎉 USE THIS MODEL: "${modelName}"`);
            break;
        }
    }
}

findWorkingModel();