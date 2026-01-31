import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Brain,
  Search,
  ShoppingCart,
  CreditCard,
  AlertCircle,
  CheckCircle,
  UserPlus
} from 'lucide-react';
import { salesAPI, expensesAPI, inventoryAPI, customersAPI, profitAnalyticsAPI, aiAPI } from '../services/api';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [profitData, setProfitData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentActivities, setRecentActivities] = useState([]);

  const handleQuickAction = (path) => {
    navigate(path);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      
      const [sRes, eRes, iRes, cRes] = await Promise.all([
        salesAPI.getSales(),
        expensesAPI.getExpenses(),
        inventoryAPI.getInventory(),
        customersAPI.getCustomers(),
      ]);

      const salesData = (sRes?.success && Array.isArray(sRes.data)) ? sRes.data : [];
      const expensesData = (eRes?.success && Array.isArray(eRes.data)) ? eRes.data : [];
      const inventoryData = (iRes?.success && Array.isArray(iRes.data)) ? iRes.data : [];
      const customersData = (cRes?.success && Array.isArray(cRes.data)) ? cRes.data : [];

      setSales(salesData);
      setExpenses(expensesData);
      setInventory(inventoryData);
      setCustomers(customersData);
      
      // Calculate profit manually first
      const totalSales = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalInventoryValue = inventoryData.reduce((sum, i) => sum + (Number(i.stock_qty || 0) * Number(i.price_per_unit || 0)), 0);
      
      // Calculate profit manually from sales data
      const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalCOGS = salesData.reduce((sum, s) => sum + Number(s.total_cogs || 0), 0);
      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;
      
      // Try profit API, fallback to manual calculation
      try {
        const pRes = await profitAnalyticsAPI.getProfitAnalysis();
        if (pRes?.success && pRes.data && pRes.data.revenue > 0) {
          setProfitData(pRes.data);
          console.log('✅ Using profit API data:', pRes.data);
        } else {
          throw new Error('Invalid API data, using manual calculation');
        }
      } catch (profitError) {
        console.log('⚠️ Using manual profit calculation');
        setProfitData({
          revenue: totalRevenue,
          totalCOGS: totalCOGS,
          grossProfit: grossProfit,
          netProfit: netProfit,
          netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0,
          salesCount: salesData.length,
          inventoryValue: totalInventoryValue
        });
      }
      
      // Generate recent activities from real data
      generateRecentActivities(salesData, expensesData, inventoryData, customersData);
      
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivities = (salesData, expensesData, inventoryData, customersData) => {
    const activities = [];
    
    salesData.slice(0, 3).forEach(sale => {
      activities.push({
        id: `sale-${sale._id}`,
        type: 'sale',
        icon: ShoppingCart,
        message: `Sale of ₹${sale.total_amount} recorded`,
        time: sale.createdAt || sale.date,
        status: 'success'
      });
    });
    
    expensesData.slice(0, 2).forEach(expense => {
      activities.push({
        id: `expense-${expense._id}`,
        type: 'expense',
        icon: CreditCard,
        message: `${expense.category || 'Expense'}: ₹${expense.amount}`,
        time: expense.createdAt || expense.date,
        status: 'info'
      });
      
    });
    
    const lowStock = inventoryData.filter(item => item.stock_qty <= (item.min_stock_level || 5));
    if (lowStock.length > 0) {
      activities.push({
        id: 'low-stock',
        type: 'inventory',
        icon: AlertCircle,
        message: `${lowStock.length} items low on stock`,
        time: new Date(),
        status: 'warning'
      });
    }
    
    customersData.slice(0, 2).forEach(customer => {
      activities.push({
        id: `customer-${customer._id}`,
        type: 'customer',
        icon: UserPlus,
        message: `Customer ${customer.name} added`,
        time: customer.createdAt,
        status: 'success'
      });
    });
    
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivities(activities.slice(0, 5));
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

  // Calculate values
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalInventoryValue = inventory.reduce((sum, i) => sum + (Number(i.stock_qty || 0) * Number(i.price_per_unit || 0)), 0);
  const basicProfit = totalSales - totalExpenses;
  
  // Calculate profit margin properly - use API data only if it has valid values, otherwise calculate
  const actualProfit = (profitData && profitData.revenue > 0) ? profitData.netProfit : basicProfit;
  const actualRevenue = (profitData && profitData.revenue > 0) ? profitData.revenue : totalSales;
  const profitMargin = actualRevenue > 0 ? (actualProfit / actualRevenue * 100) : 0;
  
  console.log('Dashboard Calculation Debug:', {
    totalSales,
    totalExpenses,
    basicProfit,
    profitDataFromAPI: profitData,
    actualProfit,
    actualRevenue,
    profitMargin
  });
  
  // Stats cards with REAL profit values
  const stats = [
    { 
      name: t('dashboard.stats.netProfit'), 
      value: `₹${actualProfit.toLocaleString()}`, 
      change: `${profitMargin.toFixed(1)}% ${t('dashboard.stats.margin', { value: profitMargin.toFixed(1) }).split('%')[1]}`, 
      changeType: actualProfit >= 0 ? 'positive' : 'negative', 
      icon: TrendingUp 
    },
    { 
      name: t('dashboard.stats.totalRevenue'), 
      value: `₹${(profitData?.revenue || totalSales).toLocaleString()}`, 
      change: `${profitData?.salesCount || sales.length} ${t('dashboard.stats.sales', { count: profitData?.salesCount || sales.length }).split(' ')[1]}`, 
      changeType: 'positive', 
      icon: DollarSign 
    },
    { 
      name: t('dashboard.stats.inventoryValue'), 
      value: `₹${(profitData?.inventoryValue || totalInventoryValue).toLocaleString()}`, 
      change: `${inventory.length} ${t('dashboard.stats.items', { count: inventory.length }).split(' ')[1]}`, 
      changeType: 'neutral', 
      icon: Package 
    },
    { 
      name: t('dashboard.stats.activeCustomers'), 
      value: String(customers.length), 
      change: t('dashboard.stats.growing'), 
      changeType: 'positive', 
      icon: Users 
    },
  ];

  // Search functionality
  const filteredData = {
    sales: sales.filter(s => 
      !searchQuery || 
      s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.payment_method?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    expenses: expenses.filter(e => 
      !searchQuery || 
      e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    inventory: inventory.filter(i => 
      !searchQuery || 
      i.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    customers: customers.filter(c => 
      !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    )
  };
  
  const searchResults = [
    ...filteredData.sales.map(s => ({ type: 'Sale', name: s.customer_name || 'Walk-in', amount: s.total_amount })),
    ...filteredData.expenses.map(e => ({ type: 'Expense', name: e.category, amount: e.amount })),
    ...filteredData.inventory.map(i => ({ type: 'Inventory', name: i.item_name, amount: i.stock_qty })),
    ...filteredData.customers.map(c => ({ type: 'Customer', name: c.name, amount: c.phone }))
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-white" />
          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10 w-full md:w-auto">
              {searchResults.map((result, idx) => (
                <div key={idx} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{result.type}</span>
                      <p className="text-sm text-gray-900 dark:text-white">{result.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-white">
                      {result.type === 'Inventory' ? `${result.amount} units` : result.type === 'Customer' ? result.amount : `₹${result.amount}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg px-4 py-3 z-10">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-black overflow-hidden shadow rounded-lg border border-transparent dark:border-gray-800 p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.name}</dt>
                  <dd className="flex flex-col">
                    <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white break-all">{stat.value}</p>
                    <p className={`mt-1 flex items-baseline text-xs sm:text-sm font-semibold ${stat.changeType === 'positive' ? 'text-green-600' : stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'}`}>
                      {stat.change}
                    </p>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AI Daily Digest */}
        <div className="bg-white dark:bg-black border border-transparent dark:border-gray-800 p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white flex items-center mb-4">
            <Brain className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            {t('dashboard.digest.title')}
          </h3>
          <div className="space-y-3">
            {actualProfit !== undefined && actualProfit !== null ? (
              <>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2">{t('dashboard.digest.performance')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('dashboard.digest.performanceText', { profit: actualProfit.toLocaleString(), margin: profitMargin.toFixed(1) })}
                    {actualProfit > 0 ? t('dashboard.digest.performanceGood') : t('dashboard.digest.performanceBad')}
                  </p>
                </div>
                {inventory.filter(i => i.stock_qty <= (i.min_stock_level || 5)).length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">{t('dashboard.digest.stockAlert')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {t('dashboard.digest.stockAlertText', { count: inventory.filter(i => i.stock_qty <= (i.min_stock_level || 5)).length })}
                    </p>
                  </div>
                )}
                {profitData.salesCount > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">{t('dashboard.digest.salesUpdate')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {t('dashboard.digest.salesUpdateText', { count: profitData.salesCount, revenue: profitData.revenue?.toLocaleString() })}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('dashboard.digest.noData')}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white dark:bg-black border border-transparent dark:border-gray-800 p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4 sm:mb-6">{t('dashboard.quickActions.title')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
             <button 
               onClick={() => handleQuickAction('/sales')} 
               className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 font-medium rounded-lg px-4 py-4 sm:px-8 sm:py-8 text-center transition-all shadow-sm hover:shadow-md"
             >
               <ShoppingCart className="h-6 w-6 sm:h-10 sm:w-10" />
               <span className="text-xs sm:text-base font-semibold">{t('dashboard.quickActions.recordSale')}</span>
             </button>
             <button 
               onClick={() => handleQuickAction('/expenses')} 
               className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 font-medium rounded-lg px-4 py-4 sm:px-8 sm:py-8 text-center transition-all shadow-sm hover:shadow-md"
             >
               <CreditCard className="h-6 w-6 sm:h-10 sm:w-10" />
               <span className="text-xs sm:text-base font-semibold">{t('dashboard.quickActions.addExpense')}</span>
             </button>
             <button 
               onClick={() => handleQuickAction('/inventory')} 
               className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 font-medium rounded-lg px-4 py-4 sm:px-8 sm:py-8 text-center transition-all shadow-sm hover:shadow-md"
             >
               <Package className="h-6 w-6 sm:h-10 sm:w-10" />
               <span className="text-xs sm:text-base font-semibold">{t('dashboard.quickActions.updateInventory')}</span>
             </button>
             <button 
               onClick={() => handleQuickAction('/customers')} 
               className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-full text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 font-medium rounded-lg px-4 py-4 sm:px-8 sm:py-8 text-center transition-all shadow-sm hover:shadow-md"
             >
               <UserPlus className="h-6 w-6 sm:h-10 sm:w-10" />
               <span className="text-xs sm:text-base font-semibold">{t('dashboard.quickActions.addCustomer')}</span>
             </button>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white dark:bg-black border border-transparent dark:border-gray-800 p-4 sm:p-6 rounded-lg shadow">
         <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">{t('dashboard.recentActivity.title')}</h3>
         <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start sm:items-center space-x-3">
                   <div className={`flex-shrink-0 p-2 rounded-full ${activity.status === 'success' ? 'bg-green-100 text-green-500' : activity.status === 'warning' ? 'bg-yellow-100 text-yellow-500' : 'bg-blue-100 text-blue-500'}`}>
                    <ActivityIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs sm:text-sm text-gray-900 dark:text-white">{activity.message}</p>
                   </div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{timeAgo(activity.time)}</p>
                 </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activity. Start by creating a sale or adding inventory!</p>
          )}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
