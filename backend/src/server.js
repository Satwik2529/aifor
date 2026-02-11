/**
 * BizNova Backend Server
 * Express.js server with MongoDB connection and API routes
 * Ready for Phase 2-6 development
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const salesRoutes = require('./routes/salesRoutes');
const expensesRoutes = require('./routes/expensesRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const customersRoutes = require('./routes/customersRoutes');
const aiRoutes = require('./routes/aiRoutes');
const aiRoutesAdvanced = require('./routes/aiRoutesAdvanced');
const aiInsightsRoutes = require('./routes/aiInsightsRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const customerChatbotRoutes = require('./routes/customerChatbotRoutes');
const dataSyncRoutes = require('./routes/dataSyncRoutes');
const conversationalActionRoutes = require('./routes/conversationalActionRoutes');
const messagesRoutes = require('./routes/messagesRoutes');
const profitAnalyticsRoutes = require('./routes/profitAnalyticsRoutes');
const customerAuthRoutes = require('./routes/customerAuthRoutes');
const customerRequestRoutes = require('./routes/customerRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const nearbyShopsRoutes = require('./routes/nearbyShopsRoutes');
const wholesalerRoutes = require('./routes/wholesalerRoutes');
const seedRoutes = require('./routes/seedRoutes');
const campaignRoutes = require('./routes/campaignRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration to allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://biznova.onrender.com',
  'https://aiforall-8d15.onrender.com',
  // Add your new frontend URL here
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin like Postman or curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware to parse JSON and urlencoded payloads
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BizNova Backend Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/ai', aiRoutesAdvanced); // Advanced AI with OpenAI, ElevenLabs, Deepgram support
app.use('/api/ai-basic', aiRoutes); // Fallback basic AI routes
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/chatbot', chatbotRoutes); // AI Chatbot with multilingual voice support
app.use('/api/chatbot/customer', customerChatbotRoutes); // Customer-side AI chatbot
app.use('/api/sync', dataSyncRoutes); // Data synchronization between stores and customers
app.use('/api/conversational', conversationalActionRoutes); // Phase 7: Conversational DB actions with confirmation
app.use('/api/messages', messagesRoutes);
app.use('/api/profit-analytics', profitAnalyticsRoutes);
app.use('/api/customer-auth', customerAuthRoutes); // Customer user authentication
app.use('/api/customer-requests', customerRequestRoutes); // Customer-to-retailer messaging
app.use('/api/notifications', notificationRoutes); // User notifications
app.use('/api/nearby-shops', nearbyShopsRoutes); // Find nearby shops by location
app.use('/api/wholesalers', wholesalerRoutes); // Wholesaler discovery and ordering
app.use('/api/seed', seedRoutes); // Development seed data
app.use('/api/campaigns', campaignRoutes); // Discount campaigns and hot deals

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to BizNova API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      sales: '/api/sales',
      expenses: '/api/expenses',
      inventory: '/api/inventory',
      customers: '/api/customers',
      ai: '/api/ai',
      aiInsights: '/api/ai-insights',
      messages: '/api/messages',
      profitAnalytics: '/api/profit-analytics'
    },
    note: 'All endpoints are ready for Phase 2 implementation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('🚀 BizNova Backend Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova'}`);
  console.log('✅ Ready for Phase 2-6 development');
  console.log('🔗 API Documentation: http://localhost:' + PORT);
});
