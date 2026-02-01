import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Bot, User } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import OrderSummary from './OrderSummary';

const CustomerChatbot = ({ customerId, retailerId, onOrderPlaced }) => {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
  ];

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chatbot
  useEffect(() => {
    initializeChatbot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeChatbot = async () => {
    try {
      const response = await axios.get('/api/chatbot/customer/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Add welcome message
      const welcomeMessage = {
        id: 'welcome',
        type: 'bot',
        content: getWelcomeMessage(),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize chatbot:', error);
    }
  };

  const getWelcomeMessage = () => {
    const messages = {
      'en': "👋 Hello! I'm BizNova, your AI shopping assistant. I can help you order groceries or ingredients for any dish. What would you like to order today?",
      'hi': "👋 नमस्ते! मैं बिज़नोवा हूं, आपका AI शॉपिंग सहायक। मैं आपको किराना सामान या किसी भी व्यंजन के सामग्री ऑर्डर करने में मदद कर सकता हूं। आप आज क्या ऑर्डर करना चाहेंगे?",
      'te': "👋 హలో! నేను బిజ్‌నోవా, మీ AI షాపింగ్ అసిస్టెంట్. నేను మీకు కిరానా సామాన్లు లేదా ఏదైనా వంటకానికి కావాల్సిన పదార్థాలు ఆర్డర్ చేయడంలో సహాయం చేయగలను. మీరు ఈరోజు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?",
      'ta': "👋 வணக்கம்! நான் பிஸ்நோவா, உங்கள் AI ஷாப்பிங் உதவியாளர். நான் உங்களுக்கு கிராஸரி பொருட்கள் அல்லது எந்த உணவுக்கும் தேவையான பொருட்களை ஆர்டர் செய்ய உதவலாம். இன்று நீங்கள் என்ன ஆர்டர் செய்ய விரும்புகிறீர்கள்?",
      'kn': "👋 ಹಲೋ! ನಾನು ಬಿಜ್‌ನೋವಾ, ನಿಮ್ಮ AI ಶಾಪಿಂಗ್ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ದಿನಸಿ ಸಾಮಾನುಗಳು ಅಥವಾ ಯಾವುದೇ ಖಾದ್ಯಕ್ಕೆ ಬೇಕಾದ ಪದಾರ್ಥಗಳನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಬಹುದು. ಇಂದು ನೀವು ಏನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುವಿರಿ?"
    };
    return messages[selectedLanguage] || messages['en'];
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chatbot/customer/chat', {
        message: inputMessage,
        retailer_id: retailerId,
        language: selectedLanguage
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.data.message || response.data.message,
        data: response.data.data,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);

      // Show order summary if items are available
      if (response.data.data && response.data.data.availability) {
        const { available, unavailable, lowStock } = response.data.data.availability;
        
        if (available && available.length > 0) {
          setConfirmedItems(available);
          setOrderData({
            available: available,
            unavailable: unavailable || [],
            lowStock: lowStock || []
          });
          setShowOrderSummary(true);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I had trouble understanding that. Could you please try again?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const placeOrder = async () => {
    if (confirmedItems.length === 0) return;

    setIsLoading(true);

    try {
      // Use the dedicated order endpoint for customer chatbot
      const response = await axios.post('/api/chatbot/customer/order', {
        retailer_id: retailerId,
        confirmed_items: confirmedItems,
        notes: 'Order placed via AI chatbot',
        language: selectedLanguage
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        const orderConfirmation = {
          id: Date.now() + 2,
          type: 'bot',
          content: response.data.data.message || 'Order placed successfully! The retailer will process your order soon.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, orderConfirmation]);

        setShowOrderSummary(false);
        setConfirmedItems([]);
        setOrderData(null);

        if (onOrderPlaced && response.data.data) {
          onOrderPlaced(response.data.data);
        }
      }

    } catch (error) {
      console.error('Order error:', error);
      const errorMessage = {
        id: Date.now() + 2,
        type: 'bot',
        content: error.response?.data?.message || 'Failed to place order. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderConfirm = () => {
    placeOrder();
  };

  const handleOrderCancel = () => {
    setShowOrderSummary(false);
    setConfirmedItems([]);
    setOrderData(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    // Voice recording functionality (placeholder)
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording logic here
      setTimeout(() => {
        setIsRecording(false);
        setInputMessage('Voice input would appear here');
      }, 2000);
    }
  };

  const toggleSpeech = (text) => {
    // Text-to-speech functionality (placeholder)
    setIsSpeaking(!isSpeaking);
    if (!isSpeaking) {
      // TTS logic here
      console.log('Speaking:', text);
      setTimeout(() => {
        setIsSpeaking(false);
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8" />
          <div>
            <h3 className="font-semibold">BizNova Assistant</h3>
            <p className="text-xs opacity-90">AI Shopping Helper</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-1 text-sm bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code} className="text-gray-800">
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => toggleSpeech(messages[messages.length - 1]?.content)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title={isSpeaking ? "Stop speaking" : "Speak last message"}
          >
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${message.type === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800'
                }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'bot' && <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                {message.type === 'user' && <User className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Order Summary */}
        {showOrderSummary && orderData && (
          <div className="mb-4">
            <OrderSummary
              items={orderData.available}
              unavailableItems={orderData.unavailable}
              lowStockItems={orderData.lowStock}
              onConfirm={handleOrderConfirm}
              onCancel={handleOrderCancel}
              isLoading={isLoading}
            />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-lg transition-colors ${isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />

          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          💡 Try: "I want to make vegetable curry for 4 people" or "Buy 2kg rice, 1 litre milk"
        </div>
      </div>
    </div>
  );
};

export default CustomerChatbot;
