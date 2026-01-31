import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerChatbot from '../components/CustomerChatbot';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CustomerChatbotDemo = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [retailers, setRetailers] = useState([]);
    const [selectedRetailer, setSelectedRetailer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRetailers();
    }, []);

    const fetchRetailers = async () => {
        try {
            const response = await axios.get('/api/customer-requests/retailers', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.success) {
                setRetailers(response.data.data);
                // Auto-select first retailer for demo
                if (response.data.data.length > 0) {
                    setSelectedRetailer(response.data.data[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch retailers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOrderPlaced = (orderData) => {
        console.log('Order placed:', orderData);
        // You can add notification or redirect logic here
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading retailers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">AI Shopping Assistant</h1>
                            <p className="text-gray-600">Order groceries with natural conversation</p>
                        </div>
                        <button
                            onClick={() => navigate('/customer-dashboard')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Retailer Selection */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Store</h3>

                            {retailers.length === 0 ? (
                                <p className="text-gray-500">No retailers available</p>
                            ) : (
                                <div className="space-y-3">
                                    {retailers.map((retailer) => (
                                        <div
                                            key={retailer._id}
                                            onClick={() => setSelectedRetailer(retailer)}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedRetailer?._id === retailer._id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <h4 className="font-medium text-gray-900">{retailer.shop_name}</h4>
                                            <p className="text-sm text-gray-600">{retailer.phone}</p>
                                            <p className="text-xs text-gray-500 mt-1">{retailer.address}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Demo Instructions */}
                        <div className="bg-blue-50 rounded-lg p-6 mt-6">
                            <h4 className="font-semibold text-blue-900 mb-3">💡 Try These Examples:</h4>
                            <div className="space-y-2 text-sm text-blue-800">
                                <p>• "Hi, I want to make vegetable curry for 4 people"</p>
                                <p>• "Buy 2 kg rice, 1 litre milk, and onions"</p>
                                <p>• "I need groceries for today's dinner"</p>
                                <p>• "What ingredients do I need for biryani?"</p>
                            </div>
                        </div>
                    </div>

                    {/* Chatbot Interface */}
                    <div className="lg:col-span-3">
                        {selectedRetailer ? (
                            <div className="h-[600px]">
                                <CustomerChatbot
                                    customerId={user?._id}
                                    retailerId={selectedRetailer._id}
                                    onOrderPlaced={handleOrderPlaced}
                                />
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm p-8 text-center h-[600px] flex items-center justify-center">
                                <div>
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store to Start Shopping</h3>
                                    <p className="text-gray-600">Choose a retailer from the left panel to begin your AI-powered shopping experience.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerChatbotDemo;