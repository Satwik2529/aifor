const User = require('../models/User');
const WholesalerInventory = require('../models/WholesalerInventory');
const Inventory = require('../models/Inventory');
const { generateAIResponse } = require('./geminiService');

/**
 * Calculate distance between two GPS coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Get low stock items for a retailer
 */
async function getLowStockItems(retailerId) {
    const lowStockItems = await Inventory.find({
        user: retailerId,
        quantity: { $lt: 10 } // Low stock threshold
    }).select('product_name category quantity unit');

    return lowStockItems;
}

/**
 * Find best wholesaler for a specific product
 */
async function findBestWholesalerForProduct(retailer, productName, category, quantity) {
    // Find wholesalers with this product
    const wholesalerProducts = await WholesalerInventory.find({
        productName: { $regex: productName, $options: 'i' },
        category: category,
        isActive: true,
        availableQty: { $gte: quantity }
    }).populate('wholesaler');

    if (wholesalerProducts.length === 0) {
        return null;
    }

    // Score each wholesaler
    const scoredWholesalers = wholesalerProducts.map(product => {
        const wholesaler = product.wholesaler;

        // Calculate distance
        let distance = null;
        if (retailer.latitude && retailer.longitude && wholesaler.latitude && wholesaler.longitude) {
            distance = calculateDistance(
                retailer.latitude, retailer.longitude,
                wholesaler.latitude, wholesaler.longitude
            );
        }

        // Get best price for quantity
        const bestPrice = product.getBestPrice(quantity);

        // Calculate scores
        const priceScore = product.pricePerUnit > 0 ? (1 - (bestPrice / product.pricePerUnit)) * 100 : 0;
        const distanceScore = distance ? Math.max(0, 100 - (distance * 5)) : 50; // Penalty for distance
        const reliabilityScore = wholesaler.wholesalerProfile?.score?.reliabilityScore || 50;

        // Overall score (weighted average)
        const overallScore = (priceScore * 0.4) + (distanceScore * 0.3) + (reliabilityScore * 0.3);

        return {
            wholesaler: {
                id: wholesaler._id,
                name: wholesaler.name,
                businessName: wholesaler.wholesalerProfile?.businessName,
                phone: wholesaler.phone,
                locality: wholesaler.locality,
                distance_km: distance ? parseFloat(distance.toFixed(2)) : null
            },
            product: {
                id: product._id,
                productName: product.productName,
                pricePerUnit: product.pricePerUnit,
                bestPrice: bestPrice,
                unit: product.unit,
                availableQty: product.availableQty,
                bulkDiscounts: product.bulkDiscounts
            },
            scores: {
                priceScore: parseFloat(priceScore.toFixed(2)),
                distanceScore: parseFloat(distanceScore.toFixed(2)),
                reliabilityScore: parseFloat(reliabilityScore.toFixed(2)),
                overallScore: parseFloat(overallScore.toFixed(2))
            }
        };
    });

    // Sort by overall score
    scoredWholesalers.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

    return scoredWholesalers[0]; // Return best wholesaler
}

/**
 * AI-powered wholesaler recommendation
 */
async function getAIWholesalerRecommendation(retailerId, productName = null, quantity = null) {
    try {
        const retailer = await User.findById(retailerId);

        if (!retailer) {
            throw new Error('Retailer not found');
        }

        let recommendations = [];

        // If specific product requested
        if (productName && quantity) {
            const recommendation = await findBestWholesalerForProduct(
                retailer,
                productName,
                'General', // Default category
                quantity
            );

            if (recommendation) {
                recommendations.push({
                    ...recommendation,
                    reason: `Best price (₹${recommendation.product.bestPrice}/${recommendation.product.unit}) and ${recommendation.wholesaler.distance_km ? `closest (${recommendation.wholesaler.distance_km}km)` : 'reliable'} wholesaler for ${productName}`
                });
            }
        } else {
            // Auto-detect low stock items
            const lowStockItems = await getLowStockItems(retailerId);

            for (const item of lowStockItems.slice(0, 5)) { // Top 5 low stock items
                const recommendation = await findBestWholesalerForProduct(
                    retailer,
                    item.product_name,
                    item.category,
                    20 // Default restock quantity
                );

                if (recommendation) {
                    recommendations.push({
                        ...recommendation,
                        lowStockItem: {
                            productName: item.product_name,
                            currentQty: item.quantity,
                            unit: item.unit
                        },
                        reason: `${item.product_name} is low (${item.quantity} ${item.unit}). Best wholesaler: ${recommendation.wholesaler.businessName || recommendation.wholesaler.name} at ₹${recommendation.product.bestPrice}/${recommendation.product.unit}`
                    });
                }
            }
        }

        // Generate AI explanation
        if (recommendations.length > 0) {
            const aiPrompt = `As a business advisor, explain why these wholesaler recommendations are good for the retailer:
      
Retailer Location: ${retailer.locality || retailer.address?.city || 'Unknown'}

Recommendations:
${recommendations.map((r, i) => `
${i + 1}. ${r.wholesaler.businessName || r.wholesaler.name}
   - Product: ${r.product.productName}
   - Price: ₹${r.product.bestPrice}/${r.product.unit}
   - Distance: ${r.wholesaler.distance_km ? r.wholesaler.distance_km + 'km' : 'Same locality'}
   - Overall Score: ${r.scores.overallScore}/100
   ${r.lowStockItem ? `- Current Stock: ${r.lowStockItem.currentQty} ${r.lowStockItem.unit}` : ''}
`).join('\n')}

Provide a brief, actionable summary (2-3 sentences) explaining the value of these recommendations.`;

            const aiExplanation = await generateAIResponse(aiPrompt, []);

            return {
                success: true,
                recommendations,
                aiExplanation: aiExplanation.response,
                summary: {
                    totalRecommendations: recommendations.length,
                    avgScore: recommendations.reduce((sum, r) => sum + r.scores.overallScore, 0) / recommendations.length,
                    nearestDistance: Math.min(...recommendations.map(r => r.wholesaler.distance_km || 999))
                }
            };
        }

        return {
            success: false,
            message: 'No wholesaler recommendations available',
            recommendations: []
        };

    } catch (error) {
        console.error('AI wholesaler recommendation error:', error);
        throw error;
    }
}

module.exports = {
    getAIWholesalerRecommendation,
    getLowStockItems,
    findBestWholesalerForProduct
};
