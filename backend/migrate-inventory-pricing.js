const mongoose = require('mongoose');
const Inventory = require('./src/models/Inventory');
require('dotenv').config();

/**
 * Migration script to update existing inventory items with cost_price and selling_price
 * This script assumes the existing price_per_unit is the selling price
 * and calculates cost_price as 80% of selling price (20% profit margin)
 */

async function migrateInventoryPricing() {
  try {
    console.log('🔄 Starting inventory pricing migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB');

    // Find all inventory items that don't have cost_price or selling_price
    const itemsToUpdate = await Inventory.find({
      $or: [
        { cost_price: { $exists: false } },
        { selling_price: { $exists: false } }
      ]
    });

    console.log(`📦 Found ${itemsToUpdate.length} items to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const item of itemsToUpdate) {
      try {
        const currentPrice = item.price_per_unit;
        
        // Calculate cost price as 80% of current price (20% profit margin)
        const costPrice = Math.round(currentPrice * 0.8 * 100) / 100; // Round to 2 decimal places
        const sellingPrice = currentPrice;

        // Update the item
        await Inventory.findByIdAndUpdate(item._id, {
          cost_price: costPrice,
          selling_price: sellingPrice,
          price_per_unit: sellingPrice // Keep for backward compatibility
        });

        console.log(`✅ Updated ${item.item_name}: Cost ₹${costPrice}, Selling ₹${sellingPrice}, Profit ₹${sellingPrice - costPrice}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating ${item.item_name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount} items`);
    console.log(`   ❌ Errors: ${errorCount} items`);
    console.log(`   📦 Total processed: ${itemsToUpdate.length} items`);

    // Verify the migration
    const verificationItems = await Inventory.find({}).limit(5);
    console.log('\n🔍 Sample updated items:');
    verificationItems.forEach(item => {
      const profitMargin = item.selling_price > 0 ? 
        ((item.selling_price - item.cost_price) / item.selling_price * 100).toFixed(2) : 0;
      console.log(`   ${item.item_name}: Cost ₹${item.cost_price}, Selling ₹${item.selling_price}, Margin ${profitMargin}%`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  migrateInventoryPricing();
}

module.exports = migrateInventoryPricing;