const geminiService = require('./geminiService');
const Inventory = require('../models/Inventory');
const CustomerRequest = require('../models/CustomerRequest');
const CustomerUser = require('../models/CustomerUser');
const User = require('../models/User');
const Notification = require('../models/Notification');

// In-memory storage for pending orders (in production, use Redis)
const pendingOrders = new Map();

/**
 * Customer Chatbot Service
 * Handles all customer-side chatbot interactions for ordering
 * Supports dish-based ordering, grocery lists, and mixed requests
 */
class CustomerChatbotService {
  constructor() {
    this.systemPrompt = `You are BizNova, an AI shopping assistant for Indian kirana stores.
    
Your purpose is to help customers order groceries and ingredients for cooking.

CAPABILITIES:
1. Understand dish requests and generate ingredient lists with realistic quantities
2. Parse direct grocery lists with items and quantities
3. Handle mixed requests (dishes + specific groceries)
4. Support multiple languages (English, Hindi, Telugu, Tamil, etc.)
5. Provide conversational, friendly service

RESPONSE FORMAT:
Always respond in JSON format:
{
  "intent": "dish_order | grocery_order | mixed_order | unclear",
  "items": [
    {
      "item_name": "string",
      "quantity": number,
      "unit": "kg | litres | pieces | packets | etc",
      "confidence": "high | medium | low"
    }
  ],
  "dish_name": "string (if dish order)",
  "servings": number (if dish order),
  "message": "string (friendly response to customer)",
  "questions": ["string"] (if clarification needed),
  "alternatives": ["string"] (for unavailable items)
}

EXAMPLES:
Input: "I want to make vegetable curry for 4 people"
Output: {"intent": "dish_order", "dish_name": "vegetable curry", "servings": 4, "items": [{"item_name": "onions", "quantity": 500, "unit": "grams", "confidence": "high"}, ...]}

Input: "Buy 2 kg rice, 1 litre milk, onions"
Output: {"intent": "grocery_order", "items": [{"item_name": "rice", "quantity": 2, "unit": "kg", "confidence": "high"}, ...]}

Be helpful, ask clarifying questions when needed, and always maintain a friendly tone.`;
  }

  /**
   * Process customer message and generate response
   */
  async processMessage(message, customerId, retailerId, language = 'en') {
    try {
      // Check if this is an order confirmation
      const isConfirmation = ['yes', 'confirm', 'ok', 'proceed', 'हाँ', 'ఓకే'].some(
        word => message.toLowerCase().trim() === word
      );

      if (isConfirmation) {
        // Check for pending order
        const orderKey = `${customerId}_${retailerId}`;
        const pendingOrder = pendingOrders.get(orderKey);

        if (pendingOrder && pendingOrder.items && pendingOrder.items.length > 0) {
          // Create the order
          const orderResult = await this.confirmPendingOrder(customerId, retailerId, pendingOrder);
          
          // Clear pending order
          pendingOrders.delete(orderKey);
          
          return orderResult;
        } else {
          return {
            intent: 'no_pending_order',
            message: "I don't have any pending order for you. Please tell me what you'd like to order first.",
            items: [],
            can_order: false
          };
        }
      }

      // Get retailer's inventory for context
      const inventory = await Inventory.find({ user_id: retailerId });
      const availableItems = inventory.map(item => item.item_name.toLowerCase());

      // Build context-aware prompt
      const contextPrompt = this.buildContextPrompt(message, availableItems, language);
      
      // Get AI response
      const aiResponse = await geminiService.generateResponse(contextPrompt);
      
      // Parse AI response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        parsedResponse = this.fallbackResponse(message, availableItems);
      }

      // Check item availability
      const availabilityCheck = await this.checkItemAvailability(parsedResponse.items, inventory);
      
      // Store pending order if items are available
      if (availabilityCheck.available.length > 0) {
        const orderKey = `${customerId}_${retailerId}`;
        const totalAmount = availabilityCheck.available.reduce((sum, item) => sum + item.total_price, 0);
        
        pendingOrders.set(orderKey, {
          items: availabilityCheck.available,
          totalAmount: totalAmount,
          timestamp: Date.now()
        });
        
        console.log(`🛒 Stored pending order for ${orderKey}: ${availabilityCheck.available.length} items, ₹${totalAmount}`);
      }
      
      // Build final response
      const finalResponse = {
        ...parsedResponse,
        availability: availabilityCheck,
        can_order: availabilityCheck.available.length > 0,
        message: this.buildCustomerMessage(parsedResponse, availabilityCheck, language)
      };

      return finalResponse;

    } catch (error) {
      console.error('Chatbot processing error:', error);
      return {
        intent: 'error',
        message: 'Sorry, I had trouble understanding that. Could you please try again?',
        items: [],
        can_order: false
      };
    }
  }

  /**
   * Confirm and create order from pending items
   */
  async confirmPendingOrder(customerId, retailerId, pendingOrder) {
    try {
      const customer = await CustomerUser.findById(customerId);
      const retailer = await User.findById(retailerId);

      if (!customer || !retailer) {
        throw new Error('Customer or retailer not found');
      }

      // Format items for the order
      const orderItems = pendingOrder.items.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        price_per_unit: item.price_per_unit,
        total_price: item.total_price
      }));

      // Create customer request
      const orderRequest = new CustomerRequest({
        customer_id: customerId,
        retailer_id: retailerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        items: orderItems,
        notes: 'Order placed via AI chatbot',
        status: 'pending',
        total_amount: pendingOrder.totalAmount
      });

      await orderRequest.save();

      // Create notification for retailer
      const notification = new Notification({
        user_id: retailerId,
        user_type: 'retailer',
        user_type_ref: 'User',
        type: 'new_request',
        title: 'New Order Received',
        message: `${customer.name} placed an order for ₹${pendingOrder.totalAmount} (${orderItems.length} items)`,
        request_id: orderRequest._id,
        is_read: false
      });

      await notification.save();
      console.log(`✅ Order confirmed and notification sent to ${retailer.shop_name}`);

      return {
        intent: 'order_confirmed',
        success: true,
        message: `Order placed successfully!\n\nTotal: ₹${pendingOrder.totalAmount}\nItems: ${orderItems.length}\n\n${retailer.shop_name} will contact you soon.`,
        order_id: orderRequest._id,
        total_amount: pendingOrder.totalAmount,
        items: orderItems,
        can_order: false
      };

    } catch (error) {
      console.error('Order confirmation error:', error);
      throw error;
    }
  }

  /**
   * Build context-aware prompt for AI
   */
  buildContextPrompt(message, availableItems, language) {
    const languageMap = {
      'en': 'English',
      'hi': 'Hindi',
      'te': 'Telugu',
      'ta': 'Tamil',
      'kn': 'Kannada'
    };

    return `${this.systemPrompt}

AVAILABLE ITEMS IN STORE:
${availableItems.join(', ')}

CUSTOMER LANGUAGE: ${languageMap[language] || 'English'}

CUSTOMER MESSAGE: "${message}"

Analyze the customer's request and respond in the specified JSON format.
Consider what items are available in the store when generating responses.
If requested items are not available, suggest alternatives from the available items.`;
  }

  /**
   * Check item availability against inventory
   */
  async checkItemAvailability(requestedItems, inventory) {
    const available = [];
    const unavailable = [];
    const lowStock = [];

    for (const requestedItem of requestedItems) {
      const inventoryItem = inventory.find(
        item => item.item_name.toLowerCase() === requestedItem.item_name.toLowerCase()
      );

      if (!inventoryItem) {
        unavailable.push({
          ...requestedItem,
          alternatives: this.findAlternatives(requestedItem.item_name, inventory)
        });
      } else if (inventoryItem.stock_qty < requestedItem.quantity) {
        lowStock.push({
          ...requestedItem,
          available_quantity: inventoryItem.stock_qty,
          price_per_unit: inventoryItem.price_per_unit
        });
      } else {
        available.push({
          ...requestedItem,
          price_per_unit: inventoryItem.price_per_unit,
          total_price: inventoryItem.price_per_unit * requestedItem.quantity
        });
      }
    }

    return { available, unavailable, lowStock };
  }

  /**
   * Find alternative items for unavailable products
   */
  findAlternatives(requestedItem, inventory) {
    const itemName = requestedItem.toLowerCase();
    const availableItems = inventory.filter(item => item.stock_qty > 0);
    
    // Simple matching logic - can be enhanced with AI
    const alternatives = availableItems
      .filter(item => 
        item.item_name.toLowerCase().includes(itemName.split(' ')[0]) ||
        item.item_name.toLowerCase().includes(itemName.slice(-3))
      )
      .slice(0, 3)
      .map(item => item.item_name);

    return alternatives.length > 0 ? alternatives : ['Check with store for alternatives'];
  }

  /**
   * Build customer-friendly message
   */
  buildCustomerMessage(response, availability, language) {
    const messages = {
      'en': {
        available: 'Great! I found these items in stock:',
        unavailable: 'These items are not available:',
        lowStock: 'These items have limited stock:',
        alternatives: 'Would you like these alternatives instead?',
        nextStep: 'Would you like me to add the available items to your cart?'
      },
      'hi': {
        available: 'बढ़िया! मैंने ये आइटम्स स्टॉक में पाए:',
        unavailable: 'ये आइटम्स उपलब्ध नहीं हैं:',
        lowStock: 'इन आइटम्स की सीमित मात्रा है:',
        alternatives: 'क्या आप इन विकल्पों को चुनना चाहेंगे?',
        nextStep: 'क्या मैं उपलब्ध आइटम्स को आपके कार्ट में डाल दूँ?'
      }
    };

    const lang = messages[language] || messages['en'];
    let message = '';

    if (availability.available.length > 0) {
      message += `${lang.available}\n`;
      message += availability.available.map(item => 
        `• ${item.item_name} (${item.quantity} ${item.unit}) - ₹${item.total_price}`
      ).join('\n');
    }

    if (availability.unavailable.length > 0) {
      message += `\n\n${lang.unavailable}\n`;
      message += availability.unavailable.map(item => 
        `• ${item.item_name} (${item.quantity} ${item.unit})`
      ).join('\n');
      
      if (availability.unavailable.some(item => item.alternatives.length > 0)) {
        message += `\n\n${lang.alternatives}\n`;
        availability.unavailable.forEach(item => {
          if (item.alternatives.length > 0) {
            message += `• Instead of ${item.item_name}: ${item.alternatives.join(', ')}\n`;
          }
        });
      }
    }

    if (availability.lowStock.length > 0) {
      message += `\n\n${lang.lowStock}\n`;
      message += availability.lowStock.map(item => 
        `• ${item.item_name}: Only ${item.available_quantity} ${item.unit} available`
      ).join('\n');
    }

    if (availability.available.length > 0) {
      message += `\n\n${lang.nextStep}`;
    }

    return message;
  }

  /**
   * Fallback response for AI parsing failures
   */
  fallbackResponse(message, availableItems) {
    // Simple keyword-based fallback
    const keywords = {
      rice: { quantity: 1, unit: 'kg' },
      milk: { quantity: 1, unit: 'litre' },
      oil: { quantity: 1, unit: 'litre' },
      onion: { quantity: 500, unit: 'grams' },
      tomato: { quantity: 500, unit: 'grams' }
    };

    const items = [];
    const lowerMessage = message.toLowerCase();

    Object.keys(keywords).forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        const item = availableItems.find(item => 
          item.toLowerCase().includes(keyword)
        );
        if (item) {
          items.push({
            item_name: item,
            quantity: keywords[keyword].quantity,
            unit: keywords[keyword].unit,
            confidence: 'low'
          });
        }
      }
    });

    return {
      intent: items.length > 0 ? 'grocery_order' : 'unclear',
      items,
      message: items.length > 0 ? 
        'I found some items you might want. Please confirm if this looks right.' :
        'I\'m not sure what you\'re looking for. Could you tell me more specifically?',
      questions: items.length === 0 ? ['What would you like to order?'] : []
    };
  }

  /**
   * Create customer request from confirmed items
   */
  async createOrder(customerId, retailerId, confirmedItems, notes = '') {
    try {
      // Calculate total and validate availability one more time
      const inventory = await Inventory.find({ user_id: retailerId });
      const orderItems = [];
      let subtotal = 0;

      for (const item of confirmedItems) {
        const inventoryItem = inventory.find(
          inv => inv.item_name.toLowerCase() === item.item_name.toLowerCase()
        );

        if (inventoryItem && inventoryItem.stock_qty >= item.quantity) {
          orderItems.push({
            item_name: item.item_name,
            quantity: item.quantity,
            price_per_unit: inventoryItem.price_per_unit,
            total_price: inventoryItem.price_per_unit * item.quantity
          });
          subtotal += inventoryItem.price_per_unit * item.quantity;
        }
      }

      if (orderItems.length === 0) {
        throw new Error('No items available for ordering');
      }

      // Create customer request
      const customerRequest = new CustomerRequest({
        customer_id: customerId,
        retailer_id: retailerId,
        items: orderItems,
        notes: notes || 'Order placed via AI chatbot',
        status: 'pending'
      });

      // Calculate bill
      customerRequest.calculateBill();

      await customerRequest.save();

      return {
        success: true,
        order_id: customerRequest._id,
        total: customerRequest.bill_details.total,
        items_count: orderItems.length,
        message: 'Order placed successfully! The retailer will process your order soon.'
      };

    } catch (error) {
      console.error('Order creation error:', error);
      return {
        success: false,
        message: 'Failed to place order. Please try again.',
        error: error.message
      };
    }
  }
}

module.exports = new CustomerChatbotService();
