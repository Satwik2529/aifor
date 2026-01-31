/**
 * AI Chatbot Controller - Handles intelligent business queries with database access
 * Supports multilingual conversations with full business context
 * Works for both retailers and customers
 */

const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const CustomerRequest = require('../models/CustomerRequest');
const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');
const Notification = require('../models/Notification');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ttsService = require('../services/ttsService');
const mongoose = require('mongoose');
const { handleRetailerChat } = require('./retailerChatHandler');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory storage for pending orders (use Redis in production)
const pendingOrders = new Map();

/**
 * Handle customer chat with retailer - Enhanced ordering interface
 */
const handleCustomerChat = async (userId, retailerId, message, language) => {
    try {
        // Get retailer inventory and info
        const [inventory, retailer] = await Promise.all([
            Inventory.find({ user_id: retailerId }),
            User.findById(retailerId)
        ]);

        if (!retailer) {
            return {
                success: false,
                message: "Sorry, this store is not available right now.",
                data: null
            };
        }

        // Check if it's a greeting
        const greetings = ['hi', 'hello', 'hey', 'namaste', 'hola'];
        if (greetings.some(g => message.toLowerCase().trim() === g)) {
            return {
                success: true,
                message: `Hi! Welcome to ${retailer.shop_name}\n\nWhat would you like to order?\n\nYou can say:\n"Chicken curry for 4 people"\n"2 kg rice, 1 litre milk"\n"Show available items"`,
                data: {
                    type: 'greeting',
                    retailer: retailer.shop_name,
                    retailer_id: retailerId,
                    available_items: inventory.length
                }
            };
        }

        // Check if it's an order confirmation
        if (['yes', 'confirm', 'ok', 'proceed'].some(word => message.toLowerCase().trim() === word)) {
            console.log('🛒 Customer said YES - checking for pending order');
            console.log('🔍 Pending orders keys:', Array.from(pendingOrders.keys()));
            const orderKey = `${userId}_${retailerId}`;
            const pendingOrder = pendingOrders.get(orderKey);
            console.log('🔍 Pending order found:', !!pendingOrder);
            if (pendingOrder) {
                console.log('🔍 Pending order items:', pendingOrder.items?.length);
            }
            return await handleOrderConfirmation(userId, retailerId, message, language);
        }

        // Use Gemini to understand customer intent and extract items
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        console.log('📦 Available Inventory:', inventory.map(item => `${item.item_name}: ${item.stock_qty}`).join(', '));

        const intentPrompt = `
Analyze this customer message: "${message}"

Available inventory (ONLY these items exist):
${inventory.map(item => `${item.item_name}: ${item.stock_qty} units at ₹${item.price_per_unit}/unit`).join('\n')}

CRITICAL RULES:
1. ONLY use items that EXACTLY match the inventory list above
2. If a dish requires ingredients NOT in inventory, mark those items as available: false
3. Do NOT make up or assume items exist
4. Match item names EXACTLY as they appear in inventory

Task: Extract what the customer wants to buy.

If it's a DISH (like "chicken curry", "biryani"):
- List the typical ingredients needed
- ONLY mark as available: true if the EXACT item exists in inventory above
- If ingredient not in inventory, set available: false

If it's DIRECT ITEMS (like "2 kg rice"):
- Extract item names and quantities
- ONLY match to items that EXACTLY exist in inventory

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "item_name": "exact name from inventory or ingredient name",
    "quantity": number,
    "unit": "kg/litre/pieces",
    "available": true/false,
    "stock_available": number,
    "price_per_unit": number
  }
]

If message is unclear or not a shopping request, return: []
`;

        const result = await model.generateContent(intentPrompt);
        const aiResponse = await result.response;
        let responseText = aiResponse.text().trim();

        console.log('🤖 AI Raw Response:', responseText);

        // Clean and parse JSON
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let orderItems = [];
        try {
            orderItems = JSON.parse(responseText);
            if (!Array.isArray(orderItems)) orderItems = [];
            console.log('🤖 Parsed Order Items:', orderItems);
        } catch (e) {
            console.log('Failed to parse order items:', responseText);
        }

        // Match items with actual inventory and calculate prices
        const matchedItems = orderItems.map(item => {
            const inventoryItem = inventory.find(inv =>
                inv.item_name.toLowerCase() === item.item_name.toLowerCase()
            );

            if (inventoryItem) {
                const available = inventoryItem.stock_qty >= item.quantity;
                return {
                    item_name: inventoryItem.item_name,
                    quantity: item.quantity,
                    unit: item.unit || 'units',
                    price_per_unit: inventoryItem.price_per_unit,
                    total_price: inventoryItem.price_per_unit * item.quantity,
                    available: available,
                    stock_available: inventoryItem.stock_qty,
                    inventory_id: inventoryItem._id
                };
            }
            return {
                ...item,
                available: false,
                price_per_unit: 0,
                total_price: 0
            };
        });

        const availableItems = matchedItems.filter(item => item.available);
        const unavailableItems = matchedItems.filter(item => !item.available);

        // Generate response message - Clean and simple
        let responseMessage = '';
        let responseData = {
            type: 'order_summary',
            availableItems: availableItems,
            unavailableItems: unavailableItems,
            totalAmount: availableItems.reduce((sum, item) => sum + item.total_price, 0)
        };

        if (matchedItems.length === 0) {
            responseMessage = `I couldn't understand that. Please try:\n\n"I want chicken curry"\n"Buy 2 kg rice"\n"Show available items"`;
            responseData.type = 'help';
        } else {
            const isDishRequest = unavailableItems.length > 2 && availableItems.length === 0;

            if (isDishRequest) {
                responseMessage = `Sorry, we don't have ingredients for that dish.\n\nMissing: ${unavailableItems.slice(0, 3).map(i => i.item_name).join(', ')}${unavailableItems.length > 3 ? ` and ${unavailableItems.length - 3} more` : ''}\n\nTry ordering individual items instead.`;
                responseData.type = 'unavailable';
            } else {
                if (availableItems.length > 0) {
                    const totalAmount = availableItems.reduce((sum, item) => sum + item.total_price, 0);
                    responseMessage = `Found ${availableItems.length} item${availableItems.length > 1 ? 's' : ''} for ₹${totalAmount}\n\nReply 'yes' to confirm`;

                    // Store pending order
                    const orderKey = `${userId}_${retailerId}`;
                    console.log('🛒 Storing pending order with key:', orderKey);
                    console.log('🛒 Available items to store:', availableItems.length);
                    pendingOrders.set(orderKey, {
                        userId,
                        retailerId,
                        items: availableItems,
                        totalAmount: totalAmount,
                        timestamp: Date.now()
                    });
                    console.log('🛒 Order stored. Total pending orders:', pendingOrders.size);
                } else {
                    responseMessage = `These items are not available right now.\n\nAsk "What's available?" to see our stock.`;
                    responseData.type = 'unavailable';
                }
            }
        }

        return {
            success: true,
            message: responseMessage,
            data: {
                ...responseData,
                retailer: retailer.shop_name,
                retailer_id: retailerId,
                available_items: inventory.length,
                can_order: availableItems.length > 0
            }
        };

    } catch (error) {
        console.error('Customer chat error:', error);
        return {
            success: false,
            message: "I'm having trouble processing your request. Please try again.",
            data: null
        };
    }
};

/**
 * Handle order confirmation and placement
 */
const handleOrderConfirmation = async (userId, retailerId, message, language) => {
    try {
        // Get the pending order from memory
        const orderKey = `${userId}_${retailerId}`;
        const pendingOrder = pendingOrders.get(orderKey);

        if (!pendingOrder || !pendingOrder.items || pendingOrder.items.length === 0) {
            return {
                success: false,
                message: "I don't have any pending order for you. Please tell me what you'd like to order first.",
                data: null
            };
        }

        const customer = await CustomerUser.findById(userId);
        const retailer = await User.findById(retailerId);

        if (!customer || !retailer) {
            return {
                success: false,
                message: "Sorry, there was an issue with your order. Please try again.",
                data: null
            };
        }

        // Format items for the order
        const orderItems = pendingOrder.items.map(item => ({
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            price_per_unit: item.price_per_unit,
            total_price: item.total_price
        }));

        // Create a customer request (order) in the database
        const orderRequest = new CustomerRequest({
            customer_id: userId,
            retailer_id: retailerId,
            customer_name: customer.name,
            customer_phone: customer.phone,
            items: orderItems,
            notes: `Order placed via AI chatbot`,
            status: 'pending',
            total_amount: pendingOrder.totalAmount
        });

        await orderRequest.save();

        // Create notification for retailer
        const notification = new Notification({
            user_id: retailerId,
            user_type: 'retailer',
            type: 'new_request',
            title: 'New Order Received',
            message: `${customer.name} placed an order for ₹${pendingOrder.totalAmount} (${orderItems.length} items)`,
            request_id: orderRequest._id,
            is_read: false
        });

        await notification.save();
        console.log(`✅ Notification sent to retailer ${retailer.shop_name}`);

        // Clear the pending order
        pendingOrders.delete(orderKey);

        return {
            success: true,
            message: `Order placed successfully!\n\nTotal: ₹${pendingOrder.totalAmount}\nItems: ${orderItems.length}\n\n${retailer.shop_name} will contact you soon.`,
            data: {
                type: 'order_confirmed',
                order_placed: true,
                order_id: orderRequest._id,
                status: 'pending',
                retailer: retailer.shop_name,
                items: orderItems,
                total_amount: pendingOrder.totalAmount
            }
        };
    } catch (error) {
        console.error('Order confirmation error:', error);
        return {
            success: false,
            message: "Sorry, there was an issue placing your order. Please try again.",
            data: null
        };
    }
};

/**
 * Handle customer without retailer selection
 */

/**
 * Handle customer without retailer selection
 */
const handleCustomerWithoutRetailer = async (userId, message, language) => {
    try {
        // Get available retailers
        const retailers = await User.find({ role: 'retailer' }).select('shop_name phone address');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
        Customer message: "${message}"
        Available retailers:
        ${retailers.map(r => `- ${r.shop_name}: ${r.phone}`).join('\n')}
        
        The customer hasn't selected a retailer yet. Help them choose one or answer general questions.
        `;

        const result = await model.generateContent(prompt);
        const aiResponse = await result.response;

        return {
            success: true,
            message: aiResponse.text(),
            data: {
                available_retailers: retailers,
                needs_retailer_selection: true
            }
        };

    } catch (error) {
        console.error('Customer without retailer error:', error);
        return {
            success: false,
            message: "Please select a retailer first to start shopping.",
            data: null
        };
    }
};

/**
 * Process chatbot query with business context
 * Works for both retailers and customers
 */
const chat = async (req, res) => {
    try {
        const { message, language = 'en', retailer_id } = req.body;
        const userId = req.user._id;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        console.log(`🤖 Unified Chatbot Query [${language}]: "${message}" from user ${userId}`);

        // Check if user is a retailer or customer
        // Try User model first (retailers), then CustomerUser model (customers)
        let user = await User.findById(userId);
        let isRetailer = false;
        let isCustomer = false;

        if (user) {
            // Found in User model - this is a retailer
            isRetailer = user.role === 'retailer';
            isCustomer = user.role === 'customer';
        } else {
            // Try CustomerUser model - this is a customer
            user = await CustomerUser.findById(userId);
            if (user) {
                isCustomer = true;
                isRetailer = false;
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log(`📝 Request data: retailer_id=${retailer_id}, isCustomer=${isCustomer}, isRetailer=${isRetailer}`);

        let response;

        if (isCustomer && retailer_id) {
            // Customer chatting with specific retailer
            response = await handleCustomerChat(userId, retailer_id, message, language);
        } else if (isRetailer) {
            // Retailer chatting with their own business data
            response = await handleRetailerChat(userId, message, language);
        } else if (isCustomer && !retailer_id) {
            // Customer needs to select a retailer first
            response = await handleCustomerWithoutRetailer(userId, message, language);
        } else {
            response = {
                success: true,
                message: "I'm here to help! Please let me know what you need assistance with.",
                data: null
            };
        }

        res.json(response);
        console.log(`📤 Response sent to frontend:`, JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process chatbot request',
            error: error.message
        });
    }
};

/**
 * Get chatbot status and available features
 */
const getStatus = async (req, res) => {
    try {
        const userId = req.user._id;

        // Try User model first (retailers), then CustomerUser model (customers)
        let user = await User.findById(userId);
        let isRetailer = false;
        let isCustomer = false;

        if (user) {
            // Found in User model - this is a retailer
            isRetailer = user.role === 'retailer';
            isCustomer = user.role === 'customer';
        } else {
            // Try CustomerUser model - this is a customer
            user = await CustomerUser.findById(userId);
            if (user) {
                isCustomer = true;
                isRetailer = false;
            }
        }

        let statusData = {
            status: 'active',
            features: {
                text_chat: true,
                voice_input: false,
                voice_output: false,
                multilingual: ['en', 'hi', 'te', 'ta', 'kn'],
                business_intelligence: true
            }
        };

        if (isCustomer) {
            // Get available retailers for customers
            const retailers = await User.find({ role: 'retailer' }).select('shop_name phone address');
            statusData.available_retailers = retailers;
            statusData.user_type = 'customer';
        } else {
            statusData.user_type = 'retailer';
        }

        res.json({
            success: true,
            data: statusData
        });

    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chatbot status',
            error: error.message
        });
    }
};

/**
 * Convert speech to text (placeholder)
 */
const speechToText = async (req, res) => {
    try {
        // Placeholder implementation
        res.json({
            success: true,
            message: "Speech to text feature coming soon",
            data: null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process speech',
            error: error.message
        });
    }
};

/**
 * Convert text to speech (placeholder)
 */
const textToSpeech = async (req, res) => {
    try {
        // Placeholder implementation
        res.json({
            success: true,
            message: "Text to speech feature coming soon",
            data: null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate speech',
            error: error.message
        });
    }
};

module.exports = {
    chat,
    getStatus,
    speechToText,
    textToSpeech
};