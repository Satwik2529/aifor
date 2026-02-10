const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const WholesalerInventory = require('./src/models/WholesalerInventory');
const WholesalerOrder = require('./src/models/WholesalerOrder');

const WHOLESALER_PHONE = '9390392507';

async function seedWholesalerData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the wholesaler
        const wholesaler = await User.findOne({ phone: WHOLESALER_PHONE });
        if (!wholesaler) {
            console.log('❌ Wholesaler not found with phone:', WHOLESALER_PHONE);
            process.exit(1);
        }

        console.log('✅ Found wholesaler:', wholesaler.name);

        // Clear existing data
        await WholesalerInventory.deleteMany({ wholesaler: wholesaler._id });
        await WholesalerOrder.deleteMany({ wholesaler: wholesaler._id });
        console.log('🗑️  Cleared existing wholesaler data');

        // Create sample inventory products
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
                    { minQty: 100, price: 75 },
                    { minQty: 200, price: 70 }
                ],
                isActive: true,
                totalOrders: 15,
                totalQuantitySold: 450,
                lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Toor Dal (Arhar)',
                category: 'Pulses',
                unit: 'kg',
                pricePerUnit: 120,
                minOrderQty: 20,
                availableQty: 300,
                bulkDiscounts: [
                    { minQty: 40, price: 115 },
                    { minQty: 80, price: 110 }
                ],
                isActive: true,
                totalOrders: 12,
                totalQuantitySold: 280,
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Refined Sunflower Oil',
                category: 'Oils',
                unit: 'litre',
                pricePerUnit: 140,
                minOrderQty: 15,
                availableQty: 200,
                bulkDiscounts: [
                    { minQty: 30, price: 135 },
                    { minQty: 60, price: 130 }
                ],
                isActive: true,
                totalOrders: 18,
                totalQuantitySold: 320,
                lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Wheat Flour (Atta)',
                category: 'Grains',
                unit: 'kg',
                pricePerUnit: 35,
                minOrderQty: 50,
                availableQty: 800,
                bulkDiscounts: [
                    { minQty: 100, price: 33 },
                    { minQty: 200, price: 31 },
                    { minQty: 500, price: 29 }
                ],
                isActive: true,
                totalOrders: 25,
                totalQuantitySold: 1200,
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Sugar (White)',
                category: 'Sweeteners',
                unit: 'kg',
                pricePerUnit: 42,
                minOrderQty: 30,
                availableQty: 600,
                bulkDiscounts: [
                    { minQty: 60, price: 40 },
                    { minQty: 120, price: 38 }
                ],
                isActive: true,
                totalOrders: 20,
                totalQuantitySold: 720,
                lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Moong Dal',
                category: 'Pulses',
                unit: 'kg',
                pricePerUnit: 110,
                minOrderQty: 20,
                availableQty: 250,
                bulkDiscounts: [
                    { minQty: 40, price: 105 },
                    { minQty: 80, price: 100 }
                ],
                isActive: true,
                totalOrders: 8,
                totalQuantitySold: 180,
                lastOrderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Chana Dal',
                category: 'Pulses',
                unit: 'kg',
                pricePerUnit: 95,
                minOrderQty: 20,
                availableQty: 180,
                bulkDiscounts: [
                    { minQty: 40, price: 90 },
                    { minQty: 80, price: 85 }
                ],
                isActive: true,
                totalOrders: 5,
                totalQuantitySold: 120,
                lastOrderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago (slow moving)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Mustard Oil',
                category: 'Oils',
                unit: 'litre',
                pricePerUnit: 160,
                minOrderQty: 10,
                availableQty: 150,
                bulkDiscounts: [
                    { minQty: 20, price: 155 },
                    { minQty: 40, price: 150 }
                ],
                isActive: true,
                totalOrders: 22,
                totalQuantitySold: 280,
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Red Chilli Powder',
                category: 'Spices',
                unit: 'kg',
                pricePerUnit: 180,
                minOrderQty: 5,
                availableQty: 80,
                bulkDiscounts: [
                    { minQty: 10, price: 175 },
                    { minQty: 20, price: 170 }
                ],
                isActive: true,
                totalOrders: 3,
                totalQuantitySold: 25,
                lastOrderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago (very slow)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Turmeric Powder',
                category: 'Spices',
                unit: 'kg',
                pricePerUnit: 200,
                minOrderQty: 5,
                availableQty: 60,
                bulkDiscounts: [
                    { minQty: 10, price: 195 },
                    { minQty: 20, price: 190 }
                ],
                isActive: true,
                totalOrders: 2,
                totalQuantitySold: 18,
                lastOrderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago (very slow)
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Tea Powder Premium',
                category: 'Beverages',
                unit: 'kg',
                pricePerUnit: 320,
                minOrderQty: 10,
                availableQty: 120,
                bulkDiscounts: [
                    { minQty: 20, price: 310 },
                    { minQty: 40, price: 300 }
                ],
                isActive: true,
                totalOrders: 14,
                totalQuantitySold: 180,
                lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            },
            {
                wholesaler: wholesaler._id,
                productName: 'Jaggery (Gur)',
                category: 'Sweeteners',
                unit: 'kg',
                pricePerUnit: 55,
                minOrderQty: 20,
                availableQty: 200,
                bulkDiscounts: [
                    { minQty: 40, price: 52 },
                    { minQty: 80, price: 50 }
                ],
                isActive: true,
                totalOrders: 6,
                totalQuantitySold: 140,
                lastOrderDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
            }
        ];

        const createdProducts = await WholesalerInventory.insertMany(products);
        console.log(`✅ Created ${createdProducts.length} inventory products`);

        // Find some retailers to create sample orders
        const retailers = await User.find({ role: 'retailer' }).limit(5);

        if (retailers.length > 0) {
            console.log(`✅ Found ${retailers.length} retailers for sample orders`);

            // Create sample orders with different statuses
            const orders = [
                {
                    retailer: retailers[0]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}001`,
                    items: [
                        {
                            productId: createdProducts[0]._id,
                            productName: createdProducts[0].productName,
                            category: createdProducts[0].category,
                            unit: createdProducts[0].unit,
                            quantity: 50,
                            pricePerUnit: 80,
                            totalPrice: 4000,
                            bulkDiscountApplied: true,
                            discountAmount: 250
                        },
                        {
                            productId: createdProducts[1]._id,
                            productName: createdProducts[1].productName,
                            category: createdProducts[1].category,
                            unit: createdProducts[1].unit,
                            quantity: 40,
                            pricePerUnit: 115,
                            totalPrice: 4600,
                            bulkDiscountApplied: true,
                            discountAmount: 200
                        }
                    ],
                    subtotal: 8600,
                    discount: 450,
                    totalAmount: 8600,
                    status: 'REQUESTED',
                    paymentMode: 'UPI',
                    deliveryAddress: retailers[0].address,
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(), note: 'Order placed' }
                    ],
                    createdAt: new Date()
                },
                {
                    retailer: retailers[1]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}002`,
                    items: [
                        {
                            productId: createdProducts[3]._id,
                            productName: createdProducts[3].productName,
                            category: createdProducts[3].category,
                            unit: createdProducts[3].unit,
                            quantity: 100,
                            pricePerUnit: 33,
                            totalPrice: 3300,
                            bulkDiscountApplied: true,
                            discountAmount: 200
                        }
                    ],
                    subtotal: 3300,
                    discount: 200,
                    totalAmount: 3300,
                    status: 'ACCEPTED',
                    paymentMode: 'Cash',
                    deliveryAddress: retailers[1].address,
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), note: 'Order placed' },
                        { status: 'ACCEPTED', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), note: 'Order accepted by wholesaler' }
                    ],
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
                },
                {
                    retailer: retailers[2]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}003`,
                    items: [
                        {
                            productId: createdProducts[2]._id,
                            productName: createdProducts[2].productName,
                            category: createdProducts[2].category,
                            unit: createdProducts[2].unit,
                            quantity: 30,
                            pricePerUnit: 135,
                            totalPrice: 4050,
                            bulkDiscountApplied: true,
                            discountAmount: 150
                        },
                        {
                            productId: createdProducts[4]._id,
                            productName: createdProducts[4].productName,
                            category: createdProducts[4].category,
                            unit: createdProducts[4].unit,
                            quantity: 60,
                            pricePerUnit: 40,
                            totalPrice: 2400,
                            bulkDiscountApplied: true,
                            discountAmount: 120
                        }
                    ],
                    subtotal: 6450,
                    discount: 270,
                    totalAmount: 6450,
                    status: 'DISPATCHED',
                    paymentMode: 'Bank Transfer',
                    deliveryAddress: retailers[2].address,
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), note: 'Order placed' },
                        { status: 'ACCEPTED', timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000), note: 'Order accepted' },
                        { status: 'PACKED', timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000), note: 'Order packed' },
                        { status: 'DISPATCHED', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000), note: 'Out for delivery' }
                    ],
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                },
                {
                    retailer: retailers[3]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}004`,
                    items: [
                        {
                            productId: createdProducts[7]._id,
                            productName: createdProducts[7].productName,
                            category: createdProducts[7].category,
                            unit: createdProducts[7].unit,
                            quantity: 20,
                            pricePerUnit: 155,
                            totalPrice: 3100,
                            bulkDiscountApplied: true,
                            discountAmount: 100
                        }
                    ],
                    subtotal: 3100,
                    discount: 100,
                    totalAmount: 3100,
                    status: 'DELIVERED',
                    paymentMode: 'UPI',
                    deliveryAddress: retailers[3].address,
                    actualDeliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), note: 'Order placed' },
                        { status: 'ACCEPTED', timestamp: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000), note: 'Order accepted' },
                        { status: 'PACKED', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), note: 'Order packed' },
                        { status: 'DISPATCHED', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), note: 'Out for delivery' },
                        { status: 'DELIVERED', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), note: 'Successfully delivered' }
                    ],
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                },
                {
                    retailer: retailers[4]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}005`,
                    items: [
                        {
                            productId: createdProducts[10]._id,
                            productName: createdProducts[10].productName,
                            category: createdProducts[10].category,
                            unit: createdProducts[10].unit,
                            quantity: 20,
                            pricePerUnit: 310,
                            totalPrice: 6200,
                            bulkDiscountApplied: true,
                            discountAmount: 200
                        }
                    ],
                    subtotal: 6200,
                    discount: 200,
                    totalAmount: 6200,
                    status: 'DELIVERED',
                    paymentMode: 'Cash',
                    deliveryAddress: retailers[4].address,
                    actualDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), note: 'Order placed' },
                        { status: 'ACCEPTED', timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), note: 'Order accepted' },
                        { status: 'PACKED', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), note: 'Order packed' },
                        { status: 'DISPATCHED', timestamp: new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000), note: 'Out for delivery' },
                        { status: 'DELIVERED', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), note: 'Successfully delivered' }
                    ],
                    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                }
            ];

            const createdOrders = await WholesalerOrder.insertMany(orders);
            console.log(`✅ Created ${createdOrders.length} sample orders`);
        } else {
            console.log('⚠️  No retailers found, skipping order creation');
        }

        console.log('\n🎉 Wholesaler data seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Wholesaler: ${wholesaler.name} (${wholesaler.phone})`);
        console.log(`   - Products: ${createdProducts.length}`);
        console.log(`   - Fast-moving: Wheat Flour, Mustard Oil, Sunflower Oil`);
        console.log(`   - Slow-moving: Red Chilli Powder, Turmeric Powder, Chana Dal`);
        console.log(`   - Orders: Various statuses (REQUESTED, ACCEPTED, DISPATCHED, DELIVERED)`);
        console.log('\n✅ You can now test:');
        console.log('   1. View inventory at /wholesaler/inventory');
        console.log('   2. Get AI insights at /wholesaler/ai-insights');
        console.log('   3. Add new products with AI assistant');
        console.log('   4. Manage orders from dashboard');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedWholesalerData();
