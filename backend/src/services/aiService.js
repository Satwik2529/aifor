/**
 * AI Service - Complete Integration Layer
 * Handles OpenAI, ElevenLabs, Deepgram, and Image Generation APIs
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.elevenlabsKey = process.env.ELEVENLABS_API_KEY;
    this.deepgramKey = process.env.DEEPGRAM_API_KEY;
    this.stabilityKey = process.env.STABILITY_API_KEY; // For image generation
    
    // API endpoints
    this.openaiEndpoint = 'https://api.openai.com/v1';
    this.elevenlabsEndpoint = 'https://api.elevenlabs.io/v1';
    this.deepgramEndpoint = 'https://api.deepgram.com/v1';
    this.stabilityEndpoint = 'https://api.stability.ai/v1';
  }

  /**
   * Check if AI services are configured
   */
  isConfigured() {
    return {
      openai: !!this.openaiKey,
      elevenlabs: !!this.elevenlabsKey,
      deepgram: !!this.deepgramKey,
      imageGen: !!this.stabilityKey
    };
  }

  /**
   * OpenAI Chat Completion (GPT-4 or GPT-3.5)
   */
  async chatCompletion(userMessage, systemPrompt, businessContext = {}) {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const contextMessage = `
Business Context:
- Inventory Items: ${businessContext.inventoryCount || 0}
- Sales Today: ₹${businessContext.salesToday || 0}
- Expenses Today: ₹${businessContext.expensesToday || 0}
- Low Stock Items: ${businessContext.lowStockItems || 0}
- Customers: ${businessContext.customersCount || 0}

User Question: ${userMessage}
`;

      const response = await axios.post(
        `${this.openaiEndpoint}/chat/completions`,
        {
          model: 'gpt-3.5-turbo', // or 'gpt-4' for better results
          messages: [
            {
              role: 'system',
              content: systemPrompt || 'You are a helpful business assistant for a shopkeeper. Provide concise, actionable advice about inventory, sales, customers, and expenses.'
            },
            {
              role: 'user',
              content: contextMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        response: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error.message);
      throw new Error(`OpenAI Error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * OpenAI Function Calling for Structured Analysis
   */
  async analyzeBusinessData(businessData) {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.openaiEndpoint}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a business analyst. Analyze the provided business data and give 3 actionable insights.'
            },
            {
              role: 'user',
              content: JSON.stringify(businessData)
            }
          ],
          functions: [
            {
              name: 'provide_business_insights',
              description: 'Provide business insights and recommendations',
              parameters: {
                type: 'object',
                properties: {
                  insights: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of business insights'
                  },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of actionable recommendations'
                  },
                  alerts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of urgent alerts'
                  }
                },
                required: ['insights', 'recommendations']
              }
            }
          ],
          function_call: { name: 'provide_business_insights' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const functionCall = response.data.choices[0].message.function_call;
      return {
        success: true,
        data: JSON.parse(functionCall.arguments)
      };
    } catch (error) {
      console.error('OpenAI Analysis Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate Image using Stability AI (DALL·E alternative)
   */
  async generateImage(prompt, style = 'photographic') {
    if (!this.stabilityKey) {
      throw new Error('Stability API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.stabilityEndpoint}/generation/stable-diffusion-xl-1024-v1-0/text-to-image`,
        {
          text_prompts: [
            {
              text: `${prompt}, business ${style} style, professional, high quality`,
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30
        },
        {
          headers: {
            'Authorization': `Bearer ${this.stabilityKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      // Image is base64 encoded
      const imageBase64 = response.data.artifacts[0].base64;
      
      return {
        success: true,
        imageUrl: `data:image/png;base64,${imageBase64}`,
        prompt: prompt
      };
    } catch (error) {
      console.error('Image Generation Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Alternative: OpenAI DALL·E 3 Image Generation
   */
  async generateImageWithDALLE(prompt) {
    if (!this.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.openaiEndpoint}/images/generations`,
        {
          model: 'dall-e-3',
          prompt: `Business context: ${prompt}. Professional, modern, clean style.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        imageUrl: response.data.data[0].url,
        prompt: prompt
      };
    } catch (error) {
      console.error('DALL·E Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * ElevenLabs Text-to-Speech
   */
  async textToSpeech(text, voiceId = 'EXAVITQu4vr4xnSDxMaL') {
    if (!this.elevenlabsKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.elevenlabsEndpoint}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: {
            'xi-api-key': this.elevenlabsKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      // Convert to base64 for frontend
      const audioBase64 = Buffer.from(response.data).toString('base64');
      
      return {
        success: true,
        audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
        text: text
      };
    } catch (error) {
      console.error('ElevenLabs Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Deepgram Speech-to-Text
   */
  async speechToText(audioBuffer, options = {}) {
    if (!this.deepgramKey) {
      throw new Error('Deepgram API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.deepgramEndpoint}/listen`,
        audioBuffer,
        {
          headers: {
            'Authorization': `Token ${this.deepgramKey}`,
            'Content-Type': 'audio/wav'
          },
          params: {
            model: options.model || 'nova-2',
            language: options.language || 'en-US',
            punctuate: true,
            diarize: false
          }
        }
      );

      const transcript = response.data.results.channels[0].alternatives[0].transcript;
      const confidence = response.data.results.channels[0].alternatives[0].confidence;

      return {
        success: true,
        transcript: transcript,
        confidence: confidence
      };
    } catch (error) {
      console.error('Deepgram Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fallback: Rule-based chat (when no API key)
   */
  async fallbackChat(message, businessContext) {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let suggestions = [];

    if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
      response = `📦 **Inventory Overview**\n\n`;
      response += `• Total Items: ${businessContext.inventoryCount || 0}\n`;
      response += `• Low Stock Items: ${businessContext.lowStockItems || 0}\n\n`;
      response += businessContext.lowStockItems > 0 
        ? '⚠️ You have items running low on stock. Consider restocking soon!'
        : '✅ All items are well stocked.';
      suggestions = ['Show inventory list', 'Add new item', 'Update stock'];
    } else if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      response = `💰 **Sales Summary**\n\n`;
      response += `• Today's Sales: ₹${businessContext.salesToday || 0}\n`;
      response += `• Total Transactions: ${businessContext.salesCount || 0}\n`;
      suggestions = ['Monthly report', 'Best sellers', 'Payment methods'];
    } else if (lowerMessage.includes('expense') || lowerMessage.includes('cost')) {
      response = `💸 **Expense Overview**\n\n`;
      response += `• Today's Expenses: ₹${businessContext.expensesToday || 0}\n`;
      suggestions = ['Category breakdown', 'Add expense', 'Monthly expenses'];
    } else if (lowerMessage.includes('profit') || lowerMessage.includes('analytics')) {
      const profit = (businessContext.salesToday || 0) - (businessContext.expensesToday || 0);
      response = `📊 **Profit Analysis**\n\n`;
      response += `• Revenue: ₹${businessContext.salesToday || 0}\n`;
      response += `• Expenses: ₹${businessContext.expensesToday || 0}\n`;
      response += `• Net Profit: ₹${profit}\n`;
      suggestions = ['Detailed analytics', 'Profit trends', 'Cost optimization'];
    } else {
      response = `I can help you with:\n\n`;
      response += `📦 Inventory Management\n`;
      response += `💰 Sales Tracking\n`;
      response += `💸 Expense Analysis\n`;
      response += `📊 Profit & Analytics\n\n`;
      response += `What would you like to know?`;
      suggestions = ['Check inventory', 'Today\'s sales', 'Expense summary', 'Profit analysis'];
    }

    return {
      success: true,
      response: response,
      suggestions: suggestions,
      usingFallback: true
    };
  }
}

module.exports = new AIService();
