import React, { useState, useEffect } from 'react';
import { Clock, Package, CheckCircle, XCircle, User, Phone, MapPin, DollarSign, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Customer Requests Component for Retailer Dashboard
 * Displays and manages customer requests sent to the retailer
 */
const CustomerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [billForm, setBillForm] = useState({ items: [], taxRate: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'processing', 'billed', 'completed', 'cancelled'

  let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  // Remove /api suffix if present to avoid double /api/api/
  API_URL = API_URL.replace(/\/api$/, '');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRequests();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const url = filter === 'all' 
        ? `${API_URL}/api/customer-requests/retailer`
        : `${API_URL}/api/customer-requests/retailer?status=${filter}`;
        
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.success) {
        // Debug: Log first request's customer data
        if (result.data.requests.length > 0) {
          console.log('📊 Sample request customer data:', {
            name: result.data.requests[0].customer_id?.name,
            phone: result.data.requests[0].customer_id?.phone,
            email: result.data.requests[0].customer_id?.email,
            address: result.data.requests[0].customer_id?.address
          });
        }
        
        // Sort: Active requests first, then completed/cancelled
        const sorted = result.data.requests.sort((a, b) => {
          const statusOrder = { pending: 1, processing: 2, billed: 3, completed: 4, cancelled: 5 };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });
        setRequests(sorted);
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
    }
  };

  const handleOpenCancelModal = (request) => {
    setSelectedRequest(request);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  const handleCancelRequest = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    console.log('🚫 Cancelling request:', selectedRequest._id, 'Reason:', cancellationReason);
    setIsLoading(true);
    try {
      const requestBody = { 
        status: 'cancelled',
        cancellation_reason: cancellationReason 
      };
      console.log('📤 Sending cancel request:', requestBody);

      const response = await fetch(`${API_URL}/api/customer-requests/${selectedRequest._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (result.success) {
        toast.success('✅ Request cancelled successfully');
        setShowCancelModal(false);
        setSelectedRequest(null);
        setCancellationReason('');
        await fetchRequests();
      } else {
        console.error('❌ Cancel failed:', result);
        toast.error(result.message || result.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('❌ Cancel request error:', error);
      toast.error('Network error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCompleteModal = (request) => {
    setSelectedRequest(request);
    setPaymentMethod('Cash');
    setShowCompleteModal(true);
  };

  const handleCompleteRequest = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    console.log('✅ Completing request:', selectedRequest._id, 'Payment:', paymentMethod);
    console.log('Current request status:', selectedRequest.status);
    console.log('Bill details:', selectedRequest.bill_details);

    setIsLoading(true);
    try {
      const requestBody = { 
        status: 'completed',
        payment_method: paymentMethod 
      };
      console.log('📤 Sending complete request:', requestBody);

      const response = await fetch(`${API_URL}/api/customer-requests/${selectedRequest._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (result.success) {
        toast.success('✅ Request completed! Sales entry created and inventory updated');
        console.log('✅ Sales created:', result.data?.sales_created, 'Inventory updated:', result.data?.inventory_updated);
        setShowCompleteModal(false);
        setSelectedRequest(null);
        setPaymentMethod('Cash');
        await fetchRequests();
      } else {
        console.error('❌ Complete failed:', result);
        toast.error(result.message || result.error || 'Failed to complete request');
      }
    } catch (error) {
      console.error('❌ Complete request error:', error);
      toast.error('Network error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/customer-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        const successMessages = {
          processing: 'Request marked as processing',
          billed: 'Bill generated successfully',
          completed: '✅ Request completed! Sales entry created and inventory updated',
          cancelled: 'Request cancelled'
        };
        toast.success(successMessages[newStatus] || `Status updated to ${newStatus}`);
        fetchRequests();
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('An error occurred');
    }
  };

  const handleOpenBillModal = (request) => {
    setSelectedRequest(request);
    setBillForm({
      items: request.items.map(item => ({
        ...item,
        price_per_unit: item.price_per_unit || 0
      })),
      taxRate: 0
    });
    setShowBillModal(true);
  };

  const handlePriceChange = (index, price) => {
    const newItems = [...billForm.items];
    newItems[index].price_per_unit = parseFloat(price) || 0;
    setBillForm({ ...billForm, items: newItems });
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    
    if (!selectedRequest) return;

    console.log('💵 Generating bill for request:', selectedRequest._id);
    console.log('Bill form data:', billForm);

    setIsLoading(true);

    try {
      const requestBody = {
        items: billForm.items,
        taxRate: billForm.taxRate
      };
      console.log('📤 Sending bill request:', requestBody);

      const response = await fetch(`${API_URL}/api/customer-requests/${selectedRequest._id}/bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (result.success) {
        toast.success('✅ Bill generated successfully!');
        console.log('✅ Bill details:', result.data?.bill_details);
        setShowBillModal(false);
        setSelectedRequest(null);
        await fetchRequests();
      } else {
        console.error('❌ Generate bill failed:', result);
        toast.error(result.message || result.error || 'Failed to generate bill');
      }
    } catch (error) {
      console.error('❌ Generate bill error:', error);
      toast.error('Network error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-300', 
        icon: Clock, 
        text: 'Pending',
        pulse: true
      },
      processing: { 
        color: 'bg-blue-100 text-blue-800 border border-blue-300', 
        icon: Package, 
        text: 'Processing',
        pulse: true
      },
      billed: { 
        color: 'bg-purple-100 text-purple-800 border border-purple-300', 
        icon: DollarSign, 
        text: 'Billed',
        pulse: false
      },
      completed: { 
        color: 'bg-green-100 text-green-800 border border-green-300 font-semibold', 
        icon: CheckCircle, 
        text: '✓ Completed',
        pulse: false
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border border-red-300', 
        icon: XCircle, 
        text: '✗ Cancelled',
        pulse: false
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
        <Icon className="w-3.5 h-3.5 mr-1.5" />
        {config.text}
      </span>
    );
  };

  const calculateTotal = () => {
    const subtotal = billForm.items.reduce((sum, item) => 
      sum + (item.price_per_unit * item.quantity), 0
    );
    const tax = subtotal * (billForm.taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Requests</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All', color: 'gray' },
            { value: 'pending', label: 'Pending', color: 'yellow' },
            { value: 'processing', label: 'Processing', color: 'blue' },
            { value: 'billed', label: 'Billed', color: 'purple' },
            { value: 'completed', label: '✓ Completed', color: 'green' },
            { value: 'cancelled', label: '✗ Cancelled', color: 'red' }
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                filter === filterOption.value
                  ? 'bg-primary-600 text-white shadow-md scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3 sm:space-y-4">
        {requests.map((request) => (
          <div key={request._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow border border-transparent dark:border-gray-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{request.customer_id?.name || 'Customer'}</h3>
                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {request.customer_id?.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{request.customer_id.phone}</span>
                      </div>
                    )}
                    {request.customer_id?.email && (
                      <div className="flex items-center gap-1">
                        <span className="truncate">{request.customer_id.email}</span>
                      </div>
                    )}
                    {!request.customer_id?.phone && !request.customer_id?.email && (
                      <span className="text-gray-500 dark:text-gray-500 italic text-xs">No contact info</span>
                    )}
                  </div>
                  {request.customer_id?.address && Object.values(request.customer_id.address).some(val => val && val.trim()) && (
                    <div className="flex items-start gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {[
                          request.customer_id.address.street,
                          request.customer_id.address.city,
                          request.customer_id.address.state,
                          request.customer_id.address.pincode
                        ].filter(val => val && val.trim()).join(', ')}
                      </span>
                    </div>
                  )}
                  {(!request.customer_id?.address || !Object.values(request.customer_id.address).some(val => val && val.trim())) && (
                    <div className="flex items-start gap-1 text-xs text-gray-500 dark:text-gray-500 italic mt-1">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                      <span>No address provided</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2">
                {getStatusBadge(request.status)}
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(request.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Requested Items:</h4>
              <div className="space-y-2">
                {request.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col xs:flex-row xs:justify-between gap-1 xs:gap-2 text-xs sm:text-sm bg-gray-50 p-2 rounded">
                    <span className="text-gray-900 font-medium">{item.item_name}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      Qty: {item.quantity}
                      {item.price_per_unit > 0 && (
                        <span className="ml-2 font-medium text-gray-900">
                          × ₹{item.price_per_unit} = ₹{item.total_price}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {request.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs sm:text-sm text-gray-700">
                  <span className="font-medium">Notes:</span> {request.notes}
                </p>
              </div>
            )}

            {/* Bill Details */}
            {request.bill_details && request.bill_details.total > 0 && (
              <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  Bill Details
                </h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-medium">₹{request.bill_details.subtotal?.toFixed(2)}</span>
                  </div>
                  {request.bill_details.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tax:</span>
                      <span className="font-medium">₹{request.bill_details.tax?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-green-300">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-base sm:text-lg text-primary-600">
                      ₹{request.bill_details.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {request.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(request._id, 'processing')}
                    className="flex-1 xs:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 transition-all hover:shadow-lg whitespace-nowrap"
                  >
                    Mark as Processing
                  </button>
                  <button
                    onClick={() => handleOpenBillModal(request)}
                    className="flex-1 xs:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 transition-all hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Generate Bill</span>
                  </button>
                  <button
                    onClick={() => handleOpenCancelModal(request)}
                    className="w-full xs:w-auto px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white text-xs sm:text-sm rounded-md hover:bg-red-700 transition-all hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Cancel Request</span>
                  </button>
                </>
              )}
              {request.status === 'processing' && (
                <>
                  <button
                    onClick={() => handleOpenBillModal(request)}
                    className="flex-1 xs:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 transition-all hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Generate Bill</span>
                  </button>
                  <button
                    onClick={() => handleOpenCancelModal(request)}
                    className="flex-1 xs:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white text-xs sm:text-sm rounded-md hover:bg-red-700 transition-all hover:shadow-lg flex items-center justify-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Cancel Request</span>
                  </button>
                </>
              )}
              {request.status === 'billed' && (
                <button
                  onClick={() => handleOpenCompleteModal(request)}
                  className="w-full xs:w-auto px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white text-xs sm:text-sm rounded-md hover:bg-green-700 transition-all hover:shadow-lg flex items-center justify-center gap-1 font-semibold"
                >
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>✓ Mark as Completed</span>
                </button>
              )}
              {request.status === 'cancelled' && request.cancellation_reason && (
                <div className="w-full mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-900 mb-1">Cancellation Reason:</p>
                  <p className="text-xs sm:text-sm text-red-800">{request.cancellation_reason}</p>
                </div>
              )}
              {request.status === 'completed' && (
                <div className="w-full mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-green-900">Order Completed Successfully!</p>
                    <p className="text-xs text-green-700">Sales entry created • Inventory updated</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 sm:p-12 text-center border border-transparent dark:border-gray-700">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No customer requests yet</h3>
            <p className="text-sm sm:text-base text-gray-600">Customer requests will appear here when they message you</p>
          </div>
        )}
      </div>

      {/* Bill Modal */}
      {showBillModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-700">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Generate Bill for {selectedRequest.customer_id?.name}
              </h3>

              <form onSubmit={handleGenerateBill} className="space-y-4">
                {/* Items with Prices */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Set Item Prices
                  </label>
                  <div className="space-y-3">
                    {billForm.items.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-gray-50 p-3 rounded-lg">
                        <span className="flex-1 text-xs sm:text-sm text-gray-900 font-medium">{item.item_name}</span>
                        <span className="text-xs sm:text-sm text-gray-600">Qty: {item.quantity}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 flex-1 sm:flex-none">
                            <span className="text-xs sm:text-sm text-gray-600">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price_per_unit}
                              onChange={(e) => handlePriceChange(index, e.target.value)}
                              className="w-20 sm:w-24 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Price"
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                            = ₹{(item.price_per_unit * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax Rate */}
                <div>
                  <label htmlFor="taxRate" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    id="taxRate"
                    step="0.01"
                    min="0"
                    max="100"
                    value={billForm.taxRate}
                    onChange={(e) => setBillForm({ ...billForm, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Bill Summary */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-md space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-medium">₹{calculateTotal().subtotal.toFixed(2)}</span>
                  </div>
                  {calculateTotal().tax > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-700">Tax ({billForm.taxRate}%):</span>
                      <span className="font-medium">₹{calculateTotal().tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold text-sm sm:text-base text-gray-900">Total:</span>
                    <span className="font-bold text-base sm:text-lg text-primary-600">
                      ₹{calculateTotal().total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 sm:flex-auto py-2 px-4 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? 'Generating...' : 'Generate Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-transparent dark:border-gray-700">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Cancel Request</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Request from {selectedRequest.customer_id?.name}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="cancellationReason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="cancellationReason"
                  rows="4"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Please provide a reason for cancellation..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be visible to the customer
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedRequest(null);
                    setCancellationReason('');
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelRequest}
                  disabled={isLoading || !cancellationReason.trim()}
                  className="flex-1 sm:flex-auto py-2 px-4 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal with Payment Method */}
      {showCompleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-transparent dark:border-gray-700">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Complete Order</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Request from {selectedRequest.customer_id?.name}
                  </p>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Order Total:</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  ₹{selectedRequest.bill_details?.total?.toFixed(2) || '0.00'}
                </p>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-4">
                <label htmlFor="paymentMethod" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-600">*</span>
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit">Credit (Pay Later)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  This will create a sales entry and update inventory
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedRequest(null);
                    setPaymentMethod('Cash');
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteRequest}
                  disabled={isLoading}
                  className="flex-1 sm:flex-auto py-2 px-4 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Complete Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerRequests;
