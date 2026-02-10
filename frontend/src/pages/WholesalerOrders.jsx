import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Check, X, Truck, ArrowLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const WholesalerOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('REQUESTED');

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/orders/wholesaler?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setOrders(result.data.orders);
            }
            setIsLoading(false);
        } catch (error) {
            toast.error('Failed to load orders');
            setIsLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, status, note) => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, note })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`Order ${status.toLowerCase()}`);
                fetchOrders();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to update order');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'REQUESTED': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'ACCEPTED': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'PACKED': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'DISPATCHED': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
            'DELIVERED': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getOrdersByStatus = (status) => {
        return orders.filter(order => order.status === status);
    };

    const getTabCount = (status) => {
        return getOrdersByStatus(status).length;
    };

    const tabs = [
        { id: 'REQUESTED', label: 'Pending', icon: Clock, color: 'yellow' },
        { id: 'ACCEPTED', label: 'Accepted', icon: Check, color: 'blue' },
        { id: 'PACKED', label: 'Packed', icon: Package, color: 'purple' },
        { id: 'DISPATCHED', label: 'In Transit', icon: Truck, color: 'indigo' },
        { id: 'DELIVERED', label: 'Delivered', icon: Check, color: 'green' }
    ];

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center space-x-4 mb-6">
                    <button onClick={() => navigate('/wholesaler-dashboard')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Orders</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Accept and track retailer orders</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-1 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const count = getTabCount(tab.id);
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${isActive
                                            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{tab.label}</span>
                                    {count > 0 && (
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive
                                                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Orders Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {getOrdersByStatus(activeTab).length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No orders in this category</p>
                        </div>
                    ) : (
                        getOrdersByStatus(activeTab).map((order) => (
                            <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Retailer: {order.retailer?.shop_name || order.retailer?.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {order.retailer?.phone}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">₹{order.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Items:</h4>
                                    <div className="space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">{item.productName} ({item.quantity} {item.unit})</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">₹{item.totalPrice.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {order.status === 'REQUESTED' && (
                                    <div className="flex space-x-3">
                                        <button onClick={() => updateOrderStatus(order._id, 'ACCEPTED', 'Order accepted by wholesaler')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
                                            <Check className="h-5 w-5" /><span>Accept Order</span>
                                        </button>
                                        <button onClick={() => updateOrderStatus(order._id, 'CANCELLED', 'Order cancelled by wholesaler')} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2">
                                            <X className="h-5 w-5" /><span>Reject Order</span>
                                        </button>
                                    </div>
                                )}

                                {order.status === 'ACCEPTED' && (
                                    <button onClick={() => updateOrderStatus(order._id, 'PACKED', 'Order packed and ready')} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2">
                                        <Package className="h-5 w-5" /><span>Mark as Packed</span>
                                    </button>
                                )}

                                {order.status === 'PACKED' && (
                                    <button onClick={() => updateOrderStatus(order._id, 'DISPATCHED', 'Order dispatched for delivery')} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2">
                                        <Truck className="h-5 w-5" /><span>Mark as Dispatched</span>
                                    </button>
                                )}

                                {order.status === 'DISPATCHED' && (
                                    <button onClick={() => updateOrderStatus(order._id, 'DELIVERED', 'Order delivered successfully')} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
                                        <Check className="h-5 w-5" /><span>Mark as Delivered</span>
                                    </button>
                                )}

                                {order.status === 'DELIVERED' && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                        <p className="text-sm text-green-800 dark:text-green-200 text-center">✅ Order completed</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default WholesalerOrders;
