import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Bot, User, X } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import OrderSummary from './OrderSummary';

const CustomerChatbot = ({ retailerId, onOrderPlaced }) => {
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
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeContent, setRecipeContent] = useState('');
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
      await axios.get('/api/chatbot/customer/status', {
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
      'en': "👋 Hello! I'm BizNova, your AI shopping assistant. I analyze our store inventory to suggest the best items for your dishes.\n\n🎯 Smart Inventory Matching:\n• Say 'chicken curry for 4 people' - I'll find suitable items from our inventory\n• Say 'remove tomatoes' to remove items\n• I match your requests to actual store items\n• You get exactly what's available in our store\n\nWhat would you like to order today?",
      'hi': "👋 नमस्ते! मैं बिज़नोवा हूं, आपका AI शॉपिंग सहायक। मैं हमारे स्टोर की इन्वेंटरी का विश्लेषण करके आपके व्यंजनों के लिए सबसे अच्छे आइटम सुझाता हूं।\n\n🎯 स्मार्ट इन्वेंटरी मैचिंग:\n• '4 लोगों के लिए चिकन करी' कहें\n• 'टमाटर हटाएं' कहें आइटम हटाने के लिए\n• मैं आपके अनुरोधों को वास्तविक स्टोर आइटम से मिलाता हूं\n\nआप आज क्या ऑर्डर करना चाहेंगे?",
      'te': "👋 హలో! నేను బిజ్‌నోవా, మీ AI షాపింగ్ అసిస్టెంట్। నేను మా స్టోర్ ఇన్వెంటరీని విశ్లేషించి మీ వంటకాలకు అనుకూలమైన వస్తువులను సూచిస్తాను।\n\n🎯 స్మార్ట్ ఇన్వెంటరీ మ్యాచింగ్:\n• '4 మందికి చికెన్ కర్రీ' అని చెప్పండి\n• 'టమాటోలు తీసివేయండి' అని చెప్పండి\n• నేను మీ అభ్యర్థనలను వాస్తవ స్టోర్ వస్తువులతో సరిపోల్చుతాను\n\nమీరు ఈరోజు ఏమి ఆర్డర్ చేయాలనుకుంటున్నారు?",
      'ta': "👋 வணக்கம்! நான் பிஸ்நோவா, உங்கள் AI ஷாப்பிங் உதவியாளர். நான் எங்கள் கடையின் இன்வென்டரியை பகுப்பாய்வு செய்து உங்கள் உணவுகளுக்கு ஏற்ற பொருட்களை பரிந்துரைக்கிறேன்।\n\n🎯 ஸ்மார்ட் இன்வென்டரி மேட்சிங்:\n• '4 பேருக்கு சிக்கன் கறி' என்று சொல்லுங்கள்\n• 'தக்காளியை நீக்கு' என்று சொல்லுங்கள்\n• நான் உங்கள் கோரிக்கைகளை உண்மையான கடை பொருட்களுடன் பொருத்துகிறேன்\n\nஇன்று நீங்கள் என்ன ஆர்டர் செய்ய விரும்புகிறீர்கள்?",
      'kn': "👋 ಹಲೋ! ನಾನು ಬಿಜ್‌ನೋವಾ, ನಿಮ್ಮ AI ಶಾಪಿಂಗ್ ಸಹಾಯಕ। ನಾನು ನಮ್ಮ ಅಂಗಡಿಯ ಇನ್ವೆಂಟರಿಯನ್ನು ವಿಶ್ಲೇಷಿಸಿ ನಿಮ್ಮ ಖಾದ್ಯಗಳಿಗೆ ಸೂಕ್ತವಾದ ವಸ್ತುಗಳನ್ನು ಸೂಚಿಸುತ್ತೇನೆ।\n\n🎯 ಸ್ಮಾರ್ಟ್ ಇನ್ವೆಂಟರಿ ಮ್ಯಾಚಿಂಗ್:\n• '4 ಜನರಿಗೆ ಚಿಕನ್ ಕರಿ' ಎಂದು ಹೇಳಿ\n• 'ಟೊಮೇಟೊ ತೆಗೆದುಹಾಕಿ' ಎಂದು ಹೇಳಿ\n• ನಾನು ನಿಮ್ಮ ವಿನಂತಿಗಳನ್ನು ನಿಜವಾದ ಅಂಗಡಿ ವಸ್ತುಗಳೊಂದಿಗೆ ಹೊಂದಿಸುತ್ತೇನೆ\n\nಇಂದು ನೀವು ಏನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುವಿರಿ?"
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
        
        console.log('Order data received:', { available, unavailable, lowStock });
        
        if (available && available.length > 0) {
          setConfirmedItems(available);
          setOrderData({
            available: available,
            unavailable: unavailable || [],
            lowStock: lowStock || []
          });
          setShowOrderSummary(true);
          console.log('Order summary should show now');
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

  const removeItem = async (itemName) => {
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chatbot/customer/chat', {
        message: `remove ${itemName}`,
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

      // Update order data if items were removed
      if (response.data.data && response.data.data.availability) {
        const { available, unavailable, lowStock } = response.data.data.availability;
        
        if (available && available.length > 0) {
          setConfirmedItems(available);
          setOrderData({
            available: available,
            unavailable: unavailable || [],
            lowStock: lowStock || []
          });
        } else {
          // All items removed
          setShowOrderSummary(false);
          setConfirmedItems([]);
          setOrderData(null);
        }
      }

    } catch (error) {
      console.error('Remove item error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I had trouble removing that item. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const showRecipeProcess = async (ingredients) => {
    console.log('showRecipeProcess called with:', ingredients);
    setIsLoading(true);
    
    try {
      // For now, use fallback recipe directly to test
      const fallbackRecipe = generateFallbackRecipe(ingredients);
      console.log('Generated recipe:', fallbackRecipe);
      setRecipeContent(fallbackRecipe);
      setShowRecipe(true);
      console.log('Recipe modal should show now');

    } catch (error) {
      console.error('Recipe generation error:', error);
      // Generate fallback recipe
      const fallbackRecipe = generateFallbackRecipe(ingredients);
      setRecipeContent(fallbackRecipe);
      setShowRecipe(true);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackRecipe = (ingredients) => {
    const ingredientNames = ingredients.map(item => item.item_name.toLowerCase());
    
    // Detect dish type based on ingredients
    let dishType = 'curry';
    let recipe = '';

    if (ingredientNames.some(name => name.includes('rice'))) {
      dishType = 'rice';
      recipe = `🍚 **How to Cook Rice:**

1. **Wash the Rice:** Rinse rice 2-3 times until water runs clear
2. **Measure Water:** Use 1:2 ratio (1 cup rice : 2 cups water)
3. **Boil:** Bring water to boil, add rice
4. **Simmer:** Reduce heat, cover and cook for 15-20 minutes
5. **Rest:** Let it sit for 5 minutes before serving
6. **Serve:** Fluff with fork and enjoy!

⏰ **Total Time:** 25 minutes
👥 **Serves:** 4 people`;
    } else if (ingredientNames.some(name => name.includes('dal') || name.includes('lentil'))) {
      dishType = 'dal';
      recipe = `🥘 **How to Cook Dal:**

1. **Wash Dal:** Rinse dal/lentils until water runs clear
2. **Boil Dal:** Cook dal with 3 cups water for 15-20 minutes
3. **Prepare Base:** Heat oil, add chopped onions
4. **Cook Onions:** Sauté until golden brown
5. **Add Tomatoes:** Add chopped tomatoes, cook until soft
6. **Combine:** Mix cooked dal with onion-tomato base
7. **Season:** Add salt and simmer for 5 minutes
8. **Serve:** Garnish and serve hot with rice

⏰ **Total Time:** 30 minutes
👥 **Serves:** 4 people`;
    } else if (ingredientNames.some(name => name.includes('chicken'))) {
      dishType = 'chicken curry';
      recipe = `🍛 **How to Cook Chicken Curry:**

1. **Prep Chicken:** Cut chicken into medium pieces
2. **Heat Oil:** Heat oil in a heavy-bottomed pan
3. **Cook Onions:** Add sliced onions, cook until golden
4. **Add Tomatoes:** Add chopped tomatoes, cook until soft
5. **Add Chicken:** Add chicken pieces, cook for 5 minutes
6. **Simmer:** Add 1 cup water, cover and cook for 20 minutes
7. **Season:** Add salt to taste
8. **Finish:** Simmer until chicken is tender and curry thickens
9. **Serve:** Garnish and serve hot with rice

⏰ **Total Time:** 35 minutes
👥 **Serves:** 4 people`;
    } else if (ingredientNames.some(name => name.includes('egg'))) {
      dishType = 'egg curry';
      recipe = `🥚 **How to Cook Egg Curry:**

1. **Boil Eggs:** Hard boil eggs for 8 minutes, peel and set aside
2. **Heat Oil:** Heat oil in a pan
3. **Cook Onions:** Add sliced onions, cook until golden
4. **Add Tomatoes:** Add chopped tomatoes, cook until soft
5. **Add Eggs:** Gently add boiled eggs to the curry
6. **Simmer:** Add 1/2 cup water, simmer for 10 minutes
7. **Season:** Add salt to taste
8. **Serve:** Serve hot with rice or bread

⏰ **Total Time:** 25 minutes
👥 **Serves:** 4 people`;
    } else {
      recipe = `🍛 **How to Cook with Your Ingredients:**

1. **Prepare:** Wash and chop all ingredients
2. **Heat Oil:** Heat oil in a pan
3. **Cook Base:** Add onions, cook until golden
4. **Add Tomatoes:** Add tomatoes, cook until soft
5. **Add Main Ingredient:** Add your main ingredient
6. **Cook:** Cook covered for 15-20 minutes
7. **Season:** Add salt and spices to taste
8. **Serve:** Serve hot with rice or bread

⏰ **Total Time:** 30 minutes
👥 **Serves:** 4 people`;
    }

    return recipe;
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Order Summary</h4>
              {console.log('Order Summary rendered:', orderData)}
              
              {/* Available Items */}
              {orderData.available && orderData.available.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-green-700 mb-2">Available Items:</h5>
                  <div className="space-y-2">
                    {orderData.available.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex-1">
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-gray-600 ml-2">
                            {item.quantity} {item.unit} × ₹{item.price_per_unit} = ₹{item.total_price}
                          </span>
                        </div>
                        <button
                          onClick={() => removeItem(item.item_name)}
                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>₹{orderData.available.reduce((sum, item) => sum + item.total_price, 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Unavailable Items */}
              {orderData.unavailable && orderData.unavailable.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-red-700 mb-2">Unavailable Items:</h5>
                  <div className="space-y-1">
                    {orderData.unavailable.map((item, index) => (
                      <div key={index} className="text-red-600 text-sm">
                        • {item.item_name} ({item.quantity} {item.unit})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock Items */}
              {orderData.lowStock && orderData.lowStock.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-orange-700 mb-2">Limited Stock:</h5>
                  <div className="space-y-1">
                    {orderData.lowStock.map((item, index) => (
                      <div key={index} className="text-orange-600 text-sm">
                        • {item.item_name}: Only {item.available_quantity} {item.unit} available
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={handleOrderConfirm}
                  disabled={isLoading || !orderData.available || orderData.available.length === 0}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Placing Order...' : 'Confirm Order'}
                </button>
                <button
                  onClick={handleOrderCancel}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>

              {/* Recipe Process Button */}
              {orderData.available && orderData.available.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => {
                      console.log('Recipe button clicked!', orderData.available);
                      showRecipeProcess(orderData.available);
                    }}
                    className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 border border-blue-200 flex items-center justify-center space-x-2"
                  >
                    <span>👨‍🍳</span>
                    <span>How to Cook with These Ingredients</span>
                  </button>
                </div>
              )}
            </div>
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

      {/* Recipe Modal */}
      {showRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                  <span>👨‍🍳</span>
                  <span>Cooking Instructions</span>
                </h3>
                <button
                  onClick={() => setShowRecipe(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {recipeContent}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRecipe(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(recipeContent);
                    alert('Recipe copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Copy Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            onKeyDown={handleKeyPress}
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
          🎯 TOP 3 guarantee: "chicken curry for 4" → I'll give you exactly the TOP 3 most essential items from inventory
        </div>
      </div>
    </div>
  );
};

export default CustomerChatbot;
