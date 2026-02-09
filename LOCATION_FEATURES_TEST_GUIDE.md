# 📍 Location Features - Testing Guide

## Quick Test Checklist

### ✅ Feature 1: Profile Location Display & Update

**Test Steps**:
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Login as retailer or customer
4. Navigate to Profile Settings
5. Scroll to "Location Information" section

**Expected Results**:
- If location exists: Shows coordinates, locality, last updated time
- If no location: Shows yellow warning with "Capture Location" button
- "Update Location" button works and requests permission
- "Open in Google Maps" link opens correct location
- Toast notifications appear for success/error

**Backend Logs to Check**:
```
📍 Location updated for user: user@example.com
```

---

### ✅ Feature 2: Nearby Shops Discovery

**Test Steps**:
1. Login as customer
2. Navigate to `/customer/nearby-shops`
3. Allow location permission when prompted
4. Wait for shops to load

**Expected Results**:
- Location permission requested automatically
- Shops displayed as cards sorted by distance
- Distance badge shows km from user
- Radius selector buttons work (5km, 10km, 20km, 50km)
- "Directions" button opens Google Maps with route
- "Open in Maps" button opens shop location

**Backend Logs to Check**:
```
🔍 Searching for shops within 10km of [26.249273, 78.169700]
✅ Found 5 shops within 10km
```

---

## Detailed Testing Scenarios

### Scenario 1: First-Time User (No Location Set)

**Steps**:
1. Register new account (skip GPS capture)
2. Login
3. Go to Profile Settings
4. Check Location Information section

**Expected**:
- Yellow warning box: "⚠️ Location not set"
- "Capture Location" button visible
- Click button → location permission requested
- After allowing → coordinates displayed
- Green success message appears

---

### Scenario 2: Existing User (Location Already Set)

**Steps**:
1. Login with account that has location
2. Go to Profile Settings
3. Check Location Information section

**Expected**:
- Blue info box with coordinates
- Latitude and longitude displayed
- Locality shown (if available)
- Last updated timestamp
- "Update Location" button
- "Open in Google Maps" link

---

### Scenario 3: Update Location

**Steps**:
1. Login
2. Go to Profile Settings
3. Click "Update Location"
4. Allow location permission

**Expected**:
- Toast: "Capturing location..."
- Browser requests permission
- Toast: "📍 Location updated successfully!"
- Coordinates update in UI
- Timestamp updates

---

### Scenario 4: Find Nearby Shops (Customer)

**Steps**:
1. Login as customer
2. Navigate to Nearby Shops page
3. Allow location permission

**Expected**:
- Toast: "Getting your location..."
- Toast: "Location captured!"
- Shops load automatically
- Default radius: 10km
- Shops sorted by distance (nearest first)
- Each shop card shows:
  - Shop name
  - Owner name
  - Distance badge (green)
  - Locality
  - Phone/Email
  - Address
  - "Directions" button
  - "Open in Maps" button

---

### Scenario 5: Change Search Radius

**Steps**:
1. On Nearby Shops page
2. Click different radius buttons (5km, 10km, 20km, 50km)

**Expected**:
- Loading indicator appears
- New search performed
- Shop list updates
- Count updates
- Shops re-sorted by distance

---

### Scenario 6: No Shops Found

**Steps**:
1. On Nearby Shops page
2. Select small radius (5km) in area with no shops

**Expected**:
- Empty state displayed
- Message: "No shops found"
- Suggestion: "Try increasing the search radius"
- Store icon shown

---

### Scenario 7: Get Directions

**Steps**:
1. On Nearby Shops page
2. Click "Directions" on any shop card

**Expected**:
- Google Maps opens in new tab
- Route from user location to shop shown
- Directions mode active

---

### Scenario 8: Location Permission Denied

**Steps**:
1. Go to Profile Settings
2. Click "Update Location"
3. Deny location permission

**Expected**:
- Toast: "Location permission denied"
- No error thrown
- UI remains functional
- Can try again

---

## API Testing with Postman/cURL

### Test Update Location Endpoint

**Retailer**:
```bash
curl -X PUT http://localhost:5000/api/auth/update-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 26.249273,
    "longitude": 78.169700,
    "locality": "Banjara Hills"
  }'
```

**Customer**:
```bash
curl -X PUT http://localhost:5000/api/customer-auth/update-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 26.249273,
    "longitude": 78.169700,
    "locality": "Jubilee Hills"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "latitude": 26.249273,
    "longitude": 78.169700,
    "locality": "Banjara Hills",
    "updatedAt": "2026-02-09T12:29:42.219Z"
  }
}
```

---

### Test Nearby Shops Endpoint

```bash
curl -X GET "http://localhost:5000/api/nearby-shops?latitude=26.249273&longitude=78.169700&radius=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Found 5 shops within 10km",
  "data": {
    "shops": [
      {
        "id": "...",
        "name": "John Doe",
        "shop_name": "John's Store",
        "email": "john@example.com",
        "phone": "9876543210",
        "address": {...},
        "locality": "Banjara Hills",
        "latitude": 26.249273,
        "longitude": 78.169700,
        "distance": 2.45
      }
    ],
    "searchLocation": {
      "latitude": 26.249273,
      "longitude": 78.169700
    },
    "radius": 10,
    "count": 5
  }
}
```

---

## Browser Console Testing

### Check Location Capture

Open browser console and run:
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('Latitude:', position.coords.latitude);
    console.log('Longitude:', position.coords.longitude);
    console.log('Accuracy:', position.coords.accuracy);
  },
  (error) => {
    console.error('Error:', error.message);
  }
);
```

---

## Database Verification

### Check Location Data in MongoDB

```javascript
// Connect to MongoDB
use biznova

// Check retailer location
db.users.findOne({ email: "retailer@example.com" }, { 
  latitude: 1, 
  longitude: 1, 
  locality: 1, 
  location: 1 
})

// Check customer location
db.customerusers.findOne({ email: "customer@example.com" }, { 
  latitude: 1, 
  longitude: 1, 
  locality: 1, 
  location: 1 
})

// Find all retailers with location
db.users.find({ 
  role: "retailer",
  latitude: { $exists: true, $ne: null }
}).count()
```

---

## Common Issues & Solutions

### Issue 1: Location Permission Blocked
**Solution**: 
- Clear browser site data
- Go to browser settings → Site permissions
- Allow location for localhost

### Issue 2: No Shops Found
**Solution**:
- Ensure retailers have location set
- Check database for retailers with latitude/longitude
- Try larger radius (50km)

### Issue 3: "Update Location" Not Working
**Solution**:
- Check browser console for errors
- Verify JWT token is valid
- Check backend logs for errors
- Ensure route is registered in server.js

### Issue 4: Distance Calculation Incorrect
**Solution**:
- Verify Haversine formula implementation
- Check coordinate order (lat, lng vs lng, lat)
- Ensure coordinates are in decimal degrees

---

## Performance Testing

### Test with Multiple Shops

1. Create 50+ retailers with locations
2. Search with 50km radius
3. Verify:
   - Response time < 2 seconds
   - All shops returned
   - Correct distance calculation
   - Proper sorting

### Test with Different Locations

1. Test from different cities
2. Test from rural areas
3. Test from dense urban areas
4. Verify results are accurate

---

## Success Criteria

✅ All features work without errors  
✅ Location permission handled gracefully  
✅ Toast notifications appear correctly  
✅ Google Maps integration works  
✅ Distance calculations are accurate  
✅ Shops sorted by distance  
✅ UI is responsive and user-friendly  
✅ Backend logs show correct data  
✅ Database stores location correctly  
✅ Works for both retailers and customers  

---

**Testing Status**: Ready for QA  
**Last Updated**: February 9, 2026
