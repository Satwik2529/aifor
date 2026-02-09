/**
 * Business Tools Service - Deterministic Data Retrieval
 * Provides structured, server-side calculated business metrics
 * Reduces token usage by computing data before sending to LLM
 */

const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const CustomerRequest = require('../models/CustomerRequest');
const User = require('../models/User');
const festivalForecast = require('./festivalForecastService');

class BusinessToolsService {
  /**
   * Get today's profit (revenue - COGS - expenses)
   */
  async getTodaysProfit(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [sales, expenses] = await Promise.all([
        Sale.find({
          user_id: userId,
          createdAt: { $gte: today, $lt: tomorrow }
        }),
        Expense.find({
          user_id: userId,
          createdAt: { $gte: today, $lt: tomorrow }
        })
      ]);

      const revenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
      const cogs = sales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = revenue - cogs - totalExpenses;
      const grossProfit = revenue - cogs;

      return {
        date: today.toISOString().split('T')[0],
        revenue,
        cogs,
        expenses: totalExpenses,
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
        sales_count: sales.length
      };
    } catch (error) {
      console.error('getTodaysProfit error:', error);
      throw error;
    }
  }

  /**
   * Get low stock items (below minimum threshold)
   */
  async getLowStockItems(userId, threshold = null) {
    try {
      const inventory = await Inventory.find({ user_id: userId });
      
      const lowStockItems = inventory.filter(item => {
        const minLevel = threshold || item.min_stock_level || 5;
        return item.stock_qty <= minLevel && item.stock_qty > 0;
      });

      const outOfStockItems = inventory.filter(item => item.stock_qty <= 0);

      return {
        low_stock: lowStockItems.map(item => ({
          item_name: item.item_name,
          current_stock: item.stock_qty,
          min_stock_level: item.min_stock_level || 5,
          category: item.category,
          price_per_unit: item.price_per_unit
        })),
        out_of_stock: outOfStockItems.map(item => ({
          item_name: item.item_name,
          category: item.category,
          last_price: item.price_per_unit
        })),
        total_low_stock: lowStockItems.length,
        total_out_of_stock: outOfStockItems.length
      };
    } catch (error) {
      console.error('getLowStockItems error:', error);
      throw error;
    }
  }

  /**
   * Get top selling products (by quantity and revenue)
   */
  async getTopSellingProducts(userId, limit = 10, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sales = await Sale.find({
        user_id: userId,
        createdAt: { $gte: startDate }
      });

      // Aggregate sales by item
      const itemStats = {};
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!itemStats[item.item_name]) {
            itemStats[item.item_name] = {
              item_name: item.item_name,
              total_quantity: 0,
              total_revenue: 0,
              total_profit: 0,
              sales_count: 0
            };
          }
          
          const itemRevenue = item.quantity * item.price_per_unit;
          const itemCost = item.quantity * (item.cost_per_unit || 0);
          
          itemStats[item.item_name].total_quantity += item.quantity;
          itemStats[item.item_name].total_revenue += itemRevenue;
          itemStats[item.item_name].total_profit += (itemRevenue - itemCost);
          itemStats[item.item_name].sales_count += 1;
        });
      });

      // Convert to array and sort
      const topByRevenue = Object.values(itemStats)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      const topByQuantity = Object.values(itemStats)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, limit);

      return {
        period_days: days,
        top_by_revenue: topByRevenue,
        top_by_quantity: topByQuantity,
        total_unique_products_sold: Object.keys(itemStats).length
      };
    } catch (error) {
      console.error('getTopSellingProducts error:', error);
      throw error;
    }
  }

  /**
   * Get monthly revenue summary
   */
  async getMonthlyRevenue(userId, year = null, month = null) {
    try {
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month !== null ? month : now.getMonth();

      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

      const [sales, expenses] = await Promise.all([
        Sale.find({
          user_id: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }),
        Expense.find({
          user_id: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        })
      ]);

      const revenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
      const cogs = sales.reduce((sum, s) => sum + (s.total_cogs || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        year: targetYear,
        month: targetMonth + 1,
        month_name: startDate.toLocaleString('default', { month: 'long' }),
        revenue,
        cogs,
        expenses: totalExpenses,
        gross_profit: revenue - cogs,
        net_profit: revenue - cogs - totalExpenses,
        sales_count: sales.length,
        avg_sale_value: sales.length > 0 ? (revenue / sales.length).toFixed(2) : 0
      };
    } catch (error) {
      console.error('getMonthlyRevenue error:', error);
      throw error;
    }
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseBreakdown(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const expenses = await Expense.find({
        user_id: userId,
        createdAt: { $gte: startDate }
      });

      const breakdown = {};
      let totalExpenses = 0;

      expenses.forEach(expense => {
        const category = expense.category || 'Other';
        if (!breakdown[category]) {
          breakdown[category] = {
            category,
            total_amount: 0,
            count: 0,
            is_sales_expense: expense.is_sales_expense || false
          };
        }
        breakdown[category].total_amount += expense.amount;
        breakdown[category].count += 1;
        totalExpenses += expense.amount;
      });

      const categoriesArray = Object.values(breakdown)
        .sort((a, b) => b.total_amount - a.total_amount);

      return {
        period_days: days,
        total_expenses: totalExpenses,
        categories: categoriesArray,
        expense_count: expenses.length
      };
    } catch (error) {
      console.error('getExpenseBreakdown error:', error);
      throw error;
    }
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(userId) {
    try {
      const inventory = await Inventory.find({ user_id: userId });

      const totalItems = inventory.length;
      const totalStockValue = inventory.reduce((sum, item) => 
        sum + (item.stock_qty * (item.cost_per_unit || item.cost_price || 0)), 0
      );
      const totalRetailValue = inventory.reduce((sum, item) => 
        sum + (item.stock_qty * item.price_per_unit), 0
      );

      const categoryBreakdown = {};
      inventory.forEach(item => {
        const category = item.category || 'Other';
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = {
            category,
            item_count: 0,
            total_units: 0,
            stock_value: 0
          };
        }
        categoryBreakdown[category].item_count += 1;
        categoryBreakdown[category].total_units += item.stock_qty;
        categoryBreakdown[category].stock_value += item.stock_qty * (item.cost_per_unit || item.cost_price || 0);
      });

      return {
        total_items: totalItems,
        total_stock_value: totalStockValue,
        total_retail_value: totalRetailValue,
        potential_profit: totalRetailValue - totalStockValue,
        categories: Object.values(categoryBreakdown),
        low_stock_count: inventory.filter(i => i.stock_qty <= (i.min_stock_level || 5)).length,
        out_of_stock_count: inventory.filter(i => i.stock_qty <= 0).length
      };
    } catch (error) {
      console.error('getInventorySummary error:', error);
      throw error;
    }
  }

  /**
   * Get pending customer orders
   */
  async getPendingOrders(userId) {
    try {
      const pendingOrders = await CustomerRequest.find({
        retailer_id: userId,
        status: 'pending'
      }).sort({ createdAt: -1 });

      const totalOrderValue = pendingOrders.reduce((sum, order) => 
        sum + (order.total_amount || 0), 0
      );

      return {
        pending_count: pendingOrders.length,
        total_value: totalOrderValue,
        orders: pendingOrders.map(order => ({
          order_id: order._id,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          items_count: order.items?.length || 0,
          total_amount: order.total_amount,
          created_at: order.createdAt
        }))
      };
    } catch (error) {
      console.error('getPendingOrders error:', error);
      throw error;
    }
  }

  /**
   * Get business overview (lightweight summary)
   */
  async getBusinessOverview(userId) {
    try {
      const [todayProfit, lowStock, pendingOrders, inventorySummary] = await Promise.all([
        this.getTodaysProfit(userId),
        this.getLowStockItems(userId),
        this.getPendingOrders(userId),
        this.getInventorySummary(userId)
      ]);

      return {
        today: todayProfit,
        inventory: {
          total_items: inventorySummary.total_items,
          low_stock_count: lowStock.total_low_stock,
          out_of_stock_count: lowStock.total_out_of_stock,
          total_value: inventorySummary.total_stock_value
        },
        orders: {
          pending_count: pendingOrders.pending_count,
          total_value: pendingOrders.total_value
        }
      };
    } catch (error) {
      console.error('getBusinessOverview error:', error);
      throw error;
    }
  }

  /**
   * Get festival demand forecast (context-aware)
   * Server-side processing - NO raw data sent to LLM
   */
  async getFestivalDemandForecast(userId) {
    try {
      return await festivalForecast.getFestivalDemandForecast(userId);
    } catch (error) {
      console.error('getFestivalDemandForecast error:', error);
      throw error;
    }
  }

  /**
   * Get upcoming festivals calendar
   */
  async getUpcomingFestivals(count = 5) {
    try {
      return festivalForecast.getUpcomingFestivals(count);
    } catch (error) {
      console.error('getUpcomingFestivals error:', error);
      throw error;
    }
  }
}

module.exports = new BusinessToolsService();
