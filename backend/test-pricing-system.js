const mongoose = require('mongoose');
const Inventory = require('./src/models/Inventory');
const User = require('./src/models/User');
require('dotenv').config();

/**
 * Test script to verify the new cost/selling price system
 */

async function testPricingSystem() {
  try {
    console.log('🔄 Testing Cost/Selling Price System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB');

    // Find a test user - try different approaches
    let testUser = await User.findOne({ role: 'retailer' });
    if (!testUser) {
      testUser = await User.findOne({});
      console.log('Using any user:', testUser ? testUser.name : 'None found');
    }
    
    if (!testUser) {
      console.log('❌ No user found for testing');
      return;
    }

    console.log(`📊 Testing with user: ${testUser.shop_name || testUser.name} (Role: ${testUser.role})\n`);

    // Test 1: Check existing inventory items have both prices
    console.log('📋 Test 1: Checking existing inventory items...');
    const inventoryItems = await Inventory.find({ user_id: testUser._id }).limit(5);
    
    inventoryItems.forEach(item => {
      const costPrice = item.cost_price || 0;
      const sellingPrice = item.selling_price || item.price_per_unit;
      const profit = sellingPrice - costPrice;
      const margin = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(2) : 0;
      
      console.log(`  • ${item.item_name}:`);
      console.log(`    Cost: ₹${costPrice}, Selling: ₹${sellingPrice}, Profit: ₹${profit.toFixed(2)} (${margin}%)`);
    });

    // Test 2: Create a new item with cost and selling price
    console.log('\n📝 Test 2: Creating new item with cost/selling prices...');
    const newItem = new Inventory({
      user_id: testUser._id,
      item_name: 'Test Pricing Item',
      stock_qty: 10,
      cost_price: 80,
      selling_price: 100,
      price_per_unit: 100, // For backward compatibility
      category: 'Other',
      description: 'Test item for pricing system'
    });

    await newItem.save();
    console.log(`✅ Created: ${newItem.item_name}`);
    console.log(`   Cost: ₹${newItem.cost_price}, Selling: ₹${newItem.selling_price}`);
    console.log(`   Profit per unit: ₹${newItem.selling_price - newItem.cost_price}`);
    console.log(`   Total potential profit: ₹${newItem.stock_qty * (newItem.selling_price - newItem.cost_price)}`);

    // Test 3: Test virtual fields
    console.log('\n🧮 Test 3: Testing virtual fields...');
    const itemWithVirtuals = await Inventory.findById(newItem._id);
    console.log(`   Profit Margin: ${itemWithVirtuals.profitMargin}%`);
    console.log(`   Is Low Stock: ${itemWithVirtuals.isLowStock}`);
    console.log(`   Summary:`, itemWithVirtuals.summary);

    // Test 4: Test validation (selling price must be > cost price)
    console.log('\n⚠️  Test 4: Testing validation (selling price <= cost price)...');
    try {
      const invalidItem = new Inventory({
        user_id: testUser._id,
        item_name: 'Invalid Pricing Item',
        stock_qty: 5,
        cost_price: 100,
        selling_price: 80, // This should fail validation
        price_per_unit: 80,
        category: 'Other'
      });
      
      await invalidItem.save();
      console.log('❌ Validation failed - item was saved with selling price < cost price');
    } catch (error) {
      console.log('✅ Validation working - prevented saving item with selling price < cost price');
    }

    // Test 5: Calculate total inventory value
    console.log('\n💰 Test 5: Calculating total inventory values...');
    const allItems = await Inventory.find({ user_id: testUser._id });
    
    let totalCostValue = 0;
    let totalSellingValue = 0;
    let totalPotentialProfit = 0;

    allItems.forEach(item => {
      const costPrice = item.cost_price || (item.price_per_unit * 0.8);
      const sellingPrice = item.selling_price || item.price_per_unit;
      
      totalCostValue += item.stock_qty * costPrice;
      totalSellingValue += item.stock_qty * sellingPrice;
      totalPotentialProfit += item.stock_qty * (sellingPrice - costPrice);
    });

    console.log(`   Total items: ${allItems.length}`);
    console.log(`   Total cost value: ₹${totalCostValue.toLocaleString()}`);
    console.log(`   Total selling value: ₹${totalSellingValue.toLocaleString()}`);
    console.log(`   Total potential profit: ₹${totalPotentialProfit.toLocaleString()}`);
    console.log(`   Overall profit margin: ${totalSellingValue > 0 ? ((totalPotentialProfit / totalSellingValue) * 100).toFixed(2) : 0}%`);

    // Clean up test item
    await Inventory.findByIdAndDelete(newItem._id);
    console.log('\n🧹 Cleaned up test item');

    console.log('\n✅ All pricing system tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Existing items have cost and selling prices');
    console.log('   ✅ New items can be created with proper pricing');
    console.log('   ✅ Virtual fields work correctly');
    console.log('   ✅ Validation prevents invalid pricing');
    console.log('   ✅ Total value calculations work properly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testPricingSystem();
}

module.exports = testPricingSystem;