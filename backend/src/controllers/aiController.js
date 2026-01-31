/**
 * AI Controller - Smart AI Assistant for Shopkeepers
 * Provides contextual responses for business management tasks
 * Integrates with inventory, sales, customers, and expenses data
 */

// AI Message Processing Function
const processAIMessage = async (message, userId, context, models) => {
  const { Inventory, Sale, Customer, Expense } = models;
  const lowerMessage = message.toLowerCase();

  try {
    // Inventory-related queries
    if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('items')) {
      const inventory = await Inventory.find({ user_id: userId });
      const lowStockItems = inventory.filter(item => item.stock_qty <= 5);

      if (lowerMessage.includes('low') || lowerMessage.includes('out')) {
        return {
          text: lowStockItems.length > 0
            ? `You have ${lowStockItems.length} items with low stock:\n${lowStockItems.map(item => `• ${item.item_name}: ${item.stock_qty} units`).join('\n')}\n\nConsider restocking these items soon!`
            : "Great news! All your inventory items are well stocked.",
          context: 'inventory',
          suggestions: ['Show me all inventory', 'Add new inventory item', 'Update stock levels'],
          needsBackend: false
        };
      }

      return {
        text: `You currently have ${inventory.length} items in your inventory:\n${inventory.slice(0, 5).map(item => `• ${item.item_name}: ${item.stock_qty} units (₹${item.price_per_unit} each)`).join('\n')}${inventory.length > 5 ? `\n...and ${inventory.length - 5} more items` : ''}`,
        context: 'inventory',
        suggestions: ['Show low stock items', 'Add new item', 'Update prices'],
        needsBackend: false
      };
    }

    // Sales-related queries
    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') || lowerMessage.includes('today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sales = await Sale.find({
        user_id: userId,
        date: { $gte: today }
      });

      const totalToday = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

      return {
        text: `Today's sales summary:\n• Total sales: ₹${totalToday}\n• Number of transactions: ${sales.length}\n• Average transaction: ₹${sales.length > 0 ? Math.round(totalToday / sales.length) : 0}`,
        context: 'sales',
        suggestions: ['Show sales by payment method', 'Generate monthly report', 'View recent transactions'],
        needsBackend: false
      };
    }

    // Customer-related queries
    if (lowerMessage.includes('customer') || lowerMessage.includes('client')) {
      const customers = await Customer.find({ user_id: userId });
      const customersWithCredit = customers.filter(c => c.credit_balance > 0);

      return {
        text: `Customer overview:\n• Total customers: ${customers.length}\n• Customers with credit: ${customersWithCredit.length}\n• Total credit outstanding: ₹${customersWithCredit.reduce((sum, c) => sum + c.credit_balance, 0)}`,
        context: 'customers',
        suggestions: ['Show customer details', 'Add new customer', 'Update credit balance'],
        needsBackend: false
      };
    }

    // Expense-related queries
    if (lowerMessage.includes('expense') || lowerMessage.includes('cost') || lowerMessage.includes('spending')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expenses = await Expense.find({
        user_id: userId,
        date: { $gte: today }
      });

      const totalToday = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      return {
        text: `Today's expenses:\n• Total expenses: ₹${totalToday}\n• Number of transactions: ${expenses.length}\n• Categories: ${[...new Set(expenses.map(e => e.category))].join(', ') || 'None today'}`,
        context: 'expenses',
        suggestions: ['Show expense categories', 'Add new expense', 'Monthly expense report'],
        needsBackend: false
      };
    }

    // Help and guidance
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return {
        text: "I can help you with:\n\n📦 **Inventory Management**\n• Check stock levels\n• Identify low stock items\n• Add new products\n\n💰 **Sales Tracking**\n• Daily sales reports\n• Transaction history\n• Revenue analysis\n\n👥 **Customer Management**\n• Customer information\n• Credit tracking\n• Contact details\n\n💸 **Expense Management**\n• Track daily expenses\n• Category analysis\n• Cost optimization\n\nJust ask me anything about your business!",
        context: 'help',
        suggestions: ['Show inventory', 'Today\'s sales', 'Customer list', 'Expense summary'],
        needsBackend: false
      };
    }

    // General business advice
    if (lowerMessage.includes('advice') || lowerMessage.includes('suggestion') || lowerMessage.includes('recommend')) {
      const inventory = await Inventory.find({ user_id: userId });
      const lowStockItems = inventory.filter(item => item.stock_qty <= 5);

      let advice = "Here are some business recommendations:\n\n";

      if (lowStockItems.length > 0) {
        advice += `⚠️ **Stock Alert**: You have ${lowStockItems.length} items running low. Consider restocking soon.\n\n`;
      }

      advice += "💡 **General Tips**:\n";
      advice += "• Keep track of your best-selling items\n";
      advice += "• Monitor customer credit balances regularly\n";
      advice += "• Review expenses weekly to identify cost-saving opportunities\n";
      advice += "• Maintain good relationships with regular customers";

      return {
        text: advice,
        context: 'advice',
        suggestions: ['Check low stock items', 'Show best sellers', 'Customer credit report'],
        needsBackend: false
      };
    }

    // Default response for unrecognized queries
    return {
      text: "I understand you're asking about: \"" + message + "\"\n\nI can help you with inventory, sales, customers, and expenses. Could you be more specific about what you'd like to know?",
      context: 'general',
      suggestions: ['Show inventory', 'Today\'s sales', 'Customer information', 'Expense summary'],
      needsBackend: false
    };

  } catch (error) {
    console.error('Error processing AI message:', error);
    return {
      text: "I'm having trouble accessing your business data right now. Please make sure all your backend services are running properly, or try asking about a specific area like 'inventory' or 'sales'.",
      context: 'error',
      suggestions: ['Check inventory', 'Show sales', 'Customer list'],
      needsBackend: true
    };
  }
};

const aiController = {
  // AI Business Insights (placeholder)
  getBusinessInsights: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'AI Business Insights endpoint - Ready for implementation',
        data: {
          insights: [],
          recommendations: [],
          trends: [],
          predictions: []
        },
        note: 'This endpoint will provide AI-powered business insights in Phase 3'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching AI insights',
        error: error.message
      });
    }
  },

  // Daily Business Digest (placeholder)
  getDailyDigest: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Daily Business Digest endpoint - Ready for implementation',
        data: {
          summary: '',
          keyMetrics: {},
          alerts: [],
          recommendations: []
        },
        note: 'This endpoint will generate daily business digest in Phase 3'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating daily digest',
        error: error.message
      });
    }
  },

  // Voice-to-Text Processing
  processVoiceInput: async (req, res) => {
    try {
      const { audioData, language = 'en-US' } = req.body;

      // For now, return a placeholder response
      // In a real implementation, this would integrate with Whisper API
      res.status(200).json({
        success: true,
        message: 'Voice input processed successfully',
        data: {
          transcript: 'Voice input received - Whisper integration pending',
          confidence: 0.85,
          language: language,
          note: 'This endpoint will process voice input using Whisper API in Phase 3'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing voice input',
        error: error.message
      });
    }
  },

  // Image Generation
  generateImage: async (req, res) => {
    try {
      const { prompt, style = 'business' } = req.body;

      // For now, return a placeholder response
      // In a real implementation, this would integrate with DALL·E API
      res.status(200).json({
        success: true,
        message: 'Image generation request received',
        data: {
          imageUrl: '', // Would contain actual image URL from DALL·E
          prompt: prompt,
          style: style,
          note: 'This endpoint will generate images using DALL·E API in Phase 3'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating image',
        error: error.message
      });
    }
  },

  // Chat with AI Assistant
  chatWithAI: async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user._id;

      // Import models for data fetching
      const Inventory = require('../models/Inventory');
      const Sale = require('../models/Sale');
      const Customer = require('../models/Customer');
      const Expense = require('../models/Expense');

      // Process the message and generate contextual response
      const response = await processAIMessage(message, userId, context, {
        Inventory,
        Sale,
        Customer,
        Expense
      });

      res.status(200).json({
        success: true,
        message: 'AI response generated successfully',
        data: {
          response: response.text,
          context: response.context,
          suggestions: response.suggestions,
          needsBackend: response.needsBackend
        }
      });
    } catch (error) {
      console.error('AI Chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing chat message',
        error: error.message
      });
    }
  }
};

module.exports = aiController;
