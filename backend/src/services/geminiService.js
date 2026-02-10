const OpenAI = require('openai');

/**
 * OpenAI Service
 * Provides AI-powered business insights using OpenAI GPT
 */

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

class OpenAIService {
  constructor() {
    this.model = 'gpt-4o-mini'; // Fast and cost-effective
  }

  /**
   * Generate AI response with context
   */
  async generateResponse(prompt, context = {}) {
    try {
      const fullPrompt = this.buildPromptWithContext(prompt, context);
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.7,
        max_tokens: 2000
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
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

CRITICAL: Structure your response EXACTLY in this order:

## 🎯 Quick Actions
List 3-5 immediate, actionable steps the retailer should take TODAY. Be specific with numbers and items.
- Action 1
- Action 2
- Action 3

## 💰 Visual Summary
Provide key metrics and numbers:
- Total Revenue: ₹X
- Top Selling Item: [name]
- Stock Alerts: X items

## 💡 Strategic Recommendations
Provide 3-4 strategic insights for long-term growth:
1. Recommendation 1
2. Recommendation 2

## 📊 Demand Forecasts
Provide detailed forecasting:
- **Top Selling Items**: List the top 5 items by sales volume and revenue
- **Sales Trends**: Identify which products are trending up or down
- **Stock Recommendations**: For each high-demand item, calculate recommended stock levels
- **Reorder Points**: Suggest when to reorder based on current stock and sales velocity
- **Demand Patterns**: Identify any patterns (daily, weekly trends)

Use clear formatting with bullet points and specific numbers.
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

CRITICAL: Structure your response EXACTLY in this order:

## 🎯 Quick Actions
List 3-5 immediate pricing or sales actions to take TODAY:
- Action 1
- Action 2
- Action 3

## 💰 Visual Summary
Provide key revenue metrics:
- Total Revenue: ₹X
- Average Profit Margin: X%
- High-Margin Items: X items

## 💡 Strategic Recommendations
Provide 3-4 strategic pricing insights:
1. Recommendation 1
2. Recommendation 2

## 📊 Revenue Optimization Details
Provide detailed analysis:
- **Price Analysis**: Evaluate current pricing vs market demand
- **Margin Opportunities**: Identify products with potential for price increases
- **Competitive Pricing**: Suggest optimal price points for maximum revenue
- **Bundle Opportunities**: Recommend product bundling strategies
- **Discount Strategy**: When to offer discounts without hurting margins
- **High-Margin Focus**: Which products to push for better profitability

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

CRITICAL: Structure your response EXACTLY in this order:

## 🎯 Quick Actions
List 3-5 immediate cost-saving actions to take TODAY:
- Action 1
- Action 2
- Action 3

## 💰 Visual Summary
Provide key expense metrics:
- Total Expenses: ₹X
- Highest Category: [category name]
- Month-over-Month Change: +/-X%

## 💡 Strategic Recommendations
Provide 3-4 strategic cost optimization insights:
1. Recommendation 1
2. Recommendation 2

## 📊 Expense Forecast Details
Provide detailed analysis:
- **Expense Breakdown**: Categorize and analyze current expenses (Sales vs Operating)
- **Monthly Trends**: Identify spending patterns and trends
- **Seasonal Impact**: How Indian seasons and festivals affect expenses (consider monsoon, festivals, holidays)
- **Weather Considerations**: Impact of current season on operational costs (AC, heating, logistics)
- **Next Month Forecast**: Predict total expenses for next month with justification
- **Cost Optimization**: Suggest ways to reduce unnecessary expenses
- **Budget Recommendations**: Recommend monthly budgets for each category

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

module.exports = new OpenAIService();
