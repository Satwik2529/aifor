const mongoose = require('mongoose');

/**
 * Wholesaler Inventory Model
 * Bulk-oriented inventory for wholesalers serving retailers
 */
const wholesalerInventorySchema = new mongoose.Schema({
    // Owner
    wholesaler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Product details
    productName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['kg', 'litre', 'box', 'piece', 'dozen', 'quintal', 'ton'],
        default: 'kg'
    },

    // Pricing
    costPrice: {
        type: Number,
        min: 0
    },
    pricePerUnit: {
        type: Number,
        required: true,
        min: 0
    },

    // Expiry tracking
    expiryDate: {
        type: Date
    },

    // Bulk discounts
    bulkDiscounts: [{
        minQty: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        discountPercentage: Number
    }],

    // Stock management
    minOrderQty: {
        type: Number,
        required: true,
        default: 1
    },
    availableQty: {
        type: Number,
        required: true,
        default: 0
    },
    reorderLevel: {
        type: Number,
        default: 10
    },

    // Product metadata
    description: String,
    brand: String,
    manufacturer: String,
    expiryDate: Date,

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Discount tracking
    discountApplied: {
        originalPrice: Number,
        discountPercentage: Number,
        appliedAt: Date,
        reason: String
    },

    // Analytics
    totalOrders: {
        type: Number,
        default: 0
    },
    totalQuantitySold: {
        type: Number,
        default: 0
    },
    lastOrderDate: Date

}, {
    timestamps: true
});

// Indexes
wholesalerInventorySchema.index({ wholesaler: 1, isActive: 1 });
wholesalerInventorySchema.index({ category: 1 });
wholesalerInventorySchema.index({ productName: 'text' });
wholesalerInventorySchema.index({ pricePerUnit: 1 });

// Calculate best price for given quantity
wholesalerInventorySchema.methods.getBestPrice = function (quantity) {
    let bestPrice = this.pricePerUnit;

    // Check bulk discounts
    for (const discount of this.bulkDiscounts) {
        if (quantity >= discount.minQty && discount.price < bestPrice) {
            bestPrice = discount.price;
        }
    }

    return bestPrice;
};

// Check if quantity is available
wholesalerInventorySchema.methods.isAvailable = function (quantity) {
    return this.isActive && this.availableQty >= quantity && quantity >= this.minOrderQty;
};

module.exports = mongoose.model('WholesalerInventory', wholesalerInventorySchema);
