const mongoose = require('mongoose');

/**
 * Wholesaler Order Model
 * Tracks orders from retailers to wholesalers
 */
const wholesalerOrderSchema = new mongoose.Schema({
    // Order identification
    orderNumber: {
        type: String,
        unique: true
    },

    // Parties involved
    retailer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    wholesaler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Order items
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WholesalerInventory'
        },
        productName: String,
        category: String,
        unit: String,
        quantity: Number,
        pricePerUnit: Number,
        totalPrice: Number,
        bulkDiscountApplied: {
            type: Boolean,
            default: false
        },
        discountAmount: {
            type: Number,
            default: 0
        }
    }],

    // Order totals
    subtotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },

    // Order status
    status: {
        type: String,
        enum: ['REQUESTED', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
        default: 'REQUESTED'
    },

    // Delivery details
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    addedToInventory: {
        type: Boolean,
        default: false
    },

    // Payment
    paymentMode: {
        type: String,
        enum: ['Cash', 'UPI', 'Credit', 'Bank Transfer', 'cash', 'upi', 'credit', 'bank_transfer'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'PARTIAL'],
        default: 'PENDING'
    },

    // Tracking
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String
    }],

    // Notes
    retailerNotes: String,
    wholesalerNotes: String,

    // AI recommendation metadata
    aiRecommended: {
        type: Boolean,
        default: false
    },
    recommendationReason: String

}, {
    timestamps: true
});

// Generate order number
wholesalerOrderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const count = await mongoose.model('WholesalerOrder').countDocuments();
        this.orderNumber = `WO${Date.now()}${count + 1}`;
    }
    next();
});

// Indexes
wholesalerOrderSchema.index({ retailer: 1, status: 1 });
wholesalerOrderSchema.index({ wholesaler: 1, status: 1 });
wholesalerOrderSchema.index({ orderNumber: 1 });
wholesalerOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WholesalerOrder', wholesalerOrderSchema);
