# 📍 Location Features - Quick Reference

## 🚀 Quick Start

### Start Application
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

### Access Features
- Profile Location: `/profile-settings` → Scroll to "Location Information"
- Nearby Shops: `/customer/nearby-shops` (customers only)

---

## 📋 API Endpoints

### Update Location
```
PUT /api/auth/update-location              (Retailers)
PUT /api/customer-auth/update-location     (Customers)

Headers: Authorization: Bearer <token>
Body: { latitude, longitude, accuracy?, locality? }
```

### Get Nearby Shops
```
GET /api/nearby-shops?latitude=X&longitude=Y&radius=Z

Headers: Authorization: Bearer <token>
Query: latitude (required), longitude (required), radius (optional, default: 10)
```

---

## 🗂️ File Locations

### Backend
- Controller: `backend/src/controllers/nearbyShopsController.js`
- Routes: `backend/src/routes/nearbyShopsRoutes.js`
- Auth Controller: `backend/src/controllers/authController.js` (updateLocation method)
- Customer Auth: `backend/src/controllers/customerAuthController.js` (updateLocation method)

### Frontend
- Profile: `frontend/src/pages/ProfileSettings.jsx`
- Nearby Shops: `frontend/src/pages/NearbyShops.jsx`
- Routes: `frontend/src/App.jsx`

### Documentation
- Complete Guide: `LOCATION_FEATURES_COMPLETE.md`
- Test Guide: `LOCATION_FEATURES_TEST_GUIDE.md`
- Status: `LOCATION_FEATURES_STATUS.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`

---

## 🧪 Quick Test

### Test Profile Location
1. Login → Profile Settings
2. Scroll to "Location Information"
3. Click "Update Location"
4. Allow permission
5. ✅ Coordinates displayed

### Test Nearby Shops
1. Login as customer
2. Go to `/customer/nearby-shops`
3. Allow permission
4. ✅ Shops displayed with distance

---

## 🔧 Troubleshooting

### Location Permission Denied
- Clear browser site data
- Check browser settings → Site permissions
- Allow location for localhost

### No Shops Found
- Ensure retailers have location set
- Try larger radius (50km)
- Check database: `db.users.find({ latitude: { $exists: true } })`

### API Errors
- Check JWT token is valid
- Verify route is registered in server.js
- Check backend logs for errors

---

## 📊 Database Queries

### Check User Location
```javascript
// Retailer
db.users.findOne({ email: "user@example.com" }, { latitude: 1, longitude: 1, locality: 1 })

// Customer
db.customerusers.findOne({ email: "user@example.com" }, { latitude: 1, longitude: 1, locality: 1 })
```

### Count Users with Location
```javascript
db.users.find({ latitude: { $exists: true, $ne: null } }).count()
db.customerusers.find({ latitude: { $exists: true, $ne: null } }).count()
```

---

## 🎯 Key Features

### Profile Location
- ✅ Display coordinates
- ✅ Update location button
- ✅ Google Maps link
- ✅ Last updated timestamp
- ✅ Works for retailers & customers

### Nearby Shops
- ✅ Find shops by radius (5, 10, 20, 50 km)
- ✅ Sort by distance
- ✅ Get directions
- ✅ View shop details
- ✅ Customer-only feature

---

## 📱 User Flow

### Retailer
1. Set location during signup OR
2. Update in Profile Settings
3. Be discovered by nearby customers

### Customer
1. Set location during signup OR
2. Update in Profile Settings
3. Use Nearby Shops to find stores
4. Get directions to any shop

---

## ✅ Success Indicators

- ✅ No console errors
- ✅ Toast notifications appear
- ✅ Coordinates displayed correctly
- ✅ Google Maps opens
- ✅ Distance calculations accurate
- ✅ Backend logs show success

---

**Status**: 🟢 Production Ready  
**Last Updated**: February 9, 2026
