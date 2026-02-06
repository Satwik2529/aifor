# BizNova - Complete Tech Stack Documentation

## 🏗️ Architecture Overview

**Type:** MERN Stack (MongoDB, Express.js, React.js, Node.js)  
**Pattern:** RESTful API with JWT Authentication  
**Deployment:** Render (Backend + Frontend)

---

## 🎨 Frontend Technologies

### Core Framework
- **React.js 18.2.0**
  - Purpose: UI library for building interactive user interfaces
  - Why: Component-based architecture, virtual DOM for performance, large ecosystem
  - Used for: All pages, components, and user interactions

- **React Router DOM 6.8.1**
  - Purpose: Client-side routing and navigation
  - Why: Declarative routing, nested routes, URL parameter handling
  - Used for: Page navigation (Dashboard, Inventory, Sales, Customer pages)

### Styling & UI
- **Tailwind CSS 3.3.6**
  - Purpose: Utility-first CSS framework
  - Why: Rapid UI development, consistent design system, responsive by default
  - Used for: All component styling, dark mode, responsive layouts

- **Lucide React 0.294.0**
  - Purpose: Icon library
  - Why: Modern, customizable SVG icons, tree-shakeable
  - Used for: UI icons (Plus, Search, Filter, Download, Edit, Trash, etc.)

- **PostCSS 8.4.32 + Autoprefixer 10.4.16**
  - Purpose: CSS processing and vendor prefixing
  - Why: Browser compatibility, CSS transformations
  - Used for: Processing Tailwind CSS, adding vendor prefixes

### State Management & Data Fetching
- **Axios 1.6.2**
  - Purpose: HTTP client for API requests
  - Why: Promise-based, interceptors, automatic JSON transformation
  - Used for: All API calls to backend (auth, inventory, sales, customers)

- **React Context API**
  - Purpose: Global state management
  - Why: Built-in, no extra dependencies, simple for auth state
  - Used for: AuthContext (user authentication), ThemeContext (dark mode)

### User Experience
- **React Hot Toast 2.6.0**
  - Purpose: Toast notifications
  - Why: Lightweight, customizable, supports dark mode
  - Used for: Success/error messages, user feedback

- **i18next 23.7.0 + React-i18next 14.0.0**
  - Purpose: Internationalization (i18n)
  - Why: Multi-language support, dynamic translations
  - Used for: English, Hindi, Telugu language support
  - Plugins:
    - `i18next-browser-languagedetector`: Auto-detect user language
    - `i18next-http-backend`: Load translations from JSON files

### Data Visualization
- **Recharts 2.8.0**
  - Purpose: Chart library for React
  - Why: Composable, responsive, built on D3.js
  - Used for: Analytics dashboard, profit charts, sales trends

### Document Generation
- **html2pdf.js 0.12.1**
  - Purpose: Generate PDF from HTML
  - Why: Client-side PDF generation, no server dependency
  - Used for: Invoice generation, sales reports, inventory reports

### Content Rendering
- **React Markdown 10.1.0**
  - Purpose: Render markdown content
  - Why: Safe HTML rendering, customizable
  - Used for: AI chatbot responses, formatted text display

### Build Tools
- **React Scripts 5.0.1**
  - Purpose: Create React App build configuration
  - Why: Zero-config setup, webpack abstraction
  - Used for: Development server, production builds, testing

---

## ⚙️ Backend Technologies

### Core Framework
- **Node.js**
  - Purpose: JavaScript runtime
  - Why: Non-blocking I/O, event-driven, JavaScript everywhere
  - Used for: Server-side application runtime

- **Express.js 4.18.2**
  - Purpose: Web application framework
  - Why: Minimalist, flexible, middleware support
  - Used for: RESTful API, routing, middleware chain

### Database
- **MongoDB (Cloud - MongoDB Atlas)**
  - Purpose: NoSQL database
  - Why: Flexible schema, JSON-like documents, scalability
  - Used for: Storing users, inventory, sales, customers, requests

- **Mongoose 8.0.3**
  - Purpose: MongoDB ODM (Object Data Modeling)
  - Why: Schema validation, middleware, query building
  - Used for: Data models, validation, relationships

### Authentication & Security
- **JSON Web Token (jsonwebtoken 9.0.2)**
  - Purpose: Token-based authentication
  - Why: Stateless, secure, scalable
  - Used for: User authentication, API authorization

- **bcryptjs 2.4.3**
  - Purpose: Password hashing
  - Why: Secure password storage, salt rounds
  - Used for: Hashing user passwords, password verification

- **CORS 2.8.5**
  - Purpose: Cross-Origin Resource Sharing
  - Why: Allow frontend to communicate with backend
  - Used for: Enabling cross-origin requests from React app

### Validation
- **Express Validator 7.0.1**
  - Purpose: Request validation middleware
  - Why: Sanitization, validation rules, error handling
  - Used for: Validating API inputs (inventory, sales, customer requests)
  - Examples:
    - Email validation
    - Phone number validation
    - Quantity validation (fractional support)
    - Price validation

### AI & Machine Learning
- **Google Generative AI (@google/generative-ai 0.24.1)**
  - Purpose: AI-powered features
  - Why: Free tier, powerful models, easy integration
  - Used for:
    - **Gemini 2.5 Flash**: Conversational AI chatbot
    - **Bill Scanning**: Extract items from bill images
    - **Inventory Recognition**: Identify items from images
    - **AI Insights**: Business analytics and recommendations
  - Models Used:
    - `gemini-2.5-flash`: Current stable model for all AI features

### File Upload
- **Multer 2.0.2**
  - Purpose: Multipart/form-data handling
  - Why: File upload middleware, disk storage
  - Used for: Bill image uploads, inventory image uploads

### Email Service
- **Nodemailer 6.9.7**
  - Purpose: Email sending
  - Why: SMTP support, template support
  - Used for: Password reset emails, notifications
  - Configuration: Gmail SMTP

### Utilities
- **dotenv 16.3.1**
  - Purpose: Environment variable management
  - Why: Secure configuration, separate dev/prod settings
  - Used for: API keys, database URLs, JWT secrets

- **body-parser 1.20.2**
  - Purpose: Parse incoming request bodies
  - Why: JSON parsing, URL-encoded data
  - Used for: Parsing API request payloads

- **express-async-handler 1.2.0**
  - Purpose: Async error handling
  - Why: Simplify try-catch in async routes
  - Used for: Cleaner async route handlers

### Development Tools
- **Nodemon 3.0.2**
  - Purpose: Auto-restart server on file changes
  - Why: Development productivity
  - Used for: Development mode (`npm run dev`)

---

## 🗄️ Database Schema

### Collections
1. **Users** (Retailers)
   - Authentication, shop details, UPI info
   - Fields: name, phone, password, shop_name, upi_id, language

2. **CustomerUsers** (Customers)
   - Customer authentication and profiles
   - Fields: name, phone, password, address

3. **Inventory**
   - Product stock management
   - Fields: item_name, stock_qty, cost_price, selling_price, unit, category
   - **Supports fractional quantities** (0.001 minimum)

4. **Sales**
   - Sales transactions
   - Fields: items[], total_amount, total_cogs, gross_profit, payment_method
   - **Supports fractional quantities**

5. **Expenses**
   - Business expenses tracking
   - Fields: amount, category, description, date

6. **Customers**
   - Customer contact information
   - Fields: name, phone, email, address

7. **CustomerRequests**
   - Customer orders to retailers
   - Fields: customer_id, retailer_id, items[], status, bill_details
   - **Supports fractional quantities**

8. **Messages**
   - Chat messages between customers and retailers
   - Fields: sender_id, receiver_id, message, timestamp

9. **Notifications**
   - User notifications
   - Fields: user_id, message, type, read_status

10. **AiInsights**
    - AI-generated business insights
    - Fields: user_id, summary_text, insights_data, generated_at

---

## 🔐 Authentication Flow

```
1. User Registration
   ↓
2. Password Hashing (bcryptjs)
   ↓
3. Store in MongoDB
   ↓
4. User Login
   ↓
5. Verify Password
   ↓
6. Generate JWT Token
   ↓
7. Send Token to Frontend
   ↓
8. Store in localStorage
   ↓
9. Include in API Headers
   ↓
10. Backend Verifies Token
```

---

## 🌐 API Architecture

### RESTful Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

**Inventory:**
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Add item (fractional qty)
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `POST /api/inventory/upload-image` - Image recognition
- `POST /api/inventory/scan-bill` - Bill scanning

**Sales:**
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale (fractional qty)
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale
- `GET /api/sales/today` - Today's sales

**Customers:**
- `GET /api/customers` - List customers
- `POST /api/customers` - Add customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

**Customer Requests:**
- `GET /api/customer-requests` - List requests
- `POST /api/customer-requests` - Create request (fractional qty)
- `PUT /api/customer-requests/:id` - Update request
- `GET /api/customer-requests/check-availability` - Check stock

**AI Features:**
- `POST /api/ai/chat` - Conversational AI
- `POST /api/ai/insights` - Generate insights
- `POST /api/ai/analyze-inventory` - Inventory analysis

---

## 🎯 Key Features & Technologies Used

### 1. Fractional Quantity System
**Technologies:**
- Express Validator: `.isFloat({ min: 0.001 })`
- Mongoose: `Number` type with min validation
- Custom Helper: `quantityHelper.js` for safe math

**Purpose:** Support selling items by weight (kg) or volume (litre)

### 2. Multi-language Support
**Technologies:**
- i18next + React-i18next
- JSON translation files (en, hi, te)
- Browser language detection

**Purpose:** Support Hindi, Telugu, English for Indian retailers

### 3. Dark Mode
**Technologies:**
- React Context API
- Tailwind CSS dark: classes
- localStorage persistence

**Purpose:** Better user experience, reduce eye strain

### 4. AI Chatbot
**Technologies:**
- Google Gemini 2.5 Flash
- Axios for API calls
- React Markdown for responses

**Purpose:** Conversational interface for inventory/sales management

### 5. Bill Scanning
**Technologies:**
- Google Gemini Vision API
- Multer for file upload
- Image processing

**Purpose:** Extract items from bill photos automatically

### 6. Real-time Notifications
**Technologies:**
- React Hot Toast
- Custom notification system
- MongoDB notifications collection

**Purpose:** User feedback, alerts, confirmations

### 7. Analytics Dashboard
**Technologies:**
- Recharts
- MongoDB aggregation
- Profit calculations

**Purpose:** Business insights, sales trends, profit analysis

### 8. PDF Generation
**Technologies:**
- html2pdf.js
- Custom invoice templates
- Client-side generation

**Purpose:** Invoices, reports, bills for customers

---

## 🚀 Deployment

### Frontend (Render)
- **Build Command:** `npm run build`
- **Start Command:** `npm run serve`
- **Environment:** Node.js
- **Static Files:** Served via Express

### Backend (Render)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node.js
- **Port:** 5000

### Database
- **MongoDB Atlas** (Cloud)
- **Connection:** Mongoose with connection pooling
- **Security:** IP whitelist, authentication

---

## 📦 Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret
GEMINI_API_KEY=your_key
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password
```

---

## 🔧 Development Tools

### Code Quality
- ESLint (React App config)
- Prettier (implicit via React Scripts)

### Testing
- Jest (via React Scripts)
- Custom API test scripts

### Version Control
- Git
- GitHub

---

## 📊 Performance Optimizations

1. **Frontend:**
   - Code splitting (React.lazy)
   - Virtual DOM (React)
   - Memoization (useMemo, useCallback)
   - Lazy loading images

2. **Backend:**
   - MongoDB indexing
   - Connection pooling
   - Async/await patterns
   - Middleware optimization

3. **Database:**
   - Indexed queries
   - Aggregation pipelines
   - Lean queries (Mongoose)

---

## 🔒 Security Features

1. **Authentication:**
   - JWT tokens
   - Password hashing (bcrypt)
   - Token expiration

2. **Validation:**
   - Input sanitization
   - Express Validator
   - Mongoose schema validation

3. **API Security:**
   - CORS configuration
   - Rate limiting (can be added)
   - Environment variables

4. **Data Protection:**
   - Encrypted passwords
   - Secure MongoDB connection
   - HTTPS (production)

---

## 📱 Responsive Design

**Technologies:**
- Tailwind CSS responsive utilities
- Mobile-first approach
- Flexbox and Grid layouts

**Breakpoints:**
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

---

## 🎨 Design System

**Colors:**
- Primary: Indigo (#4F46E5)
- Success: Green (#10B981)
- Error: Red (#EF4444)
- Warning: Yellow (#F59E0B)

**Typography:**
- Font: System fonts (Arial, sans-serif)
- Sizes: Tailwind scale (text-xs to text-4xl)

**Components:**
- Cards, Buttons, Forms, Modals
- Toast notifications
- Loading states
- Empty states

---

## 🚀 Future Tech Considerations

1. **State Management:** Redux Toolkit (if app grows)
2. **Real-time:** Socket.io (for live updates)
3. **Caching:** Redis (for performance)
4. **Testing:** Cypress (E2E testing)
5. **Monitoring:** Sentry (error tracking)
6. **Analytics:** Google Analytics
7. **Payment:** Razorpay/Stripe integration

---

## 📝 Summary

**Frontend Stack:** React + Tailwind + Axios + i18next  
**Backend Stack:** Node + Express + MongoDB + JWT  
**AI Stack:** Google Gemini 2.5 Flash  
**Deployment:** Render (Full-stack)  
**Special Features:** Fractional quantities, Multi-language, Dark mode, AI chatbot, Bill scanning

This is a modern, production-ready MERN stack application with AI capabilities! 🎉
