import React, { useState, useEffect } from 'react';
import { ArrowLeft, Store, Clock, CheckCircle, Package, User, Bot, MessageSquare, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerChatbot from '../components/CustomerChatbot';
import StoreSelector from '../components/StoreSelector';
import CustomerProfile from '../components/CustomerProfile';
import axios from 'axios';

const CustomerChatbotPage = () => {
  const navigate = useNavigate();
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [activeView, setActiveView] = useState('stores'); // 'stores', 'chatbot', 'profile', 'orders'
  const [pendingOrder, setPendingOrder] = useState(null);

  useEffect(() => {
    loadCustomerInfo();
    loadRetailers();
  }, []);

  const loadCustomerInfo = () => {
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    setCustomerInfo(userInfo);
  };

  const loadRetailers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/chatbot/customer/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Store retailers data is handled by StoreSelector component
    } catch (error) {
      console.error('Failed to load retailers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (store) => {
    setSelectedRetailer(store);
    setActiveView('chatbot');
  };

  const handleOrderPlaced = (orderData) => {
    setPendingOrder(orderData);
    setActiveView('orders');
  };

  const handleProfileUpdate = (updatedProfile) => {
    setCustomerInfo(updatedProfile);
  };

  const handleBackToStores = () => {
    setSelectedRetailer(null);
    setActiveView('stores');
  };

  const navigationItems = [
    { id: 'stores', label: 'Stores', icon: Store, description: 'Choose your preferred store' },
    { id: 'chatbot', label: 'AI Assistant', icon: Bot, description: 'Chat with our AI assistant' },
    { id: 'orders', label: 'My Orders', icon: Package, description: 'Track your orders' },
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your account' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your shopping experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {activeView !== 'stores' && (
                <button
                  onClick={handleBackToStores}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">BizNova Shopping</h1>
                <p className="text-sm text-gray-500">
                  {selectedRetailer 
                    ? `Ordering from: ${selectedRetailer.business_name || selectedRetailer.name}`
                    : navigationItems.find(item => item.id === activeView)?.description || 'Choose a store to start'
                  }
                </p>
              </div>
            </div>
            
            {customerInfo && (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{customerInfo.name}</p>
                  <p className="text-xs text-gray-500">Customer</p>
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isDisabled = item.id === 'chatbot' && !selectedRetailer;
              
              return (
                <button
                  key={item.id}
                  onClick={() => !isDisabled && setActiveView(item.id)}
                  disabled={isDisabled}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : isDisabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Stores View */}
            {activeView === 'stores' && (
              <StoreSelector 
                onStoreSelect={handleStoreSelect}
                selectedStoreId={selectedRetailer?._id}
              />
            )}

            {/* Chatbot View */}
            {activeView === 'chatbot' && selectedRetailer && (
              <div className="h-[calc(100vh-280px)]">
                <CustomerChatbot
                  customerId={customerInfo?.id}
                  retailerId={selectedRetailer._id}
                  onOrderPlaced={handleOrderPlaced}
                />
              </div>
            )}

            {/* Orders View */}
            {activeView === 'orders' && (
              <div className="space-y-6">
                {pendingOrder ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-900">Order Placed Successfully!</h3>
                        <p className="text-green-700">Order ID: {pendingOrder.order_id}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Order Total</p>
                      <p className="text-2xl font-bold text-gray-900">₹{pendingOrder.total}</p>
                      <p className="text-sm text-gray-500 mt-1">{pendingOrder.items_count} items</p>
                    </div>
                    <button
                      onClick={() => navigate('/customer-requests')}
                      className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View All Orders
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4" />
                      <p className="font-medium">No recent orders</p>
                      <p className="text-sm mt-2">Start shopping with our AI assistant to place your first order</p>
                      <button
                        onClick={() => setActiveView('chatbot')}
                        className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start Shopping
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile View */}
            {activeView === 'profile' && (
              <CustomerProfile
                customerId={customerInfo?.id}
                onProfileUpdate={handleProfileUpdate}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Store Info */}
            {selectedRetailer && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Store className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Current Store</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedRetailer.business_name || selectedRetailer.name}
                    </p>
                    <p className="text-sm text-gray-600">{selectedRetailer.shop_name}</p>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedRetailer.address || 'Address not available'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-1" />
                    {selectedRetailer.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Open: 8:00 AM - 8:00 PM
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('stores')}
                  className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Change Store
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveView('chatbot')}
                  disabled={!selectedRetailer}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <Bot className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Start Chat</p>
                    <p className="text-sm text-gray-600">Talk to AI assistant</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveView('orders')}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Package className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">View Orders</p>
                    <p className="text-sm text-gray-600">Track your purchases</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/customer-requests')}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Messages</p>
                    <p className="text-sm text-gray-600">Contact retailers</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Need Help?</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Say "I want to make curry for 4 people"</p>
                <p>• List items: "Buy 2kg rice, 1 litre milk"</p>
                <p>• Mix requests: "Make dosa and buy tea"</p>
                <p>• Available in English, Hindi, Telugu, Tamil</p>
              </div>
              <button
                onClick={() => setActiveView('chatbot')}
                disabled={!selectedRetailer}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                Try AI Assistant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerChatbotPage;
