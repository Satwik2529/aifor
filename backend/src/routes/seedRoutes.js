const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const WholesalerInventory = require('../models/WholesalerInventory');
const WholesalerOrder = require('../models/WholesalerOrder');

// Seed wholesaler data endpoint
router.post('/seed-wholesaler', authenticateToken, async (req, res) => {
    try {
        const wholesaler = await User.findById(req.user._id);

        if (!wholesaler || wholesaler.role !== 'wholesaler') {
            return res.status(403).json({
                success: false,
                message: 'Only wholesalers can seed their data'
            });
        }

        // Clear existing data
        await WholesalerInventory.deleteMany({ wholesaler: wholesaler._id });
        await WholesalerOrder.deleteMany({ wholesaler: wholesaler._id });

        // Create sample products
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
                lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
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
                bulkDiscounts: [
                    { minQty: 10, price: 195 },
                    { minQty: 20, price: 190 }
                ],
                isActive: true,
                totalOrders: 2,
                totalQuantitySold: 18,
                lastOrderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
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
                lastOrderDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
            }
        ];

        const createdProducts = await WholesalerInventory.insertMany(products);

        // Create sample orders
        const retailers = await User.find({ role: 'retailer' }).limit(5);
        let createdOrders = [];

        if (retailers.length > 0) {
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
                        }
                    ],
                    subtotal: 4000,
                    discount: 250,
                    totalAmount: 4000,
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
                    status: 'DELIVERED',
                    paymentMode: 'Cash',
                    deliveryAddress: retailers[1].address,
                    actualDeliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), note: 'Order placed' },
                        { status: 'DELIVERED', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), note: 'Delivered' }
                    ],
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                },
                {
                    retailer: retailers[2]._id,
                    wholesaler: wholesaler._id,
                    orderNumber: `WO${Date.now()}003`,
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
                    status: 'DISPATCHED',
                    paymentMode: 'UPI',
                    deliveryAddress: retailers[2].address,
                    statusHistory: [
                        { status: 'REQUESTED', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), note: 'Order placed' },
                        { status: 'ACCEPTED', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000), note: 'Accepted' },
                        { status: 'DISPATCHED', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), note: 'Out for delivery' }
                    ],
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            ];

            createdOrders = await WholesalerOrder.insertMany(orders);
        }

        res.status(200).json({
            success: true,
            message: 'Wholesaler data seeded successfully!',
            data: {
                wholesaler: {
                    name: wholesaler.name,
                    phone: wholesaler.phone
                },
                productsCreated: createdProducts.length,
                ordersCreated: createdOrders.length,
                summary: {
                    fastMoving: ['Wheat Flour', 'Mustard Oil', 'Sunflower Oil'],
                    slowMoving: ['Red Chilli Powder', 'Turmeric Powder', 'Chana Dal'],
                    orderStatuses: ['REQUESTED', 'DISPATCHED', 'DELIVERED']
                }
            }
        });

    } catch (error) {
        console.error('Seed wholesaler error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed data',
            error: error.message
        });
    }
});

module.exports = router;
