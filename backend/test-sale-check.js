const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('./src/models/Sale');

async function checkSales() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the latest sale
        const latestSale = await Sale.findOne().sort({ createdAt: -1 });

        if (!latestSale) {
            console.log('No sales found');
            return;
        }

        console.log('\n=== LATEST SALE ===');
        console.log('Sale ID:', latestSale._id);
        console.log('Date:', latestSale.date);
        console.log('Total Amount:', latestSale.total_amount);
        console.log('Payment Method:', latestSale.payment_method);
        console.log('\nItems:');

        if (latestSale.items && latestSale.items.length > 0) {
            latestSale.items.forEach((item, idx) => {
                console.log(`\n${idx + 1}. ${item.item_name}`);
                console.log(`   Quantity: ${item.quantity}`);
                console.log(`   Price per unit: ₹${item.price_per_unit}`);
                console.log(`   Cost per unit: ₹${item.cost_per_unit}`);
                console.log(`   Total: ₹${item.quantity * item.price_per_unit}`);
            });
        } else {
            console.log('NO ITEMS FOUND IN SALE!');
        }

        console.log('\nTotal COGS:', latestSale.total_cogs);
        console.log('Gross Profit:', latestSale.gross_profit);

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSales();
