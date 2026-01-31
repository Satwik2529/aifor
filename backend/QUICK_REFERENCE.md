# 🚀 AI Assistant - Quick Reference Card

## Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/chatbot/stt` | Convert voice to text |
| `POST` | `/api/conversational/parse` | Parse user intent |
| `POST` | `/api/conversational/execute` | Execute confirmed action |
| `POST` | `/api/chatbot/chat` | General Q&A chatbot |

---

## Flow Diagram

```
VOICE INPUT                    TEXT INPUT
    ↓                              ↓
[Record Audio]                [User types]
    ↓                              ↓
POST /api/chatbot/stt             │
    ↓                              ↓
[Transcribed Text] ────────────→ [Text]
                                   ↓
                    POST /api/conversational/parse
                                   ↓
                         [AI analyzes intent]
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓                             ↓
            [isAction: true]              [isAction: false]
                    ↓                             ↓
        [Show confirmation UI]          [Route to chatbot Q&A]
                    ↓
            [User confirms?]
                    ↓
        POST /api/conversational/execute
                    ↓
            [DB updated] → Success!
```

---

## Action Types

| Action Type | Description | DB Collection |
|-------------|-------------|---------------|
| `add_sale` | Record sales transaction | `sales` |
| `add_expense` | Add business expense | `expenses` |
| `update_inventory` | Modify stock/price | `inventory` |
| `add_inventory` | Create new item | `inventory` |

---

## Request/Response Examples

### 1. Voice Transcription

**Request:**
```json
POST /api/chatbot/stt
{
  "audioData": "data:audio/webm;base64,...",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Sold 5 Pepsi for ₹150",
    "language": "en"
  }
}
```

---

### 2. Parse Intent

**Request:**
```json
POST /api/conversational/parse
{
  "message": "Sold 5 Pepsi for ₹150",
  "language": "en"
}
```

**Response (Action):**
```json
{
  "success": true,
  "data": {
    "isAction": true,
    "actionType": "add_sale",
    "confirmationId": "abc123_1234567890",
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
    "confirmationMessage": "You want to record a sale:\n• 5x Pepsi @ ₹30 = ₹150\nTotal: ₹150\nPayment: Cash\n\nShould I add this sale?",
    "confidence": 0.95
  }
}
```

**Response (Question):**
```json
{
  "success": true,
  "data": {
    "isAction": false,
    "reason": "This is a query/question, not a database action"
  }
}
```

---

### 3. Execute Action

**Request:**
```json
POST /api/conversational/execute
{
  "confirmationId": "abc123_1234567890",
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
    "saleId": "6543210...",
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

## Natural Language Examples

### Sales
```
✅ "Record 5 Pepsi sold for ₹150"
✅ "Sold 2 books at ₹500 each to Rahul"
✅ "3 Milk bottles sold, ₹60 each, UPI payment"
```

### Expenses
```
✅ "Add ₹1200 electricity bill"
✅ "Paid ₹5000 for shop rent"
✅ "₹2500 spent on marketing"
✅ "Bought office supplies ₹800"
```

### Inventory Update
```
✅ "Update stock: 10 Biscuits added"
✅ "Received 50 Pepsi bottles"
✅ "Reduce Milk by 5"
✅ "Update Chips price to ₹20"
```

### Inventory Add
```
✅ "Add new item: Chocolate, 100 pieces, ₹50 each"
✅ "New product: Soap bars, 200 units, ₹30, category Toiletries"
```

### Questions (NOT Actions)
```
❌ "What is my profit today?"
❌ "How much stock do I have?"
❌ "Show me sales report"
→ Route these to /api/chatbot/chat instead
```

---

## Languages

| Code | Language | Example |
|------|----------|---------|
| `en` | English | "Sold 5 Pepsi for ₹150" |
| `hi` | Hindi | "5 Pepsi बेचे ₹150 में" |
| `te` | Telugu | "5 Pepsi అమ్మాను ₹150 కు" |

---

## Error Handling

| Error | Response |
|-------|----------|
| Item not found | `"Item 'Chocolate' not found in inventory"` |
| Insufficient stock | `"Insufficient stock for 'Pepsi'. Available: 3, Requested: 5"` |
| Expired confirmation | `"No pending action found. Please try again."` |
| Invalid auth | `401 Unauthorized` |

---

## Frontend Integration (React Example)

```javascript
// 1. Record and transcribe voice
const transcribeVoice = async (audioBlob) => {
  const base64 = await blobToBase64(audioBlob);
  const response = await fetch('/api/chatbot/stt', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ audioData: base64, language: 'en' })
  });
  const { data } = await response.json();
  return data.text;
};

// 2. Parse intent
const parseIntent = async (message) => {
  const response = await fetch('/api/conversational/parse', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, language: 'en' })
  });
  return await response.json();
};

// 3. Execute action
const executeAction = async (confirmationId, confirmed) => {
  const response = await fetch('/api/conversational/execute', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ confirmationId, confirmed, language: 'en' })
  });
  return await response.json();
};

// Complete flow
const handleVoiceCommand = async (audioBlob) => {
  // Step 1: Transcribe
  const text = await transcribeVoice(audioBlob);
  
  // Step 2: Parse
  const { data } = await parseIntent(text);
  
  if (data.isAction) {
    // Step 3: Show confirmation
    const userConfirmed = await showConfirmDialog(data.confirmationMessage);
    
    // Step 4: Execute
    const result = await executeAction(data.confirmationId, userConfirmed);
    
    if (result.executed) {
      showSuccess(result.message); // "✅ Sale recorded successfully!"
    } else {
      showInfo(result.message); // "Okay, I cancelled that action."
    }
  } else {
    // Route to Q&A chatbot
    routeToChatbot(text);
  }
};
```

---

## Testing with cURL

```bash
# Test STT
curl -X POST http://localhost:5000/api/chatbot/stt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audioData":"BASE64_AUDIO","language":"en"}'

# Test Parse
curl -X POST http://localhost:5000/api/conversational/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Sold 10 Pepsi for ₹300","language":"en"}'

# Test Execute
curl -X POST http://localhost:5000/api/conversational/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmationId":"USER_ID_TIMESTAMP","confirmed":true}'
```

---

## Authentication

All endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

Get token from `/api/auth/login`.

---

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/biznova
JWT_SECRET=your_secret_key
PORT=5000
```

---

## Key Points

✅ **Always confirm before DB update** - Never execute without user approval
✅ **Handle isAction flag** - Route questions to chatbot, actions to confirmation
✅ **Check inventory** - Sales auto-deduct stock, validates availability
✅ **Multilingual** - Support EN/HI/TE in all flows
✅ **5-min expiry** - Pending confirmations auto-expire

---

**For full documentation, see `CONVERSATIONAL_API_GUIDE.md`**
