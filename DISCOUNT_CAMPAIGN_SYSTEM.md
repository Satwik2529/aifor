# 🎯 Smart Discount & Campaign System - Complete Guide

## Overview
The Smart Discount & Campaign System is an AI-powered feature that helps retailers maximize revenue from expiring and slow-moving inventory by automatically calculating optimal discounts and managing promotional campaigns.

---

## 🚀 Key Features

### 1. **AI-Powered Discount Calculation**
- Analyzes expiry dates and sales velocity
- Calculates optimal discount percentages (5-75%)
- Considers urgency levels: Critical, High, Medium, Low
- Adjusts discounts based on multiple factors

### 2. **Retailer Discount Management**
- **1-Click Apply**: Accept AI recommendations instantly
- **Customize**: Adjust discount percentage and duration
- **Ignore**: Skip recommendations
- **Pause/Resume**: Control active campaigns
- **End Campaign**: Remove discounts anytime

### 3. **Customer-Facing Features**
- **Hot Deals Page**: Browse all active discounts
- **Discount Badges**: Visual indicators on products
- **Search & Filter**: Find deals by category
- **Sort Options**: By discount, price, or urgency
- **Real-time Updates**: Deals update automatically

### 4. **Campaign Analytics**
- Track views, clicks, and sales
- Calculate ROI and effectiveness
- Monitor revenue generated
- Analyze campaign performance by type

---

## 📊 How Discount Calculation Works

### Expiry-Based Discounts

| Days Until Expiry | Discount | Urgency | Reason |
|-------------------|----------|---------|--------|
| Expired | 70% | Critical | Clear immediately |
| 1 day | 60% | Critical | Urgent clearance |
| 2-3 days | 50% | High | High urgency |
| 4-7 days | 35% | Medium | Moderate urgency |
| 8-14 days | 25% | Medium | Approaching expiry |
| 15-30 days | 15% | Low | Early discount |

### Slow Velocity Adjustment
- **< 0.5 units/week**: +15% additional discount
- **0.5-1 units/week**: +10% additional discount
- **> 1 unit/week**: No adjustment

### Example Calculation
```
Item: Milk (500ml)
Expiry: 3 days
Sales Velocity: 0.3 units/week
Original Price: ₹50

Base Discount (3 days): 50%
Velocity Bonus (< 0.5): +15%
Total Discount: 65%
Final Price: ₹17.50
Savings: ₹32.50
```

---

## 🗄️ Database Schema

### Campaign Model
```javascript
{
  user_id: ObjectId,              // Retailer
  inventory_id: ObjectId,         // Item
  campaign_type: String,          // expiry_based, slow_velocity, etc.
  discount_percentage: Number,    // 0-100
  original_price: Number,
  discounted_price: Number,
  status: String,                 // pending, active, paused, completed
  start_date: Date,
  end_date: Date,
  reason: String,                 // Why this discount
  ai_confidence: Number,          // 0-1
  
  // Analytics
  views_count: Number,
  clicks_count: Number,
  sales_count: Number,
  revenue_generated: Number,
  
  // Metadata
  created_by: String,             // ai or manual
  notes: String
}
```

### Updated Inventory Model
```javascript
{
  // ... existing fields ...
  
  // New fields
  active_discount: Number,        // Current discount %
  discounted_price: Number,       // Price after discount
  sales_velocity: Number,         // Units sold per week
  last_velocity_update: Date
}
```

---

## 🔌 API Endpoints

### Retailer Endpoints (Protected)

#### Get AI Recommendations
```http
GET /api/campaigns/recommendations
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "item_id": "...",
      "item_name": "Milk",
      "discount": 65,
      "discountedPrice": 17.50,
      "reason": "Expires in 3 days + Slow moving",
      "urgency": "high",
      "potential_revenue": 875,
      "potential_loss_if_expired": 2500
    }
  ]
}
```

#### Apply Discount
```http
POST /api/campaigns/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "inventory_id": "...",
  "discount_percentage": 50,
  "duration_days": 7,
  "campaign_type": "expiry_based"
}
```

#### Remove Discount
```http
POST /api/campaigns/remove
Authorization: Bearer <token>
Content-Type: application/json

{
  "inventory_id": "..."
}
```

#### Get Active Campaigns
```http
GET /api/campaigns/active
Authorization: Bearer <token>
```

#### Get Campaign Analytics
```http
GET /api/campaigns/analytics
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total_campaigns": 15,
    "active_campaigns": 8,
    "total_revenue": 12500,
    "total_views": 450,
    "total_clicks": 120,
    "total_sales": 35,
    "avg_effectiveness": 7.78
  }
}
```

### Customer Endpoints (Public)

#### Get Hot Deals
```http
GET /api/campaigns/hot-deals?shop_id=<shop_id>&limit=20

Response:
{
  "success": true,
  "data": [
    {
      "item_id": "...",
      "item_name": "Milk",
      "category": "Food & Beverages",
      "original_price": 50,
      "discounted_price": 17.50,
      "discount_percentage": 65,
      "savings": 32.50,
      "stock_qty": 10,
      "ends_in_days": 3,
      "urgency": "high"
    }
  ]
}
```

#### Track Campaign Click
```http
POST /api/campaigns/track-click
Content-Type: application/json

{
  "inventory_id": "..."
}
```

---

## 💻 Frontend Components

### 1. DiscountCampaigns.jsx (Retailer)
**Location**: `aifor/frontend/src/pages/DiscountCampaigns.jsx`

**Features**:
- 3 tabs: Recommendations, Active Campaigns, Analytics
- AI recommendation cards with urgency indicators
- 1-click apply or customize discount
- Campaign management (pause/resume/end)
- Real-time analytics dashboard

**Usage**:
```jsx
import DiscountCampaigns from './pages/DiscountCampaigns';

// In your router
<Route path="/discount-campaigns" element={<DiscountCampaigns />} />
```

### 2. HotDeals.jsx (Customer)
**Location**: `aifor/frontend/src/pages/HotDeals.jsx`

**Features**:
- Grid view of all active deals
- Search and filter by category
- Sort by discount, price, or urgency
- Visual discount badges
- Click tracking for analytics

**Usage**:
```jsx
import HotDeals from './pages/HotDeals';

// In your router
<Route path="/hot-deals" element={<HotDeals />} />

// Or embed in customer app
<HotDeals />
```

---

## 🎨 UI/UX Design

### Color Coding by Urgency

| Urgency | Color | Use Case |
|---------|-------|----------|
| Critical | Red | Expired or 1-3 days left |
| High | Orange | 4-7 days left |
| Medium | Yellow | 8-30 days left |
| Low | Blue | General discounts |

### Discount Badges
- **50%+ OFF**: Red badge with flame icon 🔥
- **30-49% OFF**: Orange badge
- **< 30% OFF**: Yellow badge

### Visual Indicators
- ⚠️ Expiry alerts
- 🔥 Limited stock warnings
- ⏰ Time-sensitive deals
- 💰 Savings highlights

---

## 📈 Business Impact

### For Retailers

**Benefits**:
1. **Reduce Waste**: Sell expiring items before they expire
2. **Maximize Revenue**: Get some profit instead of total loss
3. **Automated Decisions**: AI calculates optimal discounts
4. **Track Performance**: Analytics show what works
5. **Customer Loyalty**: Customers appreciate deals

**Example Scenario**:
```
Item: 50 units of Milk @ ₹50 each
Expiry: 2 days
Cost Price: ₹30 each

Without Discount:
- All 50 units expire
- Loss: ₹1,500 (50 × ₹30)

With 60% Discount (₹20 each):
- Sell 40 units @ ₹20 = ₹800 revenue
- Profit: ₹800 - (40 × ₹30) = -₹400
- Net Benefit: ₹1,100 saved vs total loss
```

### For Customers

**Benefits**:
1. **Save Money**: Up to 75% off on quality products
2. **Reduce Waste**: Buy items that would otherwise be discarded
3. **Discover Deals**: Easy browsing of all discounts
4. **Transparency**: Know why items are discounted

---

## 🔄 Campaign Lifecycle

```
1. AI Analysis
   ↓
2. Generate Recommendations
   ↓
3. Retailer Reviews
   ↓
4. Apply/Customize/Ignore
   ↓
5. Campaign Active
   ↓
6. Track Analytics (Views, Clicks, Sales)
   ↓
7. Campaign Ends or Item Sold Out
   ↓
8. Performance Review
```

---

## 🛠️ Implementation Steps

### Backend Setup

1. **Install Dependencies** (already in package.json)
```bash
cd aifor/backend
npm install
```

2. **Start Server**
```bash
npm start
```

3. **Test API**
```bash
# Get recommendations
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/campaigns/recommendations

# Apply discount
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"inventory_id":"...","discount_percentage":50,"duration_days":7}' \
  http://localhost:5000/api/campaigns/apply
```

### Frontend Setup

1. **Add Routes to App.jsx**
```jsx
import DiscountCampaigns from './pages/DiscountCampaigns';
import HotDeals from './pages/HotDeals';

// In your routes
<Route path="/discount-campaigns" element={<DiscountCampaigns />} />
<Route path="/hot-deals" element={<HotDeals />} />
```

2. **Add Navigation Links**
```jsx
// In Sidebar.jsx or Navigation
<Link to="/discount-campaigns">
  <TrendingDown className="h-5 w-5" />
  Discount Campaigns
</Link>
```

3. **Start Frontend**
```bash
cd aifor/frontend
npm start
```

---

## 🧪 Testing

### Test Scenarios

1. **Create Expiring Items**
```javascript
// Add inventory items with expiry dates
{
  item_name: "Test Milk",
  stock_qty: 50,
  cost_price: 30,
  selling_price: 50,
  expiry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
}
```

2. **Generate Recommendations**
- Visit `/discount-campaigns`
- Check "AI Recommendations" tab
- Should see items with calculated discounts

3. **Apply Discount**
- Click "Apply X% Discount" button
- Verify campaign created
- Check "Active Campaigns" tab

4. **View as Customer**
- Visit `/hot-deals?shop_id=<your_shop_id>`
- Should see discounted items
- Click on items to track analytics

5. **Check Analytics**
- Visit "Analytics" tab
- Verify views, clicks, sales tracked
- Check revenue generated

---

## 🔐 Security Considerations

1. **Authentication**: All retailer endpoints require JWT token
2. **Authorization**: Users can only manage their own campaigns
3. **Validation**: Discount percentage limited to 0-100%
4. **Rate Limiting**: Prevent abuse of tracking endpoints
5. **Data Privacy**: Customer data not exposed in hot deals

---

## 🚀 Future Enhancements

### Phase 2 Features
1. **Push Notifications**: Alert customers about new deals
2. **Geolocation**: Show nearby deals on map
3. **Favorites**: Let customers save favorite shops
4. **Deal Alerts**: Notify when specific items go on sale
5. **Social Sharing**: Share deals on WhatsApp/Facebook

### Phase 3 Features
1. **Festival Campaigns**: Special discounts for Diwali, Holi, etc.
2. **Flash Sales**: Time-limited super discounts
3. **Bundle Deals**: Discount on item combinations
4. **Loyalty Rewards**: Extra discounts for repeat customers
5. **Predictive Analytics**: Forecast which items will need discounts

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Recommendations not showing
- **Solution**: Ensure items have expiry dates or low sales velocity

**Issue**: Discount not applied
- **Solution**: Check inventory_id is correct and item exists

**Issue**: Analytics not updating
- **Solution**: Verify tracking endpoints are being called

**Issue**: Hot deals page empty
- **Solution**: Ensure shop_id parameter is provided

---

## 📝 Summary

The Smart Discount & Campaign System transforms how retailers handle expiring inventory:

✅ **AI calculates optimal discounts** based on expiry and velocity  
✅ **Retailers apply with 1-click** or customize as needed  
✅ **Customers discover deals** through Hot Deals page  
✅ **Analytics track performance** to optimize future campaigns  
✅ **Everyone wins**: Retailers reduce waste, customers save money  

**Result**: Biznova becomes a bigger, better, production-ready platform that helps retailers maximize revenue while reducing food waste! 🎉

---

## 🎯 Next Steps

1. ✅ Backend models and services created
2. ✅ API endpoints implemented
3. ✅ Frontend pages built
4. ⏳ Add routes to App.jsx
5. ⏳ Add navigation links
6. ⏳ Test with real data
7. ⏳ Deploy to production

**Ready to make Biznova bigger and better!** 🚀
