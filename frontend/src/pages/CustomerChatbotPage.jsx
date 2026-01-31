import React, { useState, useEffect } from 'react';
import { ArrowLeft, Store, Phone } from 'lucide-react';

// Import the EXISTING FloatingChatbot
import FloatingChatbot from '../components/FloatingChatbot';

const CustomerChatbotPage = () => {
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRetailerSelection, setShowRetailerSelection] = useState(true);

  useEffect(() => {
    loadRetailers();
  }, []);

  const loadRetailers = async () => {
    try {
      const token = localStorage.getItem('token');
      let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      // Remove /api suffix if present to avoid double /api/api/
      API_URL = API_URL.replace(/\/api$/, '');
      
      const url = `${API_URL}/api/customer-requests/retailers?search=`;
      console.log('Fetching retailers from:', url);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      console.log('Retailers response:', result);
      
      if (result.success) {
        setRetailers(result.data.retailers || []);
        if (!result.data.retailers || result.data.retailers.length === 0) {
          console.log('No retailers found');
        }
      } else {
        console.error('Failed to load retailers');
      }
    } catch (error) {
      console.error('Failed to load retailers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (store) => {
    setSelectedRetailer(store);
    setShowRetailerSelection(false);
  };

  const handleBackToStores = () => {
    setSelectedRetailer(null);
    setShowRetailerSelection(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {selectedRetailer && (
                <button
                  onClick={handleBackToStores}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {selectedRetailer ? selectedRetailer.shop_name : 'Select Store'}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {selectedRetailer && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-1" />
                  {selectedRetailer.phone}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Store Selection */}
      {showRetailerSelection && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Store</h2>
            <p className="text-gray-600">Select a kirana store to start shopping with AI assistance</p>
          </div>

          <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
            {retailers.map((retailer) => (
              <div
                key={retailer._id}
                onClick={() => handleStoreSelect(retailer)}
                className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedRetailer?._id === retailer._id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">{retailer.shop_name || retailer.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{retailer.phone}</p>
                    {retailer.language && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {retailer.language}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {retailers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No retailers found</p>
            )}
          </div>
        </div>
      )}

      {/* Selected Store Info */}
      {selectedRetailer && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedRetailer.shop_name}</h2>
                <p className="text-gray-600">Chat with AI assistant for shopping help</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{selectedRetailer.phone}</p>
                <p className="text-xs text-green-600">✓ Available</p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-gray-500">
            <p>💬 Chat with our AI assistant using the floating bot at the bottom right</p>
            <p className="text-sm mt-2">Ask for products, cooking help, or shopping assistance</p>
          </div>
        </div>
      )}

      {/* THE SAME FLOATING CHATBOT - Just with customer mode */}
      {selectedRetailer && (
        <FloatingChatbot 
          isCustomerMode={true}
          retailerId={selectedRetailer._id}
          retailerName={selectedRetailer.shop_name}
        />
      )}
    </div>
  );
};

export default CustomerChatbotPage;
