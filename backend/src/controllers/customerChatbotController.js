const customerChatbotService = require('../services/customerChatbotService');
const DataSyncService = require('../services/dataSyncService');

/**
 * Customer Chatbot Controller
 * Handles API endpoints for customer-side chatbot interactions
 */

/**
 * @route   POST /api/chatbot/customer/chat
C:\Users\satwi\OneDrive\Desktop\finalbiznova\Biznova>git init   
Reinitialized existing Git repository in C:/Users/satwi/OneDrive/Desktop/finalbiznova/Biznova/.git/

C:\Users\satwi\OneDrive\Desktop\finalbiznova\Biznova>git commit -m "first commit"
On branch master
nothing to commit, working tree clean

C:\Users\satwi\OneDrive\Desktop\finalbiznova\Biznova>git add .

C:\Users\satwi\OneDrive\Desktop\finalbiznova\Biznova>
 * @desc    Process customer chat message
 * @access  Private (Customer)
 */
exports.chat = async (req, res) => {
  try {
    const { message, retailer_id, language = 'en' } = req.body;
    const customer_id = req.user._id; // MongoDB uses _id, not id

    console.log('🤖 Customer Chatbot Request:', {
      customer_id,
      retailer_id,
      message: message.substring(0, 50),
      language,
      hasUser: !!req.user,
      userId: req.user?._id
    });

    // Validate required fields
    if (!message || !retailer_id) {
      return res.status(400).json({
        success: false,
        message: 'Message and retailer ID are required'
      });
    }

    // Process the message through chatbot service
    const response = await customerChatbotService.processMessage(
      message,
      customer_id,
      retailer_id,
      language
    );

    console.log('✅ Chatbot Response:', {
      intent: response.intent,
      itemsCount: response.items?.length,
      canOrder: response.can_order
    });

    res.json({
      success: true,
      message: response.message,
      data: response
    });

  } catch (error) {
    console.error('❌ Chatbot chat error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/chatbot/customer/order
 * @desc    Place order with confirmed items
 * @access  Private (Customer)
 */
exports.placeOrder = async (req, res) => {
  try {
    const { retailer_id, confirmed_items, notes, language = 'en' } = req.body;
    const customer_id = req.user.id;

    // Validate required fields
    if (!retailer_id || !confirmed_items || !Array.isArray(confirmed_items)) {
      return res.status(400).json({
        success: false,
        message: 'Retailer ID and confirmed items are required'
      });
    }

    // Create the order
    const orderResult = await customerChatbotService.createOrder(
      customer_id,
      retailer_id,
      confirmed_items,
      notes
    );

    if (orderResult.success) {
      res.json({
        success: true,
        data: orderResult
      });
    } else {
      res.status(400).json({
        success: false,
        message: orderResult.message,
        error: orderResult.error
      });
    }

  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/chatbot/customer/status
 * @desc    Get chatbot health status and available retailers
 * @access  Private (Customer)
 */
exports.getStatus = async (req, res) => {
  try {
    const customer_id = req.user.id;
    
    // Get synced retailer data
    const retailersResult = await DataSyncService.getAvailableRetailers();
    
    if (!retailersResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load retailers',
        error: retailersResult.error
      });
    }

    res.json({
      success: true,
      data: {
        status: 'active',
        features: {
          text_chat: true,
          voice_input: false, // Can be enabled with speech-to-text API
          voice_output: false, // Can be enabled with text-to-speech API
          multilingual: ['en', 'hi', 'te', 'ta', 'kn'],
          dish_recognition: true,
          grocery_parsing: true,
          real_time_inventory: true,
          order_tracking: true
        },
        available_retailers: retailersResult.retailers,
        supported_languages: [
          { code: 'en', name: 'English', flag: '🇺🇸' },
          { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
          { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
          { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
          { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
        ],
        customer_stats: {
          total_orders: 0,
          favorite_retailer: null
        }
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/chatbot/customer/voice
 * @desc    Process voice input (speech-to-text)
 * @access  Private (Customer)
 */
exports.voiceInput = async (req, res) => {
  try {
    // This would integrate with a speech-to-text service
    // For now, return a placeholder response
    res.json({
      success: false,
      message: 'Voice input not yet implemented. Please use text input.',
      note: 'This feature can be enabled with Deepgram or similar STT service'
    });

  } catch (error) {
    console.error('Voice input error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process voice input',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/chatbot/customer/speak
 * @desc    Convert text response to speech (text-to-speech)
 * @access  Private (Customer)
 */
exports.textToSpeech = async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for speech synthesis'
      });
    }

    // This would integrate with a text-to-speech service
    // For now, return a placeholder response
    res.json({
      success: false,
      message: 'Text-to-speech not yet implemented.',
      note: 'This feature can be enabled with ElevenLabs or similar TTS service',
      text: text
    });

  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert text to speech',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/chatbot/customer/recipe
 * @desc    Generate cooking instructions for ordered ingredients
 * @access  Private (Customer)
 */
exports.generateRecipe = async (req, res) => {
  try {
    const { ingredients, language = 'en' } = req.body;
    const customer_id = req.user.id;

    if (!ingredients) {
      return res.status(400).json({
        success: false,
        message: 'Ingredients are required for recipe generation'
      });
    }

    console.log(`🍳 Generating recipe for customer ${customer_id} with ingredients: ${ingredients}`);

    // Generate recipe based on ingredients
    const recipe = await customerChatbotService.generateRecipe(ingredients, language);

    res.json({
      success: true,
      data: {
        recipe: recipe,
        ingredients: ingredients,
        language: language
      }
    });

  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recipe',
      error: error.message
    });
  }
};
