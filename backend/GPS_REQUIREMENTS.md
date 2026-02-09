# GPS Location Requirements - BOTH Customer & Retailer

## 🎯 Critical Requirement

For GPS distance-based filtering to work, **BOTH** customer and retailer MUST have GPS coordinates set.

## ✅ GPS Filtering Logic

### When GPS Filtering Activates
```
Customer has GPS ✅ + Retailer has GPS ✅ = GPS Distance Filtering Active
```

### When GPS Filtering Does NOT Activate
```
Customer has GPS ✅ + Retailer NO GPS ❌ = Retailer NOT shown in GPS results
Customer NO GPS ❌ + Retailer has GPS ✅ = Falls back to locality filtering
Customer NO GPS ❌ + Retailer NO GPS ❌ = Default list (limited to 10)
```

## 📊 Filter Priority Matrix

| Customer GPS | Retailer GPS | Result |
|--------------|--------------|--------|
| ✅ Yes | ✅ Yes | **GPS Distance Filtering** - Shows distance in km |
| ✅ Yes | ❌ No | **Retailer Hidden** - Not in GPS results |
| ❌ No | ✅ Yes | **Locality Filtering** - Falls back to locality/pincode |
| ❌ No | ❌ No | **Default List** - Limited to 10 retailers |

## 🔧 Implementation Details

### Backend Query Logic

When customer has GPS, the query explicitly requires retailers to have GPS:

```javascript
const query = {
  role: 'retailer',
  // CRITICAL: Only retailers with GPS coordinates
  latitude: { $exists: true, $ne: null },
  longitude: { $exists: true, $ne: null },
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [customer.longitude, customer.latitude]
      },
      $maxDistance: rangeInMeters
    }
  }
};
```

### API Response

The response now includes GPS requirement information:

```json
{
  "success": true,
  "data": {
    "retailers": [...],
    "filter_method": "gps",
    "gps_info": {
      "customer_has_gps": true,
      "retailers_require_gps": true,
      "message": "Only showing retailers with GPS location set"
    },
    "suggestion": "Showing 5 stores within 10km with GPS enabled"
  }
}
```

## 📱 User Experience Flow

### For Customers

#### Step 1: Set GPS Location
```javascript
// During signup or profile update
navigator.geolocation.getCurrentPosition((position) => {
  updateProfile({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    locality: "Jubilee Hills"
  });
});
```

#### Step 2: Search for Stores
```javascript
// Get stores within 10km
GET /api/customer-requests/retailers?range=10

// Response shows only retailers with GPS
{
  "retailers": [
    {
      "shop_name": "Raj Grocery",
      "distance_km": 2.5,  // ← Has GPS
      "latitude": 17.4239,
      "longitude": 78.4738
    }
  ],
  "suggestion": "Showing 5 stores within 10km with GPS enabled"
}
```

#### Step 3: If No Results
```
Message: "No stores with GPS found within 10km. 
Try increasing the range or check stores in your locality."

Actions:
1. Increase range (15km, 20km)
2. View locality-based stores
3. Contact stores to set GPS
```

### For Retailers

#### Step 1: Set Store GPS Location
```javascript
// During signup or profile update
navigator.geolocation.getCurrentPosition((position) => {
  updateProfile({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    locality: "Banjara Hills",
    address: {
      street: "Road No 12",
      city: "Hyderabad",
      pincode: "500034"
    }
  });
});
```

#### Step 2: Verify GPS is Set
```javascript
// Check profile
GET /api/users/profile

// Response should include:
{
  "user": {
    "latitude": 17.4239,
    "longitude": 78.4738,
    "locality": "Banjara Hills"
  }
}
```

#### Step 3: Be Discoverable
```
✅ GPS Set → Visible to customers with GPS within range
❌ GPS Not Set → Only visible in locality/default searches
```

## 🚨 Common Scenarios

### Scenario 1: Customer has GPS, Retailer doesn't
```
Customer: "Why can't I see Store X?"
System: Store X hasn't set their GPS location yet.

Solution: 
- Retailer needs to set GPS location
- Or customer can search by locality
```

### Scenario 2: Retailer has GPS, Customer doesn't
```
Customer sees: "Set your GPS location to find nearby stores"

Solution:
- Customer enables GPS
- Or searches by locality/pincode
```

### Scenario 3: Both have GPS, but out of range
```
Customer: "Why can't I see Store Y?"
System: Store Y is 15km away (outside your 10km range)

Solution:
- Increase search range to 15km or 20km
- Or search by locality
```

### Scenario 4: Both have GPS, within range
```
✅ Perfect! Customer sees:
"Raj Grocery - 2.5 km away"
"Sharma Store - 4.8 km away"
```

## 📋 Setup Checklist

### For Customers
- [ ] GPS permission granted
- [ ] Latitude set in profile
- [ ] Longitude set in profile
- [ ] Locality set (optional but recommended)
- [ ] Can see distance to stores

### For Retailers
- [ ] GPS permission granted
- [ ] Store latitude set in profile
- [ ] Store longitude set in profile
- [ ] Locality set (optional but recommended)
- [ ] Address details complete
- [ ] Visible in customer GPS searches

## 💡 Best Practices

### For Customers
1. **Enable GPS during onboarding** for best experience
2. **Update location** if you move to a new area
3. **Try different ranges** (5km, 10km, 15km, 20km)
4. **Use locality search** as fallback if GPS issues

### For Retailers
1. **Set GPS immediately** after signup
2. **Verify GPS accuracy** - should be at store location
3. **Update if store moves** to new location
4. **Complete address details** for fallback searches
5. **Encourage customers** to enable GPS

## 🎯 Testing Both Requirements

### Test Case 1: Both Have GPS
```bash
# 1. Set customer GPS
curl -X PATCH http://localhost:5000/api/customer-auth/profile \
  -H "Authorization: Bearer <customer_token>" \
  -d '{"latitude": 17.4399, "longitude": 78.4089}'

# 2. Set retailer GPS
curl -X PATCH http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <retailer_token>" \
  -d '{"latitude": 17.4239, "longitude": 78.4738}'

# 3. Search - Should show retailer with distance
curl "http://localhost:5000/api/customer-requests/retailers?range=10" \
  -H "Authorization: Bearer <customer_token>"

# Expected: Retailer appears with distance_km: 2.5
```

### Test Case 2: Customer Has GPS, Retailer Doesn't
```bash
# 1. Customer has GPS (from above)

# 2. Retailer WITHOUT GPS (don't set or set to null)
curl -X PATCH http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <retailer_token>" \
  -d '{"latitude": null, "longitude": null}'

# 3. Search - Should NOT show this retailer
curl "http://localhost:5000/api/customer-requests/retailers?range=10" \
  -H "Authorization: Bearer <customer_token>"

# Expected: Retailer NOT in results
# Message: "No stores with GPS found within 10km"
```

### Test Case 3: Customer No GPS, Retailer Has GPS
```bash
# 1. Customer WITHOUT GPS
curl -X PATCH http://localhost:5000/api/customer-auth/profile \
  -H "Authorization: Bearer <customer_token>" \
  -d '{"latitude": null, "longitude": null, "locality": "Jubilee Hills"}'

# 2. Retailer has GPS (from above)

# 3. Search - Falls back to locality
curl "http://localhost:5000/api/customer-requests/retailers" \
  -H "Authorization: Bearer <customer_token>"

# Expected: Uses locality filtering, no distance shown
# filter_method: "locality"
```

## 📊 Response Examples

### With GPS (Both Have GPS)
```json
{
  "success": true,
  "data": {
    "retailers": [
      {
        "shop_name": "Raj Grocery",
        "distance_km": 2.5,
        "latitude": 17.4239,
        "longitude": 78.4738
      }
    ],
    "filter_method": "gps",
    "range_km": 10,
    "gps_info": {
      "customer_has_gps": true,
      "retailers_require_gps": true,
      "message": "Only showing retailers with GPS location set"
    },
    "suggestion": "Showing 1 stores within 10km with GPS enabled"
  }
}
```

### Without GPS (Customer Missing GPS)
```json
{
  "success": true,
  "data": {
    "retailers": [...],
    "filter_method": "locality",
    "gps_info": {
      "customer_has_gps": false,
      "retailers_require_gps": false,
      "message": "GPS filtering not active - using locality/default filter"
    },
    "suggestion": "Set your GPS location to find nearby stores within your preferred range (5-20km)"
  }
}
```

### No GPS Retailers Found
```json
{
  "success": true,
  "data": {
    "retailers": [],
    "filter_method": "gps",
    "range_km": 10,
    "gps_info": {
      "customer_has_gps": true,
      "retailers_require_gps": true,
      "message": "Only showing retailers with GPS location set"
    },
    "suggestion": "No stores with GPS found within 10km. Try increasing the range or check stores in your locality."
  }
}
```

## 🎉 Summary

**GPS distance filtering requires BOTH customer and retailer to have GPS coordinates set.**

- ✅ Both have GPS → Distance-based filtering works perfectly
- ⚠️ Only one has GPS → Falls back to locality filtering
- ❌ Neither has GPS → Shows limited default list

This ensures accurate distance calculations and prevents showing retailers without location data in GPS-based searches.
