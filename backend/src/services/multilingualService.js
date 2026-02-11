/**
 * Multilingual Service - Language Support for English, Hindi, Telugu
 * Handles translation, language detection, and multilingual responses
 */

class MultilingualService {
  constructor() {
    // Language configurations
    this.languages = {
      english: 'en',
      hindi: 'hi',
      telugu: 'te'
    };

    // ElevenLabs voice IDs for different languages
    this.voiceIds = {
      en: 'EXAVITQu4vr4xnSDxMaL', // Sarah - English
      hi: 'pNInz6obpgDQGcFmaJgB', // Adam - Hindi (deep voice)
      te: '21m00Tcm4TlvDq8ikWAM'  // Rachel - Telugu
    };
  }

  /**
   * Detect language from user input
   */
  detectLanguage(text) {
    const lowerText = text.toLowerCase();

    // Telugu detection (contains Telugu script)
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return 'te';
    }

    // Hindi detection (contains Devanagari script)
    if (/[\u0900-\u097F]/.test(text)) {
      return 'hi';
    }

    // Tamil detection (contains Tamil script)
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return 'ta';
    }

    // Kannada detection (contains Kannada script)
    if (/[\u0C80-\u0CFF]/.test(text)) {
      return 'kn';
    }

    // Hindi romanized keywords
    const hindiKeywords = ['kya', 'hai', 'mera', 'stock', 'becho', 'kitna', 'dikhao', 'batao'];
    if (hindiKeywords.some(word => lowerText.includes(word))) {
      return 'hi';
    }

    // Telugu romanized keywords
    const teluguKeywords = ['enti', 'chupinchu', 'ela', 'stock', 'ammandi', 'entha'];
    if (teluguKeywords.some(word => lowerText.includes(word))) {
      return 'te';
    }

    // Tamil romanized keywords
    const tamilKeywords = ['enna', 'epadi', 'stock', 'kaattu', 'evvalavu'];
    if (tamilKeywords.some(word => lowerText.includes(word))) {
      return 'ta';
    }

    // Kannada romanized keywords
    const kannadaKeywords = ['yaava', 'hege', 'stock', 'torisu', 'eshtu'];
    if (kannadaKeywords.some(word => lowerText.includes(word))) {
      return 'kn';
    }

    // Default to English
    return 'en';
  }

  /**
   * Get voice ID for language
   */
  getVoiceId(language) {
    return this.voiceIds[language] || this.voiceIds.en;
  }

  /**
   * Translate business terms to selected language
   */
  translate(key, language = 'en', data = {}) {
    const translations = {
      // Inventory translations
      'inventory.header': {
        en: 'Inventory Status',
        hi: 'इन्वेंटरी स्थिति',
        te: 'నిల్వ స్థితి',
        ta: 'சரக்கு நிலை',
        kn: 'ದಾಸ್ತಾನು ಸ್ಥಿತಿ'
      },
      'inventory.total': {
        en: 'Total Items',
        hi: 'कुल वस्तुएं',
        te: 'మొత్తం వస్తువులు',
        ta: 'மொத்த பொருட்கள்',
        kn: 'ಒಟ್ಟು ವಸ್ತುಗಳು'
      },
      'inventory.low_stock': {
        en: 'Low Stock Items',
        hi: 'कम स्टॉक वाली वस्तुएं',
        te: 'తక్కువ స్టాక్ వస్తువులు',
        ta: 'குறைந்த பங்கு பொருட்கள்',
        kn: 'ಕಡಿಮೆ ಸ್ಟಾಕ್ ವಸ್ತುಗಳು'
      },
      'inventory.value': {
        en: 'Total Value',
        hi: 'कुल मूल्य',
        te: 'మొత్తం విలువ',
        ta: 'மொத்த மதிப்பு',
        kn: 'ಒಟ್ಟು ಮೌಲ್ಯ'
      },

      // Sales translations
      'sales.header': {
        en: 'Sales Summary',
        hi: 'बिक्री सारांश',
        te: 'అమ్మకాల సారాంశం',
        ta: 'விற்பனை சுருக்கம்',
        kn: 'ಮಾರಾಟ ಸಾರಾಂಶ'
      },
      'sales.today': {
        en: 'Today\'s Sales',
        hi: 'आज की बिक्री',
        te: 'నేటి అమ్మకాలు',
        ta: 'இன்றைய விற்பனை',
        kn: 'ಇಂದಿನ ಮಾರಾಟ'
      },
      'sales.revenue': {
        en: 'Revenue',
        hi: 'राजस्व',
        te: 'ఆదాయం',
        ta: 'வருவாய்',
        kn: 'ಆದಾಯ'
      },
      'sales.transactions': {
        en: 'Transactions',
        hi: 'लेनदेन',
        te: 'లావాదేవీలు',
        ta: 'பரிவர்த்தனைகள்',
        kn: 'ವಹಿವಾಟುಗಳು'
      },

      // Bill translations
      'bill.header': {
        en: 'INVOICE',
        hi: 'बीजक',
        te: 'బిల్లు',
        ta: 'விலைப்பட்டியல்',
        kn: 'ಬಿಲ್'
      },
      'bill.date': {
        en: 'Date',
        hi: 'तारीख',
        te: 'తేదీ',
        ta: 'தேதி',
        kn: 'ದಿನಾಂಕ'
      },
      'bill.customer': {
        en: 'Customer',
        hi: 'ग्राहक',
        te: 'కస్టమర్',
        ta: 'வாடிக்கையாளர்',
        kn: 'ಗ್ರಾಹಕ'
      },
      'bill.items': {
        en: 'Items',
        hi: 'वस्तुएं',
        te: 'వస్తువులు',
        ta: 'பொருட்கள்',
        kn: 'ವಸ್ತುಗಳು'
      },
      'bill.quantity': {
        en: 'Quantity',
        hi: 'मात्रा',
        te: 'పరిమాణం',
        ta: 'அளவு',
        kn: 'ಪ್ರಮಾಣ'
      },
      'bill.price': {
        en: 'Price',
        hi: 'मूल्य',
        te: 'ధర',
        ta: 'விலை',
        kn: 'ಬೆಲೆ'
      },
      'bill.total': {
        en: 'Total',
        hi: 'कुल',
        te: 'మొత్తం',
        ta: 'மொத்தம்',
        kn: 'ಒಟ್ಟು'
      },
      'bill.subtotal': {
        en: 'Subtotal',
        hi: 'उपयोग',
        te: 'ఉప మొత్తం',
        ta: 'துணை மொத்தம்',
        kn: 'ಉಪ ಮೊತ್ತ'
      },
      'bill.tax': {
        en: 'Tax',
        hi: 'कर',
        te: 'పన్ను',
        ta: 'வரி',
        kn: 'ತೆರಿಗೆ'
      },
      'bill.grand_total': {
        en: 'Grand Total',
        hi: 'कुल योग',
        te: 'మొత్తం మొత్తం',
        ta: 'பெரும் மொத்தம்',
        kn: 'ಒಟ್ಟು ಮೊತ್ತ'
      },
      'bill.thank_you': {
        en: 'Thank you for your business!',
        hi: 'आपके व्यापार के लिए धन्यवाद!',
        te: 'మీ వ్యాపారం కోసం ధన్యవాదాలు!',
        ta: 'உங்கள் வணிகத்திற்கு நன்றி!',
        kn: 'ನಿಮ್ಮ ವ್ಯಾಪಾರಕ್ಕೆ ಧನ್ಯವಾದಗಳು!'
      },

      // AI responses
      'ai.greeting': {
        en: 'Hello! How can I help you today?',
        hi: 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूं?',
        te: 'హలో! నేను ఈ రోజు మీకు ఎలా సహాయపడగలను?',
        ta: 'வணக்கம்! இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
        kn: 'ನಮಸ್ಕಾರ! ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?'
      },
      'ai.inventory_empty': {
        en: 'Your inventory is empty. Please add items first.',
        hi: 'आपकी इन्वेंटरी खाली है। कृपया पहले वस्तुएं जोड़ें।',
        te: 'మీ నిల్వ ఖాళీగా ఉంది. దయచేసి మొదట వస్తువులను జోడించండి.',
        ta: 'உங்கள் சரக்கு காலியாக உள்ளது. முதலில் பொருட்களைச் சேர்க்கவும்.',
        kn: 'ನಿಮ್ಮ ದಾಸ್ತಾನು ಖಾಲಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಮೊದಲು ವಸ್ತುಗಳನ್ನು ಸೇರಿಸಿ.'
      },
      'ai.sale_success': {
        en: 'Sale completed successfully! Inventory updated.',
        hi: 'बिक्री सफलतापूर्वक पूरी हुई! इन्वेंटरी अपडेट की गई।',
        te: 'అమ్మకం విజయవంతంగా పూర్తయింది! నిల్వ నవీకరించబడింది.',
        ta: 'விற்பனை வெற்றிகரமாக முடிந்தது! சரக்கு புதுப்பிக்கப்பட்டது.',
        kn: 'ಮಾರಾಟ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ! ದಾಸ್ತಾನು ನವೀಕರಿಸಲಾಗಿದೆ.'
      },
      'ai.low_stock_alert': {
        en: 'Warning: {count} items are running low on stock.',
        hi: 'चेतावनी: {count} वस्तुओं का स्टॉक कम है।',
        te: 'హెచ్చరిక: {count} వస్తువులు తక్కువ స్టాక్‌లో ఉన్నాయి.',
        ta: 'எச்சரிக்கை: {count} பொருட்கள் குறைந்த பங்கில் உள்ளன.',
        kn: 'ಎಚ್ಚರಿಕೆ: {count} ವಸ್ತುಗಳು ಕಡಿಮೆ ಸ್ಟಾಕ್‌ನಲ್ಲಿವೆ.'
      },
      'ai.profit_summary': {
        en: 'Your current profit is ₹{profit}. Revenue: ₹{revenue}, Expenses: ₹{expenses}',
        hi: 'आपका वर्तमान लाभ ₹{profit} है। राजस्व: ₹{revenue}, व्यय: ₹{expenses}',
        te: 'మీ ప్రస్తుత లాభం ₹{profit}. ఆదాయం: ₹{revenue}, ఖర్చులు: ₹{expenses}',
        ta: 'உங்கள் தற்போதைய லாபம் ₹{profit}. வருவாய்: ₹{revenue}, செலவுகள்: ₹{expenses}',
        kn: 'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಲಾಭ ₹{profit}. ಆದಾಯ: ₹{revenue}, ವೆಚ್ಚಗಳು: ₹{expenses}'
      }
    };

    const text = translations[key]?.[language] || translations[key]?.en || key;

    // Replace placeholders with data
    return text.replace(/{(\w+)}/g, (match, key) => data[key] || match);
  }

  /**
   * Generate multilingual business response
   */
  generateResponse(type, language, businessData) {
    const lang = language || 'en';

    switch (type) {
      case 'inventory':
        return this.translate('inventory.header', lang) + '\n\n' +
          this.translate('inventory.total', lang) + ': ' + businessData.count + '\n' +
          this.translate('inventory.low_stock', lang) + ': ' + businessData.lowStock + '\n' +
          this.translate('inventory.value', lang) + ': ₹' + businessData.value;

      case 'sales':
        return this.translate('sales.header', lang) + '\n\n' +
          this.translate('sales.today', lang) + ': ₹' + businessData.today + '\n' +
          this.translate('sales.transactions', lang) + ': ' + businessData.count;

      case 'profit':
        return this.translate('ai.profit_summary', lang, {
          profit: businessData.profit,
          revenue: businessData.revenue,
          expenses: businessData.expenses
        });

      case 'greeting':
        return this.translate('ai.greeting', lang);

      default:
        return this.translate('ai.greeting', lang);
    }
  }

  /**
   * Generate bill text in multiple languages
   */
  generateBillText(billData, language = 'en') {
    const lang = language;
    let text = '';

    text += this.translate('bill.header', lang) + '\n';
    text += '='.repeat(40) + '\n\n';
    text += this.translate('bill.date', lang) + ': ' + billData.date + '\n';
    text += this.translate('bill.customer', lang) + ': ' + (billData.customerName || 'Walk-in Customer') + '\n\n';
    text += this.translate('bill.items', lang) + ':\n';
    text += '-'.repeat(40) + '\n';

    billData.items.forEach((item, index) => {
      text += `${index + 1}. ${item.name}\n`;
      text += `   ${this.translate('bill.quantity', lang)}: ${item.quantity} x ₹${item.price}\n`;
      text += `   ${this.translate('bill.total', lang)}: ₹${item.quantity * item.price}\n\n`;
    });

    text += '-'.repeat(40) + '\n';
    text += this.translate('bill.subtotal', lang) + ': ₹' + billData.subtotal + '\n';

    if (billData.tax > 0) {
      text += this.translate('bill.tax', lang) + ': ₹' + billData.tax + '\n';
    }

    text += this.translate('bill.grand_total', lang) + ': ₹' + billData.grandTotal + '\n\n';
    text += this.translate('bill.thank_you', lang) + '\n';

    return text;
  }

  /**
   * Translate OpenAI prompt to include language context
   */
  generatePromptWithLanguage(userMessage, language, businessContext) {
    const languageNames = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu'
    };

    return `You are a helpful multilingual business assistant. The user is speaking in ${languageNames[language]}.

User's Business Context:
- Inventory: ${businessContext.inventoryCount} items
- Sales Today: ₹${businessContext.salesToday}
- Expenses Today: ₹${businessContext.expensesToday}
- Low Stock Items: ${businessContext.lowStockItems}

User Message: ${userMessage}

Please respond in ${languageNames[language]} language. Provide clear, actionable business advice.`;
  }
}

module.exports = new MultilingualService();
