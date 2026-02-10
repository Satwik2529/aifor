/**
 * Festival Demand Forecasting Service
 * Server-side processing for context-aware demand prediction
 * NO RAW DATA sent to LLM - only structured insights
 */

const fs = require('fs');
const path = require('path');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');

class FestivalForecastService {
  constructor() {
    this.festivalsData = null;
    this.loadFestivalData();
  }

  /**
   * Load and parse festival dataset (one-time on startup)
   */
  loadFestivalData() {
    try {
      const csvPath = path.join(__dirname, '../../biznova_festival_dataset_150.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',');
      
      this.festivalsData = lines.slice(1).map(line => {
        const values = this.parseCSVLine(line);
        return {
          festival_name: values[0],
          region: values[1],
          month: values[2],
          date_2026: values[3],
          type: values[4],
          public_holiday: values[5],
          top_selling_items: values[6].split(',').map(item => item.trim()),
          demand_level: values[7],
          estimated_demand_score: parseInt(values[8])
        };
      });

      // Remove duplicates
      const uniqueFestivals = new Map();
      this.festivalsData.forEach(festival => {
        const key = `${festival.festival_name}_${festival.month}`;
        if (!uniqueFestivals.has(key)) {
          uniqueFestivals.set(key, festival);
        }
      });
      this.festivalsData = Array.from(uniqueFestivals.values());
    } catch (error) {
      console.error('❌ Failed to load festival data:', error);
      this.festivalsData = [];
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Get month number from month string
   */
  getMonthNumber(monthStr) {
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    // Handle ranges like "Oct-Nov" or "Aug-Sep"
    if (monthStr.includes('-')) {
      const [start] = monthStr.split('-');
      return monthMap[start.trim()] ?? null;
    }

    // Handle single month
    const month = monthStr.split('-')[0].trim();
    return monthMap[month] ?? null;
  }

  /**
   * Find nearest upcoming festival
   */
  findUpcomingFestival(currentDate = new Date()) {
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    let nearestFestival = null;
    let minDistance = Infinity;

    for (const festival of this.festivalsData) {
      const festivalMonth = this.getMonthNumber(festival.month);
      if (festivalMonth === null) continue;

      // Calculate distance in months (considering year wrap)
      let distance;
      if (festivalMonth >= currentMonth) {
        distance = festivalMonth - currentMonth;
      } else {
        distance = (12 - currentMonth) + festivalMonth;
      }

      // If same month, check if festival is likely past
      if (distance === 0 && currentDay > 20) {
        distance = 12; // Consider next year
      }

      if (distance < minDistance) {
        minDistance = distance;
        nearestFestival = festival;
      }
    }

    return {
      festival: nearestFestival,
      months_away: minDistance,
      is_imminent: minDistance <= 1
    };
  }

  /**
   * Calculate sales velocity for items (last 30-60 days)
   */
  async calculateSalesVelocity(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sales = await Sale.find({
        user_id: userId,
        createdAt: { $gte: startDate }
      });

      const itemVelocity = {};

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const itemName = item.item_name.toLowerCase();
          if (!itemVelocity[itemName]) {
            itemVelocity[itemName] = {
              total_quantity: 0,
              total_revenue: 0,
              sales_count: 0
            };
          }
          itemVelocity[itemName].total_quantity += item.quantity;
          itemVelocity[itemName].total_revenue += item.quantity * item.price_per_unit;
          itemVelocity[itemName].sales_count += 1;
        });
      });

      // Calculate velocity score (sales per day)
      for (const item in itemVelocity) {
        const data = itemVelocity[item];
        data.velocity_score = data.total_quantity / days;
        data.avg_daily_sales = data.total_quantity / days;
      }

      return itemVelocity;
    } catch (error) {
      console.error('Sales velocity calculation error:', error);
      return {};
    }
  }

  /**
   * Match festival items with retailer inventory
   */
  async matchInventoryWithFestival(userId, festivalItems) {
    try {
      const inventory = await Inventory.find({ user_id: userId });
      const matches = [];

      for (const festivalItem of festivalItems) {
        const festivalItemLower = festivalItem.toLowerCase();
        
        // Find matching inventory items (fuzzy match)
        const matchedItems = inventory.filter(invItem => {
          const invItemLower = invItem.item_name.toLowerCase();
          
          // Exact match
          if (invItemLower === festivalItemLower) return true;
          
          // Partial match (e.g., "cooking oil" matches "oil")
          if (invItemLower.includes(festivalItemLower) || 
              festivalItemLower.includes(invItemLower)) return true;
          
          // Category-based match
          const keywords = festivalItemLower.split(' ');
          return keywords.some(keyword => 
            keyword.length > 3 && invItemLower.includes(keyword)
          );
        });

        if (matchedItems.length > 0) {
          matches.push({
            festival_item: festivalItem,
            matched_inventory: matchedItems.map(item => ({
              item_name: item.item_name,
              current_stock: item.stock_qty,
              price: item.price_per_unit,
              category: item.category
            }))
          });
        }
      }

      return matches;
    } catch (error) {
      console.error('Inventory matching error:', error);
      return [];
    }
  }

  /**
   * Generate confidence level based on signals
   */
  calculateConfidence(signals) {
    let score = 0;
    let maxScore = 0;

    // Festival proximity (0-40 points)
    maxScore += 40;
    if (signals.is_imminent) {
      score += 40;
    } else if (signals.months_away <= 2) {
      score += 30;
    } else if (signals.months_away <= 3) {
      score += 20;
    }

    // Sales velocity (0-30 points)
    maxScore += 30;
    if (signals.has_recent_sales) {
      if (signals.velocity_score > 1) {
        score += 30; // Selling more than 1 unit per day
      } else if (signals.velocity_score > 0.5) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // Stock availability (0-20 points)
    maxScore += 20;
    if (signals.in_stock) {
      score += 20;
    } else {
      score += 5; // Still relevant even if out of stock
    }

    // Demand level (0-10 points)
    maxScore += 10;
    if (signals.demand_level === 'High') {
      score += 10;
    } else if (signals.demand_level === 'Medium') {
      score += 5;
    }

    const percentage = (score / maxScore) * 100;

    if (percentage >= 70) return 'High';
    if (percentage >= 40) return 'Medium';
    return 'Low';
  }

  /**
   * Main forecasting function - SERVER-SIDE PROCESSING ONLY
   * Returns structured, minimal data for LLM
   * SUGGESTS ALL FESTIVAL ITEMS (whether in inventory or not)
   */
  async getFestivalDemandForecast(userId) {
    try {
      // Step 1: Find upcoming festival
      const { festival, months_away, is_imminent } = this.findUpcomingFestival();

      if (!festival) {
        return {
          has_forecast: false,
          message: 'No upcoming festivals found in dataset'
        };
      }

      // Step 2: Get current inventory
      const inventory = await Inventory.find({ user_id: userId });
      
      // Step 3: Calculate sales velocity (server-side)
      const salesVelocity = await this.calculateSalesVelocity(userId, 30);

      // Step 4: Generate forecast for ALL festival items
      const forecastItems = [];

      for (const festivalItem of festival.top_selling_items) {
        const festivalItemLower = festivalItem.toLowerCase();
        
        // Check if item exists in inventory (fuzzy match)
        const inventoryItem = inventory.find(inv => {
          const invItemLower = inv.item_name.toLowerCase();
          // Exact match
          if (invItemLower === festivalItemLower) return true;
          // Partial match
          if (invItemLower.includes(festivalItemLower) || 
              festivalItemLower.includes(invItemLower)) return true;
          // Keyword match
          const keywords = festivalItemLower.split(' ');
          return keywords.some(keyword => 
            keyword.length > 3 && invItemLower.includes(keyword)
          );
        });

        // Get sales velocity if item exists
        const itemNameLower = inventoryItem ? inventoryItem.item_name.toLowerCase() : festivalItemLower;
        const velocity = salesVelocity[itemNameLower] || { velocity_score: 0, sales_count: 0, total_quantity: 0 };

        // Build reasoning signals
        const signals = {
          is_imminent,
          months_away,
          has_recent_sales: velocity.sales_count > 0,
          velocity_score: velocity.velocity_score,
          in_stock: inventoryItem ? inventoryItem.stock_qty > 0 : false,
          demand_level: festival.demand_level,
          in_inventory: !!inventoryItem
        };

        // Calculate confidence
        const confidence = this.calculateConfidence(signals);

        // Build concise reasoning
        const reasons = [];
        if (is_imminent) {
          reasons.push('Festival approaching soon');
        } else if (months_away <= 2) {
          reasons.push(`Festival in ${months_away} month(s)`);
        }

        if (festival.demand_level === 'High') {
          reasons.push('High seasonal demand');
        }

        if (inventoryItem) {
          // Item is in inventory
          if (velocity.sales_count > 0) {
            reasons.push(`Recent sales: ${velocity.total_quantity.toFixed(1)} units`);
          }
          
          if (inventoryItem.stock_qty === 0) {
            reasons.push('Currently out of stock');
          } else if (inventoryItem.stock_qty < 10) {
            reasons.push('Low stock');
          }
        } else {
          // Item NOT in inventory - suggest to add
          reasons.push('Not in inventory - consider adding');
        }

        // Determine action
        let action;
        if (!inventoryItem) {
          action = 'Add to inventory';
        } else if (inventoryItem.stock_qty === 0) {
          action = 'Restock urgently';
        } else if (inventoryItem.stock_qty < 10) {
          action = 'Restock recommended';
        } else {
          action = 'Monitor stock';
        }

        forecastItems.push({
          item_name: inventoryItem ? inventoryItem.item_name : festivalItem,
          current_stock: inventoryItem ? inventoryItem.stock_qty : 0,
          recent_sales_velocity: velocity.velocity_score.toFixed(2),
          confidence: confidence,
          reasoning: reasons.join(' • '),
          action: action,
          in_inventory: !!inventoryItem
        });
      }

      // Sort by confidence (High > Medium > Low)
      const confidenceOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      forecastItems.sort((a, b) => 
        confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
      );

      // Return ONLY structured, minimal data
      return {
        has_forecast: true,
        festival_name: festival.festival_name,
        festival_type: festival.type,
        months_away: months_away,
        is_imminent: is_imminent,
        demand_level: festival.demand_level,
        forecast_items: forecastItems.slice(0, 10), // Limit to top 10
        total_matched_items: forecastItems.length,
        summary: {
          high_confidence: forecastItems.filter(i => i.confidence === 'High').length,
          medium_confidence: forecastItems.filter(i => i.confidence === 'Medium').length,
          low_confidence: forecastItems.filter(i => i.confidence === 'Low').length
        }
      };

    } catch (error) {
      console.error('Festival forecast error:', error);
      return {
        has_forecast: false,
        error: error.message
      };
    }
  }

  /**
   * Get festival calendar (upcoming festivals for planning)
   */
  getUpcomingFestivals(count = 5) {
    const currentDate = new Date();
    const festivals = [];

    for (let i = 0; i < count; i++) {
      const { festival, months_away } = this.findUpcomingFestival(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      );
      
      if (festival && !festivals.find(f => f.festival_name === festival.festival_name)) {
        festivals.push({
          festival_name: festival.festival_name,
          month: festival.month,
          months_away: months_away,
          demand_level: festival.demand_level,
          type: festival.type
        });
      }
    }

    return festivals;
  }
}

module.exports = new FestivalForecastService();
