/**
 * Test Script for Profit Calculation System
 * Demonstrates the correct calculation using your example dataset:
 * - 100 smartphones purchased at $200 each
 * - 60 sold at $300 each
 * - Sales expenses: $500 + $300 + $200 = $1,000
 * - Expected Net Profit: $5,000
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Sale = require('./src/models/Sale');
const Inventory = require('./src/models/Inventory');
const Expense = require('./src/models/Expense');
const User = require('./src/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Test the profit calculation system
const testProfitCalculation = async () => {
  try {
    console.log('\n🧪 Starting Profit Calculation Test...\n');

    // 1. Find or create test user
    let user = await User.findOne({ email: 'test@biznova.com' });
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: 'test@biznova.com',
        phone: '1234567890',
        password: 'testpassword123',
        shop_name: 'Test Shop'
      });
      console.log('✅ Test user created');
    } else {
      console.log('✅ Using existing test user');
    }

    const userId = user._id;

    // 2. Clear existing test data
    await Sale.deleteMany({ user_id: userId });
    await Inventory.deleteMany({ user_id: userId });
    await Expense.deleteMany({ user_id: userId });
    console.log('✅ Cleared existing test data\n');

    // 3. Add Inventory: 100 smartphones at $200 each
    console.log('📦 STEP 1: Add Inventory');
    const inventoryItem = await Inventory.create({
      user_id: userId,
      item_name: 'Smartphone',
      stock_qty: 100,
      price_per_unit: 200
    });
    const initialInventoryValue = inventoryItem.stock_qty * inventoryItem.price_per_unit;
    console.log(`   ✓ Added: ${inventoryItem.stock_qty} ${inventoryItem.item_name}s`);
    console.log(`   ✓ Cost per unit: $${inventoryItem.price_per_unit}`);
    console.log(`   ✓ Total Inventory Value: $${initialInventoryValue}\n`);

    // 4. Record Sale: 60 smartphones at $300 each
    console.log('💰 STEP 2: Record Sale');
    const sale = await Sale.create({
      user_id: userId,
      items: [{
        item_name: 'Smartphone',
        quantity: 60,
        price_per_unit: 300,           // Selling price
        cost_per_unit: 200              // Cost price from inventory
      }],
      payment_method: 'Cash',
      date: new Date()
    });

    console.log(`   ✓ Sold: ${sale.items[0].quantity} ${sale.items[0].item_name}s`);
    console.log(`   ✓ Selling price: $${sale.items[0].price_per_unit} each`);
    console.log(`   ✓ Cost price: $${sale.items[0].cost_per_unit} each`);
    console.log(`   ✓ Revenue: $${sale.total_amount}`);
    console.log(`   ✓ COGS: $${sale.total_cogs}`);
    console.log(`   ✓ Gross Profit: $${sale.gross_profit}\n`);

    // 5. Deduct from inventory
    await Inventory.findOneAndUpdate(
      { user_id: userId, item_name: 'Smartphone' },
      { $inc: { stock_qty: -60 } }
    );
    const updatedInventory = await Inventory.findOne({ user_id: userId, item_name: 'Smartphone' });
    const remainingInventoryValue = updatedInventory.stock_qty * updatedInventory.price_per_unit;
    console.log('📦 STEP 3: Inventory Updated');
    console.log(`   ✓ Remaining quantity: ${updatedInventory.stock_qty} units`);
    console.log(`   ✓ Remaining value: $${remainingInventoryValue}\n`);

    // 6. Add Sales Expenses
    console.log('💸 STEP 4: Add Sales Expenses');
    
    const expense1 = await Expense.create({
      user_id: userId,
      amount: 500,
      description: 'Marketing campaign',
      category: 'Marketing',
      is_sales_expense: true,
      date: new Date()
    });
    console.log(`   ✓ Marketing: $${expense1.amount}`);

    const expense2 = await Expense.create({
      user_id: userId,
      amount: 300,
      description: 'Sales commissions',
      category: 'Commissions',
      is_sales_expense: true,
      date: new Date()
    });
    console.log(`   ✓ Commissions: $${expense2.amount}`);

    const expense3 = await Expense.create({
      user_id: userId,
      amount: 200,
      description: 'Shipping costs',
      category: 'Shipping',
      is_sales_expense: true,
      date: new Date()
    });
    console.log(`   ✓ Shipping: $${expense3.amount}`);

    const totalSalesExpenses = expense1.amount + expense2.amount + expense3.amount;
    console.log(`   ✓ Total Sales Expenses: $${totalSalesExpenses}\n`);

    // 7. Calculate Final Profit
    console.log('📊 STEP 5: Final Profit Calculation');
    
    const revenue = sale.total_amount;
    const cogs = sale.total_cogs;
    const grossProfit = sale.gross_profit;
    const salesExpenses = totalSalesExpenses;
    const operatingExpenses = 0; // No operating expenses in this example
    const netProfit = grossProfit - salesExpenses - operatingExpenses;

    console.log(`   Revenue:            $${revenue}`);
    console.log(`   COGS:              -$${cogs}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Gross Profit:       $${grossProfit}`);
    console.log(`   Sales Expenses:    -$${salesExpenses}`);
    console.log(`   Operating Expenses: $${operatingExpenses}`);
    console.log(`   ─────────────────────────────`);
    console.log(`   NET PROFIT:         $${netProfit}`);

    const grossMargin = ((grossProfit / revenue) * 100).toFixed(2);
    const netMargin = ((netProfit / revenue) * 100).toFixed(2);
    console.log(`\n   Gross Profit Margin: ${grossMargin}%`);
    console.log(`   Net Profit Margin:   ${netMargin}%\n`);

    // 8. Verification
    console.log('✅ VERIFICATION');
    const expectedNetProfit = 5000;
    if (netProfit === expectedNetProfit) {
      console.log(`   ✓ Net Profit matches expected value: $${expectedNetProfit}`);
      console.log('   ✓ All calculations are CORRECT! 🎉\n');
    } else {
      console.log(`   ❌ Net Profit mismatch!`);
      console.log(`   Expected: $${expectedNetProfit}`);
      console.log(`   Got: $${netProfit}\n`);
    }

    // 9. Summary
    console.log('═══════════════════════════════════════');
    console.log('📈 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Initial Inventory:      $${initialInventoryValue}`);
    console.log(`Remaining Inventory:    $${remainingInventoryValue}`);
    console.log(`Revenue Generated:      $${revenue}`);
    console.log(`Total Expenses:         $${salesExpenses + operatingExpenses}`);
    console.log(`Net Profit:             $${netProfit}`);
    console.log('═══════════════════════════════════════\n');

    // 10. Test database queries (simulating profit analytics endpoint)
    console.log('🔍 Testing Profit Analytics Queries...\n');

    const salesData = await Sale.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total_amount' },
          totalCOGS: { $sum: '$total_cogs' },
          grossProfit: { $sum: '$gross_profit' }
        }
      }
    ]);

    const salesExpensesData = await Expense.aggregate([
      { $match: { user_id: userId, is_sales_expense: true } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const inventoryValue = await Inventory.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$stock_qty', '$price_per_unit'] } }
        }
      }
    ]);

    console.log('Database Query Results:');
    console.log(`  Revenue: $${salesData[0]?.totalRevenue || 0}`);
    console.log(`  COGS: $${salesData[0]?.totalCOGS || 0}`);
    console.log(`  Gross Profit: $${salesData[0]?.grossProfit || 0}`);
    console.log(`  Sales Expenses: $${salesExpensesData[0]?.total || 0}`);
    console.log(`  Inventory Value: $${inventoryValue[0]?.totalValue || 0}`);
    console.log(`  Net Profit: $${(salesData[0]?.grossProfit || 0) - (salesExpensesData[0]?.total || 0)}`);

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
(async () => {
  await connectDB();
  await testProfitCalculation();
})();
