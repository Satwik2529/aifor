import React from 'react';
import { ShoppingCart, Package, CheckCircle, AlertCircle, X } from 'lucide-react';

const OrderSummary = ({ 
  items, 
  unavailableItems, 
  lowStockItems, 
  onConfirm, 
  onCancel, 
  isLoading,
  currency = '₹'
}) => {
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  if (items.length === 0 && unavailableItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Order Summary</h3>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            {items.length} items
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Available Items */}
        {items.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Available Items</h4>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} {item.unit || 'pcs'}
                        {item.price_per_unit && ` × ${currency}${item.price_per_unit}/${item.unit || 'unit'}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-700">
                      {currency}{item.total_price || (item.price_per_unit * item.quantity)}
                    </p>
                    <p className="text-xs text-gray-500">In stock</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable Items */}
        {unavailableItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <X className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-gray-900">Unavailable Items</h4>
            </div>
            
            <div className="space-y-3">
              {unavailableItems.map((item, index) => (
                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit || 'pcs'}
                        </p>
                      </div>
                    </div>
                    <span className="text-red-600 text-sm font-medium">Out of stock</span>
                  </div>
                  
                  {item.alternatives && item.alternatives.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Alternatives:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.alternatives.map((alt, altIndex) => (
                          <span key={altIndex} className="text-xs bg-white px-2 py-1 rounded border border-gray-300">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-gray-900">Limited Stock</h4>
            </div>
            
            <div className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Package className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-sm text-gray-600">
                          Requested: {item.quantity} {item.unit || 'pcs'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-600 font-medium">
                        Only {item.available_quantity} {item.unit || 'pcs'} available
                      </p>
                      <p className="text-xs text-gray-500">Adjust quantity</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Price Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({items.length} items)</span>
                <span className="font-medium">{currency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5%)</span>
                <span className="font-medium">{currency}{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-blue-600">{currency}{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {items.length > 0 && (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{isLoading ? 'Placing Order...' : 'Confirm Order'}</span>
            </button>
          )}
          
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Order Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> Your order will be sent to the retailer for confirmation. 
            You'll receive updates on order status.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
