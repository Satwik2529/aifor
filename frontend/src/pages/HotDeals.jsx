import React, { useState, useEffect } from 'react';
import { Flame, TrendingDown, Clock, MapPin, Search, Filter, Tag } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HotDeals = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('discount'); // discount, price, ending_soon

  // Get shop_id from URL params or localStorage
  const shopId = new URLSearchParams(window.location.search).get('shop_id') || localStorage.getItem('selected_shop_id');

  useEffect(() => {
    if (shopId) {
      fetchHotDeals();
    }
  }, [shopId]);

  const fetchHotDeals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/campaigns/hot-deals?shop_id=${shopId}&limit=50`);
      setDeals(response.data.data || []);
    } catch (error) {
      console.error('Error fetching hot deals:', error);
      toast.error('Failed to load hot deals');
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = async (itemId) => {
    try {
      // Track click
      await axios.post(`${API_URL}/campaigns/track-click`, { inventory_id: itemId });
      toast.success('Deal clicked! Contact the shop to purchase.');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const getFilteredDeals = () => {
    let filtered = deals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(deal => deal.category === selectedCategory);
    }

    // Sort
    if (sortBy === 'discount') {
      filtered.sort((a, b) => b.discount_percentage - a.discount_percentage);
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => a.discounted_price - b.discounted_price);
    } else if (sortBy === 'ending_soon') {
      filtered.sort((a, b) => a.ends_in_days - b.ends_in_days);
    }

    return filtered;
  };

  const filteredDeals = getFilteredDeals();
  const categories = ['All', ...new Set(deals.map(d => d.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="h-10 w-10 animate-pulse" />
            <h1 className="text-4xl font-bold">🔥 Hot Deals</h1>
          </div>
          <p className="text-red-100 text-lg">
            Limited time offers on expiring & clearance items - Save up to 75%!
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Deals updated in real-time • {deals.length} active offers</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="discount">Highest Discount</option>
              <option value="price">Lowest Price</option>
              <option value="ending_soon">Ending Soon</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No deals found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your filters or check back later for new deals!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <div
                key={deal.item_id}
                onClick={() => handleDealClick(deal.item_id)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-red-500"
              >
                {/* Discount Badge */}
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10">
                    <div className={`px-4 py-2 rounded-full font-bold text-white shadow-lg ${
                      deal.discount_percentage >= 50 ? 'bg-red-600' :
                      deal.discount_percentage >= 30 ? 'bg-orange-600' :
                      'bg-yellow-600'
                    }`}>
                      {deal.discount_percentage}% OFF
                    </div>
                  </div>
                  
                  {/* Urgency Badge */}
                  {deal.ends_in_days <= 2 && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="px-3 py-1 bg-black bg-opacity-75 text-white rounded-full text-xs font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {deal.ends_in_days === 0 ? 'Ends Today!' : `${deal.ends_in_days}d left`}
                      </div>
                    </div>
                  )}

                  {/* Placeholder Image */}
                  <div className="h-48 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center">
                    <Tag className="h-20 w-20 text-red-300 dark:text-red-700" />
                  </div>
                </div>

                {/* Deal Info */}
                <div className="p-5">
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                      {deal.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {deal.item_name}
                  </h3>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                      ₹{deal.discounted_price}
                    </span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                      ₹{deal.original_price}
                    </span>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      💰 You Save: ₹{deal.savings}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>{deal.reason}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Offer ends in {deal.ends_in_days} day{deal.ends_in_days !== 1 ? 's' : ''}</span>
                    </div>
                    {deal.stock_qty <= 10 && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                        <Flame className="h-4 w-4" />
                        <span>Only {deal.stock_qty} left!</span>
                      </div>
                    )}
                  </div>

                  <button className="w-full mt-4 bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-orange-700 transition-all shadow-md">
                    Grab This Deal!
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">Why These Deals?</h2>
          <p className="text-indigo-100 max-w-2xl mx-auto">
            These items are nearing expiry or need to be cleared quickly. 
            The shop offers massive discounts to avoid waste - you get amazing prices, 
            they avoid losses. It's a win-win! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};

export default HotDeals;
