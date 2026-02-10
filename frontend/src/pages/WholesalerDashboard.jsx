import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, Users, LogOut, Settings, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

const WholesalerDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        profitMargin: 0,
        activeProducts: 0
    });
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            // Fetch orders
            const ordersResponse = await fetch(`${API_BASE_URL}/api/wholesalers/orders/wholesaler?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Fetch inventory
            const inventoryResponse = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/my?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (ordersResponse.ok && inventoryResponse.ok) {
                const ordersData = await ordersResponse.json();
                const inventoryData = await inventoryResponse.json();

                if (ordersData.success && inventoryData.success) {
                    const allOrders = ordersData.data.orders;
                    const inventory = inventoryData.data.inventory;

                    setOrders(allOrders);

                    const pending = allOrders.filter(o => o.status === 'REQUESTED').length;
                    const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED');
                    const revenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

                    // Calculate cost and profit
                    let totalCost = 0;
                    deliveredOrders.forEach(order => {
                        order.items.forEach(item => {
                            const product = inventory.find(p => p._id === item.productId);
                            if (product && product.costPrice) {
                                totalCost += product.costPrice * item.quantity;
                            }
                        });
                    });

                    const netProfit = revenue - totalCost;
                    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;
                    const activeProducts = inventory.filter(p => p.isActive).length;

                    setStats({
                        totalOrders: ordersData.data.pagination.total,
                        pendingOrders: pending,
                        totalRevenue: revenue,
                        totalCost,
                        netProfit,
                        profitMargin: parseFloat(profitMargin),
                        activeProducts
                    });
                }
            }
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to load data');
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        toast.success('Logged out');
        navigate('/login');
    };

    const getStatusColor = (status) => {
        const colors = {
            'REQUESTED': 'bg-yellow-100 text-yellow-800', 'ACCEPTED': 'bg-blue-100 text-blue-800',
            'PACKED': 'bg-purple-100 text-purple-800', 'DISPATCHED': 'bg-indigo-100 text-indigo-800',
            'DELIVERED': 'bg-green-100 text-green-800', 'CANCELLED': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <Package className="h-8 w-8 text-primary-600" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wholesaler Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => navigate('/wholesaler/profile-settings')} className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600"><Settings className="h-6 w-6" /></button>
                            <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"><LogOut className="h-5 w-5" /><span>Logout</span></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p><p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalOrders}</p></div>
                            <ShoppingCart className="h-12 w-12 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</p><p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.pendingOrders}</p></div>
                            <Package className="h-12 w-12 text-yellow-600" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-100">Net Profit 💰</p>
                                <p className="text-3xl font-bold mt-2">₹{stats.netProfit.toLocaleString()}</p>
                                <p className="text-xs text-green-100 mt-1">{stats.profitMargin}% margin</p>
                            </div>
                            <TrendingUp className="h-12 w-12 text-green-100" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Cost: ₹{stats.totalCost.toLocaleString()}</p>
                            </div>
                            <Users className="h-12 w-12 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <button onClick={() => navigate('/wholesaler/ai-insights')} className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow text-white">
                        <Brain className="h-12 w-12 mb-3" />
                        <h3 className="text-xl font-bold mb-2">AI Business Insights</h3>
                        <p className="text-sm text-purple-100">Get AI-powered recommendations for slow-moving products, pricing, and personalized offers</p>
                    </button>
                    <button onClick={() => navigate('/wholesaler/inventory')} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                        <Package className="h-8 w-8 text-primary-600 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Manage Inventory</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Add, update products and bulk discounts</p>
                    </button>
                    <button onClick={() => navigate('/wholesaler/orders')} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                        <ShoppingCart className="h-8 w-8 text-primary-600 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">View All Orders</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manage and track orders</p>
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
                    </div>
                    <div className="p-6">
                        {orders.length === 0 ? (
                            <div className="text-center py-12"><ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400">No orders yet</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retailer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th></tr></thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {orders.slice(0, 5).map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{order.orderNumber}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{order.retailer?.shop_name || order.retailer?.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">₹{order.totalAmount.toLocaleString()}</td>
                                                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>{order.status}</span></td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default WholesalerDashboard;
