/**
 * Conversational Action Controller - Phase 7
 * Handles AI-powered conversational database operations with user confirmation
 * 
 * SUPPORTED ACTIONS:
 * - Add Sale: Record sales transactions with inventory deduction
 * - Add Expense: Track business expenses by category
 * - Update Inventory: Modify existing inventory stock levels
 * - Add Inventory: Create new inventory items
 * 
 * LANGUAGES: English, Hindi, Telugu
 * 
 * VOICE + TEXT FLOW:
 * 1. User speaks/types → Voice transcribed via /api/chatbot/stt (if audio)
 * 2. Text sent to /api/conversational/parse → AI interprets intent
 * 3. System returns confirmation message with confirmationId
 * 4. User confirms (yes/ok) or cancels (no/cancel)
 * 5. Frontend sends confirmation to /api/conversational/execute
 * 6. Database updated, success message returned
 * 
 * AI RESPONSE FORMAT:
 * {
 *   "isAction": true,
 *   "actionType": "add_sale" | "add_expense" | "update_inventory" | "add_inventory",
 *   "confirmationId": "userId_timestamp",
 *   "data": { ...parsed fields... },
 *   "confirmationMessage": "Human-readable confirmation in user's language",
 *   "confidence": 0.0-1.0
 * }
 * 
 * DB SCHEMA MAPPINGS:
 * - Sales → { user_id, items[], payment_method, customer_name, date }
 * - Expenses → { user_id, amount, description, category, date }
 * - Inventory → { user_id, item_name, stock_qty, price_per_unit, category }
 */

const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory confirmation storage (use Redis in production)
const pendingConfirmations = new Map();

class ConversationalActionController {
    constructor() {
        // Bind methods to preserve 'this' context
        this.parseIntent = this.parseIntent.bind(this);
        this.executeAction = this.executeAction.bind(this);
        this.validateActionData = this.validateActionData.bind(this);
        this.generateConfirmationMessage = this.generateConfirmationMessage.bind(this);
        this.executeSale = this.executeSale.bind(this);
        this.executeExpense = this.executeExpense.bind(this);
        this.executeInventoryUpdate = this.executeInventoryUpdate.bind(this);
        this.executeInventoryAdd = this.executeInventoryAdd.bind(this);
        this.generateSuccessMessage = this.generateSuccessMessage.bind(this);
        this.clearExpiredConfirmations = this.clearExpiredConfirmations.bind(this);
    }

    /**
     * Parse user message to extract intent and structured data
     */
    async parseIntent(req, res) {
        try {
            const { message, language = 'en' } = req.body;
            const userId = req.user._id;

            if (!message || message.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required'
                });
            }

            console.log(`🎯 Parsing intent for: "${message}" [${language}]`);

            // Fetch user's inventory for context
            const inventory = await Inventory.find({ user_id: userId });
            const inventoryNames = inventory.map(item => item.item_name).join(', ');

            // Build intent parsing prompt
            const intentPrompt = `
You are an AI assistant that converts natural language into structured database operations for a business management system.

USER'S INVENTORY ITEMS (for reference): ${inventoryNames || 'None'}

USER MESSAGE (in ${language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'}): "${message}"

IMPORTANT INSTRUCTIONS:
1. Detect if the user wants to perform a DATABASE ACTION or just ASK A QUESTION
2. Database actions include: add/record sale, add expense, update stock, add inventory
3. Questions include: what is my profit, how much stock, etc.

If it's a DATABASE ACTION, extract the following in JSON format:
{
  "isAction": true,
  "actionType": "add_sale" | "add_expense" | "update_inventory" | "add_inventory",
  "data": {
    // For add_sale:
    "items": [{"item_name": "string", "quantity": number, "price_per_unit": number, "cost_per_unit": number}],
    "payment_method": "Cash" | "Card" | "UPI" | "Bank Transfer" | "Credit",
    "customer_name": "string (optional)"
    
    // For add_expense:
    "amount": number,
    "description": "string",
    "category": "string"
    
    // For update_inventory or add_inventory:
    "item_name": "string",
    "stock_qty": number,
    "price_per_unit": number (optional for update),
    "category": "string (optional)"
  },
  "confidence": 0.0-1.0,
  "detectedLanguage": "${language}"
}

If it's a QUESTION (not an action), return:
{
  "isAction": false,
  "reason": "This is a query/question, not a database action"
}

IMPORTANT RULES:
1. Only set "isAction": true if user wants to ADD/RECORD/UPDATE data
2. Questions like "what is", "how much", "show me" are NOT actions
3. Phrases like "record", "add", "sold", "bought", "update stock" ARE actions
4. For sales: assume cash payment if not specified
5. For items not in inventory: still extract the data, we'll handle it in backend
6. If uncertain about actionType, set confidence < 0.7

EXAMPLES:

SALES:
"Record 5 Pepsi sold for ₹150" → add_sale with items: [{"item_name": "Pepsi", "quantity": 5, "price_per_unit": 30}]
"Sold 2 books at ₹500 each to Rahul" → add_sale with items: [{"item_name": "books", "quantity": 2, "price_per_unit": 500}], customer_name: "Rahul"
"3 Milk bottles sold, ₹60 each, UPI payment" → add_sale with items: [{"item_name": "Milk", "quantity": 3, "price_per_unit": 60}], payment_method: "UPI"

EXPENSES:
"Add ₹1200 electricity bill" → add_expense with amount: 1200, description: "electricity bill", category: "Electricity"
"Paid ₹5000 for shop rent" → add_expense with amount: 5000, description: "shop rent", category: "Rent"
"₹2500 spent on marketing" → add_expense with amount: 2500, description: "marketing", category: "Marketing"
"Bought office supplies ₹800" → add_expense with amount: 800, description: "office supplies", category: "Office Supplies"

INVENTORY UPDATE:
"Update stock: 10 Biscuits added" → update_inventory with item_name: "Biscuits", stock_qty: 10 (positive means add)
"Received 50 Pepsi bottles" → update_inventory with item_name: "Pepsi", stock_qty: 50
"Reduce Milk by 5" → update_inventory with item_name: "Milk", stock_qty: -5 (negative means reduce)
"Update Chips price to ₹20" → update_inventory with item_name: "Chips", price_per_unit: 20

INVENTORY ADD:
"Add new item: Chocolate, 100 pieces, ₹50 each" → add_inventory with item_name: "Chocolate", stock_qty: 100, price_per_unit: 50
"New product: Soap bars, 200 units, ₹30 per piece, category Toiletries" → add_inventory with item_name: "Soap bars", stock_qty: 200, price_per_unit: 30, category: "Toiletries"

QUESTIONS (NOT ACTIONS):
"What is my profit today?" → isAction: false (it's a question)
"How much stock do I have?" → isAction: false (it's a query)
"Show me sales report" → isAction: false (it's a request for info)

Return ONLY valid JSON, no explanation.
`;

            // Use OpenAI to parse intent
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: intentPrompt }],
              temperature: 0.3,
              max_tokens: 500,
              response_format: { type: "json_object" }
            });
            
            const responseText = completion.choices[0].message.content;

            // Parse JSON response
            let intentData;
            try {
                intentData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse OpenAI response:', responseText);
                return res.status(200).json({
                    success: true,
                    data: {
                        isAction: false,
                        reason: 'Could not parse intent from message'
                    }
                });
            }

            console.log('✅ Intent parsed:', JSON.stringify(intentData, null, 2));

            // If it's not an action, return immediately
            if (!intentData.isAction) {
                return res.status(200).json({
                    success: true,
                    data: intentData
                });
            }

            // Validate the parsed data
            const validationResult = this.validateActionData(intentData);
            if (!validationResult.valid) {
                return res.status(200).json({
                    success: true,
                    data: {
                        isAction: false,
                        reason: validationResult.error
                    }
                });
            }

            // Generate confirmation ID
            const confirmationId = `${userId}_${Date.now()}`;

            // Store pending confirmation
            pendingConfirmations.set(confirmationId, {
                userId: userId.toString(),
                actionType: intentData.actionType,
                data: intentData.data,
                language: language,
                timestamp: Date.now(),
                originalMessage: message
            });

            // Generate confirmation message
            const confirmationMessage = this.generateConfirmationMessage(
                intentData.actionType,
                intentData.data,
                language
            );

            return res.status(200).json({
                success: true,
                data: {
                    isAction: true,
                    confirmationId: confirmationId,
                    actionType: intentData.actionType,
                    data: intentData.data,
                    confirmationMessage: confirmationMessage,
                    confidence: intentData.confidence
                }
            });

        } catch (error) {
            console.error('❌ Intent parsing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to parse intent',
                error: error.message
            });
        }
    }

    /**
     * Validate action data structure
     */
    validateActionData(intentData) {
        const { actionType, data } = intentData;

        if (!actionType || !data) {
            return { valid: false, error: 'Missing action type or data' };
        }

        switch (actionType) {
            case 'add_sale':
                if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
                    return { valid: false, error: 'Sale must have at least one item' };
                }
                for (const item of data.items) {
                    if (!item.item_name || !item.quantity || !item.price_per_unit) {
                        return { valid: false, error: 'Each item must have name, quantity, and price' };
                    }
                }
                break;

            case 'add_expense':
                if (!data.amount || !data.description || !data.category) {
                    return { valid: false, error: 'Expense must have amount, description, and category' };
                }
                break;

            case 'update_inventory':
            case 'add_inventory':
                if (!data.item_name) {
                    return { valid: false, error: 'Item name is required' };
                }
                break;

            default:
                return { valid: false, error: 'Unknown action type' };
        }

        return { valid: true };
    }

    /**
     * Generate confirmation message in user's language
     */
    generateConfirmationMessage(actionType, data, language) {
        switch (actionType) {
            case 'add_sale': {
                const itemsList = data.items.map(item => 
                    `• ${item.quantity}x ${item.item_name} @ ₹${item.price_per_unit} = ₹${item.quantity * item.price_per_unit}`
                ).join('\n');
                const total = data.items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);
                const payment = data.payment_method || 'Cash';
                
                if (language === 'hi') {
                    return `आप एक बिक्री दर्ज करना चाहते हैं:\n${itemsList}\nकुल: ₹${total}\nभुगतान: ${payment === 'Cash' ? 'नकद' : payment}\n\nक्या मैं यह बिक्री जोड़ दूं?`;
                } else if (language === 'te') {
                    return `మీరు ఒక అమ్మకాన్ని రికార్డ్ చేయాలనుకుంటున్నారు:\n${itemsList}\nమొత్తం: ₹${total}\nచెల్లింపు: ${payment === 'Cash' ? 'నగదు' : payment}\n\nనేను ఈ అమ్మకాన్ని జోడించాలా?`;
                } else {
                    return `You want to record a sale:\n${itemsList}\nTotal: ₹${total}\nPayment: ${payment}\n\nShould I add this sale to your records?`;
                }
            }
            
            case 'add_expense': {
                if (language === 'hi') {
                    return `आप एक खर्च जोड़ना चाहते हैं:\n• श्रेणी: ${data.category}\n• विवरण: ${data.description}\n• राशि: ₹${data.amount}\n\nक्या मैं यह खर्च दर्ज करूं?`;
                } else if (language === 'te') {
                    return `మీరు ఒక ఖర్చును జోడించాలనుకుంటున్నారు:\n• వర్గం: ${data.category}\n• వివరణ: ${data.description}\n• మొత్తం: ₹${data.amount}\n\nనేను ఈ ఖర్చును రికార్డ్ చేయాలా?`;
                } else {
                    return `You want to add an expense:\n• Category: ${data.category}\n• Description: ${data.description}\n• Amount: ₹${data.amount}\n\nShould I record this expense?`;
                }
            }
            
            case 'update_inventory': {
                const qtyText = `${data.stock_qty > 0 ? '+' : ''}${data.stock_qty}`;
                const priceText = data.price_per_unit ? `\n• Price: ₹${data.price_per_unit}` : '';
                
                if (language === 'hi') {
                    return `आप इन्वेंटरी अपडेट करना चाहते हैं:\n• आइटम: ${data.item_name}\n• मात्रा: ${qtyText} इकाइयाँ${data.price_per_unit ? `\n• मूल्य: ₹${data.price_per_unit}` : ''}\n\nक्या मैं स्टॉक अपडेट करूं?`;
                } else if (language === 'te') {
                    return `మీరు ఇన్వెంటరీని నవీకరించాలనుకుంటున్నారు:\n• వస్తువు: ${data.item_name}\n• పరిమాణం: ${qtyText} యూనిట్లు${data.price_per_unit ? `\n• ధర: ₹${data.price_per_unit}` : ''}\n\nనేను స్టాక్ నవీకరించాలా?`;
                } else {
                    return `You want to update inventory:\n• Item: ${data.item_name}\n• Quantity: ${qtyText} units${priceText}\n\nShould I update the stock?`;
                }
            }
            
            case 'add_inventory': {
                if (language === 'hi') {
                    return `आप नया आइटम जोड़ना चाहते हैं:\n• नाम: ${data.item_name}\n• स्टॉक: ${data.stock_qty || 0} इकाइयाँ\n• मूल्य: ₹${data.price_per_unit || 0}\n\nक्या मैं यह आइटम जोड़ूं?`;
                } else if (language === 'te') {
                    return `మీరు కొత్త వస్తువును జోడించాలనుకుంటున్నారు:\n• పేరు: ${data.item_name}\n• స్టాక్: ${data.stock_qty || 0} యూనిట్లు\n• ధర: ₹${data.price_per_unit || 0}\n\nనేను ఈ వస్తువును జోడించాలా?`;
                } else {
                    return `You want to add a new item:\n• Name: ${data.item_name}\n• Stock: ${data.stock_qty || 0} units\n• Price: ₹${data.price_per_unit || 0}\n\nShould I add this item?`;
                }
            }
            
            default:
                return 'Unknown action type';
        }
    }

    /**
     * Execute confirmed action
     */
    async executeAction(req, res) {
        try {
            const { confirmationId, confirmed, language = 'en' } = req.body;
            const userId = req.user._id;

            if (!confirmationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Confirmation ID is required'
                });
            }

            // Retrieve pending confirmation
            const pendingAction = pendingConfirmations.get(confirmationId);

            if (!pendingAction) {
                const messages = {
                    en: 'No pending action found. Please try again.',
                    hi: 'कोई लंबित कार्रवाई नहीं मिली। कृपया पुनः प्रयास करें।',
                    te: 'పెండింగ్ చర్య కనుగొనబడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
                };
                return res.status(404).json({
                    success: false,
                    message: messages[language] || messages.en
                });
            }

            // Verify user ID matches
            if (pendingAction.userId !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized action'
                });
            }

            // Remove from pending (whether confirmed or not)
            pendingConfirmations.delete(confirmationId);

            // If not confirmed, return cancellation message
            if (!confirmed) {
                const messages = {
                    en: 'Okay, I cancelled that action.',
                    hi: 'ठीक है, मैंने वह कार्रवाई रद्द कर दी।',
                    te: 'సరే, నేను ఆ చర్యను రద్దు చేసాను.'
                };
                return res.status(200).json({
                    success: true,
                    cancelled: true,
                    message: messages[language] || messages.en
                });
            }

            // Execute the action based on type
            let result;
            switch (pendingAction.actionType) {
                case 'add_sale':
                    result = await this.executeSale(userId, pendingAction.data);
                    break;
                case 'add_expense':
                    result = await this.executeExpense(userId, pendingAction.data);
                    break;
                case 'update_inventory':
                    result = await this.executeInventoryUpdate(userId, pendingAction.data);
                    break;
                case 'add_inventory':
                    result = await this.executeInventoryAdd(userId, pendingAction.data);
                    break;
                default:
                    throw new Error('Unknown action type');
            }

            // Generate success message
            const successMessage = this.generateSuccessMessage(
                pendingAction.actionType,
                result,
                language
            );

            console.log(`✅ Action executed: ${pendingAction.actionType}`);

            return res.status(200).json({
                success: true,
                executed: true,
                actionType: pendingAction.actionType,
                result: result,
                message: successMessage
            });

        } catch (error) {
            console.error('❌ Action execution error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to execute action',
                error: error.message
            });
        }
    }

    /**
     * Execute sale addition
     */
    async executeSale(userId, data) {
        // Get cost per unit from inventory for each item
        const itemsWithCost = await Promise.all(data.items.map(async (item) => {
            const inventoryItem = await Inventory.findOne({
                user_id: userId,
                item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') }
            });

            if (!inventoryItem) {
                throw new Error(`Item "${item.item_name}" not found in inventory`);
            }

            // Check sufficient stock
            if (inventoryItem.stock_qty < item.quantity) {
                throw new Error(`Insufficient stock for "${item.item_name}". Available: ${inventoryItem.stock_qty}, Requested: ${item.quantity}`);
            }

            return {
                item_name: item.item_name,
                quantity: item.quantity,
                price_per_unit: item.price_per_unit, // Selling price from user
                cost_per_unit: inventoryItem.price_per_unit // Cost price from inventory (COGS)
            };
        }));

        const sale = await Sale.create({
            user_id: userId,
            items: itemsWithCost,
            payment_method: data.payment_method || 'Cash',
            customer_name: data.customer_name || 'Walk-in Customer',
            date: new Date()
        });

        // Update inventory stock
        for (const item of itemsWithCost) {
            await Inventory.findOneAndUpdate(
                { user_id: userId, item_name: { $regex: new RegExp(`^${item.item_name}$`, 'i') } },
                { $inc: { stock_qty: -item.quantity } }
            );
        }

        return { saleId: sale._id, totalAmount: sale.total_amount };
    }

    /**
     * Execute expense addition
     */
    async executeExpense(userId, data) {
        const expense = await Expense.create({
            user_id: userId,
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: new Date()
        });

        return { expenseId: expense._id, amount: expense.amount };
    }

    /**
     * Execute inventory update
     */
    async executeInventoryUpdate(userId, data) {
        const inventory = await Inventory.findOne({
            user_id: userId,
            item_name: { $regex: new RegExp(`^${data.item_name}$`, 'i') }
        });

        if (!inventory) {
            throw new Error(`Item "${data.item_name}" not found in inventory`);
        }

        const updateData = { $inc: { stock_qty: data.stock_qty } };
        if (data.price_per_unit) {
            updateData.price_per_unit = data.price_per_unit;
        }

        const updated = await Inventory.findOneAndUpdate(
            { user_id: userId, item_name: { $regex: new RegExp(`^${data.item_name}$`, 'i') } },
            updateData,
            { new: true }
        );

        return { itemName: updated.item_name, newStock: updated.stock_qty };
    }

    /**
     * Execute inventory addition
     */
    async executeInventoryAdd(userId, data) {
        const inventory = await Inventory.create({
            user_id: userId,
            item_name: data.item_name,
            stock_qty: data.stock_qty || 0,
            price_per_unit: data.price_per_unit || 0,
            category: data.category || 'Other'
        });

        return { itemName: inventory.item_name, stock: inventory.stock_qty };
    }

    /**
     * Generate success message
     */
    generateSuccessMessage(actionType, result, language) {
        const messages = {
            add_sale: {
                en: `✅ Sale recorded successfully! Total: ₹${result.totalAmount}`,
                hi: `✅ बिक्री सफलतापूर्वक दर्ज की गई! कुल: ₹${result.totalAmount}`,
                te: `✅ అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది! మొత్తం: ₹${result.totalAmount}`
            },
            add_expense: {
                en: `✅ Expense recorded successfully! Amount: ₹${result.amount}`,
                hi: `✅ खर्च सफलतापूर्वक दर्ज किया गया! राशि: ₹${result.amount}`,
                te: `✅ ఖర్చు విజయవంతంగా రికార్డ్ చేయబడింది! మొత్తం: ₹${result.amount}`
            },
            update_inventory: {
                en: `✅ Stock updated! ${result.itemName}: ${result.newStock} units`,
                hi: `✅ स्टॉक अपडेट किया गया! ${result.itemName}: ${result.newStock} इकाइयाँ`,
                te: `✅ స్టాక్ నవీకరించబడింది! ${result.itemName}: ${result.newStock} యూనిట్లు`
            },
            add_inventory: {
                en: `✅ Item added successfully! ${result.itemName}: ${result.stock} units`,
                hi: `✅ आइटम सफलतापूर्वक जोड़ा गया! ${result.itemName}: ${result.stock} इकाइयाँ`,
                te: `✅ వస్తువు విజయవంతంగా జోడించబడింది! ${result.itemName}: ${result.stock} యూనిట్లు`
            }
        };

        return messages[actionType][language] || messages[actionType].en;
    }

    /**
     * Clear expired confirmations (run periodically)
     */
    clearExpiredConfirmations() {
        const now = Date.now();
        const expiryTime = 5 * 60 * 1000; // 5 minutes

        for (const [id, confirmation] of pendingConfirmations.entries()) {
            if (now - confirmation.timestamp > expiryTime) {
                pendingConfirmations.delete(id);
                console.log(`🧹 Cleared expired confirmation: ${id}`);
            }
        }
    }
}

// Clear expired confirmations every 2 minutes
setInterval(() => {
    const controller = new ConversationalActionController();
    controller.clearExpiredConfirmations();
}, 2 * 60 * 1000);

module.exports = new ConversationalActionController();
