# Wholesaler Offers System - Complete Guide

## Overview
This system allows wholesalers to apply discounts to slow-moving products and send offers to retailers. Retailers can view all active offers and place orders directly.

---

## Features Implemented

### 1. Wholesaler AI Insights - Action Buttons ✅

**Location**: `aifor/frontend/src/pages/WholesalerAIInsights.jsx`

**For Slow-Moving Products**:
- **Apply Discount Button**: Directly applies the AI-suggested discount to the product in inventory
- **Send Offer Button**: Sends promotional notification to all retailers who have ordered from this wholesaler

**How it Works**:
1. AI analyzes inventory and identifies slow-moving products
2. Suggests discount percentage (e.g., 15%, 20%, 30%)
3. Wholesaler clicks "Apply Discount" → Product price is updated with discount
4. Wholesaler clicks "Send Offer" → All retailers receive notification

**Backend Endpoint**: `POST /api/wholesalers/apply-discount`
```javascript
{
  "productId": "product_id_here",
  "discount": 20
}
```

---

### 2. Retailer Offers Page ✅

**Location**: `aifor/frontend/src/pages/WholesalerOffers.jsx`

**Features**:
- View all active offers from nearby wholesalers
- See discount percentage, original price, and discounted price
- View wholesaler location and distance
- See expiry alerts for products
- Place orders directly from offers page

**Navigation**: 
- Sidebar → "Special Offers"
- Route: `/dashboard/wholesaler-offers`

**Backend Endpoint**: `GET /api/wholesalers/offers/all`

---

### 3. Location-Based Offers ✅

**How Location Works**:

**For Wholesalers**:
- Wholesaler profile includes `latitude`, `longitude`, and `locality`
- Location is stored in GeoJSON format for distance queries
- Profile settings allow updating location data

**For Retailers**:
- Retailer location (GPS or locality) is used to find nearby wholesalers
- Distance is calculated using Haversine formula
- Offers are sorted by distance and discount percentage

**Distance Calculation**:
```javascript
// Haversine formula in wholesalerController.js
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    // ... calculation
    return distance_in_km;
}
```

**Fallback**: If GPS not available, uses locality/city matching

---

### 4. Order Flow ✅

**Step 1: Wholesaler Creates Offer**
1. Go to AI Insights page
2. View slow-moving products
3. Click "Apply Discount" to update price
4. Click "Send Offer" to notify retailers

**Step 2: Retailer Views Offer**
1. Navigate to "Special Offers" in sidebar
2. See all active offers with discounts
3. View wholesaler details and distance
4. Click "Place Order"

**Step 3: Place Order**
1. Modal opens with product details
2. Enter quantity (respects min/max limits)
3. See total price and savings
4. Click "Confirm Order"
5. Order is created with status "REQUESTED"

**Step 4: Wholesaler Processes Order**
1. View order in "Orders" page
2. Update status: ACCEPTED → PACKED → DISPATCHED → DELIVERED
3. Retailer receives notifications at each stage

**Step 5: Retailer Adds to Inventory**
1. When order is ACCEPTED or later
2. Go to "My Orders" page
3. Click "Add to Inventory"
4. Items are added to retailer's inventory

---

## Backend API Endpoints

### Wholesaler Endpoints

#### Apply Discount to Product
```
POST /api/wholesalers/apply-discount
Authorization: Bearer <token>

Body:
{
  "productId": "product_id",
  "discount": 20
}

Response:
{
  "success": true,
  "message": "20% discount applied to Product Name",
  "data": {
    "product": {...},
    "originalPrice": 100,
    "newPrice": 80,
    "savings": 20
  }
}
```

#### Send Campaign
```
POST /api/wholesalers/send-campaign
Authorization: Bearer <token>

Body:
{
  "productId": "product_id",
  "campaignMessage": "Special offer message",
  "discount": 20,
  "retailerId": "specific_retailer_id" // optional
}

Response:
{
  "success": true,
  "message": "Campaign sent to 15 retailers",
  "data": {
    "sentCount": 15,
    "retailers": 15
  }
}
```

### Retailer Endpoints

#### Get All Active Offers
```
GET /api/wholesalers/offers/all
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "offers": [
      {
        "_id": "product_id",
        "productName": "Rice",
        "pricePerUnit": 40,
        "effectiveDiscount": 20,
        "daysUntilExpiry": 15,
        "wholesalerInfo": {
          "id": "wholesaler_id",
          "name": "ABC Distributors",
          "location": "Mumbai",
          "distance_km": 5.2
        }
      }
    ],
    "totalOffers": 10,
    "totalWholesalers": 3
  }
}
```

#### Get Offers from Specific Wholesaler
```
GET /api/wholesalers/:wholesalerId/offers
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "offers": [...],
    "wholesaler": {
      "id": "wholesaler_id",
      "name": "ABC Distributors",
      "businessName": "ABC Wholesale",
      "location": "Mumbai",
      "distance_km": 5.2
    }
  }
}
```

---

## Database Schema Updates

### WholesalerInventory Model

Added `discountApplied` field:
```javascript
discountApplied: {
  originalPrice: Number,
  discountPercentage: Number,
  appliedAt: Date,
  reason: String
}
```

**Example**:
```javascript
{
  productName: "Rice",
  pricePerUnit: 40, // After discount
  discountApplied: {
    originalPrice: 50,
    discountPercentage: 20,
    appliedAt: "2026-02-10T10:30:00Z",
    reason: "Slow moving product - AI recommendation"
  }
}
```

---

## Location Setup Guide

### For Wholesalers

**Option 1: GPS Coordinates**
1. Go to Profile Settings
2. Enter latitude and longitude
3. System automatically creates GeoJSON location
4. Enables distance-based discovery

**Option 2: Locality Only**
1. Enter locality/city in address
2. System uses locality matching
3. Less precise but still functional

**Getting GPS Coordinates**:
- Use Google Maps: Right-click location → Copy coordinates
- Format: Latitude (e.g., 19.0760), Longitude (e.g., 72.8777)

### For Retailers

Same as wholesalers - GPS preferred for accurate distance calculation.

---

## Testing Checklist

### Wholesaler Side
- [ ] Login as wholesaler
- [ ] Go to AI Insights page
- [ ] Verify slow-moving products show up
- [ ] Click "Apply Discount" button
- [ ] Verify product price is updated in inventory
- [ ] Click "Send Offer" button
- [ ] Verify notification is sent to retailers
- [ ] Check Profile Settings shows wholesaler fields
- [ ] Update location (GPS or locality)

### Retailer Side
- [ ] Login as retailer
- [ ] Navigate to "Special Offers" in sidebar
- [ ] Verify offers are displayed
- [ ] Check distance calculation (if GPS available)
- [ ] Click "Place Order" on an offer
- [ ] Enter quantity and confirm
- [ ] Verify order is created
- [ ] Go to "My Orders" page
- [ ] Verify order appears with correct status

### Location Testing
- [ ] Wholesaler with GPS coordinates
- [ ] Retailer with GPS coordinates
- [ ] Verify distance is calculated correctly
- [ ] Test with locality-only (no GPS)
- [ ] Verify locality matching works

---

## UI Components

### WholesalerAIInsights.jsx
- Slow-moving products section
- Action buttons: "Apply Discount" and "Send Offer"
- Loading states and error handling
- Toast notifications for success/failure

### WholesalerOffers.jsx
- Grid layout of offer cards
- Discount badges (percentage)
- Wholesaler info with location
- Distance display (if available)
- Order modal with quantity selector
- Price calculation with savings display

### Sidebar.jsx
- New menu item: "Special Offers" with Tag icon
- Positioned between "Wholesalers" and "My Orders"

---

## Error Handling

### Common Issues

**1. 404 Error on Apply Discount**
- **Cause**: Backend server not restarted
- **Solution**: Restart backend server

**2. No Offers Showing**
- **Cause**: No wholesalers with discounts nearby
- **Solution**: 
  - Check wholesaler has applied discounts
  - Verify location data is set
  - Check distance range (default 50km)

**3. Distance Not Showing**
- **Cause**: Missing GPS coordinates
- **Solution**: Add latitude/longitude in profile settings

**4. Order Creation Fails**
- **Cause**: Insufficient stock or below min order value
- **Solution**: Check product availability and min order requirements

---

## Performance Considerations

### Distance Queries
- Uses MongoDB 2dsphere index for efficient geospatial queries
- Fallback to locality matching if GPS unavailable
- Max distance: 50km (configurable)

### Offer Retrieval
- Filters products with discounts or near expiry (30 days)
- Sorted by discount percentage and expiry date
- Pagination support (not implemented in UI yet)

---

## Future Enhancements

### Potential Features
1. **Push Notifications**: Real-time alerts for new offers
2. **Favorites**: Save favorite wholesalers
3. **Offer History**: Track past offers and orders
4. **Bulk Orders**: Order multiple products at once
5. **Price Comparison**: Compare prices across wholesalers
6. **Offer Expiry**: Auto-expire offers after certain time
7. **Analytics**: Track offer performance for wholesalers

---

## Troubleshooting

### Backend Issues

**Check Routes are Loaded**:
```bash
cd aifor/backend
node verify-wholesaler-routes.js
```

Should show:
```
✅ SUCCESS: apply-discount route is registered!
   POST /api/wholesalers/apply-discount
```

**Check MongoDB Connection**:
```bash
# In backend console, look for:
✅ MongoDB Connected: <database_name>
```

**Check Location Index**:
```javascript
// In MongoDB shell or Compass
db.users.getIndexes()
// Should show: { location: "2dsphere" }
```

### Frontend Issues

**Check API URL**:
```javascript
// In browser console
console.log(process.env.REACT_APP_API_URL)
// Should be: http://localhost:5000
```

**Check Token**:
```javascript
// In browser console
console.log(localStorage.getItem('token'))
// Should show JWT token
```

**Check User Role**:
```javascript
// In browser console
console.log(localStorage.getItem('userType'))
// Should be: retailer or wholesaler
```

---

## File Structure

```
aifor/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── wholesalerController.js
│   │   │       ├── applyDiscountToProduct()
│   │   │       ├── getActiveOffers()
│   │   │       └── getAllActiveOffers()
│   │   ├── routes/
│   │   │   └── wholesalerRoutes.js
│   │   │       ├── POST /apply-discount
│   │   │       ├── GET /offers/all
│   │   │       └── GET /:wholesalerId/offers
│   │   └── models/
│   │       └── WholesalerInventory.js
│   │           └── discountApplied field
│   └── verify-wholesaler-routes.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── WholesalerAIInsights.jsx (updated)
│   │   │   └── WholesalerOffers.jsx (new)
│   │   ├── components/
│   │   │   └── Sidebar.jsx (updated)
│   │   └── App.jsx (updated)
│   └── package.json
└── WHOLESALER_OFFERS_SYSTEM_GUIDE.md (this file)
```

---

## Quick Start

### 1. Restart Backend
```bash
cd aifor/backend
# Stop with Ctrl+C
npm start
```

### 2. Test as Wholesaler
1. Login as wholesaler
2. Go to AI Insights
3. Apply discount to slow-moving product
4. Send offer to retailers

### 3. Test as Retailer
1. Login as retailer
2. Click "Special Offers" in sidebar
3. View available offers
4. Place an order

---

## Support

For issues:
1. Check this guide
2. Check WHOLESALER_404_FIX_GUIDE.md
3. Check backend console logs
4. Check browser DevTools console
5. Verify MongoDB connection
6. Verify location data is set

---

**Last Updated**: February 10, 2026  
**Version**: 2.0.0  
**Status**: Production Ready
