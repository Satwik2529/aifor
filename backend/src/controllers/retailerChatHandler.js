const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const User = require('../models/User');
const CustomerRequest = require('../models/CustomerRequest');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { normalize, isValidQuantity } = require('../utils/quantityHelper');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const pendingOrders = new Map();

/**
 * Enhanced Retailer Business Assistant
 * Handles: Sales/Billing, Inventory Management, Expense Tracking, Business Insights, Analytics
 */
const handleRetailerChat = async (userId, message, language) => {
    try {
        console.log(`🛍️ Retailer chat: "${message}"`);

        // Handle confirmations for pending operations
        if (['yes', 'confirm', 'ok', 'proceed', 'हाँ', 'ठीक है'].some(word => message.toLowerCase().trim() === word)) {
            return await handleConfirmation(userId);
        }

        // Handle cancellations for pending operations
        if (['no', 'cancel', 'नहीं', 'रद्द करें'].some(word => message.toLowerCase().trim() === word)) {
            return await handleCancellation(userId);
        }

        // Get comprehensive business data
        const businessData = await getBusinessData(userId);
        
        // Use enhanced AI to understand and process the request
        const aiResponse = await processRetailerRequest(message, businessData, language);
        
        // Execute the determined action (pass original message for auto-confirm detection)
        return await executeAction(userId, aiResponse, businessData, message);

    } catch (error) {
        console.error('Retailer chat error:', error);
        return { 
            success: false, 
            message: "I encountered an error processing your request. Please try again or be more specific.", 
            data: null 
        };
    }
};

/**
 * Get comprehensive business data for context
 */
const getBusinessData = async (userId) => {
    try {
        const [inventory, sales, expenses, customerRequests, retailer] = await Promise.all([
            Inventory.find({ user_id: userId }),
            Sale.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10),
            Expense.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10),
            CustomerRequest.find({ retailer_id: userId }).sort({ createdAt: -1 }).limit(5),
            User.findById(userId)
        ]);

        // Calculate business metrics
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

        const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString());
        const weeklySales = sales.filter(s => new Date(s.createdAt) >= startOfWeek);
        const monthlySales = sales.filter(s => new Date(s.createdAt) >= startOfMonth);

        const todayExpenses = expenses.filter(e => new Date(e.createdAt).toDateString() === new Date().toDateString());
        const monthlyExpenses = expenses.filter(e => new Date(e.createdAt) >= startOfMonth);

        const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
        const totalCogs = sales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalRevenue - totalCogs - totalExpenses;

        const lowStockItems = inventory.filter(item => item.stock_qty <= (item.min_stock_level || 5));
        const outOfStockItems = inventory.filter(item => item.stock_qty <= 0);

        return {
            inventory,
            sales,
            expenses,
            customerRequests,
            retailer,
            metrics: {
                totalRevenue,
                totalCogs,
                totalExpenses,
                netProfit,
                grossProfit: totalRevenue - totalCogs,
                profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
                todayRevenue: todaySales.reduce((sum, s) => sum + s.total_amount, 0),
                weeklyRevenue: weeklySales.reduce((sum, s) => sum + s.total_amount, 0),
                monthlyRevenue: monthlySales.reduce((sum, s) => sum + s.total_amount, 0),
                todayExpenses: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
                monthlyExpenses: monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
                lowStockCount: lowStockItems.length,
                outOfStockCount: outOfStockItems.length,
                pendingOrders: customerRequests.filter(r => r.status === 'pending').length
            },
            lowStockItems,
            outOfStockItems
        };
    } catch (error) {
        console.error('Error getting business data:', error);
        throw error;
    }
};

/**
 * Fallback message parsing when AI fails
 */
const parseMessageFallback = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Inventory addition patterns
    if (lowerMessage.includes('add') && (lowerMessage.includes('item') || lowerMessage.includes('inventory') || lowerMessage.includes('product'))) {
        // Enhanced regex patterns to handle various message formats
        let itemMatch, quantityMatch, costMatch, sellingMatch, categoryMatch;
        
        // Pattern 1: "add a item to inventory laptop under electronics category"
        const pattern1 = /add.*?(?:item|product).*?(?:to\s+)?inventory\s+([^,\s]+).*?under\s+([^,\s]+)\s+category/i;
        const match1 = message.match(pattern1);
        if (match1) {
            itemMatch = [null, match1[1]];
            categoryMatch = [null, match1[2]];
        }
        
        // Pattern 2: "add a item to inventory of 100 keyboards each of 100 rupee and selling price 200 and electronics category"
        const pattern2 = /add.*?(?:item|product).*?inventory.*?of\s+(\d+)\s+([^,\s]+).*?each.*?of\s+(\d+).*?rupee.*?selling.*?price\s+(\d+).*?and\s+([^,\s]+)\s+category/i;
        const match2 = message.match(pattern2);
        if (match2) {
            quantityMatch = [null, match2[1]];
            itemMatch = [null, match2[2]];
            costMatch = [null, match2[3]];
            sellingMatch = [null, match2[4]];
            categoryMatch = [null, match2[5]];
        }
        
        // Fallback patterns for individual components
        if (!itemMatch) {
            itemMatch = message.match(/add.*?(?:item|product).*?:?\s*([^,]+)/i) || 
                       message.match(/inventory\s+([^,\s]+)/i) ||
                       message.match(/(\w+)\s+under/i);
        }
        if (!quantityMatch) {
            quantityMatch = message.match(/(\d+)\s*(?:pieces?|units?|items?|keyboards?|laptops?)/i) ||
                           message.match(/of\s+(\d+)\s+/i);
        }
        if (!costMatch) {
            costMatch = message.match(/cost.*?₹?(\d+)/i) ||
                       message.match(/each.*?of\s+(\d+)/i) ||
                       message.match(/(\d+).*?rupee/i);
        }
        if (!sellingMatch) {
            sellingMatch = message.match(/selling.*?price\s+(\d+)/i) ||
                          message.match(/price.*?₹?(\d+)/i) ||
                          message.match(/selling.*?₹?(\d+)/i);
        }
        if (!categoryMatch) {
            categoryMatch = message.match(/category\s+([^,\n]+)/i) ||
                           message.match(/under\s+([^,\s]+)/i) ||
                           message.match(/and\s+([^,\s]+)\s+category/i);
        }
        
        // Enhanced category mapping with more variations
        let validCategory = "Other";
        if (categoryMatch) {
            const categoryInput = categoryMatch[1].trim().toLowerCase();
            const categoryMap = {
                'food': 'Food & Beverages',
                'foods': 'Food & Beverages',
                'beverages': 'Food & Beverages',
                'electronics': 'Electronics',
                'electronic': 'Electronics',
                'electornics': 'Electronics', // Handle typo
                'tech': 'Electronics',
                'technology': 'Electronics',
                'clothing': 'Clothing',
                'clothes': 'Clothing',
                'apparel': 'Clothing',
                'books': 'Books',
                'book': 'Books',
                'home': 'Home & Garden',
                'garden': 'Home & Garden',
                'household': 'Home & Garden',
                'sports': 'Sports',
                'sport': 'Sports',
                'fitness': 'Sports',
                'beauty': 'Beauty & Health',
                'health': 'Beauty & Health',
                'healthcare': 'Beauty & Health',
                'cosmetics': 'Beauty & Health',
                'automotive': 'Automotive',
                'auto': 'Automotive',
                'car': 'Automotive',
                'office': 'Office Supplies',
                'supplies': 'Office Supplies',
                'stationery': 'Office Supplies',
                'other': 'Other'
            };
            validCategory = categoryMap[categoryInput] || 'Other';
        }
        
        // Check if we have enough information
        if (itemMatch && quantityMatch && costMatch && sellingMatch) {
            return {
                action: "add_inventory",
                item_name: itemMatch[1].trim(),
                quantity: parseInt(quantityMatch[1]),
                cost_per_unit: parseInt(costMatch[1]),
                price_per_unit: parseInt(sellingMatch[1]),
                category: validCategory,
                min_stock_level: 5
            };
        } else if (itemMatch && categoryMatch) {
            // If we have item and category but missing other details, ask for them
            const missing = [];
            if (!quantityMatch) missing.push("quantity");
            if (!costMatch) missing.push("cost_price");
            if (!sellingMatch) missing.push("selling_price");
            
            return {
                action: "clarify",
                missing: missing,
                response: `I found item "${itemMatch[1].trim()}" in category "${validCategory}". Please provide: ${missing.join(', ')}.\n\nExample: "Add 100 units, cost ₹50 each, selling ₹80 each"`
            };
        } else {
            return {
                action: "clarify",
                missing: ["item_name", "quantity", "cost_price", "selling_price"],
                response: "To add inventory, I need: item name, quantity, cost price, and selling price.\n\nExamples:\n• 'Add item: Chocolate, 50 pieces, cost ₹20, selling ₹30'\n• 'Add 100 keyboards, cost ₹100 each, selling ₹200, electronics category'"
            };
        }
    }
    
    // Sales patterns
    if (lowerMessage.includes('bill') || lowerMessage.includes('sale') || lowerMessage.includes('sell')) {
        return {
            action: "clarify",
            missing: ["items", "quantities", "customer_name"],
            response: "To create a sale, please specify: items to sell, quantities, and customer name (optional). Example: 'Bill 2 chocolates for John'"
        };
    }
    
    // Expense patterns
    if (lowerMessage.includes('expense') || lowerMessage.includes('cost') || lowerMessage.includes('spent')) {
        return {
            action: "clarify",
            missing: ["description", "amount", "category"],
            response: "To add an expense, I need: description, amount, and category. Example: 'Add expense: Office rent ₹5000, category Rent'"
        };
    }
    
    // Insights patterns
    if (lowerMessage.includes('sales') || lowerMessage.includes('profit') || lowerMessage.includes('revenue') || lowerMessage.includes('report')) {
        return {
            action: "insights",
            type: "overview",
            response: "Here's your business overview with key metrics and recommendations."
        };
    }
    
    return null;
};

/**
 * Enhanced AI processing for retailer requests
 */
const processRetailerRequest = async (message, businessData, language) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are an advanced business assistant for a retail store. Analyze this request: "${message}"

CURRENT BUSINESS STATUS:
📊 FINANCIAL METRICS:
- Total Revenue: ₹${businessData.metrics.totalRevenue}
- Total COGS: ₹${businessData.metrics.totalCogs}
- Total Expenses: ₹${businessData.metrics.totalExpenses}
- Net Profit: ₹${businessData.metrics.netProfit}
- Profit Margin: ${businessData.metrics.profitMargin}%
- Today's Revenue: ₹${businessData.metrics.todayRevenue}
- Monthly Revenue: ₹${businessData.metrics.monthlyRevenue}

📦 INVENTORY STATUS (${businessData.inventory.length} items):
${businessData.inventory.slice(0, 10).map(item => 
    `${item.item_name}: ${item.stock_qty} units @ ₹${item.price_per_unit} (cost: ₹${item.cost_per_unit || 0})`
).join('\n')}
${businessData.inventory.length > 10 ? `... and ${businessData.inventory.length - 10} more items` : ''}

⚠️ STOCK ALERTS:
- Low Stock: ${businessData.metrics.lowStockCount} items
- Out of Stock: ${businessData.metrics.outOfStockCount} items
${businessData.lowStockItems.slice(0, 5).map(item => `  • ${item.item_name}: ${item.stock_qty} left`).join('\n')}

💰 RECENT SALES (${businessData.sales.length}):
${businessData.sales.slice(0, 3).map(sale => 
    `₹${sale.total_amount} - ${sale.items?.length || 0} items (${new Date(sale.createdAt).toLocaleDateString()})`
).join('\n')}

💸 RECENT EXPENSES (${businessData.expenses.length}):
${businessData.expenses.slice(0, 3).map(expense => 
    `₹${expense.amount} - ${expense.description} (${expense.category})`
).join('\n')}

📋 PENDING ORDERS: ${businessData.metrics.pendingOrders}

DETERMINE THE ACTION AND RESPOND WITH JSON:

FOR BILLING/SALES (creating a sale):
{"action": "create_sale", "items": [{"item_name": "exact_name_from_inventory", "quantity": number, "price_per_unit": number}], "customer_name": "Walk-in Customer", "payment_method": "Cash"}
NOTE: Always use "Walk-in Customer" as default customer name. Do NOT ask for customer name.

FOR ADDING INVENTORY:
{"action": "add_inventory", "item_name": "name", "quantity": number, "cost_per_unit": number, "price_per_unit": number, "category": "category", "min_stock_level": number}

FOR UPDATING INVENTORY:
{"action": "update_inventory", "item_name": "exact_name", "quantity": number, "price_per_unit": number}

FOR ADDING EXPENSE:
{"action": "add_expense", "description": "description", "amount": number, "category": "Rent|Utilities|Supplies|Marketing|Transportation|Equipment|Maintenance|Insurance|Professional Services|Other", "is_sales_expense": boolean}

FOR BUSINESS INSIGHTS/ANALYTICS:
{"action": "insights", "type": "sales|inventory|expenses|profit|overview", "response": "detailed_analysis_with_specific_numbers_and_recommendations"}

FOR MISSING INFORMATION:
{"action": "clarify", "missing": ["field1", "field2"], "response": "ask_for_specific_missing_information"}

FOR UNCLEAR REQUESTS:
{"action": "help", "response": "helpful_guidance_on_what_i_can_do"}

IMPORTANT RULES:
1. Use EXACT item names from inventory for sales/updates
2. For insights, provide specific numbers and actionable recommendations
3. If information is missing, ask for clarification
4. For sales, validate stock availability
5. Suggest improvements based on current metrics

Return ONLY valid JSON, no markdown or extra text.
`;

    try {
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Clean up response
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        return JSON.parse(responseText);
    } catch (error) {
        console.error('AI processing error:', error);
        
        // Fallback: Try to parse the message manually for common patterns
        const fallbackResponse = parseMessageFallback(message);
        if (fallbackResponse) {
            return fallbackResponse;
        }
        
        return {
            action: "help",
            response: "I can help you with sales, inventory management, expense tracking, and business insights. What would you like to do?"
        };
    }
};

/**
 * Execute the determined action
 */
const executeAction = async (userId, aiResponse, businessData, originalMessage) => {
    try {
        // Check if message contains "make bill" or similar direct commands
        const directBillCommands = ['make bill', 'create bill', 'bill for', 'make sale', 'create sale'];
        const isDirectBillCommand = directBillCommands.some(cmd => 
            originalMessage.toLowerCase().includes(cmd)
        );
        
        switch (aiResponse.action) {
            case 'create_sale':
                // Auto-confirm if it's a direct "make bill" command
                return await createSalePreview(userId, aiResponse, businessData, isDirectBillCommand);
            case 'add_inventory':
                return await addInventoryItem(userId, aiResponse);
            case 'update_inventory':
                return await updateInventoryItem(userId, aiResponse, businessData);
            case 'add_expense':
                return await addExpense(userId, aiResponse);
            case 'insights':
                return await generateBusinessInsights(aiResponse, businessData);
            case 'clarify':
                return {
                    success: true,
                    message: aiResponse.response,
                    data: { type: 'clarification_needed', missing_fields: aiResponse.missing }
                };
            default:
                return {
                    success: true,
                    message: aiResponse.response || "I can help you with sales, inventory, expenses, and business insights. What would you like to do?",
                    data: null
                };
        }
    } catch (error) {
        console.error('Action execution error:', error);
        return {
            success: false,
            message: "Error executing your request. Please try again.",
            data: null
        };
    }
};

/**
 * Handle confirmations for pending operations
 */
const handleConfirmation = async (userId) => {
    const pendingOperation = pendingOrders.get(`retailer_${userId}`);
    if (!pendingOperation) {
        return {
            success: false,
            message: "No pending operation to confirm. Please make a new request.",
            data: null
        };
    }

    switch (pendingOperation.type) {
        case 'sale':
            return await confirmSale(userId, pendingOperation);
        case 'inventory':
            return await confirmInventoryAdd(userId, pendingOperation);
        case 'expense':
            return await confirmExpense(userId, pendingOperation);
        default:
            pendingOrders.delete(`retailer_${userId}`);
            return {
                success: false,
                message: "Unknown pending operation. Please try again.",
                data: null
            };
    }
};

/**
 * Handle cancellations for pending operations
 */
const handleCancellation = async (userId) => {
    const pendingOperation = pendingOrders.get(`retailer_${userId}`);
    if (!pendingOperation) {
        return {
            success: true,
            message: "No pending operation to cancel. What else can I help you with?",
            data: null
        };
    }

    // Clear the pending operation
    pendingOrders.delete(`retailer_${userId}`);

    return {
        success: true,
        message: "✅ Order cancelled. What else can I help you with?",
        data: { type: 'operation_cancelled' }
    };
};

/**
 * Create sale preview with enhanced validation
 */
const createSalePreview = async (userId, aiResponse, businessData, autoConfirm = false) => {
    if (!aiResponse.items || aiResponse.items.length === 0) {
        return {
            success: false,
            message: "Please specify which items you want to sell. For example: 'Sell 2 rice bags at ₹50 each'",
            data: null
        };
    }

    const saleItems = [];
    let totalAmount = 0;
    let totalCogs = 0;
    const stockIssues = [];

    for (const item of aiResponse.items) {
        const inventoryItem = businessData.inventory.find(inv => 
            inv.item_name.toLowerCase() === item.item_name.toLowerCase()
        );

        if (!inventoryItem) {
            return {
                success: false,
                message: `"${item.item_name}" not found in inventory.\n\nAvailable items:\n${businessData.inventory.slice(0, 10).map(i => `• ${i.item_name}`).join('\n')}${businessData.inventory.length > 10 ? '\n... and more' : ''}`,
                data: { type: 'item_not_found', available_items: businessData.inventory.map(i => i.item_name) }
            };
        }

        if (inventoryItem.stock_qty < item.quantity) {
            stockIssues.push({
                item_name: item.item_name,
                requested: item.quantity,
                available: inventoryItem.stock_qty
            });
        }

        const itemTotal = item.quantity * item.price_per_unit;
        const itemCogs = item.quantity * (inventoryItem.cost_per_unit || inventoryItem.cost_price || 0);
        
        saleItems.push({
            item_name: inventoryItem.item_name,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            cost_per_unit: inventoryItem.cost_per_unit || inventoryItem.cost_price || 0,
            total: itemTotal,
            inventory_id: inventoryItem._id,
            current_stock: inventoryItem.stock_qty,
            new_stock: inventoryItem.stock_qty - item.quantity
        });
        
        totalAmount += itemTotal;
        totalCogs += itemCogs;
    }

    if (stockIssues.length > 0) {
        const issueText = stockIssues.map(issue => 
            `• ${issue.item_name}: Need ${issue.requested}, only ${issue.available} available`
        ).join('\n');
        
        return {
            success: false,
            message: `Insufficient stock:\n\n${issueText}\n\nPlease adjust quantities or restock items.`,
            data: { type: 'insufficient_stock', issues: stockIssues }
        };
    }

    // Store pending sale
    const pendingSale = {
        type: 'sale',
        userId,
        items: saleItems,
        totalAmount,
        totalCogs,
        grossProfit: totalAmount - totalCogs,
        customer_name: aiResponse.customer_name || 'Walk-in Customer',
        payment_method: aiResponse.payment_method || 'Cash',
        timestamp: Date.now()
    };

    // If autoConfirm is true, create the sale immediately
    if (autoConfirm) {
        return await confirmSale(userId, pendingSale);
    }

    pendingOrders.set(`retailer_${userId}`, pendingSale);

    let messageText = `📋 Sale Preview:\n\n`;
    saleItems.forEach((item, idx) => {
        messageText += `${idx + 1}. ${item.item_name}\n`;
        messageText += `   Qty: ${item.quantity} × ₹${item.price_per_unit} = ₹${item.total}\n`;
        messageText += `   Stock after sale: ${item.new_stock}\n\n`;
    });
    
    messageText += `💰 Total: ₹${totalAmount}\n`;
    messageText += `💸 COGS: ₹${totalCogs}\n`;
    messageText += `📈 Gross Profit: ₹${totalAmount - totalCogs}\n`;
    messageText += `👤 Customer: ${pendingSale.customer_name}\n`;
    messageText += `💳 Payment: ${pendingSale.payment_method}\n\n`;
    messageText += `Reply 'yes' to confirm this sale.`;

    return {
        success: true,
        message: messageText,
        data: { 
            type: 'sale_preview', 
            items: saleItems, 
            total_amount: totalAmount,
            gross_profit: totalAmount - totalCogs,
            pending: true 
        }
    };
};

/**
 * Confirm and create sale
 */
const confirmSale = async (userId, pendingSale) => {
    try {
        // Validate stock again
        for (const item of pendingSale.items) {
            const inventoryItem = await Inventory.findById(item.inventory_id);
            if (!inventoryItem || inventoryItem.stock_qty < item.quantity) {
                return {
                    success: false,
                    message: `Stock changed for ${item.item_name}. Please create a new sale.`,
                    data: null
                };
            }
        }

        // Update inventory and create sale
        const saleItems = [];
        for (const item of pendingSale.items) {
            const inventoryItem = await Inventory.findById(item.inventory_id);
            inventoryItem.stock_qty -= item.quantity;
            await inventoryItem.save();

            saleItems.push({
                item_name: item.item_name,
                quantity: item.quantity,
                price_per_unit: item.price_per_unit,
                cost_per_unit: item.cost_per_unit
            });
        }

        // Create sale record
        const sale = new Sale({
            user_id: userId,
            items: saleItems,
            total_amount: pendingSale.totalAmount,
            total_cogs: pendingSale.totalCogs,
            gross_profit: pendingSale.grossProfit,
            payment_method: pendingSale.payment_method,
            customer_name: pendingSale.customer_name
        });

        await sale.save();
        pendingOrders.delete(`retailer_${userId}`);

        const retailer = await User.findById(userId);
        
        return {
            success: true,
            message: `✅ Sale completed successfully!\n\n📋 Bill #${sale._id.toString().slice(-6).toUpperCase()}\n💰 Total: ₹${pendingSale.totalAmount}\n📈 Profit: ₹${pendingSale.grossProfit}\n🏪 ${retailer?.shop_name || 'Store'}\n📅 ${new Date().toLocaleString()}`,
            data: {
                type: 'sale_completed',
                sale_id: sale._id,
                total_amount: pendingSale.totalAmount,
                gross_profit: pendingSale.grossProfit,
                items: saleItems
            }
        };
    } catch (error) {
        console.error('Sale confirmation error:', error);
        return {
            success: false,
            message: "Error completing sale. Please try again.",
            data: null
        };
    }
};

/**
 * Add new inventory item with validation
 */
const addInventoryItem = async (userId, data) => {
    try {
        // Validate required fields
        const requiredFields = ['item_name', 'quantity', 'cost_per_unit', 'price_per_unit'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return {
                success: false,
                message: `Missing information: ${missingFields.join(', ')}. Please provide: item name, quantity, cost price, and selling price.`,
                data: { type: 'missing_fields', fields: missingFields }
            };
        }

        // Validate that selling price > cost price
        if (data.price_per_unit <= data.cost_per_unit) {
            return {
                success: false,
                message: `Selling price (₹${data.price_per_unit}) must be higher than cost price (₹${data.cost_per_unit}) to ensure profit.`,
                data: { type: 'invalid_pricing' }
            };
        }

        // Check if item already exists
        const existingItem = await Inventory.findOne({ 
            user_id: userId, 
            item_name: { $regex: new RegExp(`^${data.item_name}$`, 'i') }
        });

        if (existingItem) {
            // Store pending update instead of creating duplicate
            const pendingUpdate = {
                type: 'inventory',
                action: 'update_existing',
                userId,
                existing_item: existingItem,
                new_data: data,
                timestamp: Date.now()
            };

            pendingOrders.set(`retailer_${userId}`, pendingUpdate);

            return {
                success: true,
                message: `"${data.item_name}" already exists in inventory.\n\nCurrent: ${existingItem.stock_qty} units @ ₹${existingItem.price_per_unit}\nYou want to add: ${data.quantity} units @ ₹${data.price_per_unit}\n\nReply 'yes' to add to existing stock or specify a different item name.`,
                data: { type: 'item_exists', existing_item: existingItem, new_data: data }
            };
        }

        // Create new inventory item
        const newItem = new Inventory({
            user_id: userId,
            item_name: data.item_name,
            stock_qty: data.quantity,
            cost_price: data.cost_per_unit,
            selling_price: data.price_per_unit,
            price_per_unit: data.price_per_unit, // For backward compatibility
            category: data.category || 'Other',
            min_stock_level: data.min_stock_level || 5
        });

        await newItem.save();

        const profitPerUnit = data.price_per_unit - data.cost_per_unit;
        const profitMargin = ((profitPerUnit / data.price_per_unit) * 100).toFixed(2);

        return {
            success: true,
            message: `✅ Added to inventory:\n\n📦 ${data.item_name}\n🔢 Quantity: ${data.quantity} units\n💰 Cost: ₹${data.cost_per_unit} each\n🏷️ Selling Price: ₹${data.price_per_unit} each\n📈 Profit: ₹${profitPerUnit} per unit (${profitMargin}%)\n📂 Category: ${newItem.category}`,
            data: { type: 'inventory_added', item: newItem, profit_analysis: { profit_per_unit: profitPerUnit, profit_margin: profitMargin } }
        };
    } catch (error) {
        console.error('Add inventory error:', error);
        return { 
            success: false, 
            message: `Error adding inventory: ${error.message}`, 
            data: null 
        };
    }
};

/**
 * Update existing inventory item
 */
const updateInventoryItem = async (userId, data, businessData) => {
    try {
        const inventoryItem = businessData.inventory.find(item => 
            item.item_name.toLowerCase() === data.item_name.toLowerCase()
        );

        if (!inventoryItem) {
            return {
                success: false,
                message: `"${data.item_name}" not found in inventory.\n\nAvailable items:\n${businessData.inventory.slice(0, 10).map(i => `• ${i.item_name}`).join('\n')}`,
                data: null
            };
        }

        // Update the item
        if (data.quantity !== undefined) {
            inventoryItem.stock_qty = data.quantity;
        }
        if (data.price_per_unit !== undefined) {
            inventoryItem.price_per_unit = data.price_per_unit;
        }
        if (data.cost_per_unit !== undefined) {
            inventoryItem.cost_per_unit = data.cost_per_unit;
        }

        await inventoryItem.save();

        const profitPerUnit = inventoryItem.price_per_unit - (inventoryItem.cost_per_unit || 0);
        const profitMargin = inventoryItem.price_per_unit > 0 ? ((profitPerUnit / inventoryItem.price_per_unit) * 100).toFixed(2) : 0;

        return {
            success: true,
            message: `✅ Updated inventory:\n\n📦 ${inventoryItem.item_name}\n🔢 Stock: ${inventoryItem.stock_qty} units\n🏷️ Price: ₹${inventoryItem.price_per_unit}\n📈 Profit Margin: ${profitMargin}%`,
            data: { type: 'inventory_updated', item: inventoryItem }
        };
    } catch (error) {
        console.error('Update inventory error:', error);
        return { 
            success: false, 
            message: `Error updating inventory: ${error.message}`, 
            data: null 
        };
    }
};

/**
 * Confirm inventory addition for existing items
 */
const confirmInventoryAdd = async (userId, pendingOperation) => {
    try {
        const { existing_item, new_data } = pendingOperation;
        
        // Update existing item
        existing_item.stock_qty += new_data.quantity;
        
        // Update price if different
        if (new_data.price_per_unit !== existing_item.price_per_unit) {
            existing_item.price_per_unit = new_data.price_per_unit;
        }
        
        // Update cost if provided
        if (new_data.cost_per_unit) {
            existing_item.cost_per_unit = new_data.cost_per_unit;
        }

        await existing_item.save();
        pendingOrders.delete(`retailer_${userId}`);

        const profitPerUnit = existing_item.price_per_unit - (existing_item.cost_per_unit || 0);
        const profitMargin = ((profitPerUnit / existing_item.price_per_unit) * 100).toFixed(2);

        return {
            success: true,
            message: `✅ Updated existing inventory:\n\n📦 ${existing_item.item_name}\n🔢 Total Stock: ${existing_item.stock_qty} units\n🏷️ Price: ₹${existing_item.price_per_unit}\n📈 Profit: ₹${profitPerUnit} per unit (${profitMargin}%)`,
            data: { type: 'inventory_updated', item: existing_item }
        };
    } catch (error) {
        console.error('Confirm inventory error:', error);
        return {
            success: false,
            message: "Error updating inventory. Please try again.",
            data: null
        };
    }
};

/**
 * Add expense with enhanced categorization
 */
const addExpense = async (userId, data) => {
    try {
        // Validate required fields
        if (!data.description || !data.amount) {
            return {
                success: false,
                message: "Please provide expense description and amount. For example: 'Add expense: Electricity bill ₹2000'",
                data: null
            };
        }

        const newExpense = new Expense({
            user_id: userId,
            description: data.description,
            amount: data.amount,
            category: data.category || 'Other',
            is_sales_expense: data.is_sales_expense || false,
            date: new Date()
        });

        await newExpense.save();

        const expenseType = newExpense.is_sales_expense ? '🎯 Sales-related' : '🏢 Operating';
        
        return {
            success: true,
            message: `✅ Expense added:\n\n💸 ${data.description}\n💰 Amount: ₹${data.amount}\n📂 Category: ${newExpense.category}\n🏷️ Type: ${expenseType}\n📅 Date: ${new Date().toLocaleDateString()}`,
            data: { type: 'expense_added', expense: newExpense }
        };
    } catch (error) {
        console.error('Add expense error:', error);
        return { 
            success: false, 
            message: `Error adding expense: ${error.message}`, 
            data: null 
        };
    }
};

/**
 * Generate comprehensive business insights
 */
const generateBusinessInsights = async (aiResponse, businessData) => {
    try {
        let insightMessage = '';

        switch (aiResponse.type) {
            case 'sales':
                insightMessage = generateSalesInsights(businessData);
                break;
            case 'inventory':
                insightMessage = generateInventoryInsights(businessData);
                break;
            case 'expenses':
                insightMessage = generateExpenseInsights(businessData);
                break;
            case 'profit':
                insightMessage = generateProfitInsights(businessData);
                break;
            case 'overview':
            default:
                insightMessage = generateOverviewInsights(businessData);
                break;
        }

        return {
            success: true,
            message: insightMessage,
            data: { 
                type: 'business_insights', 
                metrics: businessData.metrics,
                insights_type: aiResponse.type 
            }
        };
    } catch (error) {
        console.error('Insights generation error:', error);
        return {
            success: false,
            message: "Error generating insights. Please try again.",
            data: null
        };
    }
};

const generateSalesInsights = (businessData) => {
    const { metrics, sales } = businessData;
    
    let insights = `📊 SALES INSIGHTS\n\n`;
    insights += `💰 Total Revenue: ₹${metrics.totalRevenue.toLocaleString()}\n`;
    insights += `📈 Gross Profit: ₹${metrics.grossProfit.toLocaleString()}\n`;
    insights += `📅 Today: ₹${metrics.todayRevenue.toLocaleString()}\n`;
    insights += `📆 This Month: ₹${metrics.monthlyRevenue.toLocaleString()}\n\n`;

    if (sales.length > 0) {
        const avgSaleValue = metrics.totalRevenue / sales.length;
        insights += `📊 Average Sale: ₹${avgSaleValue.toFixed(0)}\n`;
        insights += `🛒 Total Transactions: ${sales.length}\n\n`;

        // Top selling items
        const itemSales = {};
        sales.forEach(sale => {
            sale.items?.forEach(item => {
                if (!itemSales[item.item_name]) {
                    itemSales[item.item_name] = { quantity: 0, revenue: 0 };
                }
                itemSales[item.item_name].quantity += item.quantity;
                itemSales[item.item_name].revenue += item.quantity * item.price_per_unit;
            });
        });

        const topItems = Object.entries(itemSales)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5);

        if (topItems.length > 0) {
            insights += `🏆 TOP SELLING ITEMS:\n`;
            topItems.forEach(([item, data], idx) => {
                insights += `${idx + 1}. ${item}: ${data.quantity} units, ₹${data.revenue.toLocaleString()}\n`;
            });
        }
    } else {
        insights += `📝 No sales recorded yet. Start by creating your first sale!`;
    }

    return insights;
};

const generateInventoryInsights = (businessData) => {
    const { inventory, lowStockItems, outOfStockItems, metrics } = businessData;
    
    let insights = `📦 INVENTORY INSIGHTS\n\n`;
    insights += `📊 Total Items: ${inventory.length}\n`;
    insights += `⚠️ Low Stock: ${metrics.lowStockCount} items\n`;
    insights += `❌ Out of Stock: ${metrics.outOfStockCount} items\n\n`;

    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.stock_qty * item.cost_per_unit || 0), 0);
    const totalSellingValue = inventory.reduce((sum, item) => sum + (item.stock_qty * item.price_per_unit), 0);
    
    insights += `💰 Inventory Value (Cost): ₹${totalInventoryValue.toLocaleString()}\n`;
    insights += `🏷️ Inventory Value (Selling): ₹${totalSellingValue.toLocaleString()}\n`;
    insights += `📈 Potential Profit: ₹${(totalSellingValue - totalInventoryValue).toLocaleString()}\n\n`;

    if (lowStockItems.length > 0) {
        insights += `⚠️ RESTOCK NEEDED:\n`;
        lowStockItems.slice(0, 5).forEach(item => {
            insights += `• ${item.item_name}: ${item.stock_qty} left\n`;
        });
        insights += `\n`;
    }

    if (outOfStockItems.length > 0) {
        insights += `❌ OUT OF STOCK:\n`;
        outOfStockItems.slice(0, 5).forEach(item => {
            insights += `• ${item.item_name}\n`;
        });
    }

    return insights;
};

const generateExpenseInsights = (businessData) => {
    const { expenses, metrics } = businessData;
    
    let insights = `💸 EXPENSE INSIGHTS\n\n`;
    insights += `💰 Total Expenses: ₹${metrics.totalExpenses.toLocaleString()}\n`;
    insights += `📅 Today: ₹${metrics.todayExpenses.toLocaleString()}\n`;
    insights += `📆 This Month: ₹${metrics.monthlyExpenses.toLocaleString()}\n\n`;

    if (expenses.length > 0) {
        // Expense by category
        const categoryExpenses = {};
        expenses.forEach(expense => {
            if (!categoryExpenses[expense.category]) {
                categoryExpenses[expense.category] = 0;
            }
            categoryExpenses[expense.category] += expense.amount;
        });

        const topCategories = Object.entries(categoryExpenses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        insights += `📊 EXPENSES BY CATEGORY:\n`;
        topCategories.forEach(([category, amount]) => {
            const percentage = ((amount / metrics.totalExpenses) * 100).toFixed(1);
            insights += `• ${category}: ₹${amount.toLocaleString()} (${percentage}%)\n`;
        });

        const avgExpense = metrics.totalExpenses / expenses.length;
        insights += `\n📊 Average Expense: ₹${avgExpense.toFixed(0)}\n`;
    }

    return insights;
};

const generateProfitInsights = (businessData) => {
    const { metrics } = businessData;
    
    let insights = `📈 PROFIT ANALYSIS\n\n`;
    insights += `💰 Total Revenue: ₹${metrics.totalRevenue.toLocaleString()}\n`;
    insights += `💸 Total COGS: ₹${metrics.totalCogs.toLocaleString()}\n`;
    insights += `💸 Total Expenses: ₹${metrics.totalExpenses.toLocaleString()}\n`;
    insights += `📈 Gross Profit: ₹${metrics.grossProfit.toLocaleString()}\n`;
    insights += `💎 Net Profit: ₹${metrics.netProfit.toLocaleString()}\n`;
    insights += `📊 Profit Margin: ${metrics.profitMargin}%\n\n`;

    // Profit analysis
    if (metrics.netProfit > 0) {
        insights += `✅ Your business is profitable!\n`;
        if (parseFloat(metrics.profitMargin) > 20) {
            insights += `🎉 Excellent profit margin (${metrics.profitMargin}%)`;
        } else if (parseFloat(metrics.profitMargin) > 10) {
            insights += `👍 Good profit margin (${metrics.profitMargin}%)`;
        } else {
            insights += `⚠️ Low profit margin (${metrics.profitMargin}%). Consider:\n• Reducing costs\n• Increasing prices\n• Focusing on high-margin items`;
        }
    } else {
        insights += `⚠️ Business is running at a loss.\n`;
        insights += `💡 RECOMMENDATIONS:\n`;
        insights += `• Review and reduce expenses\n`;
        insights += `• Increase sales volume\n`;
        insights += `• Optimize pricing strategy\n`;
        insights += `• Focus on high-margin products`;
    }

    return insights;
};

const generateOverviewInsights = (businessData) => {
    const { metrics, inventory, sales, expenses } = businessData;
    
    let insights = `🏪 BUSINESS OVERVIEW\n\n`;
    insights += `📊 FINANCIAL SUMMARY:\n`;
    insights += `💰 Revenue: ₹${metrics.totalRevenue.toLocaleString()}\n`;
    insights += `💎 Net Profit: ₹${metrics.netProfit.toLocaleString()}\n`;
    insights += `📈 Profit Margin: ${metrics.profitMargin}%\n\n`;
    
    insights += `📦 INVENTORY STATUS:\n`;
    insights += `• ${inventory.length} total items\n`;
    insights += `• ${metrics.lowStockCount} low stock alerts\n`;
    insights += `• ${metrics.outOfStockCount} out of stock\n\n`;
    
    insights += `🛒 SALES ACTIVITY:\n`;
    insights += `• ${sales.length} total transactions\n`;
    insights += `• ₹${metrics.todayRevenue.toLocaleString()} today\n`;
    insights += `• ₹${metrics.monthlyRevenue.toLocaleString()} this month\n\n`;
    
    insights += `💸 EXPENSES:\n`;
    insights += `• ₹${metrics.totalExpenses.toLocaleString()} total\n`;
    insights += `• ₹${metrics.monthlyExpenses.toLocaleString()} this month\n\n`;

    if (metrics.pendingOrders > 0) {
        insights += `📋 ${metrics.pendingOrders} pending customer orders\n\n`;
    }

    // Quick recommendations
    insights += `💡 QUICK RECOMMENDATIONS:\n`;
    if (metrics.lowStockCount > 0) {
        insights += `• Restock ${metrics.lowStockCount} low inventory items\n`;
    }
    if (metrics.pendingOrders > 0) {
        insights += `• Process ${metrics.pendingOrders} pending orders\n`;
    }
    if (parseFloat(metrics.profitMargin) < 15) {
        insights += `• Review pricing to improve profit margin\n`;
    }
    if (sales.length === 0) {
        insights += `• Start recording sales to track performance\n`;
    }

    return insights;
};

module.exports = { handleRetailerChat };