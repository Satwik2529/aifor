import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Package, ArrowLeft, RefreshCw, Send, Clock, Target } from 'lucide-react';
import toast from 'react-hot-toast';

const WholesalerAIInsights = () => {
    const navigate = useNavigate();
    const [insights, setInsights] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sendingCampaign, setSendingCampaign] = useState(null);

    useEffect(() => {
        fetchAIInsights();
    }, []);

    const fetchAIInsights = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/ai-insights`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                setInsights(result.data);
                toast.success('Insights updated');
            } else {
                toast.error(result.message);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load insights');
            setIsLoading(false);
        }
    };

    const handleSendCampaign = async (productId, campaignMessage, discount, retailerId = null) => {
        setSendingCampaign(productId || retailerId);
        try {
            const token = localStorage.getItem('token');
            let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

            const response = await fetch(`${API_BASE_URL}/api/wholesalers/send-campaign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId,
                    campaignMessage,
                    discount,
                    retailerId
                })
            });

            const result = await response.json();
            if (result.success) {
                toast.success(`✅ Sent to ${result.data.sentCount} retailer${result.data.sentCount > 1 ? 's' : ''}!`);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to send campaign');
        }
        setSendingCampaign(null);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Analyzing your business...</p>
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
                        <button onClick={() => navigate('/wholesaler-dashboard')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Business Insights</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Data-driven recommendations for your business</p>
                        </div>
                    </div>
                    <button onClick={fetchAIInsights} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        <RefreshCw className="h-5 w-5" />
                        <span>Refresh</span>
                    </button>
                </div>

                {insights && (
                    <div className="space-y-6">
                        {/* Profit Summary */}
                        {insights.aiInsights?.profitSummary && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profit Summary</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{insights.aiInsights.profitSummary.message}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{parseFloat(insights.aiInsights.profitSummary.netProfit).toLocaleString()}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{insights.aiInsights.profitSummary.profitMargin}% margin</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Sales</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{parseFloat(insights.aiInsights.profitSummary.totalRevenue).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Cost</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{parseFloat(insights.aiInsights.profitSummary.totalCost).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Profit</p>
                                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">₹{parseFloat(insights.aiInsights.profitSummary.netProfit).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Business Health */}
                        {insights.aiInsights?.overallHealth && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Health Score</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{insights.aiInsights.overallHealth.message || insights.aiInsights.overallHealth.summary}</p>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{insights.aiInsights.overallHealth.score}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">out of 100</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expiry Alerts */}
                        {insights.aiInsights?.expiryAlerts && insights.aiInsights.expiryAlerts.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900 p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Expiry Alerts</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Products expiring soon - take action now</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {insights.aiInsights.expiryAlerts.map((alert, idx) => (
                                        <div key={idx} className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{alert.productName}</h3>
                                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">{alert.daysLeft} days until expiry</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{alert.message}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">{alert.suggestedDiscount}% OFF</span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-red-200 dark:border-red-800">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Campaign Message:</p>
                                                <p className="text-sm text-gray-900 dark:text-white">{alert.campaignMessage}</p>
                                            </div>
                                            <button
                                                onClick={() => handleSendCampaign(alert.productId, alert.campaignMessage, alert.suggestedDiscount)}
                                                disabled={sendingCampaign === alert.productId}
                                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {sendingCampaign === alert.productId ? (
                                                    <>
                                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                                        <span>Sending...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-5 w-5" />
                                                        <span>Send to All Retailers</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Personalized Offers */}
                        {insights.aiInsights?.personalizedOffers && insights.aiInsights.personalizedOffers.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personalized Offers</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Targeted deals for specific retailers</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {insights.aiInsights.personalizedOffers.map((offer, idx) => (
                                        <div key={idx} className="border border-purple-200 dark:border-purple-900 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{offer.retailerName}</h3>
                                                    {offer.retailerLocation && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">📍 {offer.retailerLocation}</p>
                                                    )}
                                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">{offer.productName}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded-full">{offer.discount}% OFF</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{offer.message || offer.reason}</p>
                                            {offer.campaignMessage && (
                                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-purple-200 dark:border-purple-800">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Message:</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{offer.campaignMessage}</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleSendCampaign(null, offer.campaignMessage, offer.discount, offer.retailerId)}
                                                disabled={sendingCampaign === offer.retailerId}
                                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {sendingCampaign === offer.retailerId ? (
                                                    <>
                                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                                        <span>Sending...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-5 w-5" />
                                                        <span>Send Offer</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Product Performance Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Slow Moving Products */}
                            {insights.aiInsights?.slowMovingProducts && insights.aiInsights.slowMovingProducts.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                            <TrendingDown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Slow Moving</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Products need attention</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.slowMovingProducts.map((product, idx) => (
                                            <div key={idx} className="border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/10">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.productName}</h3>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{product.message || product.recommendation}</p>
                                                {product.suggestedDiscount && (
                                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-2">Suggested: {product.suggestedDiscount}% discount</p>
                                                )}
                                                {product.productId && product.suggestedDiscount && (
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const token = localStorage.getItem('token');
                                                                    let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                                                                    API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

                                                                    const response = await fetch(`${API_BASE_URL}/api/wholesalers/apply-discount`, {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${token}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify({
                                                                            productId: product.productId,
                                                                            discount: product.suggestedDiscount
                                                                        })
                                                                    });

                                                                    const result = await response.json();
                                                                    if (result.success) {
                                                                        toast.success(`✅ ${product.suggestedDiscount}% discount applied!`);
                                                                        fetchAIInsights(); // Refresh insights
                                                                    } else {
                                                                        toast.error(result.message);
                                                                    }
                                                                } catch (error) {
                                                                    toast.error('Failed to apply discount');
                                                                }
                                                            }}
                                                            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-yellow-600 text-white text-xs rounded-lg hover:bg-yellow-700 transition-colors"
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                            <span>Apply Discount</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendCampaign(
                                                                product.productId,
                                                                `Special offer on ${product.productName}! Get ${product.suggestedDiscount}% OFF. Limited time offer to clear stock.`,
                                                                product.suggestedDiscount
                                                            )}
                                                            disabled={sendingCampaign === product.productId}
                                                            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {sendingCampaign === product.productId ? (
                                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Send className="h-4 w-4" />
                                                                    <span>Send Offer</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fast Moving Products */}
                            {insights.aiInsights?.fastMovingProducts && insights.aiInsights.fastMovingProducts.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fast Moving</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">High demand products</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.fastMovingProducts.map((product, idx) => (
                                            <div key={idx} className="border border-green-200 dark:border-green-900 rounded-lg p-3 bg-green-50 dark:bg-green-900/10">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.productName}</h3>
                                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{product.message || product.insight}</p>
                                                    </div>
                                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stock Alerts & Pricing */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Stock Alerts */}
                            {insights.aiInsights?.stockAlerts && insights.aiInsights.stockAlerts.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stock Alerts</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Inventory management</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.stockAlerts.map((alert, idx) => (
                                            <div key={idx} className="border border-orange-200 dark:border-orange-900 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/10">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{alert.productName}</h3>
                                                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{alert.message || alert.action}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${alert.status === 'low' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                        {alert.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pricing Recommendations */}
                            {insights.aiInsights?.pricingRecommendations && insights.aiInsights.pricingRecommendations.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                            <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pricing</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Price optimization</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.pricingRecommendations.map((rec, idx) => (
                                            <div key={idx} className="border border-indigo-200 dark:border-indigo-900 rounded-lg p-3 bg-indigo-50 dark:bg-indigo-900/10">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{rec.productName}</h3>
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 line-through">₹{rec.currentPrice}</span>
                                                    <span className="text-sm text-gray-400">→</span>
                                                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">₹{rec.suggestedPrice}</span>
                                                </div>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">{rec.message || rec.reason}</p>
                                                {rec.productId && (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                                                                API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

                                                                const response = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/update`, {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Authorization': `Bearer ${token}`,
                                                                        'Content-Type': 'application/json'
                                                                    },
                                                                    body: JSON.stringify({
                                                                        productId: rec.productId,
                                                                        pricePerUnit: rec.suggestedPrice
                                                                    })
                                                                });

                                                                const result = await response.json();
                                                                if (result.success) {
                                                                    toast.success(`✅ Price updated to ₹${rec.suggestedPrice}!`);
                                                                    fetchAIInsights();
                                                                } else {
                                                                    toast.error(result.message);
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to update price');
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                        <span>Apply New Price</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WholesalerAIInsights;
