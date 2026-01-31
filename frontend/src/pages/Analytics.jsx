import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Wallet, Receipt } from 'lucide-react';
import { profitAnalyticsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

const Analytics = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [profitData, setProfitData] = useState(null);
    const [inventoryStatus, setInventoryStatus] = useState(null);
    const [timeSeriesData, setTimeSeriesData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [insights, setInsights] = useState(null);

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            try {
                setLoading(true);
                
                // Map timeRange to days
                const daysMap = {
                    '7d': 7,
                    '30d': 30,
                    '90d': 90,
                    '1y': 365
                };
                const days = daysMap[timeRange] || 7;
                
                const [profitRes, inventoryRes, timeSeriesRes, categoryRes, topProductsRes, insightsRes] = await Promise.all([
                    profitAnalyticsAPI.getProfitAnalysis().catch(err => {
                        console.warn('⚠️ Profit analytics API error:', err.message);
                        return { success: false };
                    }),
                    profitAnalyticsAPI.getInventoryStatus().catch(err => {
                        console.warn('⚠️ Inventory status API error:', err.message);
                        return { success: false };
                    }),
                    profitAnalyticsAPI.getTimeSeries({ days }).catch(err => {
                        console.warn('⚠️ Time series API error:', err.message);
                        return { success: false };
                    }),
                    profitAnalyticsAPI.getSalesByCategory({ days }).catch(err => {
                        console.warn('⚠️ Sales by category API error:', err.message);
                        return { success: false };
                    }),
                    profitAnalyticsAPI.getTopProducts({ days, limit: 5 }).catch(err => {
                        console.warn('⚠️ Top products API error:', err.message);
                        return { success: false };
                    }),
                    profitAnalyticsAPI.getPerformanceInsights().catch(err => {
                        console.warn('⚠️ Performance insights API error:', err.message);
                        return { success: false };
                    })
                ]);
                
                if (profitRes?.success) {
                    setProfitData(profitRes.data);
                }
                
                if (inventoryRes?.success) {
                    setInventoryStatus(inventoryRes.data);
                }
                
                if (timeSeriesRes?.success) {
                    setTimeSeriesData(timeSeriesRes.data);
                }
                
                if (categoryRes?.success) {
                    setCategoryData(categoryRes.data);
                }
                
                if (topProductsRes?.success) {
                    setTopProducts(topProductsRes.data);
                }
                
                if (insightsRes?.success) {
                    setInsights(insightsRes.data);
                }
            } catch (error) {
                console.error('❌ Error fetching analytics data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchAnalyticsData();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('analytics.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('analytics.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="input-field"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>
                </div>
            </div>

            {/* Profit Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{profitData?.revenue?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{profitData?.salesCount || 0} sales</p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* COGS */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">COGS</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{profitData?.cogs?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cost of goods sold</p>
                        </div>
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Receipt className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>

                {/* Gross Profit */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gross Profit</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{profitData?.grossProfit?.toLocaleString() || 0}</p>
                            <p className="text-xs text-green-600 mt-1">{profitData?.grossProfitMargin || 0}% margin</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{profitData?.netProfit?.toLocaleString() || 0}</p>
                            <p className="text-xs text-purple-600 mt-1">{profitData?.netProfitMargin || 0}% margin</p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Wallet className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses & Inventory Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sales Expenses */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div className="w-full">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sales Expenses</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">₹{profitData?.salesExpenses?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Marketing, commissions, shipping</p>
                        </div>
                    </div>
                </div>

                {/* Operating Expenses */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div className="w-full">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Operating Expenses</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">₹{profitData?.operatingExpenses?.toLocaleString() || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rent, utilities, salaries</p>
                        </div>
                    </div>
                </div>

                {/* Remaining Inventory Value */}
                <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div className="w-full">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                                <Package className="h-4 w-4 mr-1" />
                                Remaining Inventory Value
                            </p>
                            <p className="text-xl font-bold text-indigo-900 dark:text-indigo-400">₹{profitData?.inventoryValue?.toLocaleString() || 0}</p>
                            <p className="text-xs text-indigo-600 mt-1">{inventoryStatus?.totalItems || 0} items in stock</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales vs Expenses */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales vs Expenses</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="sales" fill="#10b981" name="Sales" />
                            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue Trend */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales by Category */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales by Category</h3>
                    {categoryData && categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <p>No category data available</p>
                        </div>
                    )}
                </div>

                {/* Top Products */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Products</h3>
                    {topProducts && topProducts.length > 0 ? (
                        <div className="space-y-3">
                            {topProducts.map((product, index) => (
                                <div key={product.name} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {index + 1}
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.sales} units sold</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">₹{product.revenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <p>No product sales data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Performance Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Insights</h3>
                    {insights ? (
                        <div className="space-y-4">
                            {/* Sales Change */}
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className={`w-2 h-2 ${insights.salesChange.direction === 'up' ? 'bg-green-500' : 'bg-red-500'} rounded-full mt-2`}></div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {insights.salesChange.lastMonth === 0 && insights.salesChange.currentMonth > 0 ? (
                                            `Great start! ₹${insights.salesChange.currentMonth.toLocaleString()} in sales this month`
                                        ) : (
                                            `Sales are ${insights.salesChange.direction} ${Math.abs(insights.salesChange.percentage)}% this month`
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {insights.salesChange.lastMonth === 0 ? (
                                            'First month with sales data'
                                        ) : (
                                            `₹${insights.salesChange.currentMonth.toLocaleString()} vs ₹${insights.salesChange.lastMonth.toLocaleString()} last month`
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Average Order Value */}
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className={`w-2 h-2 ${insights.avgOrderValue.direction === 'up' ? 'bg-green-500' : insights.avgOrderValue.direction === 'down' ? 'bg-yellow-500' : 'bg-gray-500'} rounded-full mt-2`}></div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        Average order value {insights.avgOrderValue.direction === 'up' ? 'increased' : insights.avgOrderValue.direction === 'down' ? 'decreased' : 'unchanged'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        ₹{insights.avgOrderValue.current.toLocaleString()} per order
                                        {insights.avgOrderValue.direction === 'down' && ' - Consider upselling strategies'}
                                    </p>
                                </div>
                            </div>

                            {/* Customer Acquisition */}
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className={`w-2 h-2 ${insights.newCustomers > 0 ? 'bg-blue-500' : 'bg-gray-500'} rounded-full mt-2`}></div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {insights.newCustomers > 0 ? 'Customer acquisition is ' + (insights.newCustomers > 10 ? 'strong' : 'steady') : 'No new customers this month'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {insights.newCustomers} new customers this month
                                    </p>
                                </div>
                            </div>

                            {/* Low Stock Alert */}
                            {insights.lowStockItems > 0 && (
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {insights.lowStockItems} items running low on stock
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Review inventory to avoid stockouts
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading insights...</div>
                    )}
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button 
                            onClick={() => navigate('/sales')}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">View Sales Dashboard</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Access detailed sales data & reports</p>
                        </button>
                        <button 
                            onClick={() => navigate('/customers')}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Customer Management</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">View & manage customer database</p>
                        </button>
                        <button 
                            onClick={() => navigate('/inventory')}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Inventory Management</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Stock levels & performance metrics</p>
                        </button>
                        <button 
                            onClick={() => navigate('/expenses')}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Expense Tracking</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Monitor business expenses</p>
                        </button>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Goals & Targets</h3>
                    {insights && profitData ? (
                        <div className="space-y-4">
                            {/* Monthly Sales Target */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Monthly Sales Target</span>
                                    <span className="text-gray-900 dark:text-white">
                                        ₹{insights.salesChange.currentMonth.toLocaleString()} / ₹{Math.ceil(insights.salesChange.currentMonth * 1.2).toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-green-500 h-2 rounded-full transition-all" 
                                        style={{ width: `${Math.min((insights.salesChange.currentMonth / (insights.salesChange.currentMonth * 1.2)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {insights.salesChange.direction === 'up' ? '📈 On track!' : '💪 Keep pushing!'}
                                </p>
                            </div>

                            {/* Orders This Month */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Orders This Month</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {insights.currentMonthOrders} orders
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all" 
                                        style={{ width: `${Math.min((insights.currentMonthOrders / Math.max(insights.currentMonthOrders * 1.3, 50)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Profit Margin */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Net Profit Margin</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {profitData.netProfitMargin}% (Target: 20%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className={`h-2 rounded-full transition-all ${profitData.netProfitMargin >= 20 ? 'bg-green-500' : profitData.netProfitMargin >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min((profitData.netProfitMargin / 20) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {profitData.netProfitMargin >= 20 ? '🎯 Excellent!' : profitData.netProfitMargin >= 10 ? '👍 Good' : '⚠️ Needs improvement'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading targets...</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
