# BizNova API Documentation

## Overview
Complete REST API documentation for BizNova - AI-Powered MSME Business Assistant.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "password": "password123",
  "shop_name": "Rajesh General Store",
  "language": "Hindi",
  "upi_id": "rajesh@paytm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "Rajesh Kumar",
      "phone": "9876543210",
      "shop_name": "Rajesh General Store",
      "language": "Hindi",
      "upi_id": "rajesh@paytm"
    },
    "token": "jwt_token_here"
  }
}
```

### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "phone": "9876543210",
  "password": "password123"
}
```

### Get Profile
```http
GET /api/auth/profile
```
*Requires Authentication*

### Update Profile
```http
PUT /api/auth/profile
```
*Requires Authentication*

---

## 👥 Users Endpoints

### Get All Users
```http
GET /api/users
```
*Requires Authentication*

### Get User by ID
```http
GET /api/users/:id
```
*Requires Authentication*

### Update User
```http
PUT /api/users/:id
```
*Requires Authentication*

### Delete User
```http
DELETE /api/users/:id
```
*Requires Authentication*

---

## 💰 Sales Endpoints

### Get All Sales
```http
GET /api/sales?page=1&limit=10&payment_method=Cash&start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

### Get Sale by ID
```http
GET /api/sales/:id
```
*Requires Authentication*

### Create Sale
```http
POST /api/sales
```
*Requires Authentication*

**Request Body:**
```json
{
  "items": [
    {
      "item_name": "Rice (1kg)",
      "quantity": 2,
      "price_per_unit": 50
    }
  ],
  "payment_method": "Cash",
  "date": "2024-01-15T10:30:00Z"
}
```

### Update Sale
```http
PUT /api/sales/:id
```
*Requires Authentication*

### Delete Sale
```http
DELETE /api/sales/:id
```
*Requires Authentication*

### Get Sales Analytics
```http
GET /api/sales/analytics?start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

---

## 💸 Expenses Endpoints

### Get All Expenses
```http
GET /api/expenses?page=1&limit=10&category=Rent&start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

### Get Expense by ID
```http
GET /api/expenses/:id
```
*Requires Authentication*

### Create Expense
```http
POST /api/expenses
```
*Requires Authentication*

**Request Body:**
```json
{
  "amount": 5000,
  "description": "Shop rent for January",
  "category": "Rent",
  "date": "2024-01-01T00:00:00Z"
}
```

### Update Expense
```http
PUT /api/expenses/:id
```
*Requires Authentication*

### Delete Expense
```http
DELETE /api/expenses/:id
```
*Requires Authentication*

### Get Expense Analytics
```http
GET /api/expenses/analytics?start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

---

## 📦 Inventory Endpoints

### Get All Inventory
```http
GET /api/inventory?page=1&limit=10&search=rice&low_stock=true
```
*Requires Authentication*

### Get Inventory Item by ID
```http
GET /api/inventory/:id
```
*Requires Authentication*

### Create Inventory Item
```http
POST /api/inventory
```
*Requires Authentication*

**Request Body:**
```json
{
  "item_name": "Rice (1kg)",
  "stock_qty": 50,
  "price_per_unit": 50
}
```

### Update Inventory Item
```http
PUT /api/inventory/:id
```
*Requires Authentication*

### Delete Inventory Item
```http
DELETE /api/inventory/:id
```
*Requires Authentication*

### Get Low Stock Items
```http
GET /api/inventory/low-stock?threshold=5
```
*Requires Authentication*

### Get Inventory Analytics
```http
GET /api/inventory/analytics
```
*Requires Authentication*

---

## 👤 Customers Endpoints

### Get All Customers
```http
GET /api/customers?page=1&limit=10&search=rajesh
```
*Requires Authentication*

### Get Customer by ID
```http
GET /api/customers/:id
```
*Requires Authentication*

### Create Customer
```http
POST /api/customers
```
*Requires Authentication*

**Request Body:**
```json
{
  "name": "Amit Singh",
  "phone": "9876543212",
  "credit_balance": 500
}
```

### Update Customer
```http
PUT /api/customers/:id
```
*Requires Authentication*

### Delete Customer
```http
DELETE /api/customers/:id
```
*Requires Authentication*

### Get Customer Analytics
```http
GET /api/customers/analytics?start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

---

## 🤖 AI Insights Endpoints

### Get All AI Insights
```http
GET /api/ai-insights?page=1&limit=10&type=sales_analysis
```
*Requires Authentication*

### Get AI Insight by ID
```http
GET /api/ai-insights/:id
```
*Requires Authentication*

### Create AI Insight
```http
POST /api/ai-insights
```
*Requires Authentication*

**Request Body:**
```json
{
  "summary_text": "Your sales have increased by 15% this month",
  "insights_data": {
    "type": "sales_analysis",
    "metrics": {
      "sales_growth": 15,
      "top_items": ["Rice", "Dal"]
    }
  }
}
```

### Update AI Insight
```http
PUT /api/ai-insights/:id
```
*Requires Authentication*

### Delete AI Insight
```http
DELETE /api/ai-insights/:id
```
*Requires Authentication*

### Get Latest AI Insights
```http
GET /api/ai-insights/latest?limit=5
```
*Requires Authentication*

---

## 💬 Messages Endpoints

### Get All Messages
```http
GET /api/messages?page=1&limit=20&direction=in&start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

### Get Message by ID
```http
GET /api/messages/:id
```
*Requires Authentication*

### Create Message
```http
POST /api/messages
```
*Requires Authentication*

**Request Body:**
```json
{
  "direction": "out",
  "content": "Hello, how can I help you?",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Update Message
```http
PUT /api/messages/:id
```
*Requires Authentication*

### Delete Message
```http
DELETE /api/messages/:id
```
*Requires Authentication*

### Get Recent Messages
```http
GET /api/messages/recent?limit=10
```
*Requires Authentication*

### Get Message Analytics
```http
GET /api/messages/analytics?start_date=2024-01-01&end_date=2024-01-31
```
*Requires Authentication*

---

## 🧪 Testing

### Health Check
```http
GET /api/health
```

### Run Sample Data Seeder
```bash
cd backend
npm run seed
```

### Run API Tests
```bash
cd backend
npm run test
```

---

## 📊 Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... } // For paginated endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/biznova
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
OPENAI_API_KEY=your_openai_api_key_here
WHATSAPP_API_TOKEN=your_whatsapp_api_token_here
```

---

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup Environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB:**
   ```bash
   # Make sure MongoDB is running on your system
   ```

4. **Seed Sample Data:**
   ```bash
   npm run seed
   ```

5. **Start Server:**
   ```bash
   npm run dev
   ```

6. **Test API:**
   ```bash
   npm run test
   ```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Phone numbers must be valid Indian phone numbers (10 digits starting with 6-9)
- Passwords are automatically hashed using bcrypt
- JWT tokens expire in 7 days
- All protected routes require valid JWT token
- Pagination is available for list endpoints (page, limit parameters)
- Date filtering is available for analytics endpoints (start_date, end_date parameters)

---

## 🔮 Future Enhancements (Phase 3-6)

- **Phase 3:** GPT-4o integration for AI insights
- **Phase 4:** WhatsApp API integration for customer communication
- **Phase 5:** Advanced analytics and reporting
- **Phase 6:** Mobile app and deployment optimization
