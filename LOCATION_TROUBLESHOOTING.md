# 📍 Location Features - Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: 404 Error on `/api/auth/update-location`

**Error**: `PUT http://localhost:5000/api/auth/update-location 404 (Not Found)`

**Cause**: Backend server not restarted after adding new routes

**Solution**:
1. Stop the backend server (Ctrl+C)
2. Restart: `cd backend && npm start`
3. Wait for "✅ MongoDB Connected" message
4. Try again

**Verification**:
```bash
# Test the endpoint exists
curl -X PUT http://localhost:5000/api/auth/update-location \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 26.249273, "longitude": 78.169700}'
```

---

### Issue 2: Location Not Showing in Profile

**Symptoms**: Profile Settings shows "Location not set" even though location was captured

**Possible Causes**:
1. Location not saved to database
2. Profile API not returning location fields
3. Frontend not reading location from profile data

**Solution**:
1. Check database:
```javascript
// In MongoDB
db.users.findOne({ email: "your@email.com" }, { latitude: 1, longitude: 1 })
```

2. Check backend logs for location save confirmation:
```
📍 Location updated for user: user@example.com
```

3. Check browser console for errors

4. Verify profile API returns location:
```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue 3: Location Permission Denied

**Symptoms**: Browser blocks location request or shows "Permission denied"

**Solutions**:

**Chrome**:
1. Click lock icon in address bar
2. Click "Site settings"
3. Find "Location" → Change to "Allow"
4. Refresh page

**Firefox**:
1. Click lock icon in address bar
2. Click "Connection secure" → "More information"
3. Go to "Permissions" tab
4. Find "Access Your Location" → Uncheck "Use Default"
5. Check "Allow"

**Edge**:
1. Click lock icon in address bar
2. Click "Permissions for this site"
3. Find "Location" → Change to "Allow"

**Clear All Permissions** (Nuclear option):
1. Browser Settings → Privacy & Security
2. Site Settings → Location
3. Remove localhost from blocked sites
4. Refresh page

---

### Issue 4: No Shops Found in Nearby Shops

**Symptoms**: "No shops found" message even though retailers exist

**Possible Causes**:
1. Retailers don't have location set
2. Search radius too small
3. No retailers in database

**Solutions**:

1. **Check if retailers have location**:
```javascript
// In MongoDB
db.users.find({ 
  role: "retailer",
  latitude: { $exists: true, $ne: null }
}).count()
```

2. **Increase search radius**:
- Try 50km radius instead of 5km

3. **Add test retailer with location**:
```javascript
// In MongoDB
db.users.updateOne(
  { email: "retailer@test.com" },
  { 
    $set: { 
      latitude: 26.249273,
      longitude: 78.169700,
      locality: "Test Area"
    }
  }
)
```

4. **Verify location data format**:
```javascript
// Should have both latitude AND longitude
db.users.findOne({ email: "retailer@test.com" }, { 
  latitude: 1, 
  longitude: 1,
  location: 1 
})
```

---

### Issue 5: Distance Calculation Incorrect

**Symptoms**: Shops showing wrong distances

**Possible Causes**:
1. Coordinates swapped (lat/lng vs lng/lat)
2. Haversine formula error
3. Wrong units (miles vs km)

**Solution**:
1. Verify coordinate order in database:
```javascript
// GeoJSON uses [longitude, latitude] order
db.users.findOne({}, { location: 1 })
// Should show: { type: "Point", coordinates: [lng, lat] }
```

2. Test Haversine calculation:
```javascript
// In backend/src/controllers/nearbyShopsController.js
// Add console.log to verify calculation
console.log('Distance:', distance, 'km');
```

3. Verify coordinates are in decimal degrees (not DMS format)

---

### Issue 6: CORS Error

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Check backend CORS configuration in `backend/src/server.js`
2. Ensure frontend URL is in `allowedOrigins` array
3. Restart backend server

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  // Add your frontend URL here
];
```

---

### Issue 7: JWT Token Invalid/Expired

**Error**: `401 Unauthorized` or `Token invalid`

**Solution**:
1. Logout and login again
2. Check token in localStorage:
```javascript
// In browser console
localStorage.getItem('token')
```

3. Verify token is being sent in headers:
```javascript
// In browser Network tab
// Check Authorization header: Bearer <token>
```

---

### Issue 8: MongoDB Connection Error

**Error**: `MongoServerError` or `Connection timeout`

**Solution**:
1. Check `.env` file has correct `MONGODB_URI`
2. Verify MongoDB Atlas IP whitelist includes your IP
3. Check MongoDB Atlas cluster is running
4. Test connection:
```bash
# In backend directory
node -e "require('./src/config/db')();"
```

---

### Issue 9: Frontend Not Updating After Location Change

**Symptoms**: Location updated in database but UI still shows old data

**Solution**:
1. Check if `fetchProfile()` is called after update
2. Verify state is being updated:
```javascript
// In ProfileSettings.jsx
setLocationData({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  updatedAt: new Date().toISOString()
});
```

3. Check React DevTools to see state changes
4. Hard refresh browser (Ctrl+Shift+R)

---

### Issue 10: Backend Route Not Found

**Error**: `Cannot GET /api/nearby-shops` or `Cannot PUT /api/auth/update-location`

**Checklist**:
- ✅ Route defined in controller
- ✅ Route exported from controller
- ✅ Route file created in routes folder
- ✅ Route imported in server.js
- ✅ Route registered with `app.use()`
- ✅ Backend server restarted

**Verify routes are loaded**:
```bash
# Check server.js has:
const nearbyShopsRoutes = require('./routes/nearbyShopsRoutes');
app.use('/api/nearby-shops', nearbyShopsRoutes);
```

---

## Debugging Tools

### 1. Backend Logs
Check console output for:
```
📍 Location updated for user: user@example.com
🔍 Searching for shops within 10km of [26.249273, 78.169700]
✅ Found 5 shops within 10km
```

### 2. Browser Console
Check for errors:
```javascript
// Open DevTools (F12) → Console tab
// Look for red error messages
```

### 3. Network Tab
Check API calls:
```
1. Open DevTools (F12) → Network tab
2. Filter by "XHR" or "Fetch"
3. Click on request to see:
   - Request URL
   - Request Headers (Authorization token)
   - Request Payload
   - Response Status
   - Response Data
```

### 4. MongoDB Compass
Visual database inspection:
```
1. Connect to MongoDB
2. Select "psp" database
3. Browse "users" and "customerusers" collections
4. Check latitude/longitude fields
```

### 5. Test Script
Run automated tests:
```bash
cd backend
node test-location-features.js
```

---

## Quick Fixes

### Reset Everything
```bash
# 1. Stop all servers
# 2. Clear browser data for localhost
# 3. Restart backend
cd backend
npm start

# 4. Restart frontend
cd frontend
npm start

# 5. Clear localStorage
# In browser console:
localStorage.clear()

# 6. Login again
```

### Force Location Refresh
```javascript
// In browser console on Profile Settings page
navigator.geolocation.getCurrentPosition(
  (pos) => console.log('Lat:', pos.coords.latitude, 'Lng:', pos.coords.longitude),
  (err) => console.error('Error:', err.message)
);
```

### Check All Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Auth routes
curl http://localhost:5000/api/auth/profile -H "Authorization: Bearer TOKEN"

# Nearby shops
curl "http://localhost:5000/api/nearby-shops?latitude=26.249273&longitude=78.169700&radius=10" -H "Authorization: Bearer TOKEN"
```

---

## Prevention Tips

1. **Always restart backend** after code changes
2. **Check browser console** for errors
3. **Verify database** has correct data
4. **Test with curl** before testing in UI
5. **Use test script** to verify all endpoints
6. **Check backend logs** for error messages
7. **Clear browser cache** if seeing stale data
8. **Use incognito mode** to test fresh session

---

## Getting Help

If issues persist:

1. **Check backend logs** for error messages
2. **Check browser console** for frontend errors
3. **Run test script**: `node backend/test-location-features.js`
4. **Verify database** has location data
5. **Test API directly** with curl/Postman
6. **Check all files** are saved
7. **Restart everything** (backend, frontend, browser)

---

**Last Updated**: February 9, 2026
