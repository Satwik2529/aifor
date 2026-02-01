const { handleRetailerChat } = require('./src/controllers/retailerChatHandler');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testInventoryAddition() {
    console.log('🧪 Testing Inventory Addition with Enhanced Parsing...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB');

    // Find a test user
    const User = require('./src/models/User');
    const testUser = await User.findOne({});
    if (!testUser) {
        console.log('❌ No user found for testing');
        return;
    }

    console.log(`👤 Testing with user: ${testUser.shop_name || testUser.name} (${testUser._id})\n`);

    const testMessages = [
        "add a item to inventory laptop under electronics category with a 100 units each cost 100 and selling price 1200",
        "add a item to inventory of 100 keyboards each of 100 rupee and selling price 200 and electronics category",
        "add item: Mouse, 50 pieces, cost ₹150, selling ₹300, electronics category",
        "Add 25 headphones, cost ₹500 each, selling ₹800, electornics category", // Test typo handling
        "add product smartphone under tech category"
    ];

    for (let i = 0; i < testMessages.length; i++) {
        console.log(`\n--- Test ${i + 1} ---`);
        console.log(`Message: "${testMessages[i]}"`);
        
        try {
            const result = await handleRetailerChat(testUser._id, testMessages[i], 'en');
            console.log('✅ Success:', result.success);
            console.log('📝 Response:', result.message);
            if (result.data) {
                console.log('📊 Data Type:', result.data.type);
                if (result.data.type === 'inventory_added') {
                    console.log('📦 Item Added:', result.data.item.item_name);
                    console.log('🔢 Quantity:', result.data.item.stock_qty);
                    console.log('💰 Cost:', result.data.item.cost_per_unit);
                    console.log('🏷️ Selling Price:', result.data.item.price_per_unit);
                    console.log('📂 Category:', result.data.item.category);
                }
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
        
        console.log('---');
    }

    console.log('\n🏁 Test completed!');
    await mongoose.disconnect();
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    mongoose.connection.close();
    process.exit(0);
});

testInventoryAddition().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});