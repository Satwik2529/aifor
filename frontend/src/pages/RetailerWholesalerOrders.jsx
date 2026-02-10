import React, { useState, useEffect } from 'react';
import { Package, Check, Clock, Truck, Edit2, Save, Plus, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const RetailerWholesalerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingItems, setEditingItems] = useState({});

    useEffect(() => {
        fetchOrders();
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/orders/retailer?limit=100`, {
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

    const openAddToInventoryModal = (order) => {
        setSelectedOrder(order);
        // Initialize editing items with order data
        const items = {};
        order.items.forEach(item => {
            items[item.productId] = {
                productName: item.productName,
                category: item.category,
                unit: item.unit,
                quantity: item.quantity,
                costPrice: item.pricePerUnit, // What retailer paid to wholesaler
                sellingPrice: (item.pricePerUnit * 1.2).toFixed(2), // Suggested 20% markup
                expiryDate: '',
                addToInventory: true
            };
        });
        setEditingItems(items);
    };

    const addToInventory = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const itemsToAdd = Object.entries(editingItems)
                .filter(([_, item]) => item.addToInventory)
                .map(([productId, item]) => ({
                    productName: item.productName,
                    category: item.category,
                    unit: item.unit,
                    quantity: parseFloat(item.quantity),
                    costPrice: parseFloat(item.costPrice),
                    sellingPrice: parseFloat(item.sellingPrice),
                    expiryDate: item.expiryDate || undefined
                }));

            if (itemsToAdd.length === 0) {
                toast.error('No items selected to add');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/orders/${selectedOrder._id}/add-to-my-inventory`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsToAdd })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`Added ${result.data.addedCount} items to your inventory`);
                setSelectedOrder(null);
                setEditingItems({});
                fetchOrders();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to add items to inventory');
        }
    };

    const updateEditingItem = (productId, field, value) => {
        setEditingItems({
            ...editingItems,
            [productId]: {
                ...editingItems[productId],
                [field]: value
            }
        });
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

    const renderOrderCard = (order) => (
        <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Wholesaler: {order.wholesaler?.wholesalerProfile?.businessName || order.wholesaler?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {order.wholesaler?.phone}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">₹{order.totalAmount.toLocaleString()}</p>
                </div>
            </div>

            {/* Order Timeline */}
            <div className="mb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Progress</h4>
                <div className="space-y-3">
                    {order.statusHistory?.map((history, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory.length - 1 ? 'bg-primary-600 ring-4 ring-primary-100' : 'bg-gray-400'}`}></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{history.status}</p>
                                        {history.note && <p className="text-sm text-gray-600 dark:text-gray-400 italic">{history.note}</p>}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">{new Date(history.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Items ({order.items.length})</h4>
                <div className="space-y-2">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            <span className="text-gray-700 dark:text-gray-300">{item.productName} ({item.quantity} {item.unit})</span>
                            <span className="font-semibold text-gray-900 dark:text-white">₹{item.totalPrice.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action based on status */}
            {order.status === 'REQUESTED' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">Waiting for wholesaler to accept your order</p>
                    </div>
                </div>
            )}

            {(order.status === 'ACCEPTED' || order.status === 'PACKED' || order.status === 'DISPATCHED' || order.status === 'DELIVERED') && !order.addedToInventory && (
                <button onClick={() => openAddToInventoryModal(order)} className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>{order.status === 'DELIVERED' ? 'Add Delivered Items to Inventory' : 'Add to My Inventory'}</span>
                </button>
            )}

            {order.addedToInventory && order.status !== 'DELIVERED' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-green-800 dark:text-green-200">✅ Items added to your inventory. Waiting for delivery.</p>
                    </div>
                </div>
            )}

            {order.status === 'PACKED' && !order.addedToInventory && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-purple-600" />
                        <p className="text-sm text-purple-800 dark:text-purple-200">📦 Order is packed and ready for dispatch</p>
                    </div>
                </div>
            )}

            {order.status === 'DISPATCHED' && !order.addedToInventory && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2">
                        <Truck className="h-5 w-5 text-indigo-600" />
                        <p className="text-sm text-indigo-800 dark:text-indigo-200">🚚 Order is on the way! Expected delivery soon.</p>
                    </div>
                </div>
            )}

            {order.status === 'DELIVERED' && order.addedToInventory && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-green-800 dark:text-green-200">✅ Order delivered on {new Date(order.actualDeliveryDate).toLocaleDateString()} and added to inventory</p>
                    </div>
                </div>
            )}

            {order.status === 'DELIVERED' && !order.addedToInventory && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">📦 Order delivered on {new Date(order.actualDeliveryDate).toLocaleDateString()}. Add items to your inventory now!</p>
                    </div>
                </div>
            )}

            {order.status === 'CANCELLED' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-800 dark:text-red-200">❌ Order was cancelled</p>
                    </div>
                </div>
            )}
        </div>
    );

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Wholesaler Orders</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Track your orders from wholesalers</p>
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {orders.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">No orders yet</p>
                        </div>
                    ) : (
                        orders.map(order => renderOrderCard(order))
                    )}
                </div>

                {/* Add to Inventory Modal */}
                {selectedOrder && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Add Items to Your Inventory</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Review and set your selling prices for items from order {selectedOrder.orderNumber}</p>

                            <div className="space-y-4">
                                {Object.entries(editingItems).map(([productId, item]) => (
                                    <div key={productId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{item.productName}</h4>
                                            <label className="flex items-center space-x-2">
                                                <input type="checkbox" checked={item.addToInventory} onChange={(e) => updateEditingItem(productId, 'addToInventory', e.target.checked)} className="rounded" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Add to inventory</span>
                                            </label>
                                        </div>

                                        {item.addToInventory && (
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                                                    <input type="text" value={item.productName} onChange={(e) => updateEditingItem(productId, 'productName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                                    <input type="text" value={item.category} onChange={(e) => updateEditingItem(productId, 'category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                                                    <div className="flex items-center space-x-1">
                                                        <input type="number" value={item.quantity} onChange={(e) => updateEditingItem(productId, 'quantity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                                        <span className="text-xs text-gray-500">{item.unit}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price (₹)</label>
                                                    <input type="number" step="0.01" value={item.costPrice} onChange={(e) => updateEditingItem(productId, 'costPrice', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                                    <p className="text-xs text-gray-500 mt-1">What you paid</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price (₹)</label>
                                                    <input type="number" step="0.01" value={item.sellingPrice} onChange={(e) => updateEditingItem(productId, 'sellingPrice', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                                    <p className="text-xs text-gray-500 mt-1">Your retail price</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date (Optional)</label>
                                                    <input type="date" value={item.expiryDate} onChange={(e) => updateEditingItem(productId, 'expiryDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                                </div>
                                                {item.costPrice && item.sellingPrice && (
                                                    <div className="col-span-3">
                                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Profit Analysis</label>
                                                        <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                                                                Margin: {((parseFloat(item.sellingPrice) - parseFloat(item.costPrice)) / parseFloat(item.costPrice) * 100).toFixed(1)}%
                                                                <span className="ml-2">|</span>
                                                                <span className="ml-2">Profit: ₹{(parseFloat(item.sellingPrice) - parseFloat(item.costPrice)).toFixed(2)}/{item.unit}</span>
                                                                <span className="ml-2">|</span>
                                                                <span className="ml-2">Total: ₹{((parseFloat(item.sellingPrice) - parseFloat(item.costPrice)) * parseFloat(item.quantity)).toFixed(2)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => { setSelectedOrder(null); setEditingItems({}); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                    Cancel
                                </button>
                                <button onClick={addToInventory} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-2">
                                    <Save className="h-5 w-5" /><span>Add to My Inventory</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RetailerWholesalerOrders;
