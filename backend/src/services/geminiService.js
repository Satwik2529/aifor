const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Google Gemini AI Service
 * Provides AI-powered business insights using Google Gemini
 */

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Generate AI response with context
   */
  async generateResponse(prompt, context = {}) {
    try {
      const fullPrompt = this.buildPromptWithContext(prompt, context);
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to generate AI response: ' + error.message);
    }
  }

  /**
   * Demand Forecasting Analysis
   */
  async analyzeDemandForecast(salesData, inventoryData) {
    const prompt = `
You are a business analytics AI assistant. Analyze the following sales and inventory data to provide demand forecasting insights.

SALES DATA (Recent ${salesData.length} transactions):
${JSON.stringify(salesData, null, 2)}

INVENTORY DATA (Current stock levels):
${JSON.stringify(inventoryData, null, 2)}

Provide a detailed demand forecasting report with:
1. **Top Selling Items**: List the top 5 items by sales volume and revenue
2. **Sales Trends**: Identify which products are trending up or down
3. **Stock Recommendations**: For each high-demand item, calculate recommended stock levels to prevent stockouts
4. **Reorder Points**: Suggest when to reorder based on current stock and sales velocity
5. **Demand Patterns**: Identify any patterns (daily, weekly trends)

Format the response in a clear, structured way with sections and bullet points.
Include specific numbers and actionable recommendations.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Revenue Optimization Analysis
   */
  async analyzeRevenueOptimization(salesData, inventoryData, profitData) {
    const prompt = `
You are a pricing strategy AI assistant. Analyze the following business data to maximize revenue and profitability.

SALES DATA:
${JSON.stringify(salesData.slice(0, 50), null, 2)}

INVENTORY WITH PRICING:
${JSON.stringify(inventoryData, null, 2)}

PROFIT METRICS:
${JSON.stringify(profitData, null, 2)}

Provide revenue optimization strategies:
1. **Price Analysis**: Evaluate current pricing vs market demand
2. **Margin Opportunities**: Identify products with potential for price increases
3. **Competitive Pricing**: Suggest optimal price points for maximum revenue
4. **Bundle Opportunities**: Recommend product bundling strategies
5. **Discount Strategy**: When to offer discounts without hurting margins
6. **High-Margin Focus**: Which products to push for better profitability

Format with clear sections, specific price recommendations, and expected revenue impact.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Expense Forecasting with Seasonal Analysis
   */
  async analyzeExpenseForecast(expensesData, currentMonth, currentSeason) {
    const prompt = `
You are a financial forecasting AI assistant for a business in India. Analyze expenses and predict future costs.

CURRENT DATE: ${new Date().toLocaleDateString('en-IN')}
CURRENT MONTH: ${currentMonth}
CURRENT SEASON: ${currentSeason}

EXPENSE HISTORY (Last 3 months):
${JSON.stringify(expensesData, null, 2)}

Provide expense forecasting analysis:
1. **Expense Breakdown**: Categorize and analyze current expenses (Sales vs Operating)
2. **Monthly Trends**: Identify spending patterns and trends
3. **Seasonal Impact**: How Indian seasons and festivals affect expenses (consider monsoon, festivals, holidays)
4. **Weather Considerations**: Impact of current season on operational costs (AC, heating, logistics)
5. **Next Month Forecast**: Predict total expenses for next month with justification
6. **Cost Optimization**: Suggest ways to reduce unnecessary expenses
7. **Budget Recommendations**: Recommend monthly budgets for each category

Consider Indian context:
- Festival seasons (Diwali, Holi, etc.)
- Monsoon season impacts
- Summer AC costs
- Regional factors

Format with specific numbers, percentages, and actionable advice.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * General Business Chat
   */
  async chat(message, businessContext) {
    const prompt = `
You are an AI business assistant for Biznova, a business management platform.

BUSINESS CONTEXT:
${JSON.stringify(businessContext, null, 2)}

USER QUESTION: ${message}

Provide a helpful, concise response based on the business data available.
If the user asks about inventory, sales, customers, or expenses, use the context data.
Be professional, friendly, and actionable in your advice.
`;

    return await this.generateResponse(prompt);
  }

  /**
   * Build prompt with context
   */
  buildPromptWithContext(prompt, context) {
    if (!context || Object.keys(context).length === 0) {
      return prompt;
    }

    let contextStr = '\n\nADDITIONAL CONTEXT:\n';
    for (const [key, value] of Object.entries(context)) {
      contextStr += `${key}: ${JSON.stringify(value)}\n`;
    }

    return prompt + contextStr;
  }
}

module.exports = new GeminiService();
