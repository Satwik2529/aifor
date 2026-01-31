# Biznova - Business Management System

## 🚀 Quick Start

### Installation
```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm start
```

### Default Ports
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

---

## 📋 Features

### 1. **Customer Request System**
- Customers can send product requests to retailers
- Real-time inventory checking (prevents ordering unavailable items)
- Status tracking: Pending → Processing → Billed → Completed/Cancelled
- Cancellation with reason (required field)

### 2. **Auto-Sync Workflow**
When retailer completes a request:
- ✅ Sales entry auto-created with payment method selection
- ✅ Inventory stock auto-deducted
- ✅ COGS calculated (with 70% fallback if no cost data)
- ✅ Gross profit computed automatically

### 3. **Core Modules**
- **Sales** - Record transactions, track revenue & profit
- **Inventory** - Stock management with low-stock alerts
- **Expenses** - Business expense tracking by category
- **Customers** - Customer database with credit management
- **Analytics** - Business insights and profit analysis
- **AI Assistant** - Voice/text commands for business tasks

---

## 🔑 Key Workflows

### Customer Order Flow
```
1. Customer selects retailer & adds items
2. System checks inventory availability (real-time)
3. Only available items can be submitted
4. Retailer processes: Pending → Processing → Billed
5. Retailer completes with payment method selection
6. System auto-creates Sale + deducts Inventory
```

### Validation Rules
- ❌ Cannot add items not in inventory
- ❌ Cannot add out-of-stock items (0 quantity)
- ❌ Cannot add items with insufficient stock
- ❌ Cannot complete without billing first
- ❌ Cannot cancel without reason

---

## 💾 Database Models

### Inventory
- `stock_qty` - Current quantity
- `price_per_unit` - Selling price
- `min_stock_level` - Alert threshold

### Sale
- `payment_method` - Cash/Card/UPI/Bank Transfer/Credit
- `total_cogs` - Cost of goods sold
- `gross_profit` - Revenue - COGS

### CustomerRequest
- `status` - pending/processing/billed/completed/cancelled
- `cancellation_reason` - Required for cancellations
- `sales_id` - Links to auto-created sale

---

## 🧪 Testing

### Test Auto-Sync
1. Login as customer → Create request with available item
2. Login as retailer → Generate bill → Mark as completed
3. Select payment method (Cash/UPI/Card/etc.)
4. Verify: Sales entry created, Inventory reduced, COGS calculated

### Test Validation
1. Try to add item not in inventory → Should be blocked
2. Try to add out-of-stock item → Should be blocked
3. Try to cancel without reason → Button disabled

---

## 📁 Project Structure

```
biznova/
├── backend/
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── controllers/    # Business logic
│   │   ├── routes/         # API endpoints
│   │   └── server.js       # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── App.js          # Main app
│   └── package.json
└── README.md
```

---

## 🔧 Environment Variables

Create `.env` in backend:
```env
MONGODB_URI=mongodb://localhost:27017/biznova
JWT_SECRET=your_secret_key
PORT=5000
```

Create `.env` in frontend:
```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 📞 Support

For issues or questions, check the codebase or review API endpoints in `backend/src/routes/`.

**System Status:** ✅ All features operational
