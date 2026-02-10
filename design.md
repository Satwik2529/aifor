# BizNova - Design Document

## Project Overview

**Project Name:** BizNova  
**Version:** 1.0  
**Last Updated:** February 2026  
**Document Type:** System Design Document (SDD)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  React Frontend (Port 3000)                                  │
│  - Retailer Dashboard                                        │
│  - Customer App                                              │
│  - Wholesaler Portal                                         │
│  - Responsive UI with Dark Mode                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/REST API
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  Node.js + Express Backend (Port 5000)                       │
│  ┌─────────────┬──────────────┬─────────────┬─────────────┐│
│  │ Controllers │  Middleware  │  Services   │   Routes    ││
│  └─────────────┴──────────────┴─────────────┴─────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  MongoDB Atlas (Cloud Database)                              │
│  - Users Collection                                          │
│  - Inventory Collection                                      │
│  - Sales Collection                                          │
│  - Expenses Collection                                       │
│  - Orders Collection                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│  - OpenAI API (AI Insights)                                  │
│  - Google OAuth (Authentication)                             │
│  - ElevenLabs (Text-to-Speech)                               │
│  - Deepgram (Speech-to-Text)                                 │
│  - Google Vision API (Bill Scanning)                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Framework:** React 18.x
- **Styling:** Tailwind CSS 3.x
- **State Management:** React Hooks (useState, useEffect, useContext)
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **UI Components:** Lucide React (Icons)
- **Charts:** Recharts
- **PDF Generation:** html2pdf.js
- **Notifications:** React Hot Toast
- **Internationalization:** i18next

#### Backend
- **Runtime:** Node.js 18.x
- **Framework:** Express.js 4.x
- **Database:** MongoDB 6.x with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** express-validator
- **File Upload:** Multer
- **Environment Variables:** dotenv
- **CORS:** cors middleware

#### AI & ML
- **AI Provider:** OpenAI (GPT-4o-mini)
- **Voice Services:** ElevenLabs, Deepgram
- **Image Processing:** Google Vision API

---

## 2. Database Design

### 2.1 Collections Schema

#### Users Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  phone: String (required, unique),
  password: String (hashed),
  role: String (enum: ['customer', 'retailer', 'wholesaler']),
  shop_name: String (optional, for retailers/wholesalers),
  locality: String (optional),
  city: String (optional),
  pincode: String (optional),
  latitude: Number (optional),
  longitude: Number (optional),
  delivery_radius: Number (optional, for wholesalers),
  min_order_value: Number (optional, for wholesalers),
  google_id: String (optional),
  profile_picture: String (optional),
  is_verified: Boolean (default: false),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `email` (unique)
- `phone` (unique)
- `role`
- `locality, city` (compound for location-based queries)

---

#### Inventory Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', required),
  item_name: String (required, max: 100),
  stock_qty: Number (required, min: 0, supports decimals),
  unit: String (enum: ['kg', 'litre', 'piece'], default: 'piece'),
  price_per_unit: Number (required, min: 0),
  cost_price: Number (required, min: 0),
  selling_price: Number (required, min: 0),
  min_stock_level: Number (default: 5),
  category: String (enum: [
    'Electronics', 'Clothing', 'Food & Beverages', 
    'Books', 'Home & Garden', 'Sports', 
    'Beauty & Health', 'Automotive', 
    'Office Supplies', 'Other'
  ]),
  description: String (max: 255),
  expiry_date: Date (optional),
  image_url: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `user_id, item_name` (compound, unique)
- `user_id, stock_qty` (for low stock queries)
- `user_id, expiry_date` (for expiry alerts)

**Virtual Fields:**
- `profitMargin` - Calculated profit percentage
- `isLowStock` - Boolean based on min_stock_level
- `expiryStatus` - Object with expiry urgency info
- `isExpiringSoon` - Boolean for items expiring within 7 days

---

#### Sales Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', required),
  items: [{
    item_name: String (required),
    quantity: Number (required, supports decimals),
    price_per_unit: Number (required),
    cost_price: Number (optional),
    unit: String (optional)
  }],
  total_amount: Number (required),
  total_cogs: Number (calculated),
  gross_profit: Number (calculated),
  payment_method: String (enum: ['Cash', 'UPI', 'Credit']),
  customer_name: String (optional),
  customer_phone: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `user_id, created_at` (for date-based queries)
- `user_id, payment_method`
- `customer_phone` (for customer history)

---

#### Expenses Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', required),
  amount: Number (required, min: 0),
  description: String (required),
  category: String (enum: [
    'Rent', 'Utilities', 'Salaries', 'Marketing',
    'Transportation', 'Supplies', 'Maintenance', 'Other'
  ]),
  is_sales_expense: Boolean (default: false),
  receipt_url: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `user_id, created_at`
- `user_id, category`
- `user_id, is_sales_expense`

---

#### CustomerRequests Collection (Orders)
```javascript
{
  _id: ObjectId,
  customer_id: ObjectId (ref: 'User', required),
  retailer_id: ObjectId (ref: 'User', required),
  items: [{
    item_name: String,
    quantity: Number,
    price_per_unit: Number
  }],
  total_amount: Number,
  status: String (enum: [
    'pending', 'confirmed', 'preparing', 
    'ready', 'delivered', 'cancelled'
  ]),
  delivery_address: String (optional),
  notes: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `customer_id, created_at`
- `retailer_id, status`

---

#### WholesalerOrders Collection
```javascript
{
  _id: ObjectId,
  retailer_id: ObjectId (ref: 'User', required),
  wholesaler_id: ObjectId (ref: 'User', required),
  items: [{
    item_name: String,
    quantity: Number,
    price_per_unit: Number,
    min_order_qty: Number
  }],
  total_amount: Number,
  status: String (enum: [
    'requested', 'accepted', 'packed', 
    'dispatched', 'delivered', 'cancelled'
  ]),
  delivery_date: Date (optional),
  delivery_address: String,
  notes: String (optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `retailer_id, created_at`
- `wholesaler_id, status`

---

#### Notifications Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: 'User', required),
  type: String (enum: [
    'low_stock', 'expiry_alert', 'order_update',
    'payment_received', 'system_alert'
  ]),
  title: String (required),
  message: String (required),
  is_read: Boolean (default: false),
  link: String (optional),
  created_at: Date
}
```

**Indexes:**
- `user_id, is_read, created_at`

---

## 3. API Design

### 3.1 RESTful API Endpoints

#### Authentication Routes (`/api/auth`)
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
POST   /api/auth/google            - Google OAuth login
POST   /api/auth/logout            - Logout user
POST   /api/auth/refresh-token     - Refresh JWT token
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password with token
GET    /api/auth/profile           - Get user profile
PUT    /api/auth/profile           - Update user profile
```

#### Inventory Routes (`/api/inventory`)
```
GET    /api/inventory              - Get all inventory items
GET    /api/inventory/:id          - Get single item
POST   /api/inventory              - Create new item
PUT    /api/inventory/:id          - Update item
DELETE /api/inventory/:id          - Delete item
POST   /api/inventory/upload       - Upload item image
POST   /api/inventory/scan-bill    - Scan wholesale bill
GET    /api/inventory/low-stock    - Get low stock items
GET    /api/inventory/expiring     - Get expiring items
```

#### Sales Routes (`/api/sales`)
```
GET    /api/sales                  - Get all sales
GET    /api/sales/:id              - Get single sale
POST   /api/sales                  - Create new sale
PUT    /api/sales/:id              - Update sale
DELETE /api/sales/:id              - Delete sale
GET    /api/sales/today            - Get today's sales summary
GET    /api/sales/analytics        - Get sales analytics
POST   /api/sales/:id/invoice      - Generate invoice PDF
```

#### Expenses Routes (`/api/expenses`)
```
GET    /api/expenses               - Get all expenses
GET    /api/expenses/:id           - Get single expense
POST   /api/expenses               - Create new expense
PUT    /api/expenses/:id           - Update expense
DELETE /api/expenses/:id           - Delete expense
GET    /api/expenses/analytics     - Get expense analytics
```

#### AI Insights Routes (`/api/ai-insights`)
```
POST   /api/ai-insights/demand-forecast      - Generate demand forecast
POST   /api/ai-insights/revenue-optimization - Generate revenue insights
POST   /api/ai-insights/expense-forecast     - Generate expense forecast
POST   /api/ai-insights/chat                 - Chat with AI assistant
GET    /api/ai-insights/history              - Get past insights
```

#### Chatbot Routes (`/api/chatbot`)
```
POST   /api/chatbot/retailer       - Retailer chatbot interaction
POST   /api/chatbot/customer       - Customer chatbot interaction
POST   /api/chatbot/festival       - Festival forecast query
POST   /api/chatbot/voice          - Voice input processing
```

#### Customer Routes (`/api/customer-requests`)
```
GET    /api/customer-requests/retailers      - Get nearby retailers
POST   /api/customer-requests                - Place order
GET    /api/customer-requests                - Get customer orders
GET    /api/customer-requests/:id            - Get order details
PUT    /api/customer-requests/:id/status     - Update order status
```

#### Wholesaler Routes (`/api/wholesaler`)
```
GET    /api/wholesaler/inventory             - Get wholesaler inventory
POST   /api/wholesaler/inventory             - Add bulk item
GET    /api/wholesaler/orders                - Get retailer orders
PUT    /api/wholesaler/orders/:id/status     - Update order status
GET    /api/wholesaler/analytics             - Get demand analytics
POST   /api/wholesaler/offers                - Create special offer
```

#### Notifications Routes (`/api/notifications`)
```
GET    /api/notifications          - Get user notifications
PUT    /api/notifications/:id/read - Mark as read
DELETE /api/notifications/:id      - Delete notification
POST   /api/notifications/read-all - Mark all as read
```

---

### 3.2 API Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "timestamp": "2026-02-10T10:30:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-02-10T10:30:00Z"
}
```

---

## 4. Frontend Architecture

### 4.1 Component Structure

```
src/
├── components/
│   ├── Sidebar.jsx              - Navigation sidebar
│   ├── NotificationBell.jsx     - Notification dropdown
│   ├── ProtectedRoute.jsx       - Auth guard
│   └── LoadingSpinner.jsx       - Loading indicator
├── pages/
│   ├── Dashboard.jsx            - Retailer dashboard
│   ├── Inventory.jsx            - Inventory management
│   ├── Sales.jsx                - Sales management
│   ├── Expenses.jsx             - Expense tracking
│   ├── AIInsights.jsx           - AI insights page
│   ├── Customers.jsx            - Customer management
│   ├── LoginNew.jsx             - Login page
│   ├── RegisterNew.jsx          - Registration page
│   ├── ProfileSettings.jsx      - User profile
│   ├── WholesalerDashboard.jsx  - Wholesaler dashboard
│   ├── WholesalerInventory.jsx  - Bulk inventory
│   ├── WholesalerOrders.jsx     - Order management
│   └── WholesalerDiscovery.jsx  - Find wholesalers
├── contexts/
│   └── AuthContext.jsx          - Authentication context
├── services/
│   └── api.js                   - API service layer
├── utils/
│   └── helpers.js               - Utility functions
├── App.jsx                      - Main app component
└── index.css                    - Global styles
```

### 4.2 State Management

**Context API Usage:**
- `AuthContext` - User authentication state
- Global state managed via React Hooks
- Local component state for UI interactions

### 4.3 Routing Structure

```javascript
/                          → Landing Page
/login                     → Login
/register                  → Registration
/dashboard                 → Retailer Dashboard
/inventory                 → Inventory Management
/sales                     → Sales Management
/expenses                  → Expense Tracking
/ai-insights               → AI Insights
/customers                 → Customer Management
/profile                   → Profile Settings
/wholesaler/dashboard      → Wholesaler Dashboard
/wholesaler/inventory      → Wholesaler Inventory
/wholesaler/orders         → Wholesaler Orders
/wholesaler/discovery      → Find Wholesalers
```

---

## 5. Backend Architecture

### 5.1 Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                - Database connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── inventoryController.js
│   │   ├── salesController.js
│   │   ├── expensesController.js
│   │   ├── aiInsightsController.js
│   │   ├── chatbotController.js
│   │   └── wholesalerController.js
│   ├── middleware/
│   │   ├── auth.js              - JWT authentication
│   │   ├── validation.js        - Input validation
│   │   └── rateLimiter.js       - Rate limiting
│   ├── models/
│   │   ├── User.js
│   │   ├── Inventory.js
│   │   ├── Sale.js
│   │   ├── Expense.js
│   │   ├── CustomerRequest.js
│   │   └── WholesalerOrder.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── salesRoutes.js
│   │   ├── expensesRoutes.js
│   │   ├── aiInsightsRoutes.js
│   │   ├── chatbotRoutes.js
│   │   └── wholesalerRoutes.js
│   ├── services/
│   │   ├── geminiService.js     - OpenAI integration
│   │   ├── ttsService.js        - Text-to-speech
│   │   ├── multilingualService.js
│   │   └── festivalForecastService.js
│   └── server.js                - Express app setup
├── .env                         - Environment variables
├── .env.example                 - Example env file
└── package.json
```

### 5.2 Middleware Chain

```
Request → CORS → Body Parser → Rate Limiter → 
JWT Auth → Input Validation → Controller → Response
```

---

## 6. AI Integration Design

### 6.1 AI Insights Generation Flow

```
User Request
    ↓
Fetch Business Data (Sales, Inventory, Expenses)
    ↓
Build Context-Rich Prompt
    ↓
Send to OpenAI API (GPT-4o-mini)
    ↓
Parse Structured Response
    ↓
Format with Visual Indicators
    ↓
Return to Frontend
```

### 6.2 AI Prompt Structure

```
System Role: Business Analytics AI Assistant

Context:
- Sales Data (last 30 days)
- Inventory Data (current stock)
- Expense Data (last 90 days)
- Expiring Items (within 30 days)
- Seasonal Context (Indian festivals, weather)

Required Output Format:
## 🎯 Quick Actions
- Action 1
- Action 2
- Action 3

## 💰 Visual Summary
- Metric 1
- Metric 2

## 💡 Strategic Recommendations
1. Recommendation 1
2. Recommendation 2

## 📊 Detailed Analysis
- Analysis details
```

### 6.3 Chatbot Conversation Flow

```
User Input (Voice/Text)
    ↓
Speech-to-Text (if voice)
    ↓
Intent Detection
    ↓
Context Building (User data, Inventory)
    ↓
AI Response Generation
    ↓
Text-to-Speech (if voice enabled)
    ↓
Return Response
```

---

## 7. Security Design

### 7.1 Authentication Flow

```
1. User submits credentials
2. Server validates credentials
3. Server generates JWT token (expires in 24h)
4. Token sent to client
5. Client stores token in localStorage
6. Client includes token in Authorization header
7. Server validates token on each request
8. Server checks token expiry
9. If expired, client refreshes token
```

### 7.2 Password Security

- **Hashing Algorithm:** bcrypt with salt rounds = 10
- **Password Requirements:**
  - Minimum 6 characters
  - Mix of letters and numbers recommended
- **Password Reset:**
  - Token-based reset link
  - Token expires in 1 hour
  - One-time use token

### 7.3 API Security

- **Rate Limiting:**
  - Login: 5 attempts per 15 minutes
  - Registration: 3 attempts per hour
  - Password Reset: 3 attempts per hour
  - General API: 100 requests per 15 minutes

- **Input Validation:**
  - All inputs sanitized
  - SQL injection prevention
  - XSS prevention
  - CSRF protection

---

## 8. Performance Optimization

### 8.1 Frontend Optimization

- **Code Splitting:** React.lazy() for route-based splitting
- **Image Optimization:** Lazy loading, WebP format
- **Caching:** Service workers for offline support
- **Minification:** Production builds minified
- **CDN:** Static assets served via CDN

### 8.2 Backend Optimization

- **Database Indexing:** All frequently queried fields indexed
- **Query Optimization:** Lean queries, projection
- **Caching:** Redis for session management (future)
- **Connection Pooling:** MongoDB connection pool
- **Compression:** Gzip compression enabled

### 8.3 API Optimization

- **Pagination:** Default limit of 100 items
- **Field Selection:** Only required fields returned
- **Batch Operations:** Bulk insert/update support
- **Response Compression:** JSON responses compressed

---

## 9. Error Handling

### 9.1 Error Types

```javascript
// Validation Error
{
  code: 'VALIDATION_ERROR',
  message: 'Invalid input data',
  errors: [{ field: 'email', message: 'Invalid email format' }]
}

// Authentication Error
{
  code: 'AUTH_ERROR',
  message: 'Invalid credentials'
}

// Authorization Error
{
  code: 'FORBIDDEN',
  message: 'Access denied'
}

// Not Found Error
{
  code: 'NOT_FOUND',
  message: 'Resource not found'
}

// Server Error
{
  code: 'SERVER_ERROR',
  message: 'Internal server error'
}
```

### 9.2 Error Logging

- All errors logged to console (development)
- Error stack traces captured
- User-friendly messages returned to client
- Sensitive data never logged

---

## 10. Deployment Architecture

### 10.1 Production Environment

```
┌─────────────────────────────────────────┐
│         Frontend (Vercel/Netlify)       │
│         - React Build                   │
│         - CDN Distribution              │
└─────────────────────────────────────────┘
                    ↓ HTTPS
┌─────────────────────────────────────────┐
│         Backend (Render/Railway)        │
│         - Node.js Server                │
│         - Environment Variables         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Database (MongoDB Atlas)        │
│         - Replica Set                   │
│         - Automated Backups             │
└─────────────────────────────────────────┘
```

### 10.2 Environment Variables

```bash
# Production
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong_random_secret
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://biznova.com

# Development
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/biznova
JWT_SECRET=dev_secret
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:3000
```

---

## 11. Testing Strategy

### 11.1 Unit Testing
- Test individual functions
- Mock external dependencies
- Coverage target: 80%

### 11.2 Integration Testing
- Test API endpoints
- Test database operations
- Test authentication flow

### 11.3 E2E Testing
- Test complete user flows
- Test critical paths
- Automated browser testing

---

## 12. Monitoring & Logging

### 12.1 Application Monitoring
- Server uptime monitoring
- API response time tracking
- Error rate monitoring
- Database performance monitoring

### 12.2 Logging Strategy
- Request/Response logging
- Error logging with stack traces
- User activity logging
- Performance metrics logging

---

## 13. Scalability Considerations

### 13.1 Horizontal Scaling
- Stateless backend design
- Load balancer support
- Session management via JWT

### 13.2 Database Scaling
- MongoDB sharding support
- Read replicas for analytics
- Index optimization

### 13.3 Caching Strategy
- API response caching
- Static asset caching
- Database query caching

---

## 14. Accessibility

### 14.1 WCAG Compliance
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support

### 14.2 Responsive Design
- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch-friendly UI elements

---

## 15. Internationalization

### 15.1 Supported Languages
- English (en)
- Hindi (hi)
- Telugu (te)

### 15.2 i18n Implementation
- React i18next library
- JSON translation files
- Dynamic language switching
- RTL support (future)

---

**Document Version:** 1.0  
**Last Updated:** February 10, 2026  
**Status:** Approved
