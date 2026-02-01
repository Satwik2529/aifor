import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle,
    X,
    Send,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Loader2,
    Sparkles,
    Globe,
    Printer
} from 'lucide-react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const Chatbot = ({ retailerId, retailerName, isCustomer = false }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState('en');
    const [isMuted, setIsMuted] = useState(localStorage.getItem('retailerChatbotMuted') === 'true');

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthesisRef = useRef(null);

    // Language configurations
    const languages = [
        { code: 'en', name: 'English', speechCode: 'en-IN', icon: '🇬🇧' },
        { code: 'hi', name: 'हिंदी', speechCode: 'hi-IN', icon: '🇮🇳' },
        { code: 'te', name: 'తెలుగు', speechCode: 'te-IN', icon: '🇮🇳' }
    ];

    const currentLang = languages.find(l => l.code === language);

    // Initialize chat with welcome message
    useEffect(() => {
        const welcomeMessage = isCustomer
            ? `Hi! I'm your AI shopping assistant for ${retailerName}. What would you like to buy or cook today?`
            : "Hi! I'm your business intelligence assistant. How can I help you analyze your business today?";

        setMessages([{
            id: 1,
            text: welcomeMessage,
            sender: 'bot',
            timestamp: new Date()
        }]);
    }, [isCustomer, retailerName]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Save mute state to localStorage
    useEffect(() => {
        localStorage.setItem('retailerChatbotMuted', isMuted);
    }, [isMuted]);

    // Handle sending message
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const requestData = {
                message: inputMessage,
                language: language
            };

            // Add retailer_id for customer chats
            if (isCustomer && retailerId) {
                requestData.retailer_id = retailerId;
            }

            const response = await api.post('/chatbot/chat', requestData);

            console.log('📨 Full API response:', response);
            console.log('📨 Response data:', response.data);
            console.log('✅ Success:', response.data.success);
            console.log('💬 Message:', response.data.message);

            // Handle both success and error responses
            const botMessage = {
                id: Date.now() + 1,
                text: response.data.message || "Sorry, I couldn't process that request.",
                sender: 'bot',
                timestamp: new Date(),
                data: response.data.data,
                isError: !response.data.success
            };

            console.log('📨 Bot message created:', botMessage);
            console.log('🔴 Is error:', botMessage.isError);

            console.log('📨 Bot message received:', botMessage);
            console.log('📊 Message data:', botMessage.data);
            if (botMessage.data) {
                console.log('📋 Data type:', botMessage.data.type);
                console.log('🛒 Sales array:', botMessage.data.sales);
            }

            setMessages(prev => [...prev, botMessage]);

            // Auto-speak if not muted and successful
            if (!isMuted && !isCustomer && response.data.success) {
                speakText(response.data.message);
            }
        } catch (error) {
            console.error('Chat error:', error);
            console.error('Error response:', error.response?.data);

            const errorMessage = {
                id: Date.now() + 1,
                text: error.response?.data?.message || "Sorry, I'm having trouble processing your request. Please try again.",
                sender: 'bot',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Speech recognition
    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLang.speechCode;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputMessage(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Text to speech
    const speakText = (text) => {
        if (!('speechSynthesis' in window)) {
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang.speechCode;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    // Toggle mute functionality
    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (!isMuted) {
            // Stop any ongoing speech when muting
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    // Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Print bill function
    const printBill = (billData) => {
        console.log('🖨️ Printing bill with data:', billData);
        console.log('🖨️ Sales array:', billData.sales);

        if (!billData.sales || billData.sales.length === 0) {
            alert('Error: No items in bill to print!');
            return;
        }

        const printWindow = window.open('', '_blank');
        const billHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bill - ${billData.bill_number}</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        max-width: 300px;
                        margin: 20px auto;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    .shop-name {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .bill-info {
                        font-size: 11px;
                        margin: 3px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    th {
                        text-align: left;
                        border-bottom: 1px solid #000;
                        padding: 5px 0;
                        font-size: 12px;
                    }
                    td {
                        padding: 5px 0;
                        font-size: 11px;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .total-section {
                        border-top: 2px solid #000;
                        margin-top: 10px;
                        padding-top: 10px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 14px;
                        font-weight: bold;
                        margin: 5px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 2px dashed #000;
                        font-size: 11px;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 10px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="shop-name">${billData.shop_name || 'RETAIL STORE'}</div>
                    <div class="bill-info">Bill No: ${billData.bill_number}</div>
                    <div class="bill-info">Date: ${billData.date}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="text-center">Qty</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${billData.sales.map(item => `
                            <tr>
                                <td>${item.item_name}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">₹${item.price_per_unit}</td>
                                <td class="text-right">₹${item.total}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-row">
                        <span>GRAND TOTAL:</span>
                        <span>₹${billData.total_amount}</span>
                    </div>
                </div>

                <div class="footer">
                    <div>Thank you for your business!</div>
                    <div style="margin-top: 5px;">Powered by Biznova</div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(billHTML);
        printWindow.document.close();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
            >
                <MessageCircle className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5" />
                    <div>
                        <h3 className="font-semibold">
                            {isCustomer ? `${retailerName} Assistant` : 'Business Assistant'}
                        </h3>
                        <p className="text-xs opacity-90">AI Powered</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'hi' : language === 'hi' ? 'te' : 'en')}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                            title="Change language"
                        >
                            <Globe className="w-4 h-4" />
                        </button>
                    </div>



                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.sender === 'user' ? (
                            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-blue-600 text-white shadow-sm">
                                <p className="text-sm">{message.text}</p>
                                <span className="text-xs opacity-70 mt-1 block">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ) : (
                            <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                {/* Message Content */}
                                <div className={`p-4 ${message.isError ? 'bg-red-50' : ''}`}>
                                    <p className={`text-sm leading-relaxed whitespace-pre-line ${message.isError ? 'text-red-600 font-semibold' : 'text-gray-800'}`}>
                                        {message.text}
                                    </p>
                                </div>

                                {/* Stock Error Card */}
                                {message.data && message.data.type === 'stock_error' && (
                                    <div className="border-t border-red-200 bg-red-50 p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <p className="text-sm font-bold text-red-700">Stock Not Available</p>
                                        </div>
                                        <div className="bg-white rounded-lg border border-red-200 p-3 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Item:</span>
                                                <span className="font-semibold text-gray-900">{message.data.item}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Requested:</span>
                                                <span className="font-semibold text-red-600">{message.data.requested} units</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Available:</span>
                                                <span className="font-semibold text-green-600">{message.data.available} units</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-red-600 mt-2 text-center">
                                            Please add more stock or reduce the quantity
                                        </p>
                                    </div>
                                )}

                                {/* Bill Preview Card - Before Confirmation */}
                                {message.data && message.data.type === 'bill_preview' && message.data.sales && message.data.sales.length > 0 ? (
                                    <div className="border-t border-gray-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                                                    📋 Bill Preview (Not Created Yet)
                                                </p>
                                            </div>
                                            <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                ⏳ Pending
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Item</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Qty</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Price</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {message.data.sales.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                            <td className="py-2.5 px-3 text-gray-800 font-medium">{item.item_name}</td>
                                                            <td className="py-2.5 px-3 text-center text-gray-600">{item.quantity}</td>
                                                            <td className="py-2.5 px-3 text-right text-gray-600">₹{item.price_per_unit}</td>
                                                            <td className="py-2.5 px-3 text-right font-semibold text-gray-800">₹{item.total}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Stock Info */}
                                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-blue-700 mb-2">Stock Changes:</p>
                                            <div className="space-y-1">
                                                {message.data.sales.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs text-blue-600">
                                                        <span>{item.item_name}</span>
                                                        <span>{item.current_stock} → {item.new_stock} units</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Total */}
                                        <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                                            <span className="font-bold text-gray-900 text-base">Total Amount</span>
                                            <span className="font-bold text-2xl text-orange-600">₹{message.data.total_amount}</span>
                                        </div>

                                        {/* Confirmation Button */}
                                        <div className="mt-4">
                                            <button
                                                onClick={() => {
                                                    setInputMessage('yes');
                                                    setTimeout(() => handleSendMessage(), 100);
                                                }}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center space-x-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Yes, Create Bill</span>
                                            </button>
                                        </div>

                                        {/* Warning Note */}
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500 text-center">
                                                This will update inventory and record the sale
                                            </p>
                                        </div>
                                    </div>
                                ) : message.data && message.data.type === 'bill_preview' ? (
                                    <div className="border-t border-gray-200 bg-red-50 p-4">
                                        <p className="text-sm text-red-600">Debug: Bill preview received but no items in sales array</p>
                                        <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(message.data, null, 2)}</pre>
                                    </div>
                                ) : null}

                                {/* Bill Card - Structured Table - After Confirmation */}
                                {message.data && message.data.type === 'bill_created' && message.data.sales && (
                                    <div className="border-t border-gray-200 bg-gradient-to-br from-green-50 to-blue-50 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Bill #{message.data.bill_number}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {message.data.date}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                    ✓ Paid
                                                </div>
                                                <button
                                                    onClick={() => printBill(message.data)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shadow-sm"
                                                    title="Print Bill"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span>Print</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Item</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Qty</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Price</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {message.data.sales.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                            <td className="py-2.5 px-3 text-gray-800 font-medium">{item.item_name}</td>
                                                            <td className="py-2.5 px-3 text-center text-gray-600">{item.quantity}</td>
                                                            <td className="py-2.5 px-3 text-right text-gray-600">₹{item.price_per_unit}</td>
                                                            <td className="py-2.5 px-3 text-right font-semibold text-gray-800">₹{item.total}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Stock Updated Info */}
                                        {message.data.sales.some(item => item.new_stock !== undefined) && (
                                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                                <p className="text-xs font-semibold text-green-700 mb-2">✓ Stock Updated:</p>
                                                <div className="space-y-1">
                                                    {message.data.sales.map((item, idx) => (
                                                        item.new_stock !== undefined && (
                                                            <div key={idx} className="flex justify-between text-xs text-green-600">
                                                                <span>{item.item_name}</span>
                                                                <span>New stock: {item.new_stock} units</span>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Total */}
                                        <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between items-center">
                                            <span className="font-bold text-gray-900 text-base">Grand Total</span>
                                            <span className="font-bold text-2xl text-green-600">₹{message.data.total_amount}</span>
                                        </div>

                                        {/* Footer Note */}
                                        <div className="mt-3 pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 text-center">
                                                ✓ Sale recorded • Inventory updated
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="px-4 pb-2 text-gray-400">
                                    <span className="text-xs">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-md">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex items-center space-x-2">
                    {/* Mute Button - Only for retailer */}
                    {!isCustomer && (
                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-xl transition-all ${isMuted
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                                }`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            )}
                        </button>
                    )}

                    {/* Voice Input Button */}
                    <button
                        onClick={toggleListening}
                        disabled={isLoading}
                        className={`p-3 rounded-xl transition-all ${isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            }`}
                        title="Voice Input"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>

                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isListening ? "Listening..." : `Type your message... (${currentLang.icon} ${currentLang.name})`}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                        disabled={isLoading || isListening}
                    />

                    {/* Send Button */}
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>

                {/* Voice Status */}
                {isListening && (
                    <div className="mt-2 text-xs text-red-500 flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                        Listening... Speak now
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chatbot;
