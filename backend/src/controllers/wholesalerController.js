const User = require('../models/User');
const WholesalerInventory = require('../models/WholesalerInventory');
const WholesalerOrder = require('../models/WholesalerOrder');
const Notification = require('../models/Notification');
const { getAIWholesalerRecommendation } = require('../services/wholesalerRecommendationService');

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get nearby wholesalers (for retailers)
exports.getNearbyWholesalers = async (req, res) => {
    try {
        const { search, category, range = 20, page = 1, limit = 20 } = req.query;

        // Get retailer location
        const retailer = await User.findById(req.user._id);

        if (!retailer) {
            return res.status(404).json({
                success: false,
                message: 'Retailer not found'
            });
        }

        let wholesalers = [];
        let filterMethod = 'none';

        // GPS-based filtering (if retailer has GPS)
        if (retailer.latitude && retailer.longitude) {
            filterMethod = 'gps';
            const rangeInMeters = parseInt(range) * 1000;

            const query = {
                role: 'wholesaler',
                latitude: { $exists: true, $ne: null },
                longitude: { $exists: true, $ne: null },
                'wholesalerProfile.isActive': true,
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [retailer.longitude, retailer.latitude]
                        },
                        $maxDistance: rangeInMeters
                    }
                }
            };

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { 'wholesalerProfile.businessName': { $regex: search, $options: 'i' } }
                ];
            }

            wholesalers = await User.find(query)
                .select('name wholesalerProfile locality address latitude longitude phone')
                .limit(parseInt(limit));

            // Calculate distance and score
            wholesalers = wholesalers.map(w => {
                const distance = calculateDistance(
                    retailer.latitude, retailer.longitude,
                    w.latitude, w.longitude
                );

                return {
                    ...w.toObject(),
                    distance_km: distance ? parseFloat(distance.toFixed(2)) : null,
                    overallScore: w.wholesalerProfile?.score?.rating || 0
                };
            });

            // Sort by score and distance
            wholesalers.sort((a, b) => {
                if (b.overallScore !== a.overallScore) {
                    return b.overallScore - a.overallScore;
                }
                return (a.distance_km || 999) - (b.distance_km || 999);
            });

        } else {
            // Locality-based fallback
            filterMethod = 'locality';

            const query = {
                role: 'wholesaler',
                'wholesalerProfile.isActive': true
            };

            if (retailer.locality) {
                query.$or = [
                    { locality: retailer.locality },
                    { 'address.city': retailer.address?.city }
                ];
            }

            if (search) {
                const searchFilter = [
                    { name: { $regex: search, $options: 'i' } },
                    { 'wholesalerProfile.businessName': { $regex: search, $options: 'i' } }
                ];

                if (query.$or) {
                    query.$and = [
                        { $or: query.$or },
                        { $or: searchFilter }
                    ];
                    delete query.$or;
                } else {
                    query.$or = searchFilter;
                }
            }

            wholesalers = await User.find(query)
                .select('name wholesalerProfile locality address phone')
                .sort({ 'wholesalerProfile.score.rating': -1 })
                .limit(parseInt(limit));
        }

        res.status(200).json({
            success: true,
            message: 'Wholesalers retrieved successfully',
            data: {
                wholesalers,
                filter_method: filterMethod,
                range_km: filterMethod === 'gps' ? parseInt(range) : null,
                retailer_location: {
                    locality: retailer.locality,
                    city: retailer.address?.city,
                    has_gps: !!(retailer.latitude && retailer.longitude)
                }
            }
        });

    } catch (error) {
        console.error('Get wholesalers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve wholesalers',
            error: error.message
        });
    }
};

// Get wholesaler inventory
exports.getWholesalerInventory = async (req, res) => {
    try {
        const { wholesalerId } = req.params;
        const { search, category, page = 1, limit = 50 } = req.query;

        const query = {
            wholesaler: wholesalerId,
            isActive: true
        };

        if (search) {
            query.$text = { $search: search };
        }

        if (category) {
            query.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const inventory = await WholesalerInventory.find(query)
            .sort({ totalOrders: -1, pricePerUnit: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await WholesalerInventory.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                inventory,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get wholesaler inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve inventory',
            error: error.message
        });
    }
};

// Create order from retailer to wholesaler
exports.createOrder = async (req, res) => {
    try {
        const { wholesalerId, items, paymentMode, deliveryAddress, notes } = req.body;

        // Validate wholesaler
        const wholesaler = await User.findOne({ _id: wholesalerId, role: 'wholesaler' });
        if (!wholesaler) {
            return res.status(404).json({
                success: false,
                message: 'Wholesaler not found'
            });
        }

        // Validate and calculate order
        let subtotal = 0;
        let totalDiscount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await WholesalerInventory.findById(item.productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product ${item.productId} not found`
                });
            }

            if (!product.isAvailable(item.quantity)) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.productName}`
                });
            }

            const bestPrice = product.getBestPrice(item.quantity);
            const itemTotal = bestPrice * item.quantity;
            const discount = (product.pricePerUnit - bestPrice) * item.quantity;

            orderItems.push({
                productId: product._id,
                productName: product.productName,
                category: product.category,
                unit: product.unit,
                quantity: item.quantity,
                pricePerUnit: bestPrice,
                totalPrice: itemTotal,
                bulkDiscountApplied: discount > 0,
                discountAmount: discount
            });

            subtotal += itemTotal;
            totalDiscount += discount;
        }

        // Check minimum order value
        if (wholesaler.wholesalerProfile?.minOrderValue && subtotal < wholesaler.wholesalerProfile.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value is ₹${wholesaler.wholesalerProfile.minOrderValue}`
            });
        }

        // Create order
        const order = new WholesalerOrder({
            retailer: req.user._id,
            wholesaler: wholesalerId,
            items: orderItems,
            subtotal,
            discount: totalDiscount,
            totalAmount: subtotal,
            paymentMode,
            deliveryAddress: deliveryAddress || req.user.address,
            retailerNotes: notes,
            statusHistory: [{
                status: 'REQUESTED',
                timestamp: new Date(),
                note: 'Order created by retailer'
            }]
        });

        await order.save();

        // Update inventory quantities (reserve stock)
        for (const item of orderItems) {
            await WholesalerInventory.findByIdAndUpdate(item.productId, {
                $inc: { availableQty: -item.quantity }
            });
        }

        // Create notification for wholesaler
        await Notification.create({
            user: wholesalerId,
            title: 'New Order Received',
            message: `New order ${order.orderNumber} from ${req.user.shop_name || req.user.name}`,
            type: 'order',
            relatedId: order._id
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: { order }
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// Get retailer's orders
exports.getRetailerOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = { retailer: req.user._id };
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await WholesalerOrder.find(query)
            .populate('wholesaler', 'name wholesalerProfile phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await WholesalerOrder.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get retailer orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve orders',
            error: error.message
        });
    }
};

// Get wholesaler's orders
exports.getWholesalerOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = { wholesaler: req.user._id };
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await WholesalerOrder.find(query)
            .populate('retailer', 'name shop_name phone address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await WholesalerOrder.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get wholesaler orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve orders',
            error: error.message
        });
    }
};

// Update order status (wholesaler only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, note } = req.body;

        const order = await WholesalerOrder.findOne({
            _id: orderId,
            wholesaler: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note
        });

        if (status === 'DELIVERED') {
            order.actualDeliveryDate = new Date();

            // Update wholesaler inventory analytics
            for (const item of order.items) {
                await WholesalerInventory.findByIdAndUpdate(item.productId, {
                    $inc: {
                        totalOrders: 1,
                        totalQuantitySold: item.quantity
                    },
                    lastOrderDate: new Date()
                });
            }
        }

        if (status === 'ACCEPTED') {
            // Notify retailer that order is accepted and ready to add to inventory
            await Notification.create({
                user: order.retailer,
                type: 'order',
                title: '✅ Order Accepted - Add to Inventory',
                message: `Your order ${order.orderNumber} has been accepted by the wholesaler. Click to review and add items to your inventory.`,
                relatedId: order._id
            });
        }

        if (status === 'CANCELLED') {
            // Restore inventory
            for (const item of order.items) {
                await WholesalerInventory.findByIdAndUpdate(item.productId, {
                    $inc: { availableQty: item.quantity }
                });
            }
        }

        await order.save();

        // Notify retailer
        await Notification.create({
            user: order.retailer,
            title: `Order ${status}`,
            message: `Your order ${order.orderNumber} is now ${status.toLowerCase()}`,
            type: 'order',
            relatedId: order._id
        });

        res.status(200).json({
            success: true,
            message: 'Order status updated',
            data: { order }
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// Manage wholesaler inventory (wholesaler only)
exports.manageInventory = async (req, res) => {
    try {
        const { action } = req.params; // 'add', 'update', 'delete'
        const { productId, ...productData } = req.body;

        if (action === 'add') {
            const newProduct = new WholesalerInventory({
                ...productData,
                wholesaler: req.user._id
            });
            await newProduct.save();

            return res.status(201).json({
                success: true,
                message: 'Product added successfully',
                data: { product: newProduct }
            });
        }

        if (action === 'update') {
            const product = await WholesalerInventory.findOneAndUpdate(
                { _id: productId, wholesaler: req.user._id },
                productData,
                { new: true }
            );

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: { product }
            });
        }

        if (action === 'delete') {
            const product = await WholesalerInventory.findOneAndUpdate(
                { _id: productId, wholesaler: req.user._id },
                { isActive: false },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Product deactivated successfully',
                data: { product }
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Invalid action'
        });

    } catch (error) {
        console.error('Manage inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to manage inventory',
            error: error.message
        });
    }
};

// Get wholesaler's own inventory
exports.getMyInventory = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 50 } = req.query;

        const query = {
            wholesaler: req.user._id
        };

        if (search) {
            query.$text = { $search: search };
        }

        if (category) {
            query.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const inventory = await WholesalerInventory.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await WholesalerInventory.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                inventory,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get my inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve inventory',
            error: error.message
        });
    }
};

// AI-powered wholesaler recommendation
exports.getAIRecommendation = async (req, res) => {
    try {
        const { productName, quantity } = req.query;

        const result = await getAIWholesalerRecommendation(
            req.user._id,
            productName || null,
            quantity ? parseInt(quantity) : null
        );

        res.status(200).json(result);

    } catch (error) {
        console.error('AI recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI recommendations',
            error: error.message
        });
    }
};

// Get AI insights for wholesaler (new)
exports.getWholesalerAIInsights = async (req, res) => {
    try {
        const { getWholesalerAIInsights } = require('../services/wholesalerAIService');
        const result = await getWholesalerAIInsights(req.user._id);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Wholesaler AI insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI insights',
            error: error.message
        });
    }
};

// AI Inventory Assistant
exports.aiInventoryAssistant = async (req, res) => {
    try {
        const { aiInventoryAssistant } = require('../services/wholesalerAIService');
        const { imageUrl, manualData } = req.body;

        const result = await aiInventoryAssistant(req.user._id, imageUrl, manualData);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('AI Inventory Assistant error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI assistance',
            error: error.message
        });
    }
};

// Add wholesaler order items to retailer inventory (called by retailer)
exports.addToMyInventory = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { items } = req.body;

        const Inventory = require('../models/Inventory');

        // Verify order belongs to this retailer and is in valid status
        const order = await WholesalerOrder.findOne({
            _id: orderId,
            retailer: req.user._id,
            status: { $in: ['ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED'] }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not yet accepted by wholesaler'
            });
        }

        // Check if already added to inventory
        if (order.addedToInventory) {
            return res.status(400).json({
                success: false,
                message: 'Items already added to inventory'
            });
        }

        // Add items to retailer's own inventory
        let addedCount = 0;
        for (const item of items) {
            // Check if product already exists in retailer inventory
            const existing = await Inventory.findOne({
                user: req.user._id,
                product_name: item.productName
            });

            if (existing) {
                // Update quantity and prices
                existing.quantity += item.quantity;
                if (item.costPrice) existing.cost_price = item.costPrice;
                if (item.sellingPrice) existing.selling_price = item.sellingPrice;
                if (item.expiryDate) existing.expiry_date = item.expiryDate;
                await existing.save();
                addedCount++;
            } else {
                // Create new inventory item
                await Inventory.create({
                    user: req.user._id,
                    product_name: item.productName,
                    category: item.category,
                    quantity: item.quantity,
                    unit: item.unit,
                    cost_price: item.costPrice || 0,
                    selling_price: item.sellingPrice,
                    expiry_date: item.expiryDate || undefined,
                    low_stock_threshold: Math.max(10, item.quantity * 0.2)
                });
                addedCount++;
            }
        }

        // Mark order as added to inventory
        order.addedToInventory = true;
        await order.save();

        res.status(200).json({
            success: true,
            message: `Added ${addedCount} items to your inventory`,
            data: { addedCount }
        });

    } catch (error) {
        console.error('Add to my inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add items to inventory',
            error: error.message
        });
    }
};

// Send AI campaign to retailers
exports.sendAICampaign = async (req, res) => {
    try {
        const { productId, campaignMessage, discount, targetRetailers, retailerId } = req.body;

        let product;
        if (productId) {
            product = await WholesalerInventory.findOne({
                _id: productId,
                wholesaler: req.user._id
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
        }

        // Get target retailers
        let retailers;
        if (retailerId) {
            // Send to specific retailer (personalized offer)
            retailers = await User.find({
                _id: retailerId,
                role: 'retailer'
            });
        } else if (targetRetailers && targetRetailers.length > 0) {
            // Send to specific list of retailers
            retailers = await User.find({
                _id: { $in: targetRetailers },
                role: 'retailer'
            });
        } else {
            // Send to all retailers who have ordered from this wholesaler
            const orders = await WholesalerOrder.find({
                wholesaler: req.user._id
            }).distinct('retailer');

            retailers = await User.find({
                _id: { $in: orders },
                role: 'retailer'
            });
        }

        // Send notifications to all retailers
        let sentCount = 0;
        for (const retailer of retailers) {
            await Notification.create({
                user: retailer._id,
                title: `🎁 Special Offer: ${discount}% OFF${product ? ` on ${product.productName}` : ''}!`,
                message: campaignMessage,
                type: 'promotion',
                relatedId: productId || req.user._id
            });
            sentCount++;
        }

        res.status(200).json({
            success: true,
            message: `Campaign sent to ${sentCount} retailers`,
            data: { sentCount, retailers: retailers.length }
        });

    } catch (error) {
        console.error('Send campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send campaign',
            error: error.message
        });
    }
};

// Apply discount to slow-moving product (wholesaler action)
exports.applyDiscountToProduct = async (req, res) => {
    try {
        const { productId, discount } = req.body;

        const product = await WholesalerInventory.findOne({
            _id: productId,
            wholesaler: req.user._id
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Calculate new discounted price
        const originalPrice = product.pricePerUnit;
        const discountedPrice = originalPrice * (1 - discount / 100);

        // Update product with discount
        product.pricePerUnit = discountedPrice;
        product.discountApplied = {
            originalPrice,
            discountPercentage: discount,
            appliedAt: new Date(),
            reason: 'Slow moving product - AI recommendation'
        };

        await product.save();

        res.status(200).json({
            success: true,
            message: `${discount}% discount applied to ${product.productName}`,
            data: {
                product,
                originalPrice,
                newPrice: discountedPrice,
                savings: originalPrice - discountedPrice
            }
        });

    } catch (error) {
        console.error('Apply discount error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply discount',
            error: error.message
        });
    }
};

// Get active offers for retailer
exports.getActiveOffers = async (req, res) => {
    try {
        const { wholesalerId } = req.params;

        // Get wholesaler info
        const wholesaler = await User.findOne({
            _id: wholesalerId,
            role: 'wholesaler'
        }).select('name wholesalerProfile locality address latitude longitude');

        if (!wholesaler) {
            return res.status(404).json({
                success: false,
                message: 'Wholesaler not found'
            });
        }

        // Get retailer location for distance calculation
        const retailer = await User.findById(req.user._id);
        let distance = null;
        if (retailer.latitude && retailer.longitude && wholesaler.latitude && wholesaler.longitude) {
            distance = calculateDistance(
                retailer.latitude, retailer.longitude,
                wholesaler.latitude, wholesaler.longitude
            );
        }

        // Get products with discounts or near expiry
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const offers = await WholesalerInventory.find({
            wholesaler: wholesalerId,
            isActive: true,
            $or: [
                { 'discountApplied.discountPercentage': { $exists: true, $gt: 0 } },
                { expiryDate: { $lte: thirtyDaysFromNow, $gte: now } }
            ]
        }).sort({ 'discountApplied.appliedAt': -1, expiryDate: 1 });

        // Calculate effective discount for each offer
        const offersWithDetails = offers.map(offer => {
            const offerObj = offer.toObject();

            // Calculate discount percentage
            let discountPercentage = 0;
            if (offer.discountApplied && offer.discountApplied.originalPrice) {
                discountPercentage = offer.discountApplied.discountPercentage;
            } else if (offer.expiryDate) {
                // Calculate days until expiry
                const daysUntilExpiry = Math.ceil((offer.expiryDate - now) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 7) {
                    discountPercentage = 30;
                } else if (daysUntilExpiry <= 15) {
                    discountPercentage = 20;
                } else if (daysUntilExpiry <= 30) {
                    discountPercentage = 10;
                }
            }

            return {
                ...offerObj,
                effectiveDiscount: discountPercentage,
                daysUntilExpiry: offer.expiryDate ? Math.ceil((offer.expiryDate - now) / (1000 * 60 * 60 * 24)) : null,
                wholesalerInfo: {
                    name: wholesaler.name,
                    businessName: wholesaler.wholesalerProfile?.businessName,
                    location: wholesaler.locality || wholesaler.address?.city,
                    distance_km: distance ? parseFloat(distance.toFixed(2)) : null
                }
            };
        });

        res.status(200).json({
            success: true,
            data: {
                offers: offersWithDetails,
                wholesaler: {
                    id: wholesaler._id,
                    name: wholesaler.name,
                    businessName: wholesaler.wholesalerProfile?.businessName,
                    location: wholesaler.locality || wholesaler.address?.city,
                    distance_km: distance ? parseFloat(distance.toFixed(2)) : null
                }
            }
        });

    } catch (error) {
        console.error('Get active offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve offers',
            error: error.message
        });
    }
};

// Get all active offers for retailer (from all wholesalers)
exports.getAllActiveOffers = async (req, res) => {
    try {
        const retailer = await User.findById(req.user._id);

        // Find nearby wholesalers
        let wholesalers;
        if (retailer.latitude && retailer.longitude) {
            wholesalers = await User.find({
                role: 'wholesaler',
                'wholesalerProfile.isActive': true,
                latitude: { $exists: true, $ne: null },
                longitude: { $exists: true, $ne: null },
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [retailer.longitude, retailer.latitude]
                        },
                        $maxDistance: 50000 // 50km
                    }
                }
            }).select('name wholesalerProfile locality address latitude longitude');
        } else {
            // Fallback to locality-based
            wholesalers = await User.find({
                role: 'wholesaler',
                'wholesalerProfile.isActive': true,
                $or: [
                    { locality: retailer.locality },
                    { 'address.city': retailer.address?.city }
                ]
            }).select('name wholesalerProfile locality address');
        }

        const wholesalerIds = wholesalers.map(w => w._id);

        // Get products with discounts or near expiry
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const offers = await WholesalerInventory.find({
            wholesaler: { $in: wholesalerIds },
            isActive: true,
            $or: [
                { 'discountApplied.discountPercentage': { $exists: true, $gt: 0 } },
                { expiryDate: { $lte: thirtyDaysFromNow, $gte: now } }
            ]
        }).populate('wholesaler', 'name wholesalerProfile locality address latitude longitude')
            .sort({ 'discountApplied.appliedAt': -1, expiryDate: 1 });

        // Calculate effective discount and distance for each offer
        const offersWithDetails = offers.map(offer => {
            const offerObj = offer.toObject();
            const wholesaler = offer.wholesaler;

            // Calculate distance
            let distance = null;
            if (retailer.latitude && retailer.longitude && wholesaler.latitude && wholesaler.longitude) {
                distance = calculateDistance(
                    retailer.latitude, retailer.longitude,
                    wholesaler.latitude, wholesaler.longitude
                );
            }

            // Calculate discount percentage
            let discountPercentage = 0;
            if (offer.discountApplied && offer.discountApplied.originalPrice) {
                discountPercentage = offer.discountApplied.discountPercentage;
            } else if (offer.expiryDate) {
                const daysUntilExpiry = Math.ceil((offer.expiryDate - now) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry <= 7) {
                    discountPercentage = 30;
                } else if (daysUntilExpiry <= 15) {
                    discountPercentage = 20;
                } else if (daysUntilExpiry <= 30) {
                    discountPercentage = 10;
                }
            }

            return {
                ...offerObj,
                effectiveDiscount: discountPercentage,
                daysUntilExpiry: offer.expiryDate ? Math.ceil((offer.expiryDate - now) / (1000 * 60 * 60 * 24)) : null,
                wholesalerInfo: {
                    id: wholesaler._id,
                    name: wholesaler.name,
                    businessName: wholesaler.wholesalerProfile?.businessName,
                    location: wholesaler.locality || wholesaler.address?.city,
                    distance_km: distance ? parseFloat(distance.toFixed(2)) : null
                }
            };
        });

        res.status(200).json({
            success: true,
            data: {
                offers: offersWithDetails,
                totalOffers: offersWithDetails.length,
                totalWholesalers: wholesalers.length
            }
        });

    } catch (error) {
        console.error('Get all active offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve offers',
            error: error.message
        });
    }
};
