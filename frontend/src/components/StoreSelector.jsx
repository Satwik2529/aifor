import React, { useState, useEffect } from 'react';
import { Search, MapPin, Clock, Star, Phone, Store, Check } from 'lucide-react';
import axios from 'axios';

const StoreSelector = ({ onStoreSelect, selectedStoreId }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [sortBy, setSortBy] = useState('distance'); // distance, rating, name

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      const store = stores.find(s => s._id === selectedStoreId);
      if (store) {
        setSelectedStore(store);
      }
    }
  }, [selectedStoreId, stores]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/chatbot/customer/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setStores(response.data.data.available_retailers || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores
    .filter(store => 
      (store.business_name?.toLowerCase() || store.name?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (store.shop_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.business_name || a.name || '').localeCompare(b.business_name || b.name || '');
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0; // distance would require location data
      }
    });

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    onStoreSelect(store);
  };

  const getStoreStatus = (store) => {
    const now = new Date();
    const hour = now.getHours();
    const isOpen = hour >= 8 && hour <= 20; // Simple 8 AM - 8 PM logic
    
    return {
      isOpen,
      status: isOpen ? 'Open' : 'Closed',
      statusColor: isOpen ? 'text-green-600' : 'text-red-600',
      bgColor: isOpen ? 'bg-green-100' : 'bg-red-100'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading stores...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Store className="w-5 h-5 mr-2 text-blue-600" />
            Choose Your Store
          </h2>
          <span className="text-sm text-gray-500">
            {filteredStores.length} stores available
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search stores by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="distance">Nearest First</option>
            <option value="name">Name A-Z</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Store List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No stores found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your search</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStores.map((store) => {
              const status = getStoreStatus(store);
              const isSelected = selectedStore?._id === store._id;
              
              return (
                <div
                  key={store._id}
                  onClick={() => handleStoreSelect(store)}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {store.business_name || store.name}
                        </h3>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.statusColor}`}>
                          {status.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {store.shop_name && `${store.shop_name} • `}
                        {store.address}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {store.phone}
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          8:00 AM - 8:00 PM
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          ~2.5 km away
                        </div>
                        
                        {store.rating && (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                            {store.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      
                      {store.language && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">
                            Languages: {Array.isArray(store.language) ? store.language.join(', ') : store.language}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Store Summary */}
      {selectedStore && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Selected Store
              </p>
              <p className="text-sm text-blue-700">
                {selectedStore.business_name || selectedStore.name}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedStore(null);
                onStoreSelect(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSelector;
