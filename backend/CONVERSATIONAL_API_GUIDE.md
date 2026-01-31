# Conversational AI Assistant - API Guide

## Overview
The AI Assistant supports natural language voice and text input to perform database operations for **Sales**, **Expenses**, and **Inventory** with built-in confirmation flow.

---

## 🎯 Supported Actions

### 1. **Add Sale**
Record sales transactions with automatic inventory deduction.

### 2. **Add Expense**  
Track business expenses by category.

### 3. **Update Inventory**
Modify existing inventory stock levels or prices.

### 4. **Add Inventory**
Create new inventory items.

---

## 🔄 Complete Flow (Voice + Text)

### Step 1: Voice Transcription (Optional)
If user provides audio input:

**Endpoint:** `POST /api/chatbot/stt`

**Request:**
```json
{
  "audioData": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKED...",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Add 5 Pepsi bottles sold for ₹150",
    "language": "en"
  }
}
```

### Step 2: Parse Intent
Send transcribed text (or direct text input) to AI for interpretation.

**Endpoint:** `POST /api/conversational/parse`

**Request:**
```json
{
  "message": "Add 5 Pepsi bottles sold for ₹150",
  "language": "en"
}
```

**Response (Action Detected):**
```json
{
  "success": true,
  "data": {
    "isAction": true,
    "confirmationId": "6543210abcdef_1698765432000",
    "actionType": "add_sale",
    "data": {
      "items": [
        {
          "item_name": "Pepsi",
          "quantity": 5,
          "price_per_unit": 30
        }
      ],
      "payment_method": "Cash"
    },
    "confirmationMessage": "You want to record a sale:\n• 5x Pepsi @ ₹30 = ₹150\nTotal: ₹150\nPayment: Cash\n\nShould I add this sale to your records?",
    "confidence": 0.95
  }
}
```

**Response (Question/Query Detected):**
```json
{
  "success": true,
  "data": {
    "isAction": false,
    "reason": "This is a query/question, not a database action"
  }
}
```

### Step 3: User Confirmation
User responds with "yes", "ok", "confirm" (to proceed) or "no", "cancel" (to abort).

### Step 4: Execute Action
After user confirms, execute the action.

**Endpoint:** `POST /api/conversational/execute`

**Request:**
```json
{
  "confirmationId": "6543210abcdef_1698765432000",
  "confirmed": true,
  "language": "en"
}
```

**Response (Success):**
```json
{
  "success": true,
  "executed": true,
  "actionType": "add_sale",
  "result": {
    "saleId": "6543210abcdef1234567890",
    "totalAmount": 150
  },
  "message": "✅ Sale recorded successfully! Total: ₹150"
}
```

**Response (Cancelled):**
```json
{
  "success": true,
  "cancelled": true,
  "message": "Okay, I cancelled that action."
}
```

---

## 📝 Action Examples

### Add Sale
**User Input:**
- "Record 5 Pepsi sold for ₹150"
- "Sold 2 books at ₹500 each to Rahul via UPI"
- "3 Milk bottles sold, ₹60 each"

**AI Extracts:**
```json
{
  "actionType": "add_sale",
  "data": {
    "items": [
      {"item_name": "Pepsi", "quantity": 5, "price_per_unit": 30}
    ],
    "payment_method": "Cash",
    "customer_name": "Walk-in Customer"
  }
}
```

**DB Operation:**
- Creates sale record in `sales` collection
- Deducts inventory quantities
- Calculates total amount, COGS, and profit

---

### Add Expense
**User Input:**
- "Add ₹1200 electricity bill"
- "Paid ₹5000 for shop rent"
- "₹2500 spent on marketing"

**AI Extracts:**
```json
{
  "actionType": "add_expense",
  "data": {
    "amount": 1200,
    "description": "electricity bill",
    "category": "Electricity"
  }
}
```

**DB Operation:**
- Creates expense record in `expenses` collection
- Categorizes for analytics

---

### Update Inventory
**User Input:**
- "Update stock: 10 Biscuits added"
- "Received 50 Pepsi bottles"
- "Reduce Milk by 5"
- "Update Chips price to ₹20"

**AI Extracts:**
```json
{
  "actionType": "update_inventory",
  "data": {
    "item_name": "Biscuits",
    "stock_qty": 10,
    "price_per_unit": 20
  }
}
```

**DB Operation:**
- Finds existing inventory item
- Updates stock quantity (incremental)
- Optionally updates price

---

### Add Inventory
**User Input:**
- "Add new item: Chocolate, 100 pieces, ₹50 each"
- "New product: Soap bars, 200 units, ₹30, category Toiletries"

**AI Extracts:**
```json
{
  "actionType": "add_inventory",
  "data": {
    "item_name": "Chocolate",
    "stock_qty": 100,
    "price_per_unit": 50,
    "category": "Other"
  }
}
```

**DB Operation:**
- Creates new inventory item
- Sets initial stock and price

---

## 🌐 Multilingual Support

### Supported Languages
- **English** (`en`)
- **Hindi** (`hi`)
- **Telugu** (`te`)

### Examples in Hindi
**Input:** "5 Pepsi बेचे ₹150 में"
**Confirmation:** "आप एक बिक्री दर्ज करना चाहते हैं:\n• 5x Pepsi @ ₹30 = ₹150\nकुल: ₹150\nभुगतान: नकद\n\nक्या मैं यह बिक्री जोड़ दूं?"
**Success:** "✅ बिक्री सफलतापूर्वक दर्ज की गई! कुल: ₹150"

### Examples in Telugu
**Input:** "5 Pepsi అమ్మాను ₹150 కు"
**Confirmation:** "మీరు ఒక అమ్మకాన్ని రికార్డ్ చేయాలనుకుంటున్నారు:\n• 5x Pepsi @ ₹30 = ₹150\nమొత్తం: ₹150\nచెల్లింపు: నగదు\n\nనేను ఈ అమ్మకాన్ని జోడించాలా?"
**Success:** "✅ అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది! మొత్తం: ₹150"

---

## 🔐 Authentication
All endpoints require authentication via JWT token.

**Header:**
```
Authorization: Bearer <your_jwt_token>
```

---

## ⚠️ Error Handling

### Invalid Confirmation ID
```json
{
  "success": false,
  "message": "No pending action found. Please try again."
}
```

### Insufficient Stock
```json
{
  "success": false,
  "message": "Failed to execute action",
  "error": "Insufficient stock for \"Pepsi\". Available: 3, Requested: 5"
}
```

### Item Not Found
```json
{
  "success": false,
  "message": "Failed to execute action",
  "error": "Item \"Chocolate\" not found in inventory"
}
```

---

## 🧪 Testing Examples

### Test 1: Add Sale
```bash
# Parse intent
curl -X POST http://localhost:5000/api/conversational/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Sold 10 Pepsi for ₹300", "language": "en"}'

# Execute (using confirmationId from previous response)
curl -X POST http://localhost:5000/api/conversational/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmationId": "USER_ID_TIMESTAMP", "confirmed": true}'
```

### Test 2: Add Expense
```bash
curl -X POST http://localhost:5000/api/conversational/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Add ₹5000 rent expense", "language": "en"}'
```

### Test 3: Update Inventory
```bash
curl -X POST http://localhost:5000/api/conversational/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Received 50 Milk bottles", "language": "en"}'
```

---

## 📊 DB Schema Mappings

### Sales Collection
```javascript
{
  user_id: ObjectId,
  items: [
    {
      item_name: String,
      quantity: Number,
      price_per_unit: Number,  // Selling price
      cost_per_unit: Number    // Cost from inventory (COGS)
    }
  ],
  payment_method: String,
  customer_name: String,
  date: Date,
  total_amount: Number,     // Auto-calculated
  total_cogs: Number,       // Auto-calculated
  gross_profit: Number      // Auto-calculated
}
```

### Expenses Collection
```javascript
{
  user_id: ObjectId,
  amount: Number,
  description: String,
  category: String,
  date: Date
}
```

### Inventory Collection
```javascript
{
  user_id: ObjectId,
  item_name: String,
  stock_qty: Number,
  price_per_unit: Number,  // Cost price (COGS)
  category: String,
  min_stock_level: Number
}
```

---

## 🚀 Integration Tips

1. **Voice Recording:**
   - Use `MediaRecorder` API in browser
   - Convert to base64 before sending to `/api/chatbot/stt`

2. **Confirmation UI:**
   - Display `confirmationMessage` to user
   - Show "Confirm" and "Cancel" buttons
   - Send appropriate response to `/api/conversational/execute`

3. **Error Handling:**
   - Always check `isAction` field in parse response
   - If `false`, route to chatbot `/api/chatbot/chat` for Q&A
   - Handle edge cases (item not found, insufficient stock)

4. **Pending Confirmations:**
   - Confirmations expire after 5 minutes
   - Store confirmationId in frontend state
   - Clear state after execution

---

## 🔧 Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

---

## 📞 Support

For issues or questions, refer to the main BizNova documentation or contact the development team.
