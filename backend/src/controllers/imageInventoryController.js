const { GoogleGenerativeAI } = require('@google/generative-ai');
const Inventory = require('../models/Inventory');
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Process uploaded image and extract inventory data using Gemini Vision
 * Uses gemini-2.0-flash (FREE MODEL)
 */
const processInventoryImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }

        const userId = req.user.id;
        const imagePath = req.file.path;

        console.log('📸 Processing inventory image:', imagePath);

        // Read image file
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        // Use Gemini 2.0 Flash - FREE MODEL with vision support
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an inventory data extraction assistant. Analyze this image and extract ALL inventory items with their details.

The image may contain:
- Product names/item names
- Quantities (stock quantity)
- Cost Price (CP) - what the retailer paid
- Selling Price (SP) - what customers will pay
- Category information

IMPORTANT RULES:
1. Extract ALL items visible in the image
2. If multiple items are shown, return data for each one
3. Selling Price MUST be higher than Cost Price
4. If prices are not clearly visible, make reasonable estimates based on the product type
5. Assign appropriate categories from: Food & Beverages, Electronics, Clothing, Books, Home & Garden, Sports, Beauty & Health, Automotive, Office Supplies, Other

Return ONLY a valid JSON array (even if there's just one item) in this exact format:
[
  {
    "item_name": "exact product name",
    "stock_qty": number,
    "cost_price": number,
    "selling_price": number,
    "category": "category name",
    "description": "brief description if available"
  }
]

If you cannot extract clear data, return an empty array: []

Return ONLY the JSON array, no markdown, no explanations.`;

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

        // Parse the extracted data
        let extractedItems;
        try {
            extractedItems = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            fs.unlinkSync(imagePath);
            return res.status(400).json({
                success: false,
                message: 'Could not extract inventory data from image. Please ensure the image contains clear product information.',
                aiResponse: responseText
            });
        }

        // Validate extracted data
        if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
            fs.unlinkSync(imagePath);
            return res.status(400).json({
                success: false,
                message: 'No inventory items found in the image. Please upload a clearer image with product details.',
                extractedData: extractedItems
            });
        }

        // Process and save each item
        const savedItems = [];
        const errors = [];

        for (const itemData of extractedItems) {
            try {
                // Validate required fields
                if (!itemData.item_name || !itemData.stock_qty || !itemData.cost_price || !itemData.selling_price) {
                    errors.push({
                        item: itemData.item_name || 'Unknown',
                        error: 'Missing required fields'
                    });
                    continue;
                }

                // Validate pricing
                if (itemData.selling_price <= itemData.cost_price) {
                    errors.push({
                        item: itemData.item_name,
                        error: `Selling price (₹${itemData.selling_price}) must be higher than cost price (₹${itemData.cost_price})`
                    });
                    continue;
                }

                // Check if item already exists
                const existingItem = await Inventory.findOne({
                    user_id: userId,
                    item_name: { $regex: new RegExp(`^${itemData.item_name}$`, 'i') }
                });

                if (existingItem) {
                    // Update existing item - add to stock
                    existingItem.stock_qty += itemData.stock_qty;
                    existingItem.cost_price = itemData.cost_price;
                    existingItem.selling_price = itemData.selling_price;
                    existingItem.price_per_unit = itemData.selling_price;
                    if (itemData.description) {
                        existingItem.description = itemData.description;
                    }
                    await existingItem.save();
                    savedItems.push({
                        ...existingItem.toObject(),
                        action: 'updated'
                    });
                } else {
                    // Create new item
                    const newItem = new Inventory({
                        user_id: userId,
                        item_name: itemData.item_name,
                        stock_qty: itemData.stock_qty,
                        cost_price: itemData.cost_price,
                        selling_price: itemData.selling_price,
                        price_per_unit: itemData.selling_price,
                        category: itemData.category || 'Other',
                        description: itemData.description || '',
                        min_stock_level: 5
                    });
                    await newItem.save();
                    savedItems.push({
                        ...newItem.toObject(),
                        action: 'created'
                    });
                }
            } catch (itemError) {
                console.error('Error processing item:', itemError);
                errors.push({
                    item: itemData.item_name || 'Unknown',
                    error: itemError.message
                });
            }
        }

        // Delete uploaded file
        fs.unlinkSync(imagePath);

        // Return results
        return res.json({
            success: true,
            message: `Successfully processed ${savedItems.length} item(s) from image`,
            data: {
                items: savedItems,
                errors: errors.length > 0 ? errors : null,
                summary: {
                    total_extracted: extractedItems.length,
                    successful: savedItems.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        console.error('Image processing error:', error);
        
        // Clean up uploaded file if it exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Error processing image: ' + error.message
        });
    }
};

module.exports = {
    processInventoryImage
};
