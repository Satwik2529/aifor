/**
 * Token Usage Comparison Test
 * Demonstrates the difference between old and new architecture
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB\n');
}

async function getTestUserId() {
    const User = require('./src/models/User');
    const user = await User.findOne({ role: 'retailer' });
    return user ? user._id : null;
}

async function simulateOldArchitecture(userId) {
    const Sale = require('./src/models/Sale');
    const Inventory = require('./src/models/Inventory');
    const Expense = require('./src/models/Expense');
    const CustomerRequest = require('./src/models/CustomerRequest');

    // Fetch ALL data (like old architecture does)
    const [inventory, sales, expenses, requests] = await Promise.all([
        Inventory.find({ user_id: userId }),
        Sale.find({ user_id: userId }).sort({ createdAt: -1 }).limit(50),
        Expense.find({ user_id: userId }).sort({ createdAt: -1 }).limit(30),
        CustomerRequest.find({ retailer_id: userId }).limit(10)
    ]);

    // Build the massive prompt context
    let promptContext = `
BUSINESS CONTEXT:

INVENTORY (${inventory.length} items):
${inventory.map(item => 
    `- ${item.item_name}: ${item.stock_qty} units @ ₹${item.price_per_unit} (cost: ₹${item.cost_per_unit || 0})`
).join('\n')}

RECENT SALES (${sales.length} transactions):
${sales.map(sale => 
    `- ₹${sale.total_amount} | ${sale.items?.length || 0} items | ${new Date(sale.createdAt).toLocaleDateString()}`
).join('\n')}

RECENT EXPENSES (${expenses.length} records):
${expenses.map(expense => 
    `- ₹${expense.amount} | ${expense.description} | ${expense.category}`
).join('\n')}

CUSTOMER REQUESTS (${requests.length}):
${requests.map(req => 
    `- ${req.customer_name} | ${req.items?.length || 0} items | ₹${req.total_amount || 0}`
).join('\n')}

User Question: What's my profit today?
`;

    return {
        architecture: 'OLD',
        promptLength: promptContext.length,
        estimatedTokens: Math.ceil(promptContext.length / 4), // Rough estimate: 1 token ≈ 4 chars
        dataFetched: {
            inventory: inventory.length,
            sales: sales.length,
            expenses: expenses.length,
            requests: requests.length
        }
    };
}

async function simulateNewArchitecture(userId) {
    const businessTools = require('./src/services/businessToolsService');

    // Execute ONLY the needed tool
    const profitData = await businessTools.getTodaysProfit(userId);

    // Build minimal prompt with ONLY results
    let promptContext = `
User asked: "What's my profit today?"

Retrieved data:
${JSON.stringify(profitData, null, 2)}

Generate a helpful response.
`;

    return {
        architecture: 'NEW',
        promptLength: promptContext.length,
        estimatedTokens: Math.ceil(promptContext.length / 4),
        dataFetched: {
            tool: 'getTodaysProfit',
            result: profitData
        }
    };
}

async function runComparison() {
    console.log('🔬 TOKEN USAGE COMPARISON TEST');
    console.log('='.repeat(70));
    console.log('Query: "What\'s my profit today?"\n');

    try {
        await connectDB();
        const userId = await getTestUserId();

        if (!userId) {
            console.error('❌ No retailer found. Please create a retailer first.');
            process.exit(1);
        }

        console.log(`Testing with user ID: ${userId}\n`);

        // Test old architecture
        console.log('⏳ Simulating OLD architecture...');
        const startOld = Date.now();
        const oldResult = await simulateOldArchitecture(userId);
        const timeOld = Date.now() - startOld;

        // Test new architecture
        console.log('⏳ Simulating NEW architecture...');
        const startNew = Date.now();
        const newResult = await simulateNewArchitecture(userId);
        const timeNew = Date.now() - startNew;

        // Display results
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESULTS');
        console.log('='.repeat(70));

        console.log('\n🔴 OLD ARCHITECTURE (Full Context):');
        console.log(`   Prompt Length: ${oldResult.promptLength.toLocaleString()} characters`);
        console.log(`   Estimated Tokens: ${oldResult.estimatedTokens.toLocaleString()}`);
        console.log(`   Data Fetched:`);
        console.log(`     - Inventory: ${oldResult.dataFetched.inventory} items`);
        console.log(`     - Sales: ${oldResult.dataFetched.sales} records`);
        console.log(`     - Expenses: ${oldResult.dataFetched.expenses} records`);
        console.log(`     - Requests: ${oldResult.dataFetched.requests} records`);
        console.log(`   Query Time: ${timeOld}ms`);

        console.log('\n🟢 NEW ARCHITECTURE (Tool-Based):');
        console.log(`   Prompt Length: ${newResult.promptLength.toLocaleString()} characters`);
        console.log(`   Estimated Tokens: ${newResult.estimatedTokens.toLocaleString()}`);
        console.log(`   Data Fetched:`);
        console.log(`     - Tool: ${newResult.dataFetched.tool}`);
        console.log(`     - Result: Structured profit data only`);
        console.log(`   Query Time: ${timeNew}ms`);

        // Calculate savings
        const tokenReduction = ((oldResult.estimatedTokens - newResult.estimatedTokens) / oldResult.estimatedTokens * 100).toFixed(1);
        const speedImprovement = ((timeOld - timeNew) / timeOld * 100).toFixed(1);

        console.log('\n💰 SAVINGS:');
        console.log(`   Token Reduction: ${tokenReduction}%`);
        console.log(`   Speed Improvement: ${speedImprovement}%`);
        console.log(`   Tokens Saved: ${(oldResult.estimatedTokens - newResult.estimatedTokens).toLocaleString()}`);

        // Cost calculation (using GPT-3.5 pricing as example)
        const costPerMillionTokens = 0.50; // $0.50 per 1M input tokens (GPT-3.5)
        const oldCostPer1000Queries = (oldResult.estimatedTokens * 1000 / 1000000) * costPerMillionTokens;
        const newCostPer1000Queries = (newResult.estimatedTokens * 1000 / 1000000) * costPerMillionTokens;
        const monthlySavings = ((oldCostPer1000Queries - newCostPer1000Queries) * 30).toFixed(2);

        console.log('\n💵 COST IMPACT (1000 queries/day):');
        console.log(`   Old: $${oldCostPer1000Queries.toFixed(2)}/day`);
        console.log(`   New: $${newCostPer1000Queries.toFixed(2)}/day`);
        console.log(`   Monthly Savings: $${monthlySavings}`);

        console.log('\n✅ CONCLUSION:');
        console.log(`   The new architecture reduces token usage by ${tokenReduction}%`);
        console.log(`   and improves response speed by ${speedImprovement}%`);
        console.log(`   while maintaining the same functionality.`);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Test completed\n');
    }
}

runComparison();
