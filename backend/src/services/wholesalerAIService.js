const OpenAI = require('openai');
const WholesalerInventory = require('../models/WholesalerInventory');
const WholesalerOrder = require('../models/WholesalerOrder');
const Notification = require('../models/Notification');
const User = require('../models/User');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getWholesalerAIInsights = async (wholesalerId) => {
    try {
        const inventory = await WholesalerInventory.find({ wholesaler: wholesalerId, isActive: true });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await WholesalerOrder.find({
            wholesaler: wholesalerId,
            createdAt: { $gte: thirtyDaysAgo }
        }).populate('retailer', 'name shop_name');

        const productPerformance = inventory.map(product => {
            const productOrders = orders.filter(order =>
                order.items.some(item => item.productId.toString() === product._id.toString())
            );

            const totalSold = productOrders.reduce((sum, order) => {
                const item = order.items.find(i => i.productId.toString() === product._id.toString());
                return sum + (item ? item.quantity : 0);
            }, 0);

            const avgOrdersPerWeek = (productOrders.length / 4).toFixed(1);
            const stockTurnoverRate = product.availableQty > 0 ? (totalSold / product.availableQty * 100).toFixed(1) : 0;

            // Better movement classification based on actual sales
            let movementSpeed = 'slow', urgency = 'low';

            // Fast moving: 3+ orders per week OR high turnover rate
            if (avgOrdersPerWeek >= 3 || stockTurnoverRate >= 50) {
                movementSpeed = 'fast';
                urgency = 'low';
            }
            // Medium moving: 1-3 orders per week OR moderate turnover
            else if (avgOrdersPerWeek >= 1 || (stockTurnoverRate >= 20 && stockTurnoverRate < 50)) {
                movementSpeed = 'medium';
                urgency = 'medium';
            }
            // Slow moving: Less than 1 order per week AND low turnover
            else if (avgOrdersPerWeek < 1 && stockTurnoverRate < 20) {
                movementSpeed = 'slow';
                urgency = 'high';
            }

            const stockStatus = product.availableQty < product.minOrderQty * 2 ? 'low' :
                product.availableQty > product.minOrderQty * 10 ? 'high' : 'normal';

            return {
                productId: product._id, productName: product.productName, category: product.category,
                totalSold, avgOrdersPerWeek: parseFloat(avgOrdersPerWeek), stockTurnoverRate: parseFloat(stockTurnoverRate),
                availableQty: product.availableQty, pricePerUnit: product.pricePerUnit,
                movementSpeed, urgency, stockStatus, lastOrderDate: product.lastOrderDate
            };
        });

        const retailerAnalysis = {};
        orders.forEach(order => {
            const retailerId = order.retailer._id.toString();
            if (!retailerAnalysis[retailerId]) {
                retailerAnalysis[retailerId] = {
                    retailerName: order.retailer.shop_name || order.retailer.name,
                    totalOrders: 0, totalSpent: 0, favoriteProducts: {}, avgOrderValue: 0
                };
            }
            retailerAnalysis[retailerId].totalOrders++;
            retailerAnalysis[retailerId].totalSpent += order.totalAmount;
            order.items.forEach(item => {
                if (!retailerAnalysis[retailerId].favoriteProducts[item.productName]) {
                    retailerAnalysis[retailerId].favoriteProducts[item.productName] = 0;
                }
                retailerAnalysis[retailerId].favoriteProducts[item.productName] += item.quantity;
            });
        });

        Object.keys(retailerAnalysis).forEach(retailerId => {
            retailerAnalysis[retailerId].avgOrderValue =
                (retailerAnalysis[retailerId].totalSpent / retailerAnalysis[retailerId].totalOrders).toFixed(2);
        });

        const prompt = `Analyze this wholesale business data and provide SIMPLE, ACTIONABLE insights:

PRODUCT PERFORMANCE:
${JSON.stringify(productPerformance, null, 2)}

RETAILER ANALYSIS:
${JSON.stringify(retailerAnalysis, null, 2)}

Provide insights in JSON format with these keys:

1. slowMovingProducts: array of {productName, message (simple 1 sentence), actionType ("discount"|"campaign"|"remove"), urgency, suggestedDiscount}
   - ONLY include products with ACTUAL POOR SALES: avgOrdersPerWeek < 0.5 AND stockTurnoverRate < 15
   - Do NOT include products with "normal stock; monitor sales" or "steady sales"
   - Do NOT include products that are just overstocked but selling normally
   - These must be products that are NOT SELLING and need urgent discounts
   - Message should clearly state the sales problem (e.g., "Very low sales, only X orders in 30 days")

2. fastMovingProducts: array of {productName, message (simple 1 sentence), actionType ("restock"|"increase_price"), currentStock, suggestedRestockQty}
   - ONLY include products with movementSpeed === "fast" (avgOrdersPerWeek >= 3 OR stockTurnoverRate >= 50)
   - These are HIGH DEMAND products selling well
   - Calculate suggestedRestockQty based on avgOrdersPerWeek * 4 (one month supply)

3. restockRecommendations: array of {productName, currentStock, avgWeeklySales, suggestedRestockQty, message, urgency}
   - Include products with movementSpeed === "medium" or "fast" AND stockStatus === "low"
   - These have steady/good sales but need more inventory
   - Calculate suggestedRestockQty = avgOrdersPerWeek * 4 weeks (one month supply)
   - Message should say "Restock needed - selling X units/week"

4. expiryAlerts: array of {productName, daysLeft, message (simple), actionType ("urgent_campaign"|"discount"), suggestedDiscount, campaignMessage}
   - Products expiring within 30 days
   - Higher discount for products expiring sooner (7 days = 30%, 15 days = 20%, 30 days = 15%)

5. personalizedOffers: array of {retailerName, retailerId, productName, message, discount, campaignMessage}
   - Consider retailer location and buying patterns
   - Target retailers who haven't ordered recently

6. pricingRecommendations: array of {productName, currentPrice, suggestedPrice, message, reason}
   - For products with good sales that can support higher prices
   - For products with very low margins that need price adjustment

7. stockAlerts: array of {productName, status, message, actionType ("buy_more"|"reduce_price")}
   - For products with stockStatus === "high" but movementSpeed === "medium" (overstocked but selling)
   - Message should explain: "Overstocked - X units, selling Y/week, will take Z weeks to clear"

8. overallHealth: {score (0-100), message}

9. profitSummary: {totalRevenue, totalCost, netProfit, profitMargin, message}

CRITICAL RULES:
- Use SIMPLE language
- Keep messages under 20 words
- Focus on WHAT TO DO
- slowMovingProducts = ONLY products with avgOrdersPerWeek < 0.5 AND stockTurnoverRate < 15 (VERY POOR SALES)
- Do NOT put products with "normal stock" or "monitor sales" in slowMovingProducts
- fastMovingProducts = ONLY products with avgOrdersPerWeek >= 3 OR stockTurnoverRate >= 50
- restockRecommendations = Products with good/steady sales but low stock
- Products with just high stock but normal sales go to stockAlerts, NOT slowMovingProducts
- Consider expiry dates - products expiring soon should be in expiryAlerts, not slowMovingProducts
- Calculate profit from cost vs selling price`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a business intelligence AI. Provide clear, actionable insights in JSON format. Be professional and concise." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const aiInsights = JSON.parse(completion.choices[0].message.content);

        // Ensure no product appears in both slow and fast moving
        if (aiInsights.slowMovingProducts && aiInsights.fastMovingProducts) {
            const slowProductNames = new Set(aiInsights.slowMovingProducts.map(p => p.productName));
            const fastProductNames = new Set(aiInsights.fastMovingProducts.map(p => p.productName));

            // Remove any products that appear in both
            aiInsights.slowMovingProducts = aiInsights.slowMovingProducts.filter(p => !fastProductNames.has(p.productName));
            aiInsights.fastMovingProducts = aiInsights.fastMovingProducts.filter(p => !slowProductNames.has(p.productName));
        }

        // CRITICAL: Filter slow-moving products to only include truly slow ones
        if (aiInsights.slowMovingProducts && aiInsights.slowMovingProducts.length > 0) {
            aiInsights.slowMovingProducts = aiInsights.slowMovingProducts.filter(slowProduct => {
                const perfData = productPerformance.find(p => p.productName === slowProduct.productName);
                // VERY STRICT: Only include if avgOrdersPerWeek < 0.5 AND stockTurnoverRate < 15
                // This means VERY POOR sales, not just low stock
                if (!perfData) return false;

                // Check if product is expiring soon - if yes, it should be in expiryAlerts, not here
                const product = inventory.find(p => p._id.toString() === perfData.productId.toString());
                if (product && product.expiryDate) {
                    const daysUntilExpiry = Math.floor((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
                        return false; // Should be in expiry alerts instead
                    }
                }

                return perfData.avgOrdersPerWeek < 0.5 && perfData.stockTurnoverRate < 15;
            });
        }

        // CRITICAL: Filter fast-moving products to only include truly fast ones
        if (aiInsights.fastMovingProducts && aiInsights.fastMovingProducts.length > 0) {
            aiInsights.fastMovingProducts = aiInsights.fastMovingProducts.filter(fastProduct => {
                const perfData = productPerformance.find(p => p.productName === fastProduct.productName);
                // Only include if avgOrdersPerWeek >= 3 OR stockTurnoverRate >= 50
                return perfData && perfData.movementSpeed === 'fast' && (perfData.avgOrdersPerWeek >= 3 || perfData.stockTurnoverRate >= 50);
            });
        }

        // Add productId to slow-moving products for action buttons
        if (aiInsights.slowMovingProducts && aiInsights.slowMovingProducts.length > 0) {
            aiInsights.slowMovingProducts = aiInsights.slowMovingProducts.map(slowProduct => {
                const matchingProduct = productPerformance.find(p => p.productName === slowProduct.productName);
                return {
                    ...slowProduct,
                    productId: matchingProduct ? matchingProduct.productId : null
                };
            }).filter(p => p.productId); // Only keep products with valid IDs
        }

        // Add productId to fast-moving products
        if (aiInsights.fastMovingProducts && aiInsights.fastMovingProducts.length > 0) {
            aiInsights.fastMovingProducts = aiInsights.fastMovingProducts.map(fastProduct => {
                const matchingProduct = productPerformance.find(p => p.productName === fastProduct.productName);
                return {
                    ...fastProduct,
                    productId: matchingProduct ? matchingProduct.productId : null,
                    suggestedRestockQty: matchingProduct ? Math.ceil(matchingProduct.avgOrdersPerWeek * 4) : null
                };
            }).filter(p => p.productId);
        }

        // Add productId to restock recommendations
        if (aiInsights.restockRecommendations && aiInsights.restockRecommendations.length > 0) {
            aiInsights.restockRecommendations = aiInsights.restockRecommendations.map(restockRec => {
                const matchingProduct = productPerformance.find(p => p.productName === restockRec.productName);
                return {
                    ...restockRec,
                    productId: matchingProduct ? matchingProduct.productId : null,
                    suggestedRestockQty: restockRec.suggestedRestockQty || (matchingProduct ? Math.ceil(matchingProduct.avgOrdersPerWeek * 4) : null),
                    avgWeeklySales: matchingProduct ? matchingProduct.avgOrdersPerWeek : null
                };
            }).filter(p => p.productId);
        }

        // Add productId to pricing recommendations
        if (aiInsights.pricingRecommendations && aiInsights.pricingRecommendations.length > 0) {
            aiInsights.pricingRecommendations = aiInsights.pricingRecommendations.map(pricingRec => {
                const matchingProduct = productPerformance.find(p => p.productName === pricingRec.productName);
                return {
                    ...pricingRec,
                    productId: matchingProduct ? matchingProduct.productId : null
                };
            }).filter(p => p.productId);
        }

        // Add productId to stock alerts
        if (aiInsights.stockAlerts && aiInsights.stockAlerts.length > 0) {
            aiInsights.stockAlerts = aiInsights.stockAlerts.map(stockAlert => {
                const matchingProduct = productPerformance.find(p => p.productName === stockAlert.productName);
                return {
                    ...stockAlert,
                    productId: matchingProduct ? matchingProduct.productId : null
                };
            }).filter(p => p.productId);
        }

        // Calculate actual profit summary
        const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        let totalCost = 0;
        deliveredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = inventory.find(p => p._id.toString() === item.productId?.toString());
                if (product && product.costPrice) {
                    totalCost += product.costPrice * item.quantity;
                }
            });
        });

        const netProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        aiInsights.profitSummary = {
            totalRevenue: totalRevenue.toFixed(2),
            totalCost: totalCost.toFixed(2),
            netProfit: netProfit.toFixed(2),
            profitMargin: parseFloat(profitMargin),
            message: `Net profit of ₹${netProfit.toFixed(0)} with ${profitMargin}% margin on total sales.`
        };

        // Check for near-expiry products and create campaigns
        const nearExpiryProducts = inventory.filter(product => {
            if (!product.expiryDate) return false;
            const daysLeft = Math.floor((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft <= 30;
        });

        if (nearExpiryProducts.length > 0 && !aiInsights.expiryAlerts) {
            aiInsights.expiryAlerts = nearExpiryProducts.map(product => {
                const daysLeft = Math.floor((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                const suggestedDiscount = daysLeft <= 7 ? 30 : daysLeft <= 15 ? 20 : 15;

                return {
                    productName: product.productName,
                    productId: product._id,
                    daysLeft,
                    message: `${product.productName} expires in ${daysLeft} days. Urgent action needed.`,
                    actionType: 'urgent_campaign',
                    suggestedDiscount,
                    campaignMessage: `URGENT SALE! ${product.productName} - ${suggestedDiscount}% OFF! Only ${daysLeft} days left. Order now at ₹${(product.pricePerUnit * (1 - suggestedDiscount / 100)).toFixed(2)}/${product.unit}. Limited stock available!`
                };
            });
        }

        // Add retailer IDs to personalized offers for sending campaigns
        if (aiInsights.personalizedOffers && aiInsights.personalizedOffers.length > 0) {
            for (const offer of aiInsights.personalizedOffers) {
                const retailer = await User.findOne({
                    $or: [
                        { shop_name: { $regex: offer.retailerName, $options: 'i' } },
                        { name: { $regex: offer.retailerName, $options: 'i' } }
                    ],
                    role: 'retailer'
                });

                if (retailer) {
                    offer.retailerId = retailer._id;
                    offer.retailerLocation = retailer.locality || retailer.address?.city;
                }
            }
        }

        return {
            success: true,
            data: { productPerformance, retailerAnalysis: Object.values(retailerAnalysis), aiInsights, generatedAt: new Date() }
        };

    } catch (error) {
        console.error('Wholesaler AI Insights Error:', error);
        return { success: false, message: 'Failed to generate AI insights', error: error.message };
    }
};

// AI Assistant for inventory decisions with image support
const aiInventoryAssistant = async (wholesalerId, imageUrl, manualData) => {
    try {
        let productData;

        if (imageUrl) {
            // Extract product info from image using OpenAI Vision
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Extract product information from this image. Analyze the product packaging, labels, and any visible text.

Return JSON with:
- productName: string (full product name)
- category: string (Grains/Pulses/Oils/Spices/Sweeteners/Beverages/Dairy/Snacks/Other)
- unit: string (kg/litre/box/piece/dozen)
- quantity: number (estimated quantity visible)
- costPrice: number (if visible on label)
- estimatedPrice: number (estimated market selling price)
- expiryDate: string (YYYY-MM-DD format if visible, otherwise null)
- brand: string (if visible)
- description: string (brief product description)`
                            },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 800
            });

            productData = JSON.parse(completion.choices[0].message.content);
        } else {
            productData = manualData;
        }

        // Get AI recommendations for this product
        const inventory = await WholesalerInventory.find({ wholesaler: wholesalerId });
        const orders = await WholesalerOrder.find({ wholesaler: wholesalerId }).limit(100);

        // Analyze existing sales patterns
        const categoryOrders = orders.filter(order =>
            order.items.some(item => item.category === productData.category)
        );

        const avgOrdersPerMonth = categoryOrders.length / 3; // Assuming last 3 months
        const totalCategorySales = categoryOrders.reduce((sum, order) => {
            const categoryItems = order.items.filter(item => item.category === productData.category);
            return sum + categoryItems.reduce((itemSum, item) => itemSum + item.totalPrice, 0);
        }, 0);

        // Check if product is perishable based on expiry date
        const hasExpiry = productData.expiryDate && productData.expiryDate !== 'null';
        const daysUntilExpiry = hasExpiry ?
            Math.floor((new Date(productData.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

        const analysisPrompt = `Based on this wholesale business data, provide strategic recommendations for adding this product:

NEW PRODUCT: ${JSON.stringify(productData, null, 2)}

BUSINESS CONTEXT:
- Existing Inventory: ${inventory.length} products
- Recent Orders: ${orders.length} orders
- Category "${productData.category}" Orders: ${categoryOrders.length} orders
- Category Sales: ₹${totalCategorySales.toFixed(2)}
- Avg Orders/Month: ${avgOrdersPerMonth.toFixed(1)}
${hasExpiry ? `- Days Until Expiry: ${daysUntilExpiry} days` : ''}
${productData.costPrice ? `- Cost Price: ₹${productData.costPrice}` : ''}

REQUIREMENTS:
1. Consider expiry date for pricing urgency (if applicable)
2. Analyze category demand from existing sales
3. Suggest bulk discounts that maximize profit while moving stock
4. Recommend pricing based on cost price (if provided) with good margin
5. Consider sales velocity for this category

Provide JSON with:
- recommendedPrice: number (suggested selling price per unit, consider cost + margin)
- recommendedMinOrder: number (minimum order quantity)
- bulkDiscountSuggestions: array of {minQty: number, price: number, discountPercent: number}
- marketingStrategy: string (how to promote, consider expiry urgency)
- targetRetailers: string (which retailers would buy this)
- expiryConsiderations: string (if perishable, urgency-based strategy as single text)
- profitMargin: number (estimated profit margin percentage)
- salesVelocity: string (Fast/Medium/Slow based on category demand)
- stockRecommendation: string (how much to stock based on sales and expiry)

IMPORTANT: 
- expiryConsiderations must be a simple string, not an object
- If expiry is near (<30 days), recommend aggressive pricing and bulk discounts
- Base pricing on cost price if provided, otherwise estimate market rate
- Bulk discounts should be attractive (5-15% off) to move stock faster`;

        const recommendation = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a wholesale business advisor with expertise in pricing, inventory management, and sales optimization. Provide strategic recommendations in JSON format." },
                { role: "user", content: analysisPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const aiRecommendations = JSON.parse(recommendation.choices[0].message.content);

        return {
            success: true,
            data: { productData, aiRecommendations }
        };

    } catch (error) {
        console.error('AI Inventory Assistant Error:', error);
        return { success: false, message: 'Failed to get AI recommendations', error: error.message };
    }
};

module.exports = { getWholesalerAIInsights, aiInventoryAssistant };
