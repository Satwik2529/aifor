import React, { useState, useEffect } from 'react';
import { TrendingDown, Zap, AlertTriangle, CheckCircle, XCircle, Clock, BarChart3, Eye, MousePointer, ShoppingCart, DollarSign } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// Ensure API_URL always has /api
let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
if (!API_URL.endsWith('/api')) {
  API_URL = API_URL + '/api';
}

const DiscountCampaigns = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommendations'); // recommendations, campaigns, analytics
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [customDuration, setCustomDuration] = useState(7);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please login to view campaigns');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      console.log('Fetching campaign data from:', API_URL);
      console.log('Token:', token ? token.substring(0, 20) + '...' : 'MISSING');

      const [recsRes, campaignsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/campaigns/recommendations`, { headers }),
        axios.get(`${API_URL}/campaigns/active`, { headers }),
        axios.get(`${API_URL}/campaigns/analytics`, { headers })
      ]);

      console.log('Recommendations response:', recsRes.data);
      console.log('Campaigns response:', campaignsRes.data);
      console.log('Analytics response:', analyticsRes.data);

      setRecommendations(recsRes.data.data || []);
      setActiveCampaigns(campaignsRes.data.data || []);
      setAnalytics(analyticsRes.data.data || null);

      toast.success('Campaign data loaded successfully');
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        toast.error(`Failed to load campaign data: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async (item, useAIRecommendation = true) => {
    try {
      const token = localStorage.getItem('token');
      const discount = useAIRecommendation ? item.discount : customDiscount;
      const duration = useAIRecommendation ? 7 : customDuration;

      await axios.post(
        `${API_URL}/campaigns/apply`,
        {
          inventory_id: item.item_id,
          discount_percentage: discount,
          duration_days: duration,
          campaign_type: 'expiry_based'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`✅ ${discount}% discount applied to ${item.item_name}!`);
      setShowCustomizeModal(false);
      fetchData();
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount');
    }
  };

  const handleRemoveDiscount = async (inventoryId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/campaigns/remove`,
        { inventory_id: inventoryId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Discount removed successfully');
      fetchData();
    } catch (error) {
      console.error('Error removing discount:', error);
      toast.error('Failed to remove discount');
    }
  };

  const handleToggleCampaign = async (campaignId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';

      await axios.post(
        `${API_URL}/campaigns/toggle-status`,
        { campaign_id: campaignId, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-xs">
          <div className="font-bold mb-2">🔧 Debug Info:</div>
          <div>API URL: {API_URL}</div>
          <div>Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</div>
          <div>Recommendations: {recommendations.length} items</div>
          <div>Active Campaigns: {activeCampaigns.length} campaigns</div>
          <div>Analytics: {analytics ? '✅ Loaded' : '❌ Not loaded'}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="h-7 w-7 text-indigo-600" />
            Smart Discount Campaigns
          </h1>
          <p className="text-gray-600 dark:text-gray-400">AI-powered discounts for expiring & slow-moving items</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'recommendations'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Recommendations ({recommendations.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'campaigns'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Active Campaigns ({activeCampaigns.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'analytics'
            ? 'text-indigo-600 border-b-2 border-indigo-600'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </div>
        </button>
      </div>

      {/* AI Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                All Good! 🎉
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No items need discounts right now. Your inventory is healthy!
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                      🤖 AI Discount Recommendations
                    </h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                      Our AI analyzed your inventory and found {recommendations.length} items that need discounts.
                      Apply with 1-click or customize the discount percentage.
                    </p>
                  </div>
                </div>
              </div>

              {recommendations.map((item) => (
                <div
                  key={item.item_id}
                  className={`card border-2 ${getUrgencyColor(item.urgency)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {item.item_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${item.urgency === 'critical' ? 'bg-red-600 text-white' :
                          item.urgency === 'high' ? 'bg-orange-600 text-white' :
                            item.urgency === 'medium' ? 'bg-yellow-600 text-white' :
                              'bg-blue-600 text-white'
                          }`}>
                          {item.urgency} Priority
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Stock</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.stock_qty} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Original Price</p>
                          <p className="font-semibold text-gray-900 dark:text-white">₹{item.originalPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">AI Discount</p>
                          <p className="font-bold text-indigo-600 dark:text-indigo-400">{item.discount}% OFF</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">New Price</p>
                          <p className="font-bold text-green-600 dark:text-green-400">₹{item.discountedPrice}</p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Reason:</strong> {item.reason}
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Potential Revenue:</span>
                            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                              ₹{item.potential_revenue.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Loss if Expired:</span>
                            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                              ₹{item.potential_loss_if_expired.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplyDiscount(item, true)}
                          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-semibold"
                        >
                          <Zap className="h-4 w-4" />
                          Apply {item.discount}% Discount
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setCustomDiscount(item.discount);
                            setShowCustomizeModal(true);
                          }}
                          className="px-4 py-2 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-semibold"
                        >
                          Customize
                        </button>
                        <button
                          onClick={() => toast.success('Item ignored')}
                          className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Active Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {activeCampaigns.length === 0 ? (
            <div className="card text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Active Campaigns
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Apply discounts from the Recommendations tab to start campaigns.
              </p>
            </div>
          ) : (
            activeCampaigns.map((campaign) => (
              <div key={campaign._id} className="card border-l-4 border-green-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {campaign.inventory_id?.item_name || 'Unknown Item'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Discount</p>
                        <p className="font-bold text-indigo-600">{campaign.discount_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Original</p>
                        <p className="font-semibold text-gray-900 dark:text-white">₹{campaign.original_price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Discounted</p>
                        <p className="font-bold text-green-600">₹{campaign.discounted_price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Views</p>
                        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {campaign.views_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Sales</p>
                        <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {campaign.sales_count}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Revenue Generated:</span>
                          <span className="ml-2 font-bold text-green-600">₹{campaign.revenue_generated}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Ends in:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {campaign.daysRemaining} days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleCampaign(campaign._id, campaign.status)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        {campaign.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleRemoveDiscount(campaign.inventory_id._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        End Campaign
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Campaigns</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{analytics.total_campaigns}</p>
                </div>
                <BarChart3 className="h-12 w-12 text-blue-600 dark:text-blue-400 opacity-50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">₹{analytics.total_revenue}</p>
                </div>
                <DollarSign className="h-12 w-12 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Views</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">{analytics.total_views}</p>
                </div>
                <Eye className="h-12 w-12 text-purple-600 dark:text-purple-400 opacity-50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Sales</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">{analytics.total_sales}</p>
                </div>
                <ShoppingCart className="h-12 w-12 text-orange-600 dark:text-orange-400 opacity-50" />
              </div>
            </div>
          </div>

          {/* Campaign Types */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaigns by Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(analytics.campaigns_by_type).map(([type, count]) => (
                <div key={type} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {type.replace('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Average Effectiveness</span>
                <span className="font-bold text-indigo-600">{analytics.avg_effectiveness}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Active Campaigns</span>
                <span className="font-bold text-green-600">{analytics.active_campaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Completed Campaigns</span>
                <span className="font-bold text-gray-600">{analytics.completed_campaigns}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Discount Modal */}
      {showCustomizeModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-11/12 md:w-1/2 shadow-2xl rounded-xl bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Customize Discount - {selectedItem.item_name}
              </h3>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Percentage (AI Recommended: {selectedItem.discount}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="75"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span>5%</span>
                  <span className="font-bold text-indigo-600 text-lg">{customDiscount}%</span>
                  <span>75%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Preview:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Original Price:</span>
                    <span className="ml-2 font-semibold">₹{selectedItem.originalPrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">New Price:</span>
                    <span className="ml-2 font-bold text-green-600">
                      ₹{(selectedItem.originalPrice * (1 - customDiscount / 100)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Savings:</span>
                    <span className="ml-2 font-semibold text-indigo-600">
                      ₹{(selectedItem.originalPrice * (customDiscount / 100)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="ml-2 font-semibold">{customDuration} days</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCustomizeModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApplyDiscount(selectedItem, false)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
                >
                  Apply Custom Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCampaigns;
