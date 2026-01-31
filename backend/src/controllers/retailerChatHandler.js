const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const pendingOrders = new Map();

/**
 * Complete Retailer Business Assistant
 * Handles: Sales/Billing, Inventory Management, Expense Tracking, Business Insights
 */
const handleRetailerChat = async (userId, message, language) => {
    try {
        console.log(`🛍️ Retailer chat: "${message}"`);

        // Handle bill confirmation
        if (['yes', 'confirm', 'ok', 'proceed'].some(word => message.toLowerCase().trim() === word)) {
            return await confirmBill(userId);
        }

        // Use AI to understand what the user wants to do
        const [inventory, recentSales, recentExpenses] = await Promise.all([
            Inventory.find({ user_id: userId }),
            Sale.find({ user_id: userId }).sort({ createdAt: -1 }).limit(5),
            Expense.find({ user_id: userId }).sort({ createdAt: -1 }).limit(5)
        ]);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `
You are a business assistant. Analyze: "${message}"

INVENTORY (${inventory.length} items):
${inventory.map(item => `${item.item_name}: ${item.stock_qty} units @ ₹${item.price_per_unit} (cost: ₹${item.cost_per_unit || 0})`).join('\n')}

RECENT SALES: ${recentSales.length} sales, Total: ₹${recentSales.reduce((sum, s) => sum + s.total_amount, 0)}
RECENT EXPENSES: ${recentExpenses.length} expenses, Total: ₹${recentExpenses.reduce((sum, e) => sum + e.amount, 0)}

Determine action and respond with JSON:

BILLING/SALES:
{"action": "bill", "items": [{"item_name": "exact name", "quantity": number, "price_per_unit": number}]}

ADD INVENTORY:
{"action": "add_inventory", "item_name": "name", "quantity": number, "cost_per_unit": number, "price_per_unit": number, "category": "category"}

ADD EXPENSE:
{"action": "add_expense", "description": "description", "amount": number, "category": "category"}

BUSINESS INSIGHTS:
{"action": "insights", "response": "helpful analysis"}

UNCLEAR:
{"action": "help", "response": "ask for clarification"}

Return ONLY JSON, no markdown.
`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');

        let aiResponse;
        try {
            aiResponse = JSON.parse(responseText);
        } catch (e) {
            return { success: true, message: "I can help with billing, inventory, expenses, and insights. What would you like to do?", data: null };
        }

        // Execute the action
        switch (aiResponse.action) {
            case 'bill':
                return await createBillPreview(userId, aiResponse.items, inventory);
            case 'add_inventory':
                return await addInventoryItem(userId, aiResponse);
            case 'add_expense':
                return await addExpense(userId, aiResponse);
            case 'insights':
                return { success: true, message: aiResponse.response, data: null };
            default:
                return { success: true, message: aiResponse.response || "How can I help you today?", data: null };
        }

    } catch (error) {
        console.error('Retailer chat error:', error);
        return { success: false, message: "Error processing request. Please try again.", data: null };
    }
};

// Create bill preview
const createBillPreview = async (userId, items, inventory) => {
    if (!items || items.length === 0) {
        return { success: false, message: "No items specified for billing.", data: null };
    }

    const billItems = [];
    let totalAmount = 0;

    for (const item of items) {
        const inventoryItem = inventory.find(inv => inv.item_name.toLowerCase() === item.item_name.toLowerCase());

        if (!inventoryItem) {
            return { success: false, message: `${item.item_name} not found in inventory`, data: null };
        }

        if (inventoryItem.stock_qty < item.quantity) {
            return {
                success: false,
                message: `Not enough stock for ${item.item_name}\n\nRequested: ${item.quantity}\nAvailable: ${inventoryItem.stock_qty}`,
                data: { type: 'stock_error', item: item.item_name, requested: item.quantity, available: inventoryItem.stock_qty }
            };
        }

        const itemTotal = item.quantity * item.price_per_unit;
        billItems.push({
            item_name: inventoryItem.item_name,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            total: itemTotal,
            inventory_id: inventoryItem._id,
            current_stock: inventoryItem.stock_qty,
            new_stock: inventoryItem.stock_qty - item.quantity
        });
        totalAmount += itemTotal;
    }

    // Store pending bill
    pendingOrders.set(`retailer_${userId}`, { userId, items: billItems, totalAmount, timestamp: Date.now() });

    let messageText = `Bill Preview:\n\n`;
    billItems.forEach((item, idx) => {
        messageText += `${idx + 1}. ${item.item_name} - Qty: ${item.quantity} × ₹${item.price_per_unit} = ₹${item.total}\n`;
    });
    messageText += `\nTotal: ₹${totalAmount}`;

    return {
        success: true,
        message: messageText,
        data: { type: 'bill_preview', sales: billItems, total_amount: totalAmount, pending: true }
    };
};

// Confirm and create bill
const confirmBill = async (userId) => {
    const pendingBill = pendingOrders.get(`retailer_${userId}`);
    if (!pendingBill) {
        return { success: false, message: "No pending bill to confirm.", data: null };
    }

    const saleItems = [];
    let totalAmount = 0;
    let totalCogs = 0;
    const updatedStocks = [];

    for (const item of pendingBill.items) {
        const inventoryItem = await Inventory.findById(item.inventory_id);
        if (!inventoryItem || inventoryItem.stock_qty < item.quantity) {
            return { success: false, message: `Not enough stock for ${item.item_name}`, data: null };
        }

        const itemTotal = item.quantity * item.price_per_unit;
        const itemCogs = item.quantity * (inventoryItem.cost_per_unit || 0);

        saleItems.push({
            item_name: inventoryItem.item_name,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            cost_per_unit: inventoryItem.cost_per_unit || 0
        });

        totalAmount += itemTotal;
        totalCogs += itemCogs;

        // Update inventory
        inventoryItem.stock_qty -= item.quantity;
        await inventoryItem.save();

        updatedStocks.push({
            item_name: inventoryItem.item_name,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            total: itemTotal,
            new_stock: inventoryItem.stock_qty
        });
    }

    // Create sale
    const sale = new Sale({
        user_id: userId,
        items: saleItems,
        total_amount: totalAmount,
        total_cogs: totalCogs,
        gross_profit: totalAmount - totalCogs,
        payment_method: 'Cash',
        customer_name: 'Walk-in Customer'
    });

    await sale.save();
    pendingOrders.delete(`retailer_${userId}`);

    const retailer = await User.findById(userId);
    const billItems = sale.items.map((item, idx) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        total: item.quantity * item.price_per_unit,
        new_stock: updatedStocks[idx] ? updatedStocks[idx].new_stock : null
    }));

    return {
        success: true,
        message: `Bill created successfully!`,
        data: {
            type: 'bill_created',
            sales: billItems,
            total_amount: sale.total_amount,
            bill_number: `BILL-${Date.now()}`,
            date: new Date().toLocaleString(),
            shop_name: retailer ? retailer.shop_name : 'Retail Store',
            sale_id: sale._id
        }
    };
};

// Add inventory item
const addInventoryItem = async (userId, data) => {
    try {
        const newItem = new Inventory({
            user_id: userId,
            item_name: data.item_name,
            stock_qty: data.quantity,
            cost_per_unit: data.cost_per_unit,
            price_per_unit: data.price_per_unit,
            category: data.category || 'General'
        });

        await newItem.save();
        return {
            success: true,
            message: `Added ${data.quantity} ${data.item_name} to inventory at ₹${data.price_per_unit} each`,
            data: { type: 'inventory_added', item: newItem }
        };
    } catch (error) {
        return { success: false, message: `Error adding inventory: ${error.message}`, data: null };
    }
};

// Add expense
const addExpense = async (userId, data) => {
    try {
        const newExpense = new Expense({
            user_id: userId,
            description: data.description,
            amount: data.amount,
            category: data.category || 'General',
            date: new Date()
        });

        await newExpense.save();
        return {
            success: true,
            message: `Added expense: ${data.description} - ₹${data.amount}`,
            data: { type: 'expense_added', expense: newExpense }
        };
    } catch (error) {
        return { success: false, message: `Error adding expense: ${error.message}`, data: null };
    }
};

module.exports = { handleRetailerChat };