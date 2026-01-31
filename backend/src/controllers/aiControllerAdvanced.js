/**
 * Advanced AI Controller - With Full AI Integration
 * Supports OpenAI, ElevenLabs, Deepgram, Image Generation
 */

const aiService = require('../services/aiService');
const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');

const aiControllerAdvanced = {
  /**
   * Check AI Service Status
   */
  getAIStatus: async (req, res) => {
    try {
      const config = aiService.isConfigured();
      
      res.status(200).json({
        success: true,
        message: 'AI service status',
        data: {
          services: {
            openai: {
              configured: config.openai,
              features: ['Chat', 'Business Analysis', 'Image Generation (DALL·E)']
            },
            elevenlabs: {
              configured: config.elevenlabs,
              features: ['Text-to-Speech', 'Voice Generation']
            },
            deepgram: {
              configured: config.deepgram,
              features: ['Speech-to-Text', 'Voice Recognition']
            },
            imageGeneration: {
              configured: config.imageGen,
              features: ['Image Generation (Stability AI)']
            }
          },
          fallbackAvailable: true,
          note: config.openai ? 'AI features fully enabled' : 'Using fallback mode - add API keys for full features'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking AI status',
        error: error.message
      });
    }
  },

  /**
   * Enhanced Chat with AI
   */
  chatWithAI: async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user._id;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      // Fetch business context
      const [inventory, sales, customers, expenses] = await Promise.all([
        Inventory.find({ user_id: userId }),
        Sale.find({ user_id: userId }),
        Customer.find({ user_id: userId }),
        Expense.find({ user_id: userId })
      ]);

      // Calculate today's data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
      const todayExpenses = expenses.filter(e => new Date(e.createdAt) >= today);
      
      const businessContext = {
        inventoryCount: inventory.length,
        salesToday: todaySales.reduce((sum, s) => sum + s.total_amount, 0),
        salesCount: todaySales.length,
        expensesToday: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
        lowStockItems: inventory.filter(i => i.stock_qty <= 5).length,
        customersCount: customers.length
      };

      let aiResponse;
      const config = aiService.isConfigured();

      if (config.openai) {
        // Use OpenAI for intelligent responses
        try {
          const systemPrompt = `You are a helpful business assistant for a shopkeeper. 
Provide concise, actionable advice about inventory, sales, customers, and expenses.
Use the business context to give personalized recommendations.
Keep responses under 200 words and always end with 2-3 follow-up suggestions.`;

          aiResponse = await aiService.chatCompletion(message, systemPrompt, businessContext);
          
          // Generate suggestions
          const suggestions = [
            'Show detailed analytics',
            'Check inventory status',
            'Today\'s sales report'
          ];

          res.status(200).json({
            success: true,
            message: 'AI response generated',
            data: {
              response: aiResponse.response,
              suggestions: suggestions,
              context: 'ai_powered',
              usingOpenAI: true
            }
          });
        } catch (openaiError) {
          console.error('OpenAI failed, using fallback:', openaiError.message);
          // Fallback to rule-based
          aiResponse = await aiService.fallbackChat(message, businessContext);
          
          res.status(200).json({
            success: true,
            message: 'AI response generated (fallback mode)',
            data: {
              response: aiResponse.response,
              suggestions: aiResponse.suggestions,
              context: 'fallback',
              usingOpenAI: false,
              note: 'OpenAI unavailable, using rule-based responses'
            }
          });
        }
      } else {
        // Use fallback rule-based system
        aiResponse = await aiService.fallbackChat(message, businessContext);
        
        res.status(200).json({
          success: true,
          message: 'AI response generated',
          data: {
            response: aiResponse.response,
            suggestions: aiResponse.suggestions,
            context: 'fallback',
            usingOpenAI: false,
            note: 'Configure OPENAI_API_KEY for advanced AI features'
          }
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing chat message',
        error: error.message
      });
    }
  },

  /**
   * Business Insights with AI Analysis
   */
  getBusinessInsights: async (req, res) => {
    try {
      const userId = req.user._id;

      // Fetch all business data
      const [inventory, sales, customers, expenses] = await Promise.all([
        Inventory.find({ user_id: userId }),
        Sale.find({ user_id: userId }).limit(100).sort({ createdAt: -1 }),
        Customer.find({ user_id: userId }),
        Expense.find({ user_id: userId }).limit(100).sort({ createdAt: -1 })
      ]);

      const businessData = {
        inventory: {
          total: inventory.length,
          lowStock: inventory.filter(i => i.stock_qty <= 5).length,
          totalValue: inventory.reduce((sum, i) => sum + (i.stock_qty * i.price_per_unit), 0)
        },
        sales: {
          total: sales.length,
          totalRevenue: sales.reduce((sum, s) => sum + s.total_amount, 0),
          averageTransaction: sales.length > 0 ? sales.reduce((sum, s) => sum + s.total_amount, 0) / sales.length : 0
        },
        expenses: {
          total: expenses.length,
          totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
          categories: [...new Set(expenses.map(e => e.category))]
        },
        customers: {
          total: customers.length,
          withCredit: customers.filter(c => c.credit_balance > 0).length
        }
      };

      const config = aiService.isConfigured();

      if (config.openai) {
        try {
          const analysis = await aiService.analyzeBusinessData(businessData);
          
          res.status(200).json({
            success: true,
            message: 'Business insights generated',
            data: {
              insights: analysis.data.insights,
              recommendations: analysis.data.recommendations,
              alerts: analysis.data.alerts || [],
              businessData: businessData,
              usingAI: true
            }
          });
        } catch (aiError) {
          console.error('AI analysis failed:', aiError.message);
          // Fallback to manual insights
          const insights = generateManualInsights(businessData);
          
          res.status(200).json({
            success: true,
            message: 'Business insights generated (manual mode)',
            data: {
              ...insights,
              businessData: businessData,
              usingAI: false
            }
          });
        }
      } else {
        // Manual insights
        const insights = generateManualInsights(businessData);
        
        res.status(200).json({
          success: true,
          message: 'Business insights generated',
          data: {
            ...insights,
            businessData: businessData,
            usingAI: false,
            note: 'Configure OPENAI_API_KEY for AI-powered insights'
          }
        });
      }
    } catch (error) {
      console.error('Insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating business insights',
        error: error.message
      });
    }
  },

  /**
   * Generate Image
   */
  generateImage: async (req, res) => {
    try {
      const { prompt, style = 'photographic' } = req.body;

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      const config = aiService.isConfigured();

      if (config.openai) {
        // Try DALL·E first
        try {
          const image = await aiService.generateImageWithDALLE(prompt);
          
          res.status(200).json({
            success: true,
            message: 'Image generated successfully',
            data: {
              imageUrl: image.imageUrl,
              prompt: prompt,
              service: 'dall-e-3'
            }
          });
        } catch (dalleError) {
          console.error('DALL·E failed:', dalleError.message);
          throw new Error('Image generation unavailable');
        }
      } else if (config.imageGen) {
        // Try Stability AI
        const image = await aiService.generateImage(prompt, style);
        
        res.status(200).json({
          success: true,
          message: 'Image generated successfully',
          data: {
            imageUrl: image.imageUrl,
            prompt: prompt,
            service: 'stability-ai'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Image generation not configured',
          note: 'Add OPENAI_API_KEY or STABILITY_API_KEY to enable image generation'
        });
      }
    } catch (error) {
      console.error('Image generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating image',
        error: error.message
      });
    }
  },

  /**
   * Text-to-Speech
   */
  textToSpeech: async (req, res) => {
    try {
      const { text, voiceId } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Text is required'
        });
      }

      const config = aiService.isConfigured();

      if (!config.elevenlabs) {
        return res.status(400).json({
          success: false,
          message: 'ElevenLabs API not configured',
          note: 'Add ELEVENLABS_API_KEY to enable text-to-speech'
        });
      }

      const audio = await aiService.textToSpeech(text, voiceId);
      
      res.status(200).json({
        success: true,
        message: 'Audio generated successfully',
        data: {
          audioUrl: audio.audioUrl,
          text: text
        }
      });
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating audio',
        error: error.message
      });
    }
  },

  /**
   * Speech-to-Text
   */
  speechToText: async (req, res) => {
    try {
      const audioBuffer = req.file?.buffer;

      if (!audioBuffer) {
        return res.status(400).json({
          success: false,
          message: 'Audio file is required'
        });
      }

      const config = aiService.isConfigured();

      if (!config.deepgram) {
        return res.status(400).json({
          success: false,
          message: 'Deepgram API not configured',
          note: 'Add DEEPGRAM_API_KEY to enable speech-to-text'
        });
      }

      const result = await aiService.speechToText(audioBuffer);
      
      res.status(200).json({
        success: true,
        message: 'Transcription completed',
        data: {
          transcript: result.transcript,
          confidence: result.confidence
        }
      });
    } catch (error) {
      console.error('STT error:', error);
      res.status(500).json({
        success: false,
        message: 'Error transcribing audio',
        error: error.message
      });
    }
  }
};

/**
 * Generate manual insights when AI is not available
 */
function generateManualInsights(businessData) {
  const insights = [];
  const recommendations = [];
  const alerts = [];

  // Inventory insights
  if (businessData.inventory.lowStock > 0) {
    alerts.push(`⚠️ ${businessData.inventory.lowStock} items are running low on stock`);
    recommendations.push('Review and restock low inventory items to avoid stock-outs');
  }

  if (businessData.inventory.total === 0) {
    alerts.push('❌ No inventory items found');
    recommendations.push('Add inventory items to start tracking your stock');
  } else {
    insights.push(`✅ Managing ${businessData.inventory.total} inventory items worth ₹${businessData.inventory.totalValue.toLocaleString()}`);
  }

  // Sales insights
  if (businessData.sales.total > 0) {
    insights.push(`💰 Generated ₹${businessData.sales.totalRevenue.toLocaleString()} from ${businessData.sales.total} sales`);
    insights.push(`📊 Average transaction value: ₹${Math.round(businessData.sales.averageTransaction)}`);
  } else {
    recommendations.push('Start recording sales to track revenue and business performance');
  }

  // Expense insights
  if (businessData.expenses.total > 0) {
    insights.push(`💸 Total expenses: ₹${businessData.expenses.totalAmount.toLocaleString()} across ${businessData.expenses.categories.length} categories`);
    
    const profit = businessData.sales.totalRevenue - businessData.expenses.totalAmount;
    if (profit > 0) {
      insights.push(`✅ Current profit: ₹${profit.toLocaleString()}`);
    } else {
      alerts.push(`⚠️ Expenses (₹${businessData.expenses.totalAmount}) exceed revenue (₹${businessData.sales.totalRevenue})`);
      recommendations.push('Review expenses and look for cost optimization opportunities');
    }
  }

  // Customer insights
  if (businessData.customers.total > 0) {
    insights.push(`👥 Managing ${businessData.customers.total} customers`);
    if (businessData.customers.withCredit > 0) {
      alerts.push(`💳 ${businessData.customers.withCredit} customers have outstanding credit`);
      recommendations.push('Follow up with customers having credit balances');
    }
  }

  return { insights, recommendations, alerts };
}

module.exports = aiControllerAdvanced;
