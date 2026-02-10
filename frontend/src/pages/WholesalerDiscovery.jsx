import React, { useState, useEffect } from 'react';
import { MapPin, Package, TrendingUp, Phone, DollarSign, Truck, Star, ShoppingCart, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const WholesalerDiscovery = () => {
    const [wholesalers, setWholesalers] = useState([]);
    const [selectedWholesaler, setSelectedWholesaler] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [range, setRange] = useState(20);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [showOrderConfirm, setShowOrderConfirm] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    useEffect(() => {
        fetchWholesalers();
    }, [range]);

    const fetchWholesalers = async () => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/nearby?range=${range}&search=${searchTerm}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setWholesalers(result.data.wholesalers);
            } else {
                toast.error(result.message);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load wholesalers');
            setIsLoading(false);
        }
    };

    const fetchInventory = async (wholesalerId) => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/${wholesalerId}/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setInventory(result.data.inventory);
            }
        } catch (error) {
            toast.error('Failed to load inventory');
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item._id === product._id);
        if (existing) {
            setCart(cart.map(item => item._id === product._id ? { ...item, quantity: item.quantity + product.minOrderQty } : item));
        } else {
            setCart([...cart, { ...product, quantity: product.minOrderQty }]);
        }
        toast.success(`Added ${product.productName} to cart`);
    };

    const placeOrder = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        setIsPlacingOrder(true);

        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/orders`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wholesalerId: selectedWholesaler._id,
                    items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
                    paymentMode: paymentMode
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`Order ${result.data.order.orderNumber} placed successfully!`);
                setCart([]);
                setSelectedWholesaler(null);
                setShowOrderConfirm(false);
            } else {
                toast.error(result.message || 'Failed to place order');
            }
        } catch (error) {
            console.error('Order error:', error);
            toast.error('Failed to place order');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Discover Wholesalers</h1>
                    <div className="flex space-x-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Search wholesalers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && fetchWholesalers()} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <select value={range} onChange={(e) => setRange(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                            <option value="10">Within 10 km</option>
                            <option value="20">Within 20 km</option>
                            <option value="50">Within 50 km</option>
                            <option value="100">Within 100 km</option>
                        </select>
                        <button onClick={fetchWholesalers} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Search</button>
                    </div>
                </div>

                {!selectedWholesaler ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wholesalers.map((wholesaler) => (
                            <div key={wholesaler._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setSelectedWholesaler(wholesaler); fetchInventory(wholesaler._id); }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div><h3 className="text-xl font-bold text-gray-900 dark:text-white">{wholesaler.wholesalerProfile?.businessName || wholesaler.name}</h3><p className="text-sm text-gray-600 dark:text-gray-400">{wholesaler.wholesalerProfile?.contactPerson}</p></div>
                                    {wholesaler.overallScore > 0 && (
                                        <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded"><Star className="h-4 w-4 text-yellow-600" /><span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{wholesaler.overallScore.toFixed(1)}</span></div>
                                    )}
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center text-gray-600 dark:text-gray-400"><MapPin className="h-4 w-4 mr-2" /><span>{wholesaler.locality || wholesaler.address?.city}</span>{wholesaler.distance_km && <span className="ml-2 text-primary-600 font-semibold">({wholesaler.distance_km} km)</span>}</div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400"><DollarSign className="h-4 w-4 mr-2" /><span>Min Order: ₹{wholesaler.wholesalerProfile?.minOrderValue?.toLocaleString()}</span></div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400"><Truck className="h-4 w-4 mr-2" /><span>Delivery: {wholesaler.wholesalerProfile?.avgDeliveryTime}</span></div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400"><Phone className="h-4 w-4 mr-2" /><span>{wholesaler.phone}</span></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500 dark:text-gray-400">Payment: {wholesaler.wholesalerProfile?.paymentModes?.join(', ')}</p></div>
                                <button className="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center space-x-2"><Package className="h-5 w-5" /><span>View Products</span></button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                                <button onClick={() => { setSelectedWholesaler(null); setCart([]); }} className="text-primary-600 hover:text-primary-700 mb-4">← Back to Wholesalers</button>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedWholesaler.wholesalerProfile?.businessName}</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedWholesaler.locality}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {inventory.map((product) => (
                                    <div key={product._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{product.productName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{product.category}</p>
                                        <div className="space-y-1 text-sm mb-3">
                                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Price:</span><span className="font-semibold text-gray-900 dark:text-white">₹{product.pricePerUnit}/{product.unit}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Min Order:</span><span className="font-semibold text-gray-900 dark:text-white">{product.minOrderQty} {product.unit}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Available:</span><span className="font-semibold text-green-600">{product.availableQty} {product.unit}</span></div>
                                        </div>
                                        {product.bulkDiscounts && product.bulkDiscounts.length > 0 && (
                                            <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 mb-3"><p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">Bulk Discounts:</p>
                                                {product.bulkDiscounts.map((d, i) => (<p key={i} className="text-xs text-green-700 dark:text-green-300">≥{d.minQty}: ₹{d.price}/{product.unit}</p>))}
                                            </div>
                                        )}
                                        <button onClick={() => addToCart(product)} className="w-full px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center justify-center space-x-2"><ShoppingCart className="h-4 w-4" /><span>Add to Cart</span></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cart ({cart.length})</h3>
                                {cart.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">Cart is empty</p>
                                ) : (
                                    <>
                                        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                                            {cart.map((item) => (
                                                <div key={item._id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{item.productName}</p>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <div className="flex items-center space-x-2">
                                                            <button onClick={() => setCart(cart.map(i => i._id === item._id ? { ...i, quantity: Math.max(item.minOrderQty, i.quantity - item.minOrderQty) } : i))} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">-</button>
                                                            <span className="text-sm">{item.quantity} {item.unit}</span>
                                                            <button onClick={() => setCart(cart.map(i => i._id === item._id ? { ...i, quantity: i.quantity + item.minOrderQty } : i))} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">+</button>
                                                        </div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">₹{(item.pricePerUnit * item.quantity).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Mode</label>
                                                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                                    <option value="Cash">Cash</option>
                                                    <option value="UPI">UPI</option>
                                                    <option value="Credit">Credit</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white"><span>Total:</span><span>₹{cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0).toFixed(2)}</span></div>
                                        </div>
                                        <button onClick={() => setShowOrderConfirm(true)} className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">Review & Place Order</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Confirmation Modal */}
                {showOrderConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Your Order</h3>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Wholesaler Details</h4>
                                <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Name:</strong> {selectedWholesaler?.wholesalerProfile?.businessName || selectedWholesaler?.name}</p>
                                <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Location:</strong> {selectedWholesaler?.locality}</p>
                                <p className="text-sm text-blue-800 dark:text-blue-300"><strong>Phone:</strong> {selectedWholesaler?.phone}</p>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Order Items ({cart.length} items)</h4>
                                <div className="space-y-3">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900 dark:text-white">{item.productName}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.category}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {item.quantity} {item.unit} × ₹{item.pricePerUnit}/{item.unit}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">₹{(item.pricePerUnit * item.quantity).toFixed(2)}</p>
                                                {item.bulkDiscounts && item.bulkDiscounts.some(d => item.quantity >= d.minQty) && (
                                                    <span className="text-xs text-green-600 dark:text-green-400">Bulk discount applied</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">₹{cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-600 dark:text-gray-400">Payment Mode:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{paymentMode}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span>Total Amount:</span>
                                    <span className="text-green-600">₹{cart.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Note:</strong> This order will be sent to {selectedWholesaler?.wholesalerProfile?.businessName || selectedWholesaler?.name} as a single order.
                                    All {cart.length} items will be processed together. The wholesaler will review and confirm your order.
                                </p>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowOrderConfirm(false)}
                                    disabled={isPlacingOrder}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={placeOrder}
                                    disabled={isPlacingOrder}
                                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPlacingOrder ? 'Placing Order...' : 'Confirm & Place Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WholesalerDiscovery;
