import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Send, Package, Clock, CheckCircle, XCircle, Plus, Store, ShoppingCart, AlertCircle, Settings, Bot, MessageCircle, Moon, Sun, Sparkles, FileText, X, MapPin, Tag, TrendingDown, Home } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import NotificationBell from '../components/NotificationBell';
import FloatingAIChatbot from '../components/FloatingAIChatbot';

/**
 * Customer Dashboard
 * Allows customers to message retailers and view their requests
 */
const CustomerDashboard = () => {
  const { t } = useTranslation();
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
  const [activeTab, setActiveTab] = useState('home'); // Changed default to 'home'
  const [retailerInventory, setRetailerInventory] = useState([]);
  const [itemAvailability, setItemAvailability] = useState({});
  const [checkingStock, setCheckingStock] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  
  // Bill Scanner States
  const [showBillScanModal, setShowBillScanModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [parsedBillItems, setParsedBillItems] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Payment Confirmation States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [confirmingPayment, setConfirmingPayment] = useState(false);

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
    
    // Auto-refresh requests every 10 seconds when on My Orders tab
    const interval = setInterval(() => {
      if (activeTab === 'my-requests') {
        fetchMyRequests();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [token, navigate, activeTab]);

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
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setRetailers(result.data.retailers || []);
        // Only show error if searching and no results found
        if (search && (!result.data.retailers || result.data.retailers.length === 0)) {
          toast(t('customerDashboard.toast.noRetailersFound'), { icon: 'ℹ️' });
        }
      } else {
        toast.error(t('customerDashboard.toast.failedToLoadRetailers'));
      }
    } catch (error) {
      console.error('Fetch retailers error:', error);
      toast.error(t('customerDashboard.toast.errorLoadingRetailers'));
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer-requests/customer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        const newRequests = result.data.requests;
        
        // Check if there are new completed orders
        if (requests.length > 0) {
          const newCompletedOrders = newRequests.filter(newReq => 
            newReq.status === 'completed' && 
            !requests.find(oldReq => oldReq._id === newReq._id && oldReq.status === 'completed')
          );
          
          if (newCompletedOrders.length > 0) {
            toast.success(t('customerDashboard.toast.ordersCompleted', { count: newCompletedOrders.length }));
          }
          
          // Check for billed orders
          const newBilledOrders = newRequests.filter(newReq => 
            newReq.status === 'billed' && 
            !requests.find(oldReq => oldReq._id === newReq._id && oldReq.status === 'billed')
          );
          
          if (newBilledOrders.length > 0) {
            toast.success(t('customerDashboard.toast.ordersBilled', { count: newBilledOrders.length }));
          }
        }
        
        setRequests(newRequests);
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
    
    if (field === 'quantity') {
      // Allow fractional quantities
      const qty = value === '' ? '' : parseFloat(value);
      newItems[index][field] = isNaN(qty) ? '' : qty;
    } else {
      newItems[index][field] = value;
    }
    
    setMessageForm({ ...messageForm, items: newItems });

    // Check availability after change (debounced)
    if (newItems[index].item_name.trim()) {
      setTimeout(() => checkItemAvailability(newItems), 500);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!selectedRetailer) {
      toast.error(t('customerDashboard.toast.selectRetailer'));
      return;
    }

    const validItems = messageForm.items.filter(item => item.item_name.trim());
    if (validItems.length === 0) {
      toast.error(t('customerDashboard.toast.addOneItem'));
      return;
    }

    // Check if all items are available before submitting
    // Verify each item has been checked and is available
    for (const item of validItems) {
      const availability = itemAvailability[item.item_name.toLowerCase()];
      if (!availability) {
        toast.error(t('customerDashboard.toast.waitForStockCheck', { itemName: item.item_name }));
        return;
      }
      if (!availability.can_order) {
        toast.error(t('customerDashboard.toast.itemUnavailable', { itemName: item.item_name, message: availability.message }));
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
        toast.success(t('customerDashboard.toast.requestSent'));
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
            toast.error(t('customerDashboard.toast.outOfStock', { items: outOfStock.map(i => i.item_name).join(', ') }));
          }
          if (lowStock.length > 0) {
            toast.error(t('customerDashboard.toast.insufficientStock', { items: lowStock.map(i => `${i.item_name} (only ${i.available} available)`).join(', ') }));
          }
        } else {
          toast.error(result.message || t('customerDashboard.toast.requestFailed'));
        }
      }
    } catch (error) {
      console.error('Submit request error:', error);
      toast.error(t('customerDashboard.toast.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: t('customerDashboard.status.pending') },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Package, text: t('customerDashboard.status.processing') },
      billed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, text: t('customerDashboard.status.billed') },
      payment_confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: t('customerDashboard.status.payment_confirmed') },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: t('customerDashboard.status.completed') },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, text: t('customerDashboard.status.cancelled') }
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

  const handleNearbyShops = () => {
    navigate('/customer/nearby-shops');
  };

  // Bill Scanner Functions
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBillScan = async () => {
    if (!selectedImage) {
      toast.error(t('customerDashboard.toast.selectImageFirst'));
      return;
    }

    if (!selectedRetailer) {
      toast.error(t('customerDashboard.toast.selectRetailerFirst'));
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch(`${API_URL}/api/inventory/parse-bill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setParsedBillItems(result.data.items);
        toast.success(result.message, { duration: 3000 });
        
        if (result.data.needsReview) {
          toast.warning('Low confidence - Please review items carefully', { duration: 4000 });
        }
      }
    } catch (error) {
      console.error('Error parsing bill:', error);
      toast.error('Failed to parse bill image');
      setShowBillScanModal(false);
      setSelectedImage(null);
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBillConfirm = () => {
    if (!parsedBillItems || parsedBillItems.length === 0) {
      toast.error(t('customerDashboard.toast.noItemsToConfirm'));
      return;
    }

    // Convert parsed items to message form format
    const items = parsedBillItems.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity
    }));

    setMessageForm({
      ...messageForm,
      items: items
    });

    // Close modal
    setShowBillScanModal(false);
    setSelectedImage(null);
    setImagePreview(null);
    setParsedBillItems(null);

    // Check availability for all items
    setTimeout(() => checkItemAvailability(items), 500);

    toast.success(t('customerDashboard.toast.itemsAdded', { count: items.length }));
  };

  const handleRemoveBillItem = (index) => {
    const updatedItems = parsedBillItems.filter((_, i) => i !== index);
    setParsedBillItems(updatedItems);
  };

  const handleEditBillItem = (index, field, value) => {
    const updatedItems = [...parsedBillItems];
    updatedItems[index][field] = value;
    setParsedBillItems(updatedItems);
  };

  const handleOpenPaymentModal = (request) => {
    // Double-check status before opening modal
    if (request.status !== 'billed') {
      toast.error(t('customerDashboard.toast.cannotConfirm', { status: request.status }));
      fetchMyRequests(); // Refresh to get latest status
      return;
    }

    if (request.payment_confirmation?.confirmed) {
      toast.error(t('customerDashboard.toast.alreadyConfirmed'));
      fetchMyRequests(); // Refresh to get latest status
      return;
    }

    setSelectedRequestForPayment(request);
    setPaymentMethod('Cash');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedRequestForPayment || !paymentMethod) {
      toast.error(t('customerDashboard.toast.selectPaymentMethod'));
      return;
    }

    // Check if already confirmed
    if (selectedRequestForPayment.status === 'payment_confirmed' || selectedRequestForPayment.payment_confirmation?.confirmed) {
      toast.error(t('customerDashboard.toast.alreadyConfirmed'));
      setShowPaymentModal(false);
      setSelectedRequestForPayment(null);
      await fetchMyRequests(); // Refresh to get latest status
      return;
    }

    setConfirmingPayment(true);
    try {
      const response = await fetch(`${API_URL}/api/customer-requests/${selectedRequestForPayment._id}/confirm-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ payment_method: paymentMethod })
      });

      const result = await response.json();

      if (result.success) {
        // Show UPI ID if payment method is UPI
        if (paymentMethod === 'UPI' && result.data.retailer_upi) {
          toast.success(
            <div>
              <p className="font-semibold">✅ {t('customerDashboard.paymentModal.title')}!</p>
              <p className="text-sm mt-1">{t('customerDashboard.paymentModal.retailerUpiId')} <span className="font-mono font-bold">{result.data.retailer_upi}</span></p>
              <p className="text-xs mt-1">{t('customerDashboard.paymentModal.sendToUpi', { amount: result.data.total })}</p>
            </div>,
            { duration: 8000 }
          );
        } else {
          toast.success(t('customerDashboard.toast.paymentConfirmedSuccess'));
        }
        
        setShowPaymentModal(false);
        setSelectedRequestForPayment(null);
        setPaymentMethod('Cash');
        await fetchMyRequests();
      } else {
        // Handle specific error for already confirmed
        if (result.message && result.message.includes('payment_confirmed')) {
          toast.error(t('customerDashboard.toast.alreadyConfirmed'));
          setShowPaymentModal(false);
          setSelectedRequestForPayment(null);
          await fetchMyRequests(); // Refresh to get latest status
        } else {
          toast.error(result.message || t('customerDashboard.toast.requestFailed'));
        }
      }
    } catch (error) {
      console.error('Confirm payment error:', error);
      toast.error(t('customerDashboard.toast.networkError', { message: error.message }));
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 10000,
          style: {
            background: isDarkMode ? '#1F2937' : '#FFFFFF',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
      
      {/* Floating AI Chatbot */}
      <FloatingAIChatbot />

      {/* Modern Minimalist Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${isDarkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: User Info */}
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div 
                  className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg cursor-pointer"
                  title={user.name || 'Customer'}
                >
                  {user.name?.[0] || 'C'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                {/* Tooltip */}
                <div className="absolute left-0 top-12 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {user.name || 'Customer'}
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
              <div>
                <h1 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.name}
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('customerDashboard.customer')}
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
                onClick={handleNearbyShops}
                className={`hidden sm:flex p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                title="Find Nearby Shops"
              >
                <MapPin className="h-5 w-5" />
              </button>

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
                {t('customerDashboard.logout')}
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
            onClick={() => setActiveTab('home')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'home'
              ? isDarkMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-600 text-white shadow-lg'
              : isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Home className="h-4 w-4" />
            <span>{t('customerDashboard.tabs.home')}</span>
          </button>

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
            <span>{t('customerDashboard.tabs.browseStores')}</span>
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
            <span>{t('customerDashboard.tabs.myOrders')}</span>
            {requests.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Home Tab - Feature Cards */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gradient-to-r from-blue-900 to-purple-900' : 'bg-gradient-to-r from-blue-600 to-purple-600'} text-white`}>
              <h2 className="text-2xl font-bold mb-2">{t('customerDashboard.welcome.title', { name: user.name })} 👋</h2>
              <p className="text-blue-100">{t('customerDashboard.welcome.subtitle')}</p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nearby Shops Card */}
              <div
                onClick={() => navigate('/customer/nearby-shops')}
                className={`group cursor-pointer rounded-xl p-6 transition-all hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-green-900 to-teal-900 hover:from-green-800 hover:to-teal-800' 
                    : 'bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600'
                } shadow-lg hover:shadow-2xl`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-white/80 group-hover:text-white transition-colors">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('customerDashboard.features.nearbyShops.title')}</h3>
                <p className="text-white/90 text-sm mb-4">
                  {t('customerDashboard.features.nearbyShops.description')}
                </p>
                <div className="flex items-center text-white/80 text-xs">
                  <span className="px-2 py-1 bg-white/20 rounded-full">{t('customerDashboard.features.nearbyShops.badge')}</span>
                </div>
              </div>

              {/* My Orders Card */}
              <div
                onClick={() => setActiveTab('my-requests')}
                className={`group cursor-pointer rounded-xl p-6 transition-all hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                } shadow-lg hover:shadow-2xl`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ShoppingCart className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-white/80 group-hover:text-white transition-colors">
                    {requests.length > 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                        {requests.length}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('customerDashboard.features.myOrders.title')}</h3>
                <p className="text-white/90 text-sm mb-4">
                  {t('customerDashboard.features.myOrders.description')}
                </p>
                <div className="flex items-center text-white/80 text-xs">
                  <span className="px-2 py-1 bg-white/20 rounded-full">
                    {t('customerDashboard.features.myOrders.activeOrders', { count: requests.length })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('customerDashboard.stats.totalOrders')}</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{requests.length}</p>
                  </div>
                  <ShoppingCart className={`h-8 w-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>

              <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('customerDashboard.stats.pendingOrders')}</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {requests.filter(r => r.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className={`h-8 w-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                </div>
              </div>

              <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('customerDashboard.stats.completed')}</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {requests.filter(r => r.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className={`h-8 w-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {requests.length > 0 && (
              <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('customerDashboard.recentOrders.title')}
                </h3>
                <div className="space-y-3">
                  {requests.slice(0, 3).map((request) => (
                    <div
                      key={request._id}
                      className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {request.retailer_id?.shop_name || request.retailer_id?.name}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('customerDashboard.recentOrders.items', { count: request.items?.length || 0 })}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('my-requests')}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {t('customerDashboard.recentOrders.viewAll')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message Retailer Tab */}
        {activeTab === 'message' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retailer List */}
            <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-sm`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('customerDashboard.browseStores.title')}
              </h2>

              {/* Search Bar */}
              <div className="mb-4 relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder={t('customerDashboard.browseStores.searchPlaceholder')}
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
                    <p className="text-sm">{t('customerDashboard.browseStores.noStores')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Message Form */}
            <div className={`rounded-xl p-5 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} shadow-sm`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedRetailer ? t('customerDashboard.orderForm.title', { shopName: selectedRetailer.shop_name || selectedRetailer.name }) : t('customerDashboard.orderForm.selectStore')}
              </h2>

              {showMessageForm && selectedRetailer ? (
                <form onSubmit={handleSubmitRequest} className="space-y-3 sm:space-y-4">
                  {/* Scan Bill Button */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setShowBillScanModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-md text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{t('customerDashboard.orderForm.scanList')}</span>
                    </button>
                  </div>

                  {/* View Inventory Button */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setShowInventory(!showInventory)}
                      className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors ${isDarkMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                    >
                      <Package className="h-4 w-4" />
                      <span>{showInventory ? t('customerDashboard.orderForm.hideInventory') : t('customerDashboard.orderForm.viewInventory', { count: retailerInventory.length })}</span>
                    </button>
                    {checkingStock && (
                      <span className={`text-xs hidden sm:inline ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('customerDashboard.orderForm.checkingStock')}</span>
                    )}
                  </div>

                  {/* Inventory List */}
                  {showInventory && (
                    <div className={`rounded-lg p-4 max-h-48 overflow-y-auto transition-colors ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                      <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('customerDashboard.orderForm.inventoryTitle')}</h4>
                      {retailerInventory.length > 0 ? (
                        <div className="space-y-2">
                          {retailerInventory.map((invItem, idx) => (
                            <div key={idx} className={`flex justify-between items-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
                              <div className="flex-1">
                                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{invItem.item_name}</span>
                                <div className="flex items-center space-x-3 mt-1">
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {invItem.quantity} {invItem.unit || 'units'}
                                  </span>
                                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    ₹{invItem.selling_price || invItem.price_per_unit || 0}/{invItem.unit || 'unit'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {invItem.stock_status === 'out_of_stock' && (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{t('customerDashboard.orderForm.outOfStock')}</span>
                                )}
                                {invItem.stock_status === 'low_stock' && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{t('customerDashboard.orderForm.lowStock')}</span>
                                )}
                                {invItem.stock_status === 'in_stock' && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{t('customerDashboard.orderForm.inStock')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('customerDashboard.orderForm.noInventory')}</p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t('customerDashboard.orderForm.items')} *
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
                                placeholder={t('customerDashboard.orderForm.itemNamePlaceholder')}
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
                                    {invItem.quantity} {invItem.unit || 'units'} @ ₹{invItem.selling_price || invItem.price_per_unit || 0}/{invItem.unit || 'unit'}
                                  </option>
                                ))}
                              </datalist>
                            </div>
                            <div className="relative flex-shrink-0">
                              <input
                                type="number"
                                placeholder={t('customerDashboard.orderForm.qtyPlaceholder')}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                min="0.001"
                                step="0.001"
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
                                  {t('customerDashboard.orderForm.max')}: {availability.available_quantity}
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
                                    <span className="font-medium">✓ {t('customerDashboard.orderForm.available')}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="font-medium">✗ {availability.status === 'not_found' ? t('customerDashboard.orderForm.notInShop') : t('customerDashboard.orderForm.unavailable')}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-sm font-semibold">
                                {availability.status === 'available' && (
                                  <span className="text-green-800">
                                    {t('customerDashboard.orderForm.stock')}: {availability.available_quantity} {availability.unit || 'units'}
                                  </span>
                                )}
                                {availability.status === 'insufficient_stock' && (
                                  <span className="text-red-800">
                                    {t('customerDashboard.orderForm.only')} {availability.available_quantity} {availability.unit || 'units'} {t('customerDashboard.orderForm.available')}
                                  </span>
                                )}
                                {availability.status === 'out_of_stock' && (
                                  <span className="text-red-800">{t('customerDashboard.orderForm.outOfStock')} (0 {t('customerDashboard.orderForm.available')})</span>
                                )}
                                {availability.status === 'not_found' && (
                                  <span className="text-red-800">{t('customerDashboard.orderForm.notAvailable')}</span>
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
                      <span>{t('customerDashboard.orderForm.addItem')}</span>
                    </button>
                  </div>

                  {/* Order Summary */}
                  {Object.keys(itemAvailability).length > 0 && (
                    <div className={`rounded-lg p-4 transition-colors ${isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                        <Package className="h-4 w-4" />
                        <span>{t('customerDashboard.orderForm.orderSummary')}</span>
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
                                    ✓ {t('customerDashboard.orderForm.stock')}: {avail.available_quantity} {avail.unit || 'units'}
                                  </span>
                                ) : (
                                  <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                                    ✗ {avail.status === 'not_found' ? t('customerDashboard.orderForm.notAvailable') : `${t('customerDashboard.orderForm.only')} ${avail.available_quantity} ${t('customerDashboard.orderForm.available')}`}
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
              {t('customerDashboard.myOrdersTab.title')}
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
                      {t('customerDashboard.myOrdersTab.items')}
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
                      <div className="flex justify-between font-semibold text-base mb-3">
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Total</span>
                        <span className="text-blue-600">₹{request.bill_details.total?.toFixed(2)}</span>
                      </div>

                      {/* Payment Confirmation Button - Only show if status is 'billed' */}
                      {request.status === 'billed' && (
                        <button
                          onClick={() => handleOpenPaymentModal(request)}
                          className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-md"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirm Payment
                        </button>
                      )}

                      {/* Payment Confirmed Status */}
                      {request.payment_confirmation?.confirmed && (
                        <div className={`mt-2 p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-semibold text-sm">Payment Confirmed</span>
                          </div>
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Method: {request.payment_confirmation.payment_method}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {new Date(request.payment_confirmation.confirmed_at).toLocaleString()}
                          </div>
                        </div>
                      )}

                      {/* Waiting for Retailer - Only show if payment confirmed but not completed */}
                      {request.status === 'payment_confirmed' && (
                        <div className={`mt-2 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                          <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                            ⏳ Waiting for retailer to complete your order...
                          </p>
                        </div>
                      )}
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
                  <p className="font-medium">{t('customerDashboard.myOrdersTab.noOrders')}</p>
                  <p className="text-sm mt-1">{t('customerDashboard.myOrdersTab.noOrdersSubtitle')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bill Scanner Modal */}
      {showBillScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className={`relative mx-auto p-6 border w-full max-w-4xl shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className={`text-2xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FileText className="h-6 w-6 text-green-600" />
                  {t('customerDashboard.billScanner.title')}
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('customerDashboard.billScanner.subtitle')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBillScanModal(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                  setParsedBillItems(null);
                }}
                className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {!parsedBillItems ? (
              /* Step 1: Upload Image */
              <div className="space-y-6">
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDarkMode ? 'border-gray-700 hover:border-green-600' : 'border-gray-300 hover:border-green-500'}`}>
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img 
                        src={imagePreview} 
                        alt="Shopping List Preview" 
                        className="max-h-96 mx-auto rounded-lg shadow-md"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        {t('customerDashboard.billScanner.removeImage')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <FileText className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('customerDashboard.billScanner.uploadTitle')}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('customerDashboard.billScanner.uploadSubtitle')}</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="bill-upload-customer"
                      />
                      <label
                        htmlFor="bill-upload-customer"
                        className="mt-4 inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
                      >
                        {t('customerDashboard.billScanner.selectImage')}
                      </label>
                    </div>
                  )}
                </div>

                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                  <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-900'}`}>{t('customerDashboard.billScanner.whatWeExtract')}</h4>
                  <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                    <li>{t('customerDashboard.billScanner.extractItem1')}</li>
                    <li>{t('customerDashboard.billScanner.extractItem2')}</li>
                    <li>{t('customerDashboard.billScanner.extractItem3')}</li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowBillScanModal(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className={`px-6 py-2 rounded-lg transition-colors ${isDarkMode ? 'border border-gray-700 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    disabled={uploadingImage}
                  >
                    {t('customerDashboard.orderForm.cancel')}
                  </button>
                  <button
                    onClick={handleBillScan}
                    disabled={!selectedImage || uploadingImage}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('customerDashboard.billScanner.scanning')}
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        {t('customerDashboard.billScanner.scanList')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Review & Confirm Extracted Items */
              <div className="space-y-6">
                <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    {t('customerDashboard.billScanner.extracted', { count: parsedBillItems.length })}
                  </h4>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {t('customerDashboard.billScanner.reviewSubtitle')}
                  </p>
                </div>

                <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <table className="w-full">
                    <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('customerDashboard.billScanner.itemName')}</th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('customerDashboard.billScanner.quantity')}</th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('customerDashboard.billScanner.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedBillItems.map((item, index) => (
                        <tr key={index} className={`border-t ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleEditBillItem(index, 'item_name', e.target.value)}
                              className={`w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                              placeholder={t('customerDashboard.billScanner.itemName')}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                const qty = value === '' ? '' : parseFloat(value);
                                handleEditBillItem(index, 'quantity', isNaN(qty) ? '' : qty);
                              }}
                              className={`w-20 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                              placeholder={t('customerDashboard.orderForm.qtyPlaceholder')}
                              min="0.001"
                              step="0.001"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveBillItem(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              {t('customerDashboard.billScanner.remove')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setParsedBillItems(null);
                    }}
                    className={`px-6 py-2 rounded-lg transition-colors ${isDarkMode ? 'border border-gray-700 text-gray-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    disabled={uploadingImage}
                  >
                    {t('customerDashboard.billScanner.back')}
                  </button>
                  <button
                    onClick={handleBillConfirm}
                    disabled={uploadingImage || parsedBillItems.length === 0}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('customerDashboard.billScanner.adding')}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        {t('customerDashboard.billScanner.addToOrder')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedRequestForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`relative mx-auto p-6 border w-full max-w-md shadow-2xl rounded-xl ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('customerDashboard.paymentModal.title')}
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('customerDashboard.paymentModal.orderFrom', { shopName: selectedRequestForPayment.retailer_id?.shop_name || selectedRequestForPayment.retailer_id?.name })}
                </p>
              </div>
            </div>

            {/* Bill Summary */}
            <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('customerDashboard.paymentModal.orderTotal')}
              </p>
              <p className="text-2xl font-bold text-green-600">
                ₹{selectedRequestForPayment.bill_details?.total?.toFixed(2) || '0.00'}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label htmlFor="paymentMethodCustomer" className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('customerDashboard.paymentModal.paymentMethod')} <span className="text-red-600">{t('customerDashboard.paymentModal.required')}</span>
              </label>
              <select
                id="paymentMethodCustomer"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                required
              >
                <option value="Cash">{t('customerDashboard.paymentModal.cash')}</option>
                <option value="Card">{t('customerDashboard.paymentModal.card')}</option>
                <option value="UPI">{t('customerDashboard.paymentModal.upi')}</option>
                <option value="Bank Transfer">{t('customerDashboard.paymentModal.bankTransfer')}</option>
                <option value="Credit">{t('customerDashboard.paymentModal.credit')}</option>
              </select>
              
              {/* Show UPI ID when UPI is selected */}
              {paymentMethod === 'UPI' && selectedRequestForPayment.retailer_id?.upi_id && (
                <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    {t('customerDashboard.paymentModal.retailerUpiId')}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className={`font-mono font-bold text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                      {selectedRequestForPayment.retailer_id.upi_id}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRequestForPayment.retailer_id.upi_id);
                        toast.success(t('customerDashboard.toast.upiIdCopied'));
                      }}
                      className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      {t('customerDashboard.paymentModal.copy')}
                    </button>
                  </div>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {t('customerDashboard.paymentModal.sendToUpi', { amount: selectedRequestForPayment.bill_details?.total?.toFixed(2) })}
                  </p>
                </div>
              )}
              
              {paymentMethod === 'UPI' && !selectedRequestForPayment.retailer_id?.upi_id && (
                <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                    {t('customerDashboard.paymentModal.noUpiWarning')}
                  </p>
                </div>
              )}
              
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('customerDashboard.paymentModal.paymentNote')}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedRequestForPayment(null);
                  setPaymentMethod('Cash');
                }}
                disabled={confirmingPayment}
                className={`px-4 py-2 text-sm border rounded-lg transition-colors ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {t('customerDashboard.orderForm.cancel')}
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={confirmingPayment}
                className="flex-1 sm:flex-auto py-2 px-4 text-sm bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
              >
                {confirmingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t('customerDashboard.paymentModal.confirming')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t('customerDashboard.paymentModal.confirm')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
