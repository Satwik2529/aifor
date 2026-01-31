/**
 * Script to recalculate COGS and Profit for existing sales
 * Run this once to fix all historical sales data
 */

const mongoose = require('mongoose');
const Sale = require('../src/models/Sale');
const Inventory = require('../src/models/Inventory');
require('dotenv').config();

async function recalculateSales() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all sales
    const sales = await Sale.find({});
    console.log(`📊 Found ${sales.length} sales to recalculate`);

    let updated = 0;
    let failed = 0;

    for (const sale of sales) {
      try {
        // Recalculate for each item
        for (let item of sale.items) {
          if (!item.cost_per_unit || item.cost_per_unit === 0) {
            // Find cost from inventory
            const inventoryItem = await Inventory.findOne({
              user_id: sale.user_id,
              item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') }
            });

            if (inventoryItem) {
              item.cost_per_unit = inventoryItem.price_per_unit;
            }
          }
        }

        // Recalculate totals
        sale.total_amount = sale.items.reduce((sum, item) => 
          sum + (item.quantity * item.price_per_unit), 0
        );

        sale.total_cogs = sale.items.reduce((sum, item) => 
          sum + (item.quantity * (item.cost_per_unit || 0)), 0
        );

        sale.gross_profit = sale.total_amount - sale.total_cogs;

        await sale.save();
        updated++;
        console.log(`✅ Updated sale ${sale._id}`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to update sale ${sale._id}:`, error.message);
      }
    }

    console.log('\n🎉 Recalculation Complete!');
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

recalculateSales();
