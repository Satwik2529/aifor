# BizNova - Requirements Document

## Project Overview

**Project Name:** BizNova  
**Version:** 1.0  
**Last Updated:** February 2026  
**Document Type:** Software Requirements Specification (SRS)

---

## 1. Introduction

### 1.1 Purpose
BizNova is an AI-powered business management platform designed to help small and medium-sized businesses in India manage their operations efficiently through voice-first, multilingual interactions.

### 1.2 Scope
The system provides comprehensive business management tools for three user types:
- **Retailers** - Manage inventory, sales, expenses, and get AI insights
- **Customers** - Voice-first shopping experience with AI assistance
- **Wholesalers** - Bulk inventory management and retailer order fulfillment

### 1.3 Target Audience
- Small retail shop owners in India
- Customers with varying digital literacy levels
- Wholesale distributors
- Users comfortable with English, Hindi, and Telugu

---

## 2. Functional Requirements

### 2.1 User Management

#### 2.1.1 Authentication & Authorization
- **FR-AUTH-001:** System shall support user registration with phone number and email
- **FR-AUTH-002:** System shall support three user roles: Customer, Retailer, Wholesaler
- **FR-AUTH-003:** System shall implement JWT-based authentication
- **FR-AUTH-004:** System shall support Google OAuth login
- **FR-AUTH-005:** System shall provide password reset functionality via email
- **FR-AUTH-006:** System shall enforce password complexity requirements
- **FR-AUTH-007:** System shall implement rate limiting on login attempts

#### 2.1.2 Profile Management
- **FR-PROFILE-001:** Users shall be able to update their profile information
- **FR-PROFILE-002:** Retailers shall be able to set shop name and location
- **FR-PROFILE-003:** Wholesalers shall be able to configure delivery radius
- **FR-PROFILE-004:** System shall support profile picture upload

---

### 2.2 Inventory Management (Retailers)

#### 2.2.1 Item Management
- **FR-INV-001:** System shall support adding inventory items with name, quantity, cost price, selling price
- **FR-INV-002:** System shall support fractional quantities (kg, litre, pieces)
- **FR-INV-003:** System shall provide unit conversion helpers (grams→kg, ml→litre)
- **FR-INV-004:** System shall calculate profit margin automatically
- **FR-INV-005:** System shall support 10 product categories
- **FR-INV-006:** System shall allow item description and image upload
- **FR-INV-007:** System shall support expiry date tracking for perishable items
- **FR-INV-008:** System shall validate selling price > cost price

#### 2.2.2 Stock Alerts
- **FR-INV-009:** System shall alert when stock falls below minimum level
- **FR-INV-010:** System shall show expiring items (within 30 days)
- **FR-INV-011:** System shall categorize expiry urgency (expired, 3 days, 7 days, 30 days)
- **FR-INV-012:** System shall suggest discounts for expiring items

#### 2.2.3 Bill Scanning
- **FR-INV-013:** System shall support wholesale bill image upload
- **FR-INV-014:** System shall extract items, quantities, and prices using AI
- **FR-INV-015:** System shall allow review and edit before adding to inventory
- **FR-INV-016:** System shall show confidence score for extracted data

---

### 2.3 Sales Management (Retailers)

#### 2.3.1 Sale Creation
- **FR-SALES-001:** System shall support multi-item sales
- **FR-SALES-002:** System shall support three payment methods (Cash, UPI, Credit)
- **FR-SALES-003:** System shall auto-fill item prices from inventory
- **FR-SALES-004:** System shall validate stock availability before sale
- **FR-SALES-005:** System shall calculate total amount automatically
- **FR-SALES-006:** System shall update inventory after successful sale
- **FR-SALES-007:** System shall support customer name and phone tracking

#### 2.3.2 Sale Management
- **FR-SALES-008:** System shall allow viewing sale details
- **FR-SALES-009:** System shall allow editing sales
- **FR-SALES-010:** System shall allow deleting sales with confirmation
- **FR-SALES-011:** System shall restore inventory on sale deletion
- **FR-SALES-012:** System shall generate PDF invoices for customers

#### 2.3.3 Sales Analytics
- **FR-SALES-013:** System shall show today's sales summary
- **FR-SALES-014:** System shall calculate average order value
- **FR-SALES-015:** System shall support filtering by date range (Today, Last 7 days, Last 30 days, This Month, Custom)
- **FR-SALES-016:** System shall support filtering by payment method
- **FR-SALES-017:** System shall export sales data to PDF

---

### 2.4 Expense Management (Retailers)

#### 2.4.1 Expense Tracking
- **FR-EXP-001:** System shall support adding expenses with amount, description, category
- **FR-EXP-002:** System shall categorize expenses as Sales or Operating
- **FR-EXP-003:** System shall support expense categories (Rent, Utilities, Salaries, etc.)
- **FR-EXP-004:** System shall allow editing and deleting expenses
- **FR-EXP-005:** System shall show monthly expense trends

#### 2.4.2 Expense Analytics
- **FR-EXP-006:** System shall calculate total expenses by category
- **FR-EXP-007:** System shall show expense breakdown (Sales vs Operating)
- **FR-EXP-008:** System shall export expense reports to PDF

---

### 2.5 AI-Powered Insights (Retailers)

#### 2.5.1 Demand Forecasting
- **FR-AI-001:** System shall analyze sales data to predict future demand
- **FR-AI-002:** System shall identify top-selling items
- **FR-AI-003:** System shall suggest reorder points based on sales velocity
- **FR-AI-004:** System shall detect sales trends (up/down)
- **FR-AI-005:** System shall recommend stock levels to prevent stockouts
- **FR-AI-006:** System shall include expiring items in recommendations

#### 2.5.2 Revenue Optimization
- **FR-AI-007:** System shall analyze pricing vs demand
- **FR-AI-008:** System shall identify high-margin products
- **FR-AI-009:** System shall suggest optimal price points
- **FR-AI-010:** System shall recommend product bundling strategies
- **FR-AI-011:** System shall advise on discount strategies

#### 2.5.3 Expense Forecasting
- **FR-AI-012:** System shall predict next month's expenses
- **FR-AI-013:** System shall consider seasonal factors (Indian festivals, monsoon, summer)
- **FR-AI-014:** System shall suggest cost optimization strategies
- **FR-AI-015:** System shall recommend monthly budgets by category

#### 2.5.4 Festival Forecasting
- **FR-AI-016:** System shall predict demand for upcoming Indian festivals
- **FR-AI-017:** System shall suggest items to stock based on festival type
- **FR-AI-018:** System shall provide confidence levels for recommendations
- **FR-AI-019:** System shall analyze historical sales for festival patterns

#### 2.5.5 AI Response Format
- **FR-AI-020:** All AI insights shall follow structured format:
  - 🎯 Quick Actions (3-5 immediate steps)
  - 💰 Visual Summary (key metrics)
  - 💡 Strategic Recommendations (3-4 insights)
  - 📊 Detailed Analysis
- **FR-AI-021:** System shall highlight urgent items with visual indicators
- **FR-AI-022:** System shall support PDF export of AI insights

---

### 2.6 Conversational AI Chatbot

#### 2.6.1 Retailer Chatbot
- **FR-CHAT-001:** System shall provide voice and text input
- **FR-CHAT-002:** System shall understand natural language queries about business
- **FR-CHAT-003:** System shall support multilingual input (English, Hindi, Telugu)
- **FR-CHAT-004:** System shall answer questions about sales, inventory, profit
- **FR-CHAT-005:** System shall provide voice output (text-to-speech)

#### 2.6.2 Customer Chatbot
- **FR-CHAT-006:** System shall understand cooking/recipe-based queries
- **FR-CHAT-007:** System shall suggest ingredients automatically
- **FR-CHAT-008:** System shall estimate quantities based on servings
- **FR-CHAT-009:** System shall check real-time inventory availability
- **FR-CHAT-010:** System shall build shopping cart from conversation
- **FR-CHAT-011:** System shall confirm order before placement

---

### 2.7 Customer Features

#### 2.7.1 Store Discovery
- **FR-CUST-001:** System shall show nearby stores based on location
- **FR-CUST-002:** System shall filter stores by locality/pincode
- **FR-CUST-003:** System shall show store details (name, location, items)
- **FR-CUST-004:** System shall support GPS-based location detection

#### 2.7.2 Order Management
- **FR-CUST-005:** System shall allow placing orders via chatbot
- **FR-CUST-006:** System shall show order summary before confirmation
- **FR-CUST-007:** System shall track order status
- **FR-CUST-008:** System shall show order history

---

### 2.8 Wholesaler Features

#### 2.8.1 Inventory Management
- **FR-WHOLE-001:** System shall support bulk inventory management
- **FR-WHOLE-002:** System shall set minimum order quantities
- **FR-WHOLE-003:** System shall configure bulk pricing tiers
- **FR-WHOLE-004:** System shall manage delivery radius

#### 2.8.2 Order Management
- **FR-WHOLE-005:** System shall receive orders from retailers
- **FR-WHOLE-006:** System shall support order lifecycle (Requested, Accepted, Packed, Dispatched, Delivered)
- **FR-WHOLE-007:** System shall send notifications on order status changes
- **FR-WHOLE-008:** System shall show order analytics

#### 2.8.3 Retailer Discovery
- **FR-WHOLE-009:** Retailers shall discover nearby wholesalers
- **FR-WHOLE-010:** System shall show wholesaler pricing and delivery time
- **FR-WHOLE-011:** System shall allow price comparison

---

### 2.9 Notifications

- **FR-NOTIF-001:** System shall send low stock alerts
- **FR-NOTIF-002:** System shall send expiry alerts
- **FR-NOTIF-003:** System shall send order status updates
- **FR-NOTIF-004:** System shall support in-app notifications
- **FR-NOTIF-005:** System shall mark notifications as read/unread

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **NFR-PERF-001:** System shall load pages within 2 seconds
- **NFR-PERF-002:** AI insights shall generate within 10 seconds
- **NFR-PERF-003:** System shall support 1000 concurrent users
- **NFR-PERF-004:** Database queries shall execute within 500ms

### 3.2 Security
- **NFR-SEC-001:** All passwords shall be hashed using bcrypt
- **NFR-SEC-002:** API endpoints shall be protected with JWT authentication
- **NFR-SEC-003:** System shall implement rate limiting on sensitive endpoints
- **NFR-SEC-004:** All data transmission shall use HTTPS
- **NFR-SEC-005:** Sensitive data shall not be logged
- **NFR-SEC-006:** System shall validate all user inputs

### 3.3 Usability
- **NFR-USE-001:** System shall support dark mode
- **NFR-USE-002:** System shall be mobile-responsive
- **NFR-USE-003:** System shall support voice input/output
- **NFR-USE-004:** System shall provide multilingual UI (English, Hindi, Telugu)
- **NFR-USE-005:** System shall be usable by users with minimal digital literacy

### 3.4 Reliability
- **NFR-REL-001:** System shall have 99% uptime
- **NFR-REL-002:** System shall handle errors gracefully
- **NFR-REL-003:** System shall provide meaningful error messages
- **NFR-REL-004:** System shall log all errors for debugging

### 3.5 Scalability
- **NFR-SCALE-001:** System shall support horizontal scaling
- **NFR-SCALE-002:** Database shall support sharding
- **NFR-SCALE-003:** System shall handle 10,000+ inventory items per user

### 3.6 Maintainability
- **NFR-MAINT-001:** Code shall follow consistent naming conventions
- **NFR-MAINT-002:** All functions shall have JSDoc comments
- **NFR-MAINT-003:** System shall have modular architecture
- **NFR-MAINT-004:** System shall use environment variables for configuration

---

## 4. Data Requirements

### 4.1 Data Models

#### User
- user_id, name, email, phone, password_hash, role, shop_name, locality, city, pincode, latitude, longitude, created_at, updated_at

#### Inventory
- inventory_id, user_id, item_name, stock_qty, unit, cost_price, selling_price, min_stock_level, category, description, expiry_date, created_at, updated_at

#### Sale
- sale_id, user_id, items[], total_amount, total_cogs, gross_profit, payment_method, customer_name, customer_phone, created_at, updated_at

#### Expense
- expense_id, user_id, amount, description, category, is_sales_expense, created_at, updated_at

#### Order (Customer → Retailer)
- order_id, customer_id, retailer_id, items[], total_amount, status, created_at, updated_at

#### WholesalerOrder (Retailer → Wholesaler)
- order_id, retailer_id, wholesaler_id, items[], total_amount, status, delivery_date, created_at, updated_at

---

## 5. Integration Requirements

### 5.1 External APIs
- **OpenAI API** - For AI insights generation
- **Google OAuth** - For social login
- **ElevenLabs API** - For text-to-speech
- **Deepgram API** - For speech-to-text
- **Google Vision API** - For bill scanning

### 5.2 Database
- **MongoDB Atlas** - Primary database
- **Mongoose ODM** - Database modeling

---

## 6. Constraints

### 6.1 Technical Constraints
- Must use Node.js for backend
- Must use React for frontend
- Must use MongoDB for database
- Must support modern browsers (Chrome, Firefox, Safari, Edge)

### 6.2 Business Constraints
- Must be free for users
- Must work offline for basic features
- Must support Indian languages
- Must handle Indian currency (₹)

---

## 7. Assumptions

- Users have internet connectivity
- Users have smartphones or computers
- Users can provide basic business data
- Retailers maintain accurate inventory records
- Wholesalers have reliable delivery systems

---

## 8. Future Enhancements

- WhatsApp integration for orders
- SMS notifications
- Barcode scanning
- Multi-store management
- Employee management
- Customer loyalty programs
- Payment gateway integration
- Accounting integration
- Tax calculation (GST)
- Supplier management

---

## 9. Acceptance Criteria

### 9.1 Retailer Module
- ✅ Can add/edit/delete inventory items
- ✅ Can record sales with multiple items
- ✅ Can track expenses
- ✅ Can view AI insights
- ✅ Receives low stock and expiry alerts
- ✅ Can export reports to PDF

### 9.2 Customer Module
- ✅ Can discover nearby stores
- ✅ Can chat with AI for shopping
- ✅ Can place orders
- ✅ Can track order status

### 9.3 Wholesaler Module
- ✅ Can manage bulk inventory
- ✅ Can receive and fulfill retailer orders
- ✅ Can view demand analytics

### 9.4 AI Module
- ✅ Generates insights within 10 seconds
- ✅ Provides actionable recommendations
- ✅ Considers seasonal factors
- ✅ Includes expiry-based suggestions

---

## 10. Glossary

- **COGS** - Cost of Goods Sold
- **SKU** - Stock Keeping Unit
- **JWT** - JSON Web Token
- **API** - Application Programming Interface
- **UI** - User Interface
- **UX** - User Experience
- **AI** - Artificial Intelligence
- **NLP** - Natural Language Processing
- **TTS** - Text-to-Speech
- **STT** - Speech-to-Text

---

**Document Version:** 1.0  
**Last Updated:** February 10, 2026  
**Status:** Approved
