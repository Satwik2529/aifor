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
        // Try to load cached insights first
        const cachedInsights = localStorage.getItem('wholesaler_ai_insights');
        const cacheTimestamp = localStorage.getItem('wholesaler_ai_insights_timestamp');

        if (cachedInsights && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            // Use cache if less than 1 hour old
            if (cacheAge < 3600000) {
                setInsights(JSON.parse(cachedInsights));
                setIsLoading(false);
                return;
            }
        }

        // If no cache or cache expired, fetch new insights
        fetchAIInsights();
    }, []);

    const fetchAIInsights = async (forceFresh = false) => {
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
                // Cache the insights
                localStorage.setItem('wholesaler_ai_insights', JSON.stringify(result.data));
                localStorage.setItem('wholesaler_ai_insights_timestamp', Date.now().toString());
                toast.success(forceFresh ? 'Insights regenerated' : 'Insights updated');
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
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Data-driven recommendations for your business
                                {insights?.generatedAt && (
                                    <span className="ml-2">• Last updated: {new Date(insights.generatedAt).toLocaleString()}</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchAIInsights(true)}
                        disabled={isLoading}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Regenerating...' : 'Regenerate'}</span>
                    </button>
                </div>

                {insights && (
                    <div className="space-y-6">
                        {/* Business Health Overview - Top Priority */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Overall Health Score */}
                            {insights.aiInsights?.overallHealth && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Health</h2>
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
                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Revenue</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{parseFloat(insights.aiInsights.profitSummary.totalRevenue).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{parseFloat(insights.aiInsights.profitSummary.totalCost).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Profit</p>
                                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">₹{parseFloat(insights.aiInsights.profitSummary.netProfit).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* URGENT ACTIONS - Highest Priority */}
                        {insights.aiInsights?.expiryAlerts && insights.aiInsights.expiryAlerts.length > 0 && (
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl shadow-lg border-2 border-red-300 dark:border-red-800 p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-3 bg-red-600 rounded-lg animate-pulse">
                                        <Clock className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-red-900 dark:text-red-300">⚠️ URGENT: Products Expiring Soon</h2>
                                        <p className="text-sm text-red-700 dark:text-red-400">Take immediate action to prevent losses</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {insights.aiInsights.expiryAlerts.map((alert, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-600">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{alert.productName}</h3>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${alert.daysLeft <= 7
                                                            ? 'bg-red-600 text-white animate-pulse'
                                                            : alert.daysLeft <= 15
                                                                ? 'bg-orange-600 text-white'
                                                                : 'bg-yellow-600 text-white'
                                                            }`}>
                                                            {alert.daysLeft} DAYS LEFT
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{alert.message}</p>
                                                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-3">
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📢 Campaign Message:</p>
                                                        <p className="text-sm text-gray-900 dark:text-white font-medium">{alert.campaignMessage}</p>
                                                    </div>
                                                </div>
                                                <span className="px-4 py-2 bg-red-600 text-white text-xl font-bold rounded-lg ml-4">{alert.suggestedDiscount}% OFF</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
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
                                                                    productId: alert.productId,
                                                                    discount: alert.suggestedDiscount
                                                                })
                                                            });

                                                            const result = await response.json();
                                                            if (result.success) {
                                                                toast.success(`✅ ${alert.suggestedDiscount}% discount applied!`);
                                                                fetchAIInsights(true);
                                                            } else {
                                                                toast.error(result.message);
                                                            }
                                                        } catch (error) {
                                                            toast.error('Failed to apply discount');
                                                        }
                                                    }}
                                                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                                                >
                                                    <DollarSign className="h-5 w-5" />
                                                    <span>Apply {alert.suggestedDiscount}% Discount</span>
                                                </button>
                                                <button
                                                    onClick={() => handleSendCampaign(alert.productId, alert.campaignMessage, alert.suggestedDiscount)}
                                                    disabled={sendingCampaign === alert.productId}
                                                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                                >
                                                    {sendingCampaign === alert.productId ? (
                                                        <>
                                                            <RefreshCw className="h-5 w-5 animate-spin" />
                                                            <span>Sending...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="h-5 w-5" />
                                                            <span>Send to Retailers</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PRODUCT PERFORMANCE & PRICING - Critical Insights */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Slow Moving Products - Needs Attention */}
                            {insights.aiInsights?.slowMovingProducts && insights.aiInsights.slowMovingProducts.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-yellow-500 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                            <TrendingDown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">⚠️ Slow Moving</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Very poor sales</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.slowMovingProducts.map((product, idx) => (
                                            <div key={idx} className="border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/10">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">{product.productName}</h3>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{product.message || product.recommendation}</p>
                                                        {product.suggestedDiscount && (
                                                            <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium mt-2">
                                                                💡 {product.suggestedDiscount}% discount needed
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {product.productId && product.suggestedDiscount && (
                                                    <div className="grid grid-cols-2 gap-2 mt-3">
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
                                                                        fetchAIInsights(true);
                                                                    } else {
                                                                        toast.error(result.message);
                                                                    }
                                                                } catch (error) {
                                                                    toast.error('Failed to apply discount');
                                                                }
                                                            }}
                                                            className="flex items-center justify-center space-x-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                            <span>Apply {product.suggestedDiscount}%</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendCampaign(
                                                                product.productId,
                                                                `Special clearance sale on ${product.productName}! Get ${product.suggestedDiscount}% OFF. Limited time offer to clear stock. Order now!`,
                                                                product.suggestedDiscount
                                                            )}
                                                            disabled={sendingCampaign === product.productId}
                                                            className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                                                        >
                                                            {sendingCampaign === product.productId ? (
                                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Send className="h-4 w-4" />
                                                                    <span>Promote</span>
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

                            {/* Pricing Optimization */}
                            {insights.aiInsights?.pricingRecommendations && insights.aiInsights.pricingRecommendations.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-indigo-500 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                            <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">💰 Pricing</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Optimize prices</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.pricingRecommendations.map((rec, idx) => (
                                            <div key={idx} className="border border-indigo-200 dark:border-indigo-900 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/10">
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{rec.productName}</h3>
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 line-through">₹{rec.currentPrice}</span>
                                                    <span className="text-sm text-gray-400">→</span>
                                                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{rec.suggestedPrice}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{rec.message || rec.reason}</p>
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
                                                                        pricePerUnit: parseFloat(rec.suggestedPrice)
                                                                    })
                                                                });

                                                                const result = await response.json();
                                                                if (result.success) {
                                                                    toast.success(`✅ Price updated to ₹${rec.suggestedPrice}!`);
                                                                    fetchAIInsights(true);
                                                                } else {
                                                                    toast.error(result.message);
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to update price');
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                        <span>Apply Price</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fast Moving Products - Opportunities */}
                            {insights.aiInsights?.fastMovingProducts && insights.aiInsights.fastMovingProducts.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-green-500 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">🔥 Fast Moving</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">High demand</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.fastMovingProducts.map((product, idx) => (
                                            <div key={idx} className="border border-green-200 dark:border-green-900 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <h3 className="font-semibold text-gray-900 dark:text-white">{product.productName}</h3>
                                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{product.message || product.insight}</p>
                                                        {product.currentStock && (
                                                            <p className="text-sm text-green-700 dark:text-green-400 font-medium mt-2">
                                                                📦 Stock: {product.currentStock} units
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {product.productId && product.actionType === 'increase_price' && (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                                                                API_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

                                                                const productData = insights.productPerformance.find(p => p.productId === product.productId);
                                                                if (productData) {
                                                                    const newPrice = (productData.pricePerUnit * 1.10).toFixed(2);

                                                                    const response = await fetch(`${API_BASE_URL}/api/wholesalers/inventory/update`, {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${token}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify({
                                                                            productId: product.productId,
                                                                            pricePerUnit: parseFloat(newPrice)
                                                                        })
                                                                    });

                                                                    const result = await response.json();
                                                                    if (result.success) {
                                                                        toast.success(`✅ Price increased to ₹${newPrice}!`);
                                                                        fetchAIInsights(true);
                                                                    } else {
                                                                        toast.error(result.message);
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to update price');
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                                                    >
                                                        <TrendingUp className="h-4 w-4" />
                                                        <span>+10% Price</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RESTOCK RECOMMENDATIONS - Products Selling Well */}
                        {insights.aiInsights?.restockRecommendations && insights.aiInsights.restockRecommendations.length > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl shadow-sm border-2 border-blue-300 dark:border-blue-800 p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-3 bg-blue-600 rounded-lg">
                                        <Package className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300">📦 Restock Recommendations</h2>
                                        <p className="text-sm text-blue-700 dark:text-blue-400">Products selling well - order more inventory</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {insights.aiInsights.restockRecommendations.map((restock, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-blue-600">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{restock.productName}</h3>
                                            <div className="space-y-2 mb-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">{restock.currentStock} units</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Weekly Sales:</span>
                                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{restock.avgWeeklySales} units/week</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Suggested Order:</span>
                                                    <span className="font-bold text-green-600 dark:text-green-400 text-lg">{restock.suggestedRestockQty} units</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 italic">{restock.message}</p>
                                            <div className={`px-3 py-2 rounded-lg text-center font-semibold ${restock.urgency === 'high'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {restock.urgency === 'high' ? '🚨 URGENT' : '📊 Recommended'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TARGETED MARKETING - Personalized Offers & Stock Management */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personalized Offers */}
                            {insights.aiInsights?.personalizedOffers && insights.aiInsights.personalizedOffers.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-purple-500 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">🎯 Personalized Offers</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Targeted deals for specific retailers</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.personalizedOffers.map((offer, idx) => (
                                            <div key={idx} className="border border-purple-200 dark:border-purple-900 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">{offer.retailerName}</h3>
                                                        {offer.retailerLocation && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">📍 {offer.retailerLocation}</p>
                                                        )}
                                                        <p className="text-sm text-purple-700 dark:text-purple-400 font-medium mt-1">{offer.productName}</p>
                                                    </div>
                                                    <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded-full">{offer.discount}% OFF</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{offer.message || offer.reason}</p>
                                                {offer.campaignMessage && (
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-purple-200 dark:border-purple-800">
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📧 Message:</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{offer.campaignMessage}</p>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleSendCampaign(null, offer.campaignMessage, offer.discount, offer.retailerId)}
                                                    disabled={sendingCampaign === offer.retailerId}
                                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                >
                                                    {sendingCampaign === offer.retailerId ? (
                                                        <>
                                                            <RefreshCw className="h-5 w-5 animate-spin" />
                                                            <span>Sending...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="h-5 w-5" />
                                                            <span>Send Personalized Offer</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stock Alerts */}
                            {insights.aiInsights?.stockAlerts && insights.aiInsights.stockAlerts.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-orange-500 p-6">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📦 Stock Alerts</h2>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Inventory management recommendations</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {insights.aiInsights.stockAlerts.map((alert, idx) => (
                                            <div key={idx} className="border border-orange-200 dark:border-orange-900 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/10">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">{alert.productName}</h3>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{alert.message || alert.action}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${alert.status === 'low'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-blue-600 text-white'
                                                        }`}>
                                                        {alert.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                {alert.productId && alert.actionType === 'reduce_price' && (
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
                                                                        productId: alert.productId,
                                                                        discount: 15
                                                                    })
                                                                });

                                                                const result = await response.json();
                                                                if (result.success) {
                                                                    toast.success(`✅ 15% discount applied to clear excess stock!`);
                                                                    fetchAIInsights(true);
                                                                } else {
                                                                    toast.error(result.message);
                                                                }
                                                            } catch (error) {
                                                                toast.error('Failed to apply discount');
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors font-medium"
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                        <span>Apply 15% Discount</span>
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
