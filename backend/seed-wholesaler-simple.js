// Simple script to seed wholesaler data
// Run with: node seed-wholesaler-simple.js

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://saipranav974:xseYEzahzjx1dhE0@cluster0.mgjhg.mongodb.net/psp?retryWrites=true&w=majority&tls=true';
const WHOLESALER_PHONE = '9390392507';

// Define schemas inline
const userSchema = new mongoose.Schema({}, { strict: false });
const inventorySchema = new mongoose.Schema({}, { strict: false });
const orderSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', userSchema);
const WholesalerInventory = mongoose.model('WholesalerInventory', inventorySchema);
const WholesalerOrder = mongoose.model('WholesalerOrder', orderSchema);

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const wholesaler = await User.findOne({ phone: WHOLESALER_PHONE });
        if (!wholesaler) {
            console.log('Wholesaler not found!');
            process.exit(1);
        }

        console.log('Found wholesaler:', wholesaler.name);

        // Clear old data
        await WholesalerInventory.deleteMany({ wholesaler: wholesaler._id });
        console.log('Cleared old inventory');

        // Add products
        const products = [
            {
                wholesaler: wholesaler._id,
                productName: 'Basmati Rice Premium',
                category: 'Grains',
                unit: 'kg',
                pricePerUnit: 85,
                minOrderQty: 25,
                availableQty: 500,
                bulkDiscounts: [
                    { minQty: 50, price: 80 },
                    { minQty: 100, price: 75 }
                ],
                isActive: true,
                totalOrders: 15,
                totalQuantitySold: 450,
                lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Toor Dal',
                category: 'Pulses',
                unit: 'kg',
                pricePerUnit: 120,
                minOrderQty: 20,
                availableQty: 300,
                bulkDiscounts: [{ minQty: 40, price: 115 }],
                isActive: true,
                totalOrders: 12,
                totalQuantitySold: 280,
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Sunflower Oil',
                category: 'Oils',
                unit: 'litre',
                pricePerUnit: 140,
                minOrderQty: 15,
                availableQty: 200,
                bulkDiscounts: [{ minQty: 30, price: 135 }],
                isActive: true,
                totalOrders: 18,
                totalQuantitySold: 320,
                lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Wheat Flour',
                category: 'Grains',
                unit: 'kg',
                pricePerUnit: 35,
                minOrderQty: 50,
                availableQty: 800,
                bulkDiscounts: [{ minQty: 100, price: 33 }],
                isActive: true,
                totalOrders: 25,
                totalQuantitySold: 1200,
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Sugar',
                category: 'Sweeteners',
                unit: 'kg',
                pricePerUnit: 42,
                minOrderQty: 30,
                availableQty: 600,
                bulkDiscounts: [{ minQty: 60, price: 40 }],
                isActive: true,
                totalOrders: 20,
                totalQuantitySold: 720,
                lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Red Chilli Powder',
                category: 'Spices',
                unit: 'kg',
                pricePerUnit: 180,
                minOrderQty: 5,
                availableQty: 80,
                bulkDiscounts: [{ minQty: 10, price: 175 }],
                isActive: true,
                totalOrders: 3,
                totalQuantitySold: 25,
                lastOrderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Turmeric Powder',
                category: 'Spices',
                unit: 'kg',
                pricePerUnit: 200,
                minOrderQty: 5,
                availableQty: 60,
                bulkDiscounts: [{ minQty: 10, price: 195 }],
                isActive: true,
                totalOrders: 2,
                totalQuantitySold: 18,
                lastOrderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Mustard Oil',
                category: 'Oils',
                unit: 'litre',
                pricePerUnit: 160,
                minOrderQty: 10,
                availableQty: 150,
                bulkDiscounts: [{ minQty: 20, price: 155 }],
                isActive: true,
                totalOrders: 22,
                totalQuantitySold: 280,
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ];

        await WholesalerInventory.insertMany(products);
        console.log('Added', products.length, 'products');

        // Create sample orders
        const retailers = await User.find({ role: 'retailer' }).limit(3);
        if (retailers.length > 0) {
            await WholesalerOrder.deleteMany({ wholesaler: wholesaler._id });

            const orders = [
                {
                    retailer: retailers[0]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}001`,
                    items: [{
                        productId: products[0]._id,
                        productName: 'Basmati Rice Premium',
                        quantity: 50,
                        pricePerUnit: 80,
                        totalPrice: 4000
                    }],
                    subtotal: 4000,
                    totalAmount: 4000,
                    status: 'REQUESTED',
                    paymentMode: 'UPI',
                    statusHistory: [{ status: 'REQUESTED', timestamp: new Date() }]
                },
                {
                    retailer: retailers[1]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}002`,
                    items: [{
                        productId: products[3]._id,
                        productName: 'Wheat Flour',
                        quantity: 100,
                        pricePerUnit: 33,
                        totalPrice: 3300
                    }],
                    subtotal: 3300,
                    totalAmount: 3300,
                    status: 'DELIVERED',
                    paymentMode: 'Cash',
                    actualDeliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
                        { status: 'DELIVERED', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
                    ],
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                }
            ];

            await WholesalerOrder.insertMany(orders);
            console.log('Added', orders.length, 'orders');
        }

        console.log('\n✅ SUCCESS! Data seeded for wholesaler:', wholesaler.name);
        console.log('Products:', products.length);
        console.log('Fast-moving: Wheat Flour, Mustard Oil, Sunflower Oil');
        console.log('Slow-moving: Red Chilli Powder, Turmeric Powder');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

seed();
