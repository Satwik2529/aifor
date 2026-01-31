const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');

/**
 * Profit Analytics Controller
 * Handles accurate profit calculations with COGS and expenses
 * 
 * Formula:
 * - Revenue = Total Sales Amount
 * - COGS = Total Cost of Goods Sold
 * - Gross Profit = Revenue - COGS
 * - Sales Expenses = Expenses marked as sales-related
 * - Operating Expenses = Other business expenses
 * - Net Profit = Gross Profit - Sales Expenses - Operating Expenses
 */

const profitAnalyticsController = {
  /**
   * Get comprehensive profit analysis
   * Calculates all profit metrics accurately
   */
  getProfitAnalysis: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      // Build date filter
      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.date = {};
        if (start_date) dateFilter.date.$gte = new Date(start_date);
        if (end_date) dateFilter.date.$lte = new Date(end_date);
      }

      // 1. Get Total Revenue and COGS from Sales
      const salesData = await Sale.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total_amount' },
            totalCOGS: { $sum: '$total_cogs' },
            grossProfit: { $sum: '$gross_profit' },
            salesCount: { $sum: 1 }
          }
        }
      ]);

      const revenue = salesData[0]?.totalRevenue || 0;
      const cogs = salesData[0]?.totalCOGS || 0;
      const grossProfit = salesData[0]?.grossProfit || 0;
      const salesCount = salesData[0]?.salesCount || 0;

      // 2. Get Sales-Related Expenses
      const salesExpenses = await Expense.aggregate([
        { $match: { ...dateFilter, is_sales_expense: true } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalSalesExpenses = salesExpenses[0]?.total || 0;

      // 3. Get Operating Expenses (non-sales)
      const operatingExpenses = await Expense.aggregate([
        { $match: { ...dateFilter, is_sales_expense: false } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalOperatingExpenses = operatingExpenses[0]?.total || 0;

      // 4. Calculate Net Profit
      const netProfit = grossProfit - totalSalesExpenses - totalOperatingExpenses;

      // 5. Get Current Inventory Value
      const inventoryValue = await Inventory.aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$stock_qty', '$price_per_unit'] } }
          }
        }
      ]);
      const totalInventoryValue = inventoryValue[0]?.totalValue || 0;

      // 6. Calculate Profit Margins
      const grossProfitMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0;
      const netProfitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

      res.status(200).json({
        success: true,
        message: 'Profit analysis retrieved successfully',
        data: {
          revenue: revenue,
          cogs: cogs,
          grossProfit: grossProfit,
          salesExpenses: totalSalesExpenses,
          operatingExpenses: totalOperatingExpenses,
          totalExpenses: totalSalesExpenses + totalOperatingExpenses,
          netProfit: netProfit,
          grossProfitMargin: parseFloat(grossProfitMargin),
          netProfitMargin: parseFloat(netProfitMargin),
          salesCount: salesCount,
          inventoryValue: totalInventoryValue,
          period: { start_date, end_date }
        },
        breakdown: {
          formula: 'Net Profit = Revenue - COGS - Sales Expenses - Operating Expenses',
          calculation: `${netProfit.toFixed(2)} = ${revenue} - ${cogs} - ${totalSalesExpenses} - ${totalOperatingExpenses}`
        }
      });
    } catch (error) {
      console.error('Profit analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating profit analysis',
        error: error.message
      });
    }
  },

  /**
   * Get detailed sales breakdown with COGS per item
   */
  getSalesBreakdown: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.date = {};
        if (start_date) dateFilter.date.$gte = new Date(start_date);
        if (end_date) dateFilter.date.$lte = new Date(end_date);
      }

      const sales = await Sale.find(dateFilter)
        .sort({ date: -1 })
        .select('date items total_amount total_cogs gross_profit payment_method');

      const breakdown = sales.map(sale => ({
        saleId: sale._id,
        date: sale.date,
        revenue: sale.total_amount,
        cogs: sale.total_cogs,
        grossProfit: sale.gross_profit,
        profitMargin: sale.total_amount > 0 
          ? ((sale.gross_profit / sale.total_amount) * 100).toFixed(2) 
          : 0,
        paymentMethod: sale.payment_method,
        items: sale.items.map(item => ({
          name: item.item_name,
          quantity: item.quantity,
          sellingPrice: item.price_per_unit,
          costPrice: item.cost_per_unit,
          revenue: item.quantity * item.price_per_unit,
          cogs: item.quantity * item.cost_per_unit,
          profit: (item.quantity * item.price_per_unit) - (item.quantity * item.cost_per_unit)
        }))
      }));

      res.status(200).json({
        success: true,
        message: 'Sales breakdown retrieved successfully',
        data: breakdown,
        count: breakdown.length
      });
    } catch (error) {
      console.error('Sales breakdown error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sales breakdown',
        error: error.message
      });
    }
  },

  /**
   * Get expenses breakdown (sales vs operating)
   */
  getExpensesBreakdown: async (req, res) => {
    try {
      const userId = req.user._id;
      const { start_date, end_date } = req.query;

      const dateFilter = { user_id: userId };
      if (start_date || end_date) {
        dateFilter.date = {};
        if (start_date) dateFilter.date.$gte = new Date(start_date);
        if (end_date) dateFilter.date.$lte = new Date(end_date);
      }

      // Get sales expenses by category
      const salesExpenses = await Expense.find({ ...dateFilter, is_sales_expense: true })
        .sort({ date: -1 })
        .select('amount description category date');

      // Get operating expenses by category
      const operatingExpenses = await Expense.find({ ...dateFilter, is_sales_expense: false })
        .sort({ date: -1 })
        .select('amount description category date');

      // Aggregate by category
      const salesByCategory = await Expense.aggregate([
        { $match: { ...dateFilter, is_sales_expense: true } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]);

      const operatingByCategory = await Expense.aggregate([
        { $match: { ...dateFilter, is_sales_expense: false } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Expenses breakdown retrieved successfully',
        data: {
          salesExpenses: {
            items: salesExpenses,
            byCategory: salesByCategory,
            total: salesExpenses.reduce((sum, e) => sum + e.amount, 0)
          },
          operatingExpenses: {
            items: operatingExpenses,
            byCategory: operatingByCategory,
            total: operatingExpenses.reduce((sum, e) => sum + e.amount, 0)
          }
        }
      });
    } catch (error) {
      console.error('Expenses breakdown error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expenses breakdown',
        error: error.message
      });
    }
  },

  /**
   * Get inventory status with remaining value
   */
  getInventoryStatus: async (req, res) => {
    try {
      const userId = req.user._id;

      const inventory = await Inventory.find({ user_id: userId })
        .sort({ item_name: 1 })
        .select('item_name stock_qty price_per_unit min_stock_level');

      const inventoryDetails = inventory.map(item => ({
        itemName: item.item_name,
        quantity: item.stock_qty,
        costPerUnit: item.price_per_unit,
        totalValue: item.stock_qty * item.price_per_unit,
        isLowStock: item.stock_qty <= item.min_stock_level
      }));

      const totalValue = inventoryDetails.reduce((sum, item) => sum + item.totalValue, 0);
      const lowStockCount = inventoryDetails.filter(item => item.isLowStock).length;

      res.status(200).json({
        success: true,
        message: 'Inventory status retrieved successfully',
        data: {
          items: inventoryDetails,
          totalItems: inventory.length,
          totalValue: totalValue,
          lowStockCount: lowStockCount
        }
      });
    } catch (error) {
      console.error('Inventory status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory status',
        error: error.message
      });
    }
  },

  /**
   * Get sales vs expenses time series data
   * Returns daily aggregated data for charts
   */
  getSalesVsExpensesTimeSeries: async (req, res) => {
    try {
      const userId = req.user._id;
      const { days = 7 } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Get sales by day
      const salesByDay = await Sale.aggregate([
        { 
          $match: { 
            user_id: userId,
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        {
          $group: {
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            sales: { $sum: '$total_amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Get expenses by day
      const expensesByDay = await Expense.aggregate([
        { 
          $match: { 
            user_id: userId,
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        {
          $group: {
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            expenses: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Create a complete date range
      const dateMap = {};
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateMap[dateStr] = { date: dateStr, sales: 0, expenses: 0 };
      }
      
      // Fill in sales data
      salesByDay.forEach(item => {
        if (dateMap[item._id]) {
          dateMap[item._id].sales = item.sales;
        }
      });
      
      // Fill in expenses data
      expensesByDay.forEach(item => {
        if (dateMap[item._id]) {
          dateMap[item._id].expenses = item.expenses;
        }
      });
      
      // Convert to array and format dates
      const timeSeriesData = Object.values(dateMap).map(item => ({
        name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: item.date,
        sales: Math.round(item.sales),
        expenses: Math.round(item.expenses),
        profit: Math.round(item.sales - item.expenses)
      }));
      
      res.status(200).json({
        success: true,
        message: 'Time series data retrieved successfully',
        data: timeSeriesData
      });
    } catch (error) {
      console.error('Time series error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching time series data',
        error: error.message
      });
    }
  },

  /**
   * Get sales by category
   * Aggregates sales data by inventory categories
   */
  getSalesByCategory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { days = 30 } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Get all sales within date range
      const sales = await Sale.find({
        user_id: userId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('user_id', 'name');
      
      // Get all inventory items to map categories
      const inventoryItems = await Inventory.find({ user_id: userId });
      const categoryMap = {};
      inventoryItems.forEach(item => {
        categoryMap[item.item_name.toLowerCase()] = item.category || 'Other';
      });
      
      // Aggregate sales by category
      const categoryData = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const category = categoryMap[item.item_name.toLowerCase()] || 'Other';
          if (!categoryData[category]) {
            categoryData[category] = { value: 0, count: 0 };
          }
          categoryData[category].value += item.quantity * item.price_per_unit;
          categoryData[category].count += item.quantity;
        });
      });
      
      // Convert to array and add colors
      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];
      const categoryArray = Object.entries(categoryData).map(([name, data], index) => ({
        name,
        value: Math.round(data.value),
        count: data.count,
        color: colors[index % colors.length]
      })).sort((a, b) => b.value - a.value);
      
      res.status(200).json({
        success: true,
        message: 'Sales by category retrieved successfully',
        data: categoryArray
      });
    } catch (error) {
      console.error('Sales by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sales by category',
        error: error.message
      });
    }
  },

  /**
   * Get top selling products
   * Returns products with highest sales
   */
  getTopProducts: async (req, res) => {
    try {
      const userId = req.user._id;
      const { days = 30, limit = 5 } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Get all sales within date range and unwind items
      const topProducts = await Sale.aggregate([
        { 
          $match: { 
            user_id: userId,
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.item_name',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { 
              $sum: { $multiply: ['$items.quantity', '$items.price_per_unit'] }
            },
            salesCount: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: parseInt(limit) }
      ]);
      
      const formattedProducts = topProducts.map(product => ({
        name: product._id,
        sales: product.totalQuantity,
        revenue: Math.round(product.totalRevenue),
        transactions: product.salesCount
      }));
      
      res.status(200).json({
        success: true,
        message: 'Top products retrieved successfully',
        data: formattedProducts
      });
    } catch (error) {
      console.error('Top products error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching top products',
        error: error.message
      });
    }
  },

  /**
   * Get performance insights with month-over-month comparisons
   * Returns insights for analytics dashboard
   */
  getPerformanceInsights: async (req, res) => {
    try {
      const userId = req.user._id;
      const Customer = require('../models/Customer');
      
      // Get current month dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get last month dates
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Current month sales
      const currentMonthSales = await Sale.aggregate([
        { $match: { user_id: userId, createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 }, avgOrder: { $avg: '$total_amount' } } }
      ]);
      
      // Last month sales
      const lastMonthSales = await Sale.aggregate([
        { $match: { user_id: userId, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 }, avgOrder: { $avg: '$total_amount' } } }
      ]);
      
      // New customers this month
      const newCustomers = await Customer.countDocuments({
        user_id: userId,
        createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
      });
      
      // Calculate changes
      const currentSales = currentMonthSales[0]?.total || 0;
      const lastSales = lastMonthSales[0]?.total || 0;
      
      // Handle sales change calculation
      let salesChange = 0;
      if (lastSales > 0) {
        salesChange = (((currentSales - lastSales) / lastSales) * 100).toFixed(1);
      } else if (currentSales > 0) {
        salesChange = 100; // If no previous sales but have current sales, show 100% increase
      }
      
      const currentAvgOrder = currentMonthSales[0]?.avgOrder || 0;
      const lastAvgOrder = lastMonthSales[0]?.avgOrder || 0;
      
      // Handle avg order change calculation
      let avgOrderChange = 0;
      if (lastAvgOrder > 0) {
        avgOrderChange = (((currentAvgOrder - lastAvgOrder) / lastAvgOrder) * 100).toFixed(1);
      } else if (currentAvgOrder > 0) {
        avgOrderChange = 100;
      }
      
      // Get low stock items (comparing stock_qty with each item's min_stock_level)
      const allItems = await Inventory.find({ user_id: userId })
        .select('item_name stock_qty min_stock_level');
      
      // Count low stock items
      const lowStockItems = allItems.filter(item => item.stock_qty <= item.min_stock_level).length;
      
      res.status(200).json({
        success: true,
        message: 'Performance insights retrieved successfully',
        data: {
          salesChange: {
            percentage: parseFloat(salesChange),
            direction: salesChange >= 0 ? 'up' : 'down',
            currentMonth: currentSales,
            lastMonth: lastSales
          },
          avgOrderValue: {
            percentage: parseFloat(avgOrderChange),
            direction: avgOrderChange >= 0 ? 'up' : 'down',
            current: Math.round(currentAvgOrder),
            last: Math.round(lastAvgOrder)
          },
          newCustomers: newCustomers,
          currentMonthOrders: currentMonthSales[0]?.count || 0,
          lowStockItems: lowStockItems
        }
      });
    } catch (error) {
      console.error('Performance insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching performance insights',
        error: error.message
      });
    }
  }
};

module.exports = profitAnalyticsController;
