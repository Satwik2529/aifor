import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Send, Package, Clock, CheckCircle, XCircle, Plus, Store, ShoppingCart, AlertCircle, Settings, Bot, MessageCircle, Moon, Sun, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';
import FloatingAIChatbot from '../components/FloatingAIChatbot';

/**
 * Customer Dashboard
 * Allows customers to message retailers and view their requests
 */
const CustomerDashboard = () => {
  const [retailers, setRetailers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [messageForm, setMessageForm] = useState({
    items: [{ item_name: '', quantity: 1 }],
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('message');
  const [retailerInventory, setRetailerInventory] = useState([]);
  const [itemAvailability, setItemAvailability] = useState({});
  const [checkingStock, setCheckingStock] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  const navigate = useNavigate();

  let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  // Remove /api suffix if present to avoid double /api/api/
  API_URL = API_URL.replace(/\/api$/, '');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || localStorage.getItem('userType') !== 'customer') {
      navigate('/login');
      return;
    }

    fetchRetailers();
    fetchMyRequests();
  }, [token, navigate]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchRetailers = async (search = '') => {
    try {
      const url = `${API_URL}/api/customer-requests/retailers?search=${encodeURIComponent(search)}`;
      console.log('Fetching retailers from:', url);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      console.log('Retailers response:', result);

      if (result.success) {
        setRetailers(result.data.retailers || []);
        if (!result.data.retailers || result.data.retailers.length === 0) {
          toast.error('No retailers found. Please ask a retailer to sign up first.');
        }
      } else {
        toast.error('Failed to load retailers');
      }
    } catch (error) {
      console.error('Fetch retailers error:', error);
      toast.error('Error loading retailers');
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer-requests/customer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setRequests(result.data.requests);
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchRetailers(query);
  };

  const handleSelectRetailer = async (retailer) => {
    setSelectedRetailer(retailer);
    setShowMessageForm(true);
    setShowInventory(false);
    // Fetch retailer's inventory
    await fetchRetailerInventory(retailer._id);
  };

  const fetchRetailerInventory = async (retailer_id) => {
    try {
      const response = await fetch(`${API_URL}/api/customer-requests/retailer/${retailer_id}/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setRetailerInventory(result.data.items || []);
      }
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
  };

  const checkItemAvailability = async (items) => {
    if (!selectedRetailer || items.length === 0) return;

    // Filter out empty items
    const validItems = items.filter(item => item.item_name.trim());
    if (validItems.length === 0) return;

    setCheckingStock(true);
    console.log('🔍 Checking availability for:', validItems);

    try {
      const response = await fetch(`${API_URL}/api/customer-requests/retailer/${selectedRetailer._id}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: validItems })
      });

      const result = await response.json();
      console.log('✅ Availability check result:', result);

      if (result.success) {
        // Create availability map by item name
        const availMap = {};
        result.data.availability.forEach(item => {
          availMap[item.item_name.toLowerCase()] = item;
          console.log(`📦 ${item.item_name}: ${item.status} (${item.available_quantity} available, ${item.requested_quantity} requested)`);
        });
        setItemAvailability(availMap);
      }
    } catch (error) {
      console.error('❌ Check availability error:', error);
    } finally {
      setCheckingStock(false);
    }
  };

  const handleAddItem = () => {
    setMessageForm({
      ...messageForm,
      items: [...messageForm.items, { item_name: '', quantity: 1 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = messageForm.items.filter((_, i) => i !== index);
    setMessageForm({ ...messageForm, items: newItems });
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...messageForm.items];
    newItems[index][field] = field === 'quantity' ? parseInt(value) || 1 : value;
    setMessageForm({ ...messageForm, items: newItems });

    // Check availability after change (debounced)
    if (newItems[index].item_name.trim()) {
      setTimeout(() => checkItemAvailability(newItems), 500);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!selectedRetailer) {
      toast.error('Please select a retailer');
      return;
    }

    const validItems = messageForm.items.filter(item => item.item_name.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Check if all items are available before submitting
    // Verify each item has been checked and is available
    for (const item of validItems) {
      const availability = itemAvailability[item.item_name.toLowerCase()];
      if (!availability) {
        toast.error(`Please wait for stock check or remove "${item.item_name}"`);
        return;
      }
      if (!availability.can_order) {
        toast.error(`"${item.item_name}" is unavailable. ${availability.message}`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/customer-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          retailer_id: selectedRetailer._id,
          items: validItems,
          notes: messageForm.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Request sent successfully!');
        setShowMessageForm(false);
        setMessageForm({ items: [{ item_name: '', quantity: 1 }], notes: '' });
        setSelectedRetailer(null);
        setItemAvailability({});
        fetchMyRequests();
      } else {
        // Handle stock errors
        if (result.outOfStockItems || result.lowStockItems) {
          const outOfStock = result.outOfStockItems || [];
          const lowStock = result.lowStockItems || [];

          if (outOfStock.length > 0) {
            toast.error(`Out of stock: ${outOfStock.map(i => i.item_name).join(', ')}`);
          }
          if (lowStock.length > 0) {
            toast.error(`Insufficient stock: ${lowStock.map(i => `${i.item_name} (only ${i.available} available)`).join(', ')}`);
          }
        } else {
          toast.error(result.message || 'Failed to send request');
        }
      }
    } catch (error) {
      console.error('Submit request error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'Processing' },
      billed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Billed' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleProfileSettings = () => {
    navigate('/customer/profile-settings');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Floating AI Chatbot */}
      <FloatingAIChatbot />

      {/* Modern Minimalist Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${isDarkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: User Info */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  {user.name?.[0] || 'C'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
              <div>
                <h1 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.name}
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Customer
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <NotificationBell isDarkMode={isDarkMode} />

              <button
                onClick={handleProfileSettings}
                className={`hidden sm:flex p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={handleLogout}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isDarkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Clean Tab Navigation */}
        <div className={`inline-flex rounded-xl p-1 mb-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('message')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'message'
              ? isDarkMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-600 text-white shadow-lg'
              : isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Store className="h-4 w-4" />
            <span>Browse Stores</span>
          </button>

          <button
            onClick={() => setActiveTab('my-requests')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'my-requests'
              ? isDarkMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-600 text-white shadow-lg'
              : isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>My Orders</span>
            {requests.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Message Retailer Tab */}
        {activeTab === 'message' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retailer List */}
            <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-sm`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Available Stores
              </h2>

              {/* Search Bar */}
              <div className="mb-4 relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search stores..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                />
              </div>

              {/* Retailer Cards */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {retailers.map((retailer) => (
                  <div
                    key={retailer._id}
                    onClick={() => handleSelectRetailer(retailer)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedRetailer?._id === retailer._id
                      ? isDarkMode
                        ? 'bg-blue-600/10 border-blue-600'
                        : 'bg-blue-50 border-blue-600'
                      : isDarkMode
                        ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedRetailer?._id === retailer._id
                        ? 'bg-blue-600 text-white'
                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                        }`}>
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {retailer.shop_name || retailer.name}
                        </h3>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {retailer.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {retailers.length === 0 && (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Store className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                    <p className="text-sm">No stores found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Message Form */}
            <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-sm`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedRetailer ? `Order from ${selectedRetailer.shop_name || selectedRetailer.name}` : 'Select a Store'}
              </h2>

              {showMessageForm && selectedRetailer ? (
                <form onSubmit={handleSubmitRequest} className="space-y-3 sm:space-y-4">
                  {/* View Inventory Button */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setShowInventory(!showInventory)}
                      className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors ${isDarkMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                    >
                      <Package className="h-4 w-4" />
                      <span>{showInventory ? 'Hide' : 'View'} Available Items ({retailerInventory.length})</span>
                    </button>
                    {checkingStock && (
                      <span className={`text-xs hidden sm:inline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Checking stock...</span>
                    )}
                  </div>

                  {/* Inventory List */}
                  {showInventory && (
                    <div className={`rounded-lg p-4 max-h-48 overflow-y-auto transition-colors ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                      <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Available Inventory</h4>
                      {retailerInventory.length > 0 ? (
                        <div className="space-y-1">
                          {retailerInventory.map((invItem, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{invItem.item_name}</span>
                              <div className="flex items-center space-x-2">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{invItem.quantity} {invItem.unit || 'units'}</span>
                                {invItem.stock_status === 'out_of_stock' && (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Out of Stock</span>
                                )}
                                {invItem.stock_status === 'low_stock' && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Low Stock</span>
                                )}
                                {invItem.stock_status === 'in_stock' && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">In Stock</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No inventory available</p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Items *
                    </label>
                    {messageForm.items.map((item, index) => {
                      const availability = item.item_name ? itemAvailability[item.item_name.toLowerCase()] : null;
                      return (
                        <div key={index} className="mb-2 sm:mb-3">
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <div className="flex-1 relative min-w-0">
                              <input
                                type="text"
                                list={`inventory-items-${index}`}
                                placeholder="Item name (type or select)"
                                value={item.item_name}
                                onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${availability && !availability.can_order
                                  ? 'border-red-500 bg-red-50'
                                  : isDarkMode
                                    ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border border-gray-300 text-gray-900'
                                  }`}
                              />
                              <datalist id={`inventory-items-${index}`}>
                                {retailerInventory.filter(i => i.stock_status !== 'out_of_stock').map((invItem, idx) => (
                                  <option key={idx} value={invItem.item_name}>
                                    {invItem.quantity} {invItem.unit || 'units'} available
                                  </option>
                                ))}
                              </datalist>
                            </div>
                            <div className="relative flex-shrink-0">
                              <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                min="1"
                                max={availability && availability.can_order ? availability.available_quantity : undefined}
                                className={`w-full sm:w-24 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${availability && !availability.can_order
                                  ? 'border-red-500 bg-red-50'
                                  : isDarkMode
                                    ? 'bg-gray-700 border border-gray-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-900'
                                  }`}
                              />
                              {availability && availability.available_quantity > 0 && (
                                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                  max: {availability.available_quantity}
                                </span>
                              )}
                            </div>
                            {messageForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className={`px-3 py-2 rounded-lg transition-colors ${isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-gray-700' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                          {/* Stock Status Message */}
                          {availability && (
                            <div className={`mt-1 text-sm flex items-center justify-between ${availability.can_order ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                              } px-3 py-2 rounded-md`}>
                              <div className="flex items-center space-x-2">
                                {availability.can_order ? (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="font-medium">✓ Available</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="font-medium">✗ {availability.status === 'not_found' ? 'Not in Shop' : 'Unavailable'}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-sm font-semibold">
                                {availability.status === 'available' && (
                                  <span className="text-green-800">
                                    Stock: {availability.available_quantity} {availability.unit || 'units'}
                                  </span>
                                )}
                                {availability.status === 'insufficient_stock' && (
                                  <span className="text-red-800">
                                    Only {availability.available_quantity} {availability.unit || 'units'} available
                                  </span>
                                )}
                                {availability.status === 'out_of_stock' && (
                                  <span className="text-red-800">Out of Stock (0 available)</span>
                                )}
                                {availability.status === 'not_found' && (
                                  <span className="text-red-800">Not available in this shop</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className={`mt-2 flex items-center space-x-1 text-sm font-medium transition-colors ${isDarkMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {/* Order Summary */}
                  {Object.keys(itemAvailability).length > 0 && (
                    <div className={`rounded-lg p-4 transition-colors ${isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                        <Package className="h-4 w-4" />
                        <span>Order Summary</span>
                      </h3>
                      <div className="space-y-2">
                        {messageForm.items.filter(item => item.item_name.trim()).map((item, idx) => {
                          const avail = itemAvailability[item.item_name.toLowerCase()];
                          if (!avail) return null;
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{item.item_name} × {item.quantity}</span>
                              <div className="flex items-center space-x-2">
                                {avail.can_order ? (
                                  <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                    ✓ Stock: {avail.available_quantity} {avail.unit || 'units'}
                                  </span>
                                ) : (
                                  <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                                    ✗ {avail.status === 'not_found' ? 'Not available' : `Only ${avail.available_quantity} available`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {Object.values(itemAvailability).some(item => !item.can_order) && (
                        <div className={`mt-3 p-2 rounded text-sm flex items-center space-x-2 ${isDarkMode ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-red-100 border border-red-300 text-red-800'}`}>
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Cannot proceed: Some items are unavailable or insufficient</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className={`block text-xs sm:text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows="3"
                      value={messageForm.notes}
                      onChange={(e) => setMessageForm({ ...messageForm, notes: e.target.value })}
                      className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${isDarkMode ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400' : 'bg-white border border-gray-300 text-gray-900'}`}
                      placeholder="Any special requests or instructions..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-semibold bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMessageForm(false);
                        setSelectedRetailer(null);
                        setMessageForm({ items: [{ item_name: '', quantity: 1 }], notes: '' });
                      }}
                      className={`px-4 py-3 text-sm font-medium rounded-xl transition-all transform hover:scale-105 ${isDarkMode ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Store className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p>Select a retailer to send a request</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === 'my-requests' && (
          <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-sm`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              My Orders
            </h2>

            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className={`rounded-lg p-4 border transition-all ${isDarkMode
                      ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {request.retailer_id?.shop_name || request.retailer_id?.name}
                      </h3>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="space-y-2 mb-3">
                    <p className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Items
                    </p>
                    {request.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between text-sm py-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        <span>{item.item_name} × {item.quantity}</span>
                        {item.price_per_unit > 0 && (
                          <span className="font-medium">₹{item.total_price}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {request.notes && (
                    <p className={`text-sm mb-3 p-2 rounded ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      <span className="font-medium">Note:</span> {request.notes}
                    </p>
                  )}

                  {request.bill_details && request.bill_details.total > 0 && (
                    <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                          ₹{request.bill_details.subtotal?.toFixed(2)}
                        </span>
                      </div>
                      {request.bill_details.tax > 0 && (
                        <div className="flex justify-between text-sm mb-2">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tax</span>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                            ₹{request.bill_details.tax?.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base">
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Total</span>
                        <span className="text-blue-600">₹{request.bill_details.total?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {requests.length === 0 && (
                <div className={`text-center py-16 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Browse stores to place your first order</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
