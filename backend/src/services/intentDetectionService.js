/**
 * Intent Detection Service - Lightweight AI for Tool Selection
 * Determines user intent and maps to appropriate business tools
 * Minimal token usage - only for intent classification
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class IntentDetectionService {
  constructor() {
    this.model = 'gpt-4o-mini'; // Fast and cheap for classification
  }

  /**
   * Detect user intent and determine which tool(s) to call
   * Returns: { tools: [], action: '', params: {} }
   */
  async detectIntent(message, userType = 'retailer') {
    try {
      const prompt = `
You are an intent classifier for a business management system.
Analyze this user message and determine what they want: "${message}"

User Type: ${userType}

AVAILABLE TOOLS:
1. getTodaysProfit - Get today's revenue, expenses, and profit
2. getLowStockItems - Get items running low on stock
3. getTopSellingProducts - Get best-selling products
4. getMonthlyRevenue - Get monthly financial summary
5. getExpenseBreakdown - Get expense analysis by category
6. getInventorySummary - Get inventory overview
7. getPendingOrders - Get pending customer orders
8. getBusinessOverview - Get quick business snapshot
9. getFestivalDemandForecast - Get festival-based demand predictions (NEW)
10. getUpcomingFestivals - Get upcoming festival calendar (NEW)

ACTIONS (non-query operations):
- create_sale - Create a new sale/bill
- add_inventory - Add new inventory item
- update_inventory - Update existing inventory
- add_expense - Record an expense

INTENT CLASSIFICATION RULES:
- If asking about "today's profit/sales/revenue" → getTodaysProfit
- If asking about "low stock/out of stock/restock" → getLowStockItems
- If asking about "best sellers/top products/popular items" → getTopSellingProducts
- If asking about "monthly/this month" → getMonthlyRevenue
- If asking about "expenses/costs/spending" → getExpenseBreakdown
- If asking about "inventory/stock overview" → getInventorySummary
- If asking about "orders/customer requests" → getPendingOrders
- If asking general "overview/summary/dashboard" → getBusinessOverview
- If asking about "festival/seasonal/demand forecast/upcoming festival" → getFestivalDemandForecast
- If asking about "festival calendar/which festivals" → getUpcomingFestivals
- If creating "bill/sale/sell" → create_sale
- If "add item/new product/add inventory" → add_inventory
- If "add expense/spent money" → add_expense

Return ONLY valid JSON (no markdown):
{
  "intent_type": "query|action|clarify",
  "tools": ["tool_name1", "tool_name2"],
  "action": "action_name or null",
  "params": {},
  "confidence": 0.0-1.0,
  "needs_clarification": false,
  "clarification_message": "optional message if unclear"
}

Examples:
- "What's my profit today?" → {"intent_type": "query", "tools": ["getTodaysProfit"], "confidence": 0.95}
- "Show low stock items" → {"intent_type": "query", "tools": ["getLowStockItems"], "confidence": 0.98}
- "Best sellers this month" → {"intent_type": "query", "tools": ["getTopSellingProducts", "getMonthlyRevenue"], "confidence": 0.90}
- "Make a bill for 2 rice" → {"intent_type": "action", "action": "create_sale", "confidence": 0.85}
- "How's business?" → {"intent_type": "query", "tools": ["getBusinessOverview"], "confidence": 0.92}
- "What should I stock for upcoming festival?" → {"intent_type": "query", "tools": ["getFestivalDemandForecast"], "confidence": 0.93}
- "Show festival calendar" → {"intent_type": "query", "tools": ["getUpcomingFestivals"], "confidence": 0.95}
`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });
      
      const intent = JSON.parse(completion.choices[0].message.content);
      
      // Validate and set defaults
      return {
        intent_type: intent.intent_type || 'clarify',
        tools: intent.tools || [],
        action: intent.action || null,
        params: intent.params || {},
        confidence: intent.confidence || 0.5,
        needs_clarification: intent.needs_clarification || false,
        clarification_message: intent.clarification_message || null
      };
      
    } catch (error) {
      console.error('Intent detection error:', error);
      
      // Fallback: Simple keyword matching
      return this.fallbackIntentDetection(message);
    }
  }

  /**
   * Fallback intent detection using keyword matching
   */
  fallbackIntentDetection(message) {
    const lowerMessage = message.toLowerCase();
    
    // Profit/Sales queries
    if (lowerMessage.match(/profit|revenue|sales.*today|today.*sales|today.*profit/)) {
      return {
        intent_type: 'query',
        tools: ['getTodaysProfit'],
        action: null,
        params: {},
        confidence: 0.8,
        needs_clarification: false
      };
    }
    
    // Stock queries
    if (lowerMessage.match(/low stock|out of stock|restock|stock.*low/)) {
      return {
        intent_type: 'query',
        tools: ['getLowStockItems'],
        action: null,
        params: {},
        confidence: 0.85,
        needs_clarification: false
      };
    }
    
    // Top sellers
    if (lowerMessage.match(/best sell|top sell|popular|most sold|top product/)) {
      return {
        intent_type: 'query',
        tools: ['getTopSellingProducts'],
        action: null,
        params: {},
        confidence: 0.8,
        needs_clarification: false
      };
    }
    
    // Monthly revenue
    if (lowerMessage.match(/month|monthly/)) {
      return {
        intent_type: 'query',
        tools: ['getMonthlyRevenue'],
        action: null,
        params: {},
        confidence: 0.75,
        needs_clarification: false
      };
    }
    
    // Expenses
    if (lowerMessage.match(/expense|cost|spending|spent/)) {
      return {
        intent_type: 'query',
        tools: ['getExpenseBreakdown'],
        action: null,
        params: {},
        confidence: 0.8,
        needs_clarification: false
      };
    }
    
    // Inventory
    if (lowerMessage.match(/inventory|stock.*overview|all.*items/)) {
      return {
        intent_type: 'query',
        tools: ['getInventorySummary'],
        action: null,
        params: {},
        confidence: 0.75,
        needs_clarification: false
      };
    }
    
    // Orders
    if (lowerMessage.match(/order|customer.*request|pending/)) {
      return {
        intent_type: 'query',
        tools: ['getPendingOrders'],
        action: null,
        params: {},
        confidence: 0.8,
        needs_clarification: false
      };
    }
    
    // Overview
    if (lowerMessage.match(/overview|summary|dashboard|how.*business|business.*status/)) {
      return {
        intent_type: 'query',
        tools: ['getBusinessOverview'],
        action: null,
        params: {},
        confidence: 0.85,
        needs_clarification: false
      };
    }
    
    // Festival forecast
    if (lowerMessage.match(/festival|seasonal|demand.*forecast|upcoming.*festival|stock.*festival|diwali|holi|eid/)) {
      return {
        intent_type: 'query',
        tools: ['getFestivalDemandForecast'],
        action: null,
        params: {},
        confidence: 0.85,
        needs_clarification: false
      };
    }
    
    // Festival calendar
    if (lowerMessage.match(/festival.*calendar|which.*festival|upcoming.*event|festival.*list/)) {
      return {
        intent_type: 'query',
        tools: ['getUpcomingFestivals'],
        action: null,
        params: {},
        confidence: 0.85,
        needs_clarification: false
      };
    }
    
    // Actions - Sales
    if (lowerMessage.match(/bill|sale|sell|make.*bill|create.*bill/)) {
      return {
        intent_type: 'action',
        tools: [],
        action: 'create_sale',
        params: {},
        confidence: 0.7,
        needs_clarification: false
      };
    }
    
    // Actions - Add inventory
    if (lowerMessage.match(/add.*item|add.*inventory|new.*product|add.*product/)) {
      return {
        intent_type: 'action',
        tools: [],
        action: 'add_inventory',
        params: {},
        confidence: 0.7,
        needs_clarification: false
      };
    }
    
    // Actions - Add expense
    if (lowerMessage.match(/add.*expense|record.*expense|spent.*money/)) {
      return {
        intent_type: 'action',
        tools: [],
        action: 'add_expense',
        params: {},
        confidence: 0.7,
        needs_clarification: false
      };
    }
    
    // Default: needs clarification
    return {
      intent_type: 'clarify',
      tools: [],
      action: null,
      params: {},
      confidence: 0.3,
      needs_clarification: true,
      clarification_message: "I can help you with sales, inventory, expenses, and business insights. What would you like to know?"
    };
  }
}

module.exports = new IntentDetectionService();
