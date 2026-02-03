const { GoogleGenerativeAI } = require('@google/generative-ai');
const Inventory = require('../models/Inventory');

// Initialize Gemini AI with v1 API (stable)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * STEP 1: PARSE BILL IMAGE
 * Extract items from wholesale bill - NO DB WRITES
 */
const parseBillImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No bill image uploaded'
            });
        }

        const userId = req.user.id;

        console.log('📄 Parsing bill image from memory buffer');

        // Get image buffer directly from memory (no file system needed)
        const imageBuffer = req.file.buffer;
        const base64Image = imageBuffer.toString('base64');

        // Use Gemini 2.5 Flash - Current stable model with vision support (free tier)
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash'
        });

        const prompt = `You are analyzing a wholesale purchase bill/invoice image.

STRICT EXTRACTION RULES:
1. Extract ONLY clearly visible items from the bill
2. Do NOT guess missing values - return null if unsure
3. Ignore: GST, totals, addresses, vendor details, dates
4. Focus on extracting:
   - Item name (product name)
   - Quantity (number of units purchased)
   - Cost Price (purchase price per unit in rupees)
   - Selling Price (if visible, otherwise estimate 20% markup)
   - Category (guess from item name: Food & Beverages, Electronics, Clothing, Books, Home & Garden, Sports, Beauty & Health, Automotive, Office Supplies, Other)

IMPORTANT:
- Extract only items with at least item name, quantity, and cost price visible
- If selling price is not visible, calculate as: cost_price * 1.2 (20% markup)
- Assign appropriate category based on item type
- Do NOT make wild assumptions

OUTPUT FORMAT (JSON only, no markdown):
{
  "items": [
    {
      "item_name": "Parle-G Biscuit",
      "quantity": 20,
      "cost_price": 8,
      "selling_price": 10,
      "category": "Food & Beverages"
    }
  ],
  "confidence": 0.85
}

Valid categories: Food & Beverages, Electronics, Clothing, Books, Home & Garden, Sports, Beauty & Health, Automotive, Office Supplies, Other

Confidence scoring:
- 0.9-1.0: All items clearly visible with all fields
- 0.7-0.89: Most items clear, some fields estimated
- Below 0.7: Poor quality, manual review needed

Return ONLY the JSON object. No explanations.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: base64Image
                }
            }
        ]);

        const responseText = result.response.text().trim();
        console.log('🤖 AI Response:', responseText);

        // Clean up response
        let cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        // Parse AI response
        let parsedData;
        try {
            parsedData = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return res.status(400).json({
                success: false,
                message: 'Could not parse bill image. Please ensure the image is clear and contains item details.',
                aiResponse: responseText
            });
        }

        // Validate structure
        if (!parsedData.items || !Array.isArray(parsedData.items)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bill format. Please upload a clear bill image with item details.'
            });
        }

        // Check confidence
        const confidence = parsedData.confidence || 0;
        const needsReview = confidence < 0.7;

        // Log for debugging
        console.log('📊 Parsed items:', parsedData.items.length);
        console.log('🎯 Confidence:', confidence);

        // Return parsed data for user confirmation
        return res.json({
            success: true,
            message: needsReview 
                ? 'Bill parsed with low confidence. Please review items carefully.'
                : `Successfully extracted ${parsedData.items.length} item(s) from bill.`,
            data: {
                items: parsedData.items,
                confidence: confidence,
                needsReview: needsReview,
                userId: userId // Include for execute step
            }
        });

    } catch (error) {
        console.error('❌ Bill parsing error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // No file cleanup needed (using memory storage)
        
        return res.status(500).json({
            success: false,
            message: 'Error parsing bill: ' + error.message
        });
    }
};

/**
 * STEP 2: EXECUTE BILL ITEMS
 * User confirmed - now write to database
 */
const executeBillItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No items provided for execution'
            });
        }

        console.log('✅ Executing bill items:', items.length);

        const results = {
            created: [],
            updated: [],
            errors: []
        };

        // Process each item
        for (const item of items) {
            try {
                // Validate item data
                if (!item.item_name || !item.quantity || !item.cost_price) {
                    results.errors.push({
                        item: item.item_name || 'Unknown',
                        error: 'Missing required fields (name, quantity, cost price)'
                    });
                    continue;
                }

                // Validate positive numbers
                if (item.quantity <= 0 || item.cost_price <= 0) {
                    results.errors.push({
                        item: item.item_name,
                        error: 'Quantity and cost price must be positive'
                    });
                    continue;
                }

                // Ensure selling price is higher than cost price
                const sellingPrice = item.selling_price || Math.round(item.cost_price * 1.2);
                if (sellingPrice <= item.cost_price) {
                    results.errors.push({
                        item: item.item_name,
                        error: 'Selling price must be higher than cost price'
                    });
                    continue;
                }

                // Check if item exists (case-insensitive)
                const existingItem = await Inventory.findOne({
                    user_id: userId,
                    item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') }
                });

                if (existingItem) {
                    // Update existing item - increase stock
                    existingItem.stock_qty += item.quantity;
                    existingItem.cost_price = item.cost_price;
                    existingItem.selling_price = sellingPrice;
                    existingItem.price_per_unit = sellingPrice;
                    
                    // Update category if provided
                    if (item.category) {
                        existingItem.category = item.category;
                    }
                    
                    await existingItem.save();
                    
                    results.updated.push({
                        item_name: existingItem.item_name,
                        quantity_added: item.quantity,
                        new_stock: existingItem.stock_qty,
                        cost_price: existingItem.cost_price,
                        selling_price: existingItem.selling_price,
                        category: existingItem.category
                    });
                } else {
                    // Create new item
                    const newItem = new Inventory({
                        user_id: userId,
                        item_name: item.item_name,
                        stock_qty: item.quantity,
                        cost_price: item.cost_price,
                        selling_price: sellingPrice,
                        price_per_unit: sellingPrice,
                        category: item.category || 'Other',
                        description: 'Added from bill scan',
                        min_stock_level: 5
                    });
                    
                    await newItem.save();
                    
                    results.created.push({
                        item_name: newItem.item_name,
                        quantity: newItem.stock_qty,
                        cost_price: newItem.cost_price,
                        selling_price: newItem.selling_price,
                        category: newItem.category
                    });
                }

            } catch (itemError) {
                console.error('Error processing item:', itemError);
                results.errors.push({
                    item: item.item_name || 'Unknown',
                    error: itemError.message
                });
            }
        }

        // Log execution results
        console.log('📊 Execution results:', {
            created: results.created.length,
            updated: results.updated.length,
            errors: results.errors.length
        });

        // Return results
        return res.json({
            success: true,
            message: `Successfully processed ${results.created.length + results.updated.length} item(s)`,
            data: {
                summary: {
                    total_items: items.length,
                    created: results.created.length,
                    updated: results.updated.length,
                    failed: results.errors.length
                },
                created: results.created,
                updated: results.updated,
                errors: results.errors.length > 0 ? results.errors : null
            }
        });

    } catch (error) {
        console.error('Bill execution error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error executing bill items: ' + error.message
        });
    }
};

module.exports = {
    parseBillImage,
    executeBillItems
};
