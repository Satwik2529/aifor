import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock, TrendingDown, ShoppingCart, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Wholesaler Offers Page - For Retailers
 * View all active offers from nearby wholesalers
 * Click to view details and place orders
 */
const WholesalerOffers = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [orderQuantity, setOrderQuantity] = useState(1);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/offers/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setOffers(result.data.offers);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load offers');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlaceOrder = async (offer) => {
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            // Validate quantity - only check available quantity, no minimum restriction for special offers
            if (orderQuantity <= 0) {
                toast.error('Quantity must be at least 1');
                return;
            }

            if (orderQuantity > offer.availableQty) {
                toast.error(`Only ${offer.availableQty} units available`);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wholesalerId: offer.wholesalerInfo.id || offer.wholesaler,
                    items: [{
                        productId: offer._id,
                        quantity: orderQuantity
                    }],
                    paymentMode: 'Cash',
                    notes: `Special offer order - ${offer.effectiveDiscount}% discount applied`
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success('✅ Order placed successfully!');
                setSelectedOffer(null);
                setOrderQuantity(1);
                fetchOffers(); // Refresh offers
                setTimeout(() => navigate('/retailer-wholesaler-orders'), 1500);
            } else {
                toast.error(result.message || 'Failed to place order');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to place order');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading offers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Special Offers</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Exclusive deals from nearby wholesalers</p>
                        </div>
                    </div>
                    <button onClick={fetchOffers} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        <RefreshCw className="h-5 w-5" />
                        <span>Refresh</span>
                    </button>
                </div>

                {/* Offers Grid */}
                {offers.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Offers</h3>
                        <p className="text-gray-600 dark:text-gray-400">Check back later for special deals from wholesalers</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {offers.map((offer, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Discount Badge */}
                                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 text-center">
                                    <span className="text-2xl font-bold">{offer.effectiveDiscount}% OFF</span>
                                </div>

                                <div className="p-4">
                                    {/* Product Info */}
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{offer.productName}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{offer.category}</p>

                                    {/* Pricing */}
                                    <div className="flex items-center space-x-3 mb-3">
                                        {offer.discountApplied?.originalPrice && (
                                            <span className="text-lg text-gray-500 line-through">₹{offer.discountApplied.originalPrice}</span>
                                        )}
                                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹{offer.pricePerUnit}</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">/{offer.unit}</span>
                                    </div>

                                    {/* Expiry Alert */}
                                    {offer.daysUntilExpiry && (
                                        <div className="flex items-center space-x-2 mb-3 text-orange-600 dark:text-orange-400">
                                            <Clock className="h-4 w-4" />
                                            <span className="text-xs font-medium">Expires in {offer.daysUntilExpiry} days</span>
                                        </div>
                                    )}

                                    {/* Wholesaler Info */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{offer.wholesalerInfo.businessName || offer.wholesalerInfo.name}</p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            <span>{offer.wholesalerInfo.location}</span>
                                            {offer.wholesalerInfo.distance_km && (
                                                <span className="text-primary-600 dark:text-primary-400">• {offer.wholesalerInfo.distance_km} km away</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stock Info */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Package className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-400">{offer.availableQty} {offer.unit} available</span>
                                        </div>
                                        {offer.minOrderQty > 1 && (
                                            <span className="text-xs text-gray-500">Min: {offer.minOrderQty}</span>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => setSelectedOffer(offer)}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                                    >
                                        <ShoppingCart className="h-5 w-5" />
                                        <span>Place Order</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Modal */}
            {selectedOffer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Place Order</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Product</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedOffer.productName}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Price</p>
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹{selectedOffer.pricePerUnit}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">/{selectedOffer.unit}</span>
                                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded">{selectedOffer.effectiveDiscount}% OFF</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Quantity ({selectedOffer.unit})
                                </label>
                                <input
                                    type="number"
                                    min={selectedOffer.minOrderQty || 1}
                                    max={selectedOffer.availableQty}
                                    value={orderQuantity}
                                    onChange={(e) => setOrderQuantity(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">Min: {selectedOffer.minOrderQty || 1}, Max: {selectedOffer.availableQty}</p>
                            </div>

                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">₹{(selectedOffer.pricePerUnit * orderQuantity).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                    <span>You Save</span>
                                    <span className="font-semibold">
                                        {selectedOffer.discountApplied?.originalPrice
                                            ? `₹${((selectedOffer.discountApplied.originalPrice - selectedOffer.pricePerUnit) * orderQuantity).toFixed(2)}`
                                            : `${selectedOffer.effectiveDiscount}%`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedOffer(null);
                                    setOrderQuantity(1);
                                }}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handlePlaceOrder(selectedOffer)}
                                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                            >
                                Confirm Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WholesalerOffers;
