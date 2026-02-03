const geminiService = require('./geminiService');
const Inventory = require('../models/Inventory');
const CustomerRequest = require('../models/CustomerRequest');
const CustomerUser = require('../models/CustomerUser');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { normalize, isValidQuantity, normalizeQuantity } = require('../utils/quantityHelper');

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
1. Understand dish requests and generate ONLY the most ESSENTIAL ingredient lists
2. Parse direct grocery lists with items and quantities (supports fractional quantities)
3. Handle mixed requests (dishes + specific groceries)
4. Support multiple languages (English, Hindi, Telugu, Tamil, etc.)
5. Provide conversational, friendly service

FRACTIONAL QUANTITY SUPPORT:
- Rice, Dal, Sugar, Flour → measured in KG (supports 0.5 kg, 2.5 kg, etc.)
- Oil, Milk, Juice → measured in LITRES (supports 0.5 L, 1.5 L, etc.)
- Eggs, Bottles, Packets → measured in PIECES (whole numbers only)
- When customer says "500 grams", convert to 0.5 kg
- When customer says "250ml", convert to 0.25 litres

ULTRA-STRICT RULES FOR DISH ORDERS:
- ONLY include ingredients that are ABSOLUTELY ESSENTIAL for the dish
- MAXIMUM 3-4 ingredients per dish unless specifically requested otherwise
- DO NOT add spices, seasonings, or condiments unless explicitly mentioned
- DO NOT add garnishes, optional items, or "nice-to-have" ingredients
- DO NOT add salt, pepper, or any spices unless the customer specifically asks
- Focus ONLY on the main ingredients that make the dish what it is
- If unsure whether an ingredient is essential, DON'T include it
- Better to suggest too few items than too many irrelevant ones

RESPONSE FORMAT:
Always respond in JSON format:
{
  "intent": "dish_order | grocery_order | mixed_order | item_removal | unclear",
  "items": [
    {
      "item_name": "string (exact name, commonly used)",
      "quantity": number (supports decimals: 0.5, 2.5, etc.),
      "unit": "kg | litre | piece",
      "confidence": "high | medium | low",
      "essential": boolean (true for must-have ingredients)
    }
  ],
  "dish_name": "string (if dish order)",
  "servings": number (if dish order),
  "message": "string (friendly response to customer)",
  "questions": ["string"] (if clarification needed),
  "alternatives": ["string"] (for unavailable items),
  "removable_items": ["string"] (items customer can remove)
}

QUANTITY EXAMPLES:
- "500 grams rice" → {"item_name": "rice", "quantity": 0.5, "unit": "kg"}
- "2.5 kg sugar" → {"item_name": "sugar", "quantity": 2.5, "unit": "kg"}
- "1.5 litres oil" → {"item_name": "oil", "quantity": 1.5, "unit": "litre"}
- "6 eggs" → {"item_name": "eggs", "quantity": 6, "unit": "piece"}

ULTRA-MINIMAL DISH GUIDELINES (ONLY CORE INGREDIENTS):
- Chicken Curry: chicken (0.5-1 kg), onions (0.25 kg), tomatoes (0.2 kg) - ONLY these 3
- Rice: rice (0.5-1 kg per 4 people) - ONLY rice
- Dal: dal (0.25 kg), onions (0.1 kg) - ONLY these 2
- Biryani: rice (1 kg), chicken/vegetables (0.5 kg) - ONLY these 2
- Roti/Chapati: wheat flour (0.5 kg) - ONLY flour
- Egg Curry: eggs (6 pieces), onions (0.2 kg) - ONLY these 2

CRITICAL: 
- Use fractional quantities for kg and litres
- Use whole numbers for pieces
- When in doubt, include FEWER items, not more
- Always normalize quantities (500g → 0.5kg, 250ml → 0.25L)`;
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

      // Check if this is an item removal request
      const isRemovalRequest = this.detectItemRemoval(message);
      if (isRemovalRequest.isRemoval) {
        return await this.handleItemRemoval(customerId, retailerId, isRemovalRequest.itemsToRemove, language);
      }

      // Check if this is a new dish request (clear previous context)
      const isDishRequest = this.isDishRequest(message);
      if (isDishRequest) {
        // Clear any previous pending orders for fresh context
        const orderKey = `${customerId}_${retailerId}`;
        pendingOrders.delete(orderKey);
        console.log(`🔄 New dish request detected, cleared previous context for ${orderKey}`);
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
        // Apply intelligent filtering to ensure TOP 3 items only
        parsedResponse = this.intelligentlyFilterSuggestions(parsedResponse, parsedResponse.dish_name);
        // Final safety check: Hard limit to 3 items
        if (parsedResponse.items && parsedResponse.items.length > 3) {
          parsedResponse.items = parsedResponse.items.slice(0, 3);
          parsedResponse.message = `Here are the TOP 3 most essential ingredients:`;
        }
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
   * Detect if message is requesting item removal
   */
  detectItemRemoval(message) {
    const removalKeywords = [
      'remove', 'delete', 'take out', 'don\'t want', 'cancel', 'drop',
      'हटा', 'निकाल', 'रद्द', 'తీసివేయి', 'రద్దు', 'நீக்கு', 'ರದ್ದುಮಾಡು'
    ];

    const lowerMessage = message.toLowerCase();
    const hasRemovalKeyword = removalKeywords.some(keyword => lowerMessage.includes(keyword));

    if (!hasRemovalKeyword) {
      return { isRemoval: false, itemsToRemove: [] };
    }

    // Extract item names from the message
    const commonItems = [
      'rice', 'milk', 'oil', 'onion', 'tomato', 'potato', 'chicken', 'dal', 'sugar', 'salt',
      'bread', 'egg', 'butter', 'cheese', 'flour', 'spices', 'garlic', 'ginger', 'lemon',
      'चावल', 'दूध', 'तेल', 'प्याज', 'टमाटर', 'आलू', 'चिकन', 'दाल', 'चीनी', 'नमक',
      'అన్నం', 'పాలు', 'నూనె', 'ఉల్లిపాయ', 'టమాట', 'బంగాళాదుంప', 'చికెన్', 'పప్పు'
    ];

    const itemsToRemove = [];
    commonItems.forEach(item => {
      if (lowerMessage.includes(item)) {
        itemsToRemove.push(item);
      }
    });

    return { isRemoval: true, itemsToRemove };
  }

  /**
   * Handle item removal from pending order
   */
  async handleItemRemoval(customerId, retailerId, itemsToRemove, language) {
    const orderKey = `${customerId}_${retailerId}`;
    const pendingOrder = pendingOrders.get(orderKey);

    if (!pendingOrder || !pendingOrder.items || pendingOrder.items.length === 0) {
      return {
        intent: 'no_pending_order',
        message: "You don't have any pending order to modify. Please place an order first.",
        items: [],
        can_order: false
      };
    }

    let removedItems = [];
    let updatedItems = [...pendingOrder.items];

    // Remove items that match the removal request
    itemsToRemove.forEach(itemToRemove => {
      const itemIndex = updatedItems.findIndex(item => 
        item.item_name.toLowerCase().includes(itemToRemove.toLowerCase())
      );
      
      if (itemIndex !== -1) {
        removedItems.push(updatedItems[itemIndex]);
        updatedItems.splice(itemIndex, 1);
      }
    });

    if (removedItems.length === 0) {
      return {
        intent: 'item_not_found',
        message: "I couldn't find those items in your current order. Here's what you have:\n" + 
                 pendingOrder.items.map(item => `• ${item.item_name} (${item.quantity} ${item.unit})`).join('\n'),
        items: pendingOrder.items,
        can_order: true
      };
    }

    // Update pending order
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    if (updatedItems.length === 0) {
      // All items removed
      pendingOrders.delete(orderKey);
      return {
        intent: 'order_cancelled',
        message: "All items have been removed from your order. Your order has been cancelled.",
        items: [],
        can_order: false
      };
    } else {
      // Update pending order
      pendingOrders.set(orderKey, {
        items: updatedItems,
        totalAmount: newTotalAmount,
        timestamp: Date.now()
      });

      return {
        intent: 'items_removed',
        message: `Removed: ${removedItems.map(item => item.item_name).join(', ')}\n\n` +
                 `Updated order:\n${updatedItems.map(item => 
                   `• ${item.item_name} (${item.quantity} ${item.unit}) - ₹${item.total_price}`
                 ).join('\n')}\n\nTotal: ₹${newTotalAmount}\n\nReply 'yes' to confirm this updated order.`,
        items: updatedItems,
        availability: {
          available: updatedItems,
          unavailable: [],
          lowStock: []
        },
        can_order: true,
        totalAmount: newTotalAmount
      };
    }
  }

  /**
   * Detect if message is a new dish request
   */
  isDishRequest(message) {
    const dishKeywords = [
      'curry', 'rice', 'dal', 'biryani', 'fish', 'chicken', 'mutton', 'egg', 'vegetable',
      'make', 'cook', 'prepare', 'want', 'need', 'order',
      'करी', 'चावल', 'दाल', 'बिरयानी', 'मछली', 'चिकन', 'मटन', 'अंडा', 'सब्जी',
      'కర్రీ', 'అన్నం', 'పప్పు', 'బిర్యానీ', 'చేప', 'చికెన్', 'మటన్', 'గుడ్డు', 'కూరగాయలు'
    ];

    const lowerMessage = message.toLowerCase();
    return dishKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Build context-aware prompt for AI with inventory analysis
   */
  buildContextPrompt(message, availableItems, language) {
    const languageMap = {
      'en': 'English',
      'hi': 'Hindi',
      'te': 'Telugu',
      'ta': 'Tamil',
      'kn': 'Kannada'
    };

    // Ultra-strict system prompt for TOP 3 items only - FRESH CONTEXT EACH TIME
    const strictPrompt = `You are BizNova, an AI shopping assistant. This is a FRESH REQUEST - ignore any previous conversations.

ULTRA-STRICT RULES FOR THIS SPECIFIC REQUEST:
1. MAXIMUM 3 ITEMS ONLY - Never suggest more than 3 items
2. ONLY suggest items that are ACTUALLY AVAILABLE in the inventory below
3. ONLY suggest items that are DIRECTLY RELATED to the specific dish requested in this message
4. RANK by importance and select ONLY the TOP 3 most essential ones for THIS SPECIFIC DISH
5. Use EXACT inventory item names (not generic names)
6. IGNORE any previous requests - focus ONLY on this current message

DISH-SPECIFIC TOP 3 SELECTION FOR THIS REQUEST:
- If Chicken Curry: 1) Chicken (any type), 2) Onions (any type), 3) Tomatoes (any type)
- If Vegetable Curry: 1) Main vegetable mentioned, 2) Onions, 3) Tomatoes
- If Dal: 1) Dal/Lentils (any type), 2) Onions, 3) Stop (only 2 items needed)
- If Fish Curry: 1) Fish (any type), 2) Onions, 3) Tomatoes
- If Egg Curry: 1) Eggs, 2) Onions, 3) Stop (only 2 items needed)
- If Rice: 1) Rice (any type), 2) Stop (only 1 item needed)
- If Biryani: 1) Rice, 2) Meat/Vegetables, 3) Onions

CRITICAL SELECTION PROCESS FOR THIS REQUEST:
1. Read the current message: "${message}"
2. Identify what dish is being requested in THIS message
3. Look at the inventory list below
4. Find ONLY the TOP 3 most essential ingredients for THAT SPECIFIC DISH
5. Select ONLY those items that exist in the inventory
6. Use exact inventory names
7. STOP at 3 items maximum

RESPONSE FORMAT: JSON with MAXIMUM 3 items, using exact inventory names

AVAILABLE INVENTORY ITEMS FOR THIS REQUEST:
${availableItems.join(', ')}

CUSTOMER LANGUAGE: ${languageMap[language] || 'English'}
CURRENT CUSTOMER MESSAGE (IGNORE ALL PREVIOUS): "${message}"

CRITICAL: This is a fresh request. Give me ONLY the TOP 3 most essential items from the inventory above that match the dish mentioned in this specific message: "${message}"`;

    return strictPrompt;
  }

  /**
   * Intelligently filter AI suggestions to ensure ONLY TOP 3 items for the CURRENT dish
   */
  intelligentlyFilterSuggestions(aiResponse, dishName) {
    if (!aiResponse.items || aiResponse.items.length === 0) {
      return aiResponse;
    }

    // Extract the actual dish from the current request (not previous ones)
    const currentDish = dishName ? dishName.toLowerCase().trim() : '';
    
    // Define TOP 3 essential ingredients for each dish type
    const dishTop3 = {
      'chicken curry': ['chicken', 'onion', 'tomato'],
      'vegetable curry': ['vegetable', 'onion', 'tomato'],
      'dal': ['dal', 'lentil', 'onion'], // Only top 2 for dal
      'fish curry': ['fish', 'onion', 'tomato'],
      'egg curry': ['egg', 'onion'], // Only top 2 for egg curry
      'mutton curry': ['mutton', 'goat', 'onion', 'tomato'],
      'rice': ['rice'], // Only 1 for rice
      'biryani': ['rice', 'chicken', 'mutton', 'vegetable', 'onion']
    };

    // Get the essential ingredients for the current dish
    const topEssentials = dishTop3[currentDish] || ['onion', 'tomato', 'vegetable'];

    // ULTRA-STRICT: Select ONLY the most relevant items for THIS specific dish
    const top3Items = [];
    const usedCategories = new Set();

    // First pass: Match items to top essential categories in priority order
    for (const essential of topEssentials) {
      if (top3Items.length >= 3) break; // Hard limit of 3 items
      
      for (const item of aiResponse.items) {
        const itemName = item.item_name.toLowerCase();
        
        // Only add if it matches the essential category and we haven't used this category
        if (itemName.includes(essential) && !usedCategories.has(essential)) {
          top3Items.push({
            ...item,
            reason: `Essential ${essential} for ${currentDish || 'this dish'}`
          });
          usedCategories.add(essential);
          break; // Only one item per category
        }
      }
    }

    // Ensure we don't exceed 3 items and items are relevant to the current dish
    const finalItems = top3Items.slice(0, 3);

    // Additional validation: Remove items that don't make sense for the current dish
    const validatedItems = finalItems.filter(item => {
      const itemName = item.item_name.toLowerCase();
      
      // If it's a chicken dish, don't include fish or mutton
      if (currentDish.includes('chicken') && (itemName.includes('fish') || itemName.includes('mutton'))) {
        return false;
      }
      
      // If it's a fish dish, don't include chicken or mutton
      if (currentDish.includes('fish') && (itemName.includes('chicken') || itemName.includes('mutton'))) {
        return false;
      }
      
      // If it's a vegetarian dish, don't include meat
      if (currentDish.includes('vegetable') && (itemName.includes('chicken') || itemName.includes('fish') || itemName.includes('mutton'))) {
        return false;
      }
      
      return true;
    });

    return {
      ...aiResponse,
      items: validatedItems,
      message: `Here are the TOP ${validatedItems.length} most essential ingredients for ${currentDish || 'your dish'}:`
    };
  }

  /**
   * Check item availability against inventory with smart matching
   */
  async checkItemAvailability(requestedItems, inventory) {
    const available = [];
    const unavailable = [];
    const lowStock = [];

    for (const requestedItem of requestedItems) {
      // Normalize quantity if needed (convert grams to kg, ml to litres)
      let normalizedQty = requestedItem.quantity;
      let normalizedUnit = requestedItem.unit;
      
      // Convert grams to kg
      if (requestedItem.unit === 'grams' || requestedItem.unit === 'gram' || requestedItem.unit === 'g') {
        normalizedQty = normalize(requestedItem.quantity / 1000);
        normalizedUnit = 'kg';
      }
      
      // Convert ml to litres
      if (requestedItem.unit === 'ml' || requestedItem.unit === 'milliliters') {
        normalizedQty = normalize(requestedItem.quantity / 1000);
        normalizedUnit = 'litre';
      }
      
      // Validate normalized quantity
      if (!isValidQuantity(normalizedQty)) {
        console.warn(`Invalid quantity for ${requestedItem.item_name}: ${normalizedQty}`);
        normalizedQty = 1; // Default to 1
      }
      
      // Try exact match first
      let inventoryItem = inventory.find(
        item => item.item_name.toLowerCase() === requestedItem.item_name.toLowerCase()
      );

      // If no exact match, try partial matching for similar items
      if (!inventoryItem) {
        inventoryItem = inventory.find(item => {
          const itemName = item.item_name.toLowerCase();
          const requestedName = requestedItem.item_name.toLowerCase();
          
          // Check if inventory item contains the requested item name or vice versa
          return itemName.includes(requestedName) || requestedName.includes(itemName);
        });
      }

      if (!inventoryItem) {
        unavailable.push({
          ...requestedItem,
          quantity: normalizedQty,
          unit: normalizedUnit,
          alternatives: this.findAlternatives(requestedItem.item_name, inventory)
        });
      } else if (inventoryItem.stock_qty < normalizedQty) {
        lowStock.push({
          ...requestedItem,
          quantity: normalizedQty,
          unit: normalizedUnit,
          available_quantity: inventoryItem.stock_qty,
          price_per_unit: inventoryItem.selling_price || inventoryItem.price_per_unit,
          inventory_id: inventoryItem._id
        });
      } else {
        available.push({
          ...requestedItem,
          quantity: normalizedQty,
          unit: normalizedUnit,
          price_per_unit: inventoryItem.selling_price || inventoryItem.price_per_unit,
          total_price: normalize((inventoryItem.selling_price || inventoryItem.price_per_unit) * normalizedQty),
          available: true,
          stock_available: inventoryItem.stock_qty,
          inventory_id: inventoryItem._id
        });
      }
    }

    return { available, unavailable, lowStock };
  }

  /**
   * Find alternative items for unavailable products with smart matching
   */
  findAlternatives(requestedItem, inventory) {
    const itemName = requestedItem.toLowerCase();
    const availableItems = inventory.filter(item => item.stock_qty > 0);
    
    // Enhanced matching logic for better alternatives
    const alternatives = [];
    
    // Category-based matching
    const categoryMatches = {
      'chicken': ['mutton', 'fish', 'egg', 'paneer'],
      'mutton': ['chicken', 'fish', 'egg'],
      'fish': ['chicken', 'mutton', 'egg'],
      'rice': ['wheat', 'flour', 'bread'],
      'onion': ['garlic', 'ginger', 'shallot'],
      'tomato': ['capsicum', 'carrot', 'potato'],
      'potato': ['tomato', 'carrot', 'capsicum'],
      'oil': ['ghee', 'butter'],
      'milk': ['curd', 'paneer', 'butter'],
      'dal': ['lentils', 'beans', 'chickpeas']
    };

    // First, try direct word matching
    availableItems.forEach(item => {
      const inventoryName = item.item_name.toLowerCase();
      if (inventoryName.includes(itemName) || itemName.includes(inventoryName)) {
        alternatives.push(item.item_name);
      }
    });

    // If no direct matches, try category-based alternatives
    if (alternatives.length === 0) {
      Object.keys(categoryMatches).forEach(category => {
        if (itemName.includes(category)) {
          categoryMatches[category].forEach(altCategory => {
            const altItem = availableItems.find(item => 
              item.item_name.toLowerCase().includes(altCategory)
            );
            if (altItem && !alternatives.includes(altItem.item_name)) {
              alternatives.push(altItem.item_name);
            }
          });
        }
      });
    }

    return alternatives.slice(0, 3); // Return max 3 alternatives
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
   * Fallback response for AI parsing failures - maximum 3 items
   */
  fallbackResponse(message, availableItems) {
    // Ultra-conservative keyword-based fallback - maximum 3 items
    const keywords = {
      rice: { quantity: 1, unit: 'kg', priority: 1 },
      chicken: { quantity: 500, unit: 'grams', priority: 1 },
      fish: { quantity: 500, unit: 'grams', priority: 1 },
      egg: { quantity: 6, unit: 'pieces', priority: 1 },
      dal: { quantity: 500, unit: 'grams', priority: 1 },
      onion: { quantity: 300, unit: 'grams', priority: 2 },
      tomato: { quantity: 200, unit: 'grams', priority: 3 }
    };

    const items = [];
    const lowerMessage = message.toLowerCase();

    // Add items based on priority and limit to 3
    const sortedKeywords = Object.entries(keywords).sort((a, b) => a[1].priority - b[1].priority);
    
    for (const [keyword, config] of sortedKeywords) {
      if (items.length >= 3) break; // Hard limit of 3 items
      
      if (lowerMessage.includes(keyword)) {
        const item = availableItems.find(item => 
          item.toLowerCase().includes(keyword)
        );
        if (item) {
          items.push({
            item_name: item,
            quantity: config.quantity,
            unit: config.unit,
            confidence: 'medium',
            essential: true
          });
        }
      }
    }

    return {
      intent: items.length > 0 ? 'grocery_order' : 'unclear',
      items: items,
      message: items.length > 0 ? 
        `I found these ${items.length} essential items you mentioned:` :
        'I\'m not sure what you\'re looking for. Could you tell me more specifically what items you need?',
      questions: items.length === 0 ? ['What specific items would you like to order?'] : []
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
          const sellingPrice = inventoryItem.selling_price || inventoryItem.price_per_unit;
          orderItems.push({
            item_name: item.item_name,
            quantity: item.quantity,
            price_per_unit: sellingPrice,
            total_price: sellingPrice * item.quantity
          });
          subtotal += sellingPrice * item.quantity;
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

  /**
   * Generate cooking recipe based on ingredients
   */
  async generateRecipe(ingredients, language = 'en') {
    try {
      const ingredientList = ingredients.toLowerCase();
      
      // Detect dish type based on ingredients
      let dishType = 'curry';
      let recipe = '';

      if (ingredientList.includes('rice')) {
        dishType = 'rice';
        recipe = this.getRiceRecipe(language);
      } else if (ingredientList.includes('dal') || ingredientList.includes('lentil')) {
        dishType = 'dal';
        recipe = this.getDalRecipe(language);
      } else if (ingredientList.includes('chicken')) {
        dishType = 'chicken curry';
        recipe = this.getChickenCurryRecipe(language);
      } else if (ingredientList.includes('egg')) {
        dishType = 'egg curry';
        recipe = this.getEggCurryRecipe(language);
      } else if (ingredientList.includes('fish')) {
        dishType = 'fish curry';
        recipe = this.getFishCurryRecipe(language);
      } else {
        recipe = this.getGenericCurryRecipe(language);
      }

      return recipe;

    } catch (error) {
      console.error('Recipe generation error:', error);
      return this.getGenericCurryRecipe(language);
    }
  }

  /**
   * Get rice cooking recipe
   */
  getRiceRecipe(language) {
    const recipes = {
      'en': `🍚 **How to Cook Perfect Rice**

**Ingredients:** Rice, Water

**Instructions:**
1. **Wash Rice:** Rinse rice 2-3 times until water runs clear
2. **Measure Water:** Use 1:2 ratio (1 cup rice : 2 cups water)
3. **Boil:** Bring water to boil in a heavy-bottomed pot
4. **Add Rice:** Add washed rice to boiling water
5. **Simmer:** Reduce heat to low, cover and cook for 15-20 minutes
6. **Rest:** Turn off heat, let it sit covered for 5 minutes
7. **Fluff:** Gently fluff with a fork before serving

⏰ **Total Time:** 25 minutes
👥 **Serves:** 4 people
💡 **Tip:** Don't lift the lid while cooking!`,

      'hi': `🍚 **परफेक्ट चावल कैसे बनाएं**

**सामग्री:** चावल, पानी

**विधि:**
1. **चावल धोएं:** चावल को 2-3 बार धोएं जब तक पानी साफ न हो जाए
2. **पानी नापें:** 1:2 का अनुपात (1 कप चावल : 2 कप पानी)
3. **उबालें:** भारी तले वाले बर्तन में पानी उबालें
4. **चावल डालें:** उबलते पानी में धुले चावल डालें
5. **धीमी आंच:** आंच धीमी करें, ढक कर 15-20 मिनट पकाएं
6. **आराम दें:** आंच बंद कर 5 मिनट ढक कर रखें
7. **फुलाएं:** कांटे से धीरे से फुलाकर परोसें

⏰ **कुल समय:** 25 मिनट
👥 **परोसता है:** 4 लोग`,

      'te': `🍚 **పర్ఫెక్ట్ అన్నం ఎలా వండాలి**

**పదార్థాలు:** అన్నం, నీరు

**విధానం:**
1. **అన్నం కడుక్కోవడం:** అన్నాన్ని 2-3 సార్లు కడిగి నీరు క్లియర్ అయ్యే వరకు
2. **నీరు కొలవడం:** 1:2 నిష్పత్తి (1 కప్పు అన్నం : 2 కప్పుల నీరు)
3. **మరిగించడం:** మందపాత్రలో నీరు మరిగించండి
4. **అన్నం వేయడం:** మరుగుతున్న నీటిలో కడిగిన అన్నం వేయండి
5. **మెల్లగా వండటం:** మంట తగ్గించి, మూత వేసి 15-20 నిమిషాలు వండండి
6. **విశ్రమించడం:** మంట ఆపి 5 నిమిషాలు మూత వేసి ఉంచండి
7. **కలపడం:** ఫోర్క్‌తో మెల్లగా కలిపి వడ్డించండి

⏰ **మొత్తం సమయం:** 25 నిమిషాలు
👥 **వడ్డిస్తుంది:** 4 మందికి`
    };

    return recipes[language] || recipes['en'];
  }

  /**
   * Get dal cooking recipe
   */
  getDalRecipe(language) {
    const recipes = {
      'en': `🥘 **How to Cook Dal (Lentils)**

**Ingredients:** Dal/Lentils, Onions, Tomatoes, Oil, Salt

**Instructions:**
1. **Wash Dal:** Rinse dal until water runs clear
2. **Boil Dal:** Cook dal with 3 cups water for 15-20 minutes until soft
3. **Heat Oil:** Heat 2 tbsp oil in a pan
4. **Cook Onions:** Add chopped onions, sauté until golden brown
5. **Add Tomatoes:** Add chopped tomatoes, cook until soft and mushy
6. **Combine:** Add cooked dal to onion-tomato mixture
7. **Season:** Add salt to taste, simmer for 5-10 minutes
8. **Serve:** Garnish with fresh herbs, serve hot with rice

⏰ **Total Time:** 30 minutes
👥 **Serves:** 4 people
💡 **Tip:** Add turmeric while boiling dal for color and flavor!`,

      'hi': `🥘 **दाल कैसे बनाएं**

**सामग्री:** दाल, प्याज, टमाटर, तेल, नमक

**विधि:**
1. **दाल धोएं:** दाल को साफ पानी आने तक धोएं
2. **दाल उबालें:** 3 कप पानी में 15-20 मिनट तक नरम होने तक उबालें
3. **तेल गरम करें:** पैन में 2 चम्मच तेल गरम करें
4. **प्याज पकाएं:** कटे प्याज डालकर सुनहरा होने तक भूनें
5. **टमाटर डालें:** कटे टमाटर डालकर नरम होने तक पकाएं
6. **मिलाएं:** उबली दाल को प्याज-टमाटर में मिलाएं
7. **नमक डालें:** स्वादानुसार नमक डालकर 5-10 मिनट पकाएं
8. **परोसें:** हरी धनिया से सजाकर चावल के साथ गरम परोसें

⏰ **कुल समय:** 30 मिनट
👥 **परोसता है:** 4 लोग`
    };

    return recipes[language] || recipes['en'];
  }

  /**
   * Get chicken curry recipe
   */
  getChickenCurryRecipe(language) {
    const recipes = {
      'en': `🍛 **How to Cook Chicken Curry**

**Ingredients:** Chicken, Onions, Tomatoes, Oil, Salt, Spices

**Instructions:**
1. **Prep Chicken:** Cut chicken into medium-sized pieces
2. **Heat Oil:** Heat 3 tbsp oil in a heavy-bottomed pan
3. **Cook Onions:** Add sliced onions, cook until golden brown
4. **Add Tomatoes:** Add chopped tomatoes, cook until soft and oil separates
5. **Add Chicken:** Add chicken pieces, cook on high heat for 5 minutes
6. **Add Water:** Add 1 cup water, bring to boil
7. **Simmer:** Cover and cook on medium heat for 20-25 minutes
8. **Season:** Add salt to taste, cook until chicken is tender
9. **Serve:** Garnish and serve hot with rice or bread

⏰ **Total Time:** 40 minutes
👥 **Serves:** 4 people
💡 **Tip:** Cook until chicken is fully tender and curry thickens!`,

      'hi': `🍛 **चिकन करी कैसे बनाएं**

**सामग्री:** चिकन, प्याज, टमाटर, तेल, नमक, मसाले

**विधि:**
1. **चिकन तैयार करें:** चिकन को मध्यम टुकड़ों में काटें
2. **तेल गरम करें:** भारी तले के पैन में 3 चम्मच तेल गरम करें
3. **प्याज पकाएं:** कटे प्याज डालकर सुनहरा होने तक भूनें
4. **टमाटर डालें:** कटे टमाटर डालकर नरम होने तक पकाएं
5. **चिकन डालें:** चिकन के टुकड़े डालकर तेज आंच पर 5 मिनट पकाएं
6. **पानी डालें:** 1 कप पानी डालकर उबाल लाएं
7. **धीमी आंच:** ढक कर मध्यम आंच पर 20-25 मिनट पकाएं
8. **नमक डालें:** स्वादानुसार नमक डालकर चिकन नरम होने तक पकाएं
9. **परोसें:** सजाकर चावल या रोटी के साथ गरम परोसें

⏰ **कुल समय:** 40 मिनट
👥 **परोसता है:** 4 लोग`
    };

    return recipes[language] || recipes['en'];
  }

  /**
   * Get egg curry recipe
   */
  getEggCurryRecipe(language) {
    const recipes = {
      'en': `🥚 **How to Cook Egg Curry**

**Ingredients:** Eggs, Onions, Tomatoes, Oil, Salt

**Instructions:**
1. **Boil Eggs:** Hard boil eggs for 8-10 minutes, cool and peel
2. **Heat Oil:** Heat 2 tbsp oil in a pan
3. **Cook Onions:** Add sliced onions, cook until golden brown
4. **Add Tomatoes:** Add chopped tomatoes, cook until soft
5. **Add Eggs:** Gently add peeled eggs to the curry
6. **Add Water:** Add 1/2 cup water, bring to simmer
7. **Season:** Add salt to taste, simmer for 10 minutes
8. **Serve:** Serve hot with rice or bread

⏰ **Total Time:** 25 minutes
👥 **Serves:** 4 people
💡 **Tip:** Be gentle with eggs to avoid breaking them!`
    };

    return recipes[language] || recipes['en'];
  }

  /**
   * Get fish curry recipe
   */
  getFishCurryRecipe(language) {
    const recipes = {
      'en': `🐟 **How to Cook Fish Curry**

**Ingredients:** Fish, Onions, Tomatoes, Oil, Salt

**Instructions:**
1. **Prep Fish:** Clean and cut fish into medium pieces
2. **Heat Oil:** Heat 3 tbsp oil in a pan
3. **Cook Onions:** Add sliced onions, cook until golden
4. **Add Tomatoes:** Add chopped tomatoes, cook until soft
5. **Add Fish:** Gently add fish pieces, cook for 3-4 minutes
6. **Add Water:** Add 1 cup water, bring to gentle boil
7. **Simmer:** Cook on low heat for 15 minutes
8. **Season:** Add salt to taste
9. **Serve:** Serve hot with rice

⏰ **Total Time:** 30 minutes
👥 **Serves:** 4 people
💡 **Tip:** Handle fish gently to keep pieces intact!`
    };

    return recipes[language] || recipes['en'];
  }

  /**
   * Get generic curry recipe
   */
  getGenericCurryRecipe(language) {
    const recipes = {
      'en': `🍛 **How to Cook with Your Ingredients**

**Instructions:**
1. **Prepare:** Wash and chop all ingredients properly
2. **Heat Oil:** Heat 2-3 tbsp oil in a heavy-bottomed pan
3. **Cook Base:** Add onions, cook until golden brown
4. **Add Tomatoes:** Add tomatoes, cook until soft and mushy
5. **Add Main Ingredient:** Add your main ingredient (vegetables/meat)
6. **Cook:** Cook covered for 15-20 minutes on medium heat
7. **Add Water:** Add water if needed to prevent sticking
8. **Season:** Add salt and spices to taste
9. **Serve:** Serve hot with rice or bread

⏰ **Total Time:** 30 minutes
👥 **Serves:** 4 people
💡 **Tip:** Adjust cooking time based on your main ingredient!`
    };

    return recipes[language] || recipes['en'];
  }
}

module.exports = new CustomerChatbotService();
