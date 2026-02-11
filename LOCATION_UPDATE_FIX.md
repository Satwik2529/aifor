# Location Update Fix - Retailer Not Showing to Customers

## Problem
When retailer updates their location from Profile Settings, the shop doesn't show up to customers in nearby shops or retailer discovery.

## Root Cause
The `updateLocation` method was using `findByIdAndUpdate()` which bypasses Mongoose middleware. The User model has a `pre('save')` hook that updates the GeoJSON `location` field, but this hook wasn't being triggered.

```javascript
// User Model pre-save hook (wasn't being triggered)
userSchema.pre('save', async function (next) {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    if (this.latitude && this.longitude) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude] // GeoJSON format
      };
    }
  }
  // ... password hashing
});
```

The geospatial queries use the `location` field (GeoJSON format), not `latitude`/`longitude` directly:

```javascript
// Nearby shops query
location: {
  $near: {
    $geometry: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    $maxDistance: rangeInMeters
  }
}
```

## Solution

Changed from `findByIdAndUpdate()` to `find()` + `save()` pattern to trigger the pre-save hook:

### Before (Broken):
```javascript
const user = await User.findByIdAndUpdate(
  userId,
  { latitude, longitude, locality },
  { new: true, runValidators: true }
);
```

### After (Fixed):
```javascript
// Find user first
const user = await User.findById(userId);

// Update fields
user.latitude = latitude;
user.longitude = longitude;
user.locality = locality;

// Update GeoJSON location explicitly
user.location = {
  type: 'Point',
  coordinates: [longitude, latitude]
};

// Save to trigger pre-save hooks
await user.save();
```

## Files Fixed

### Backend
1. `backend/src/controllers/authController.js` - Fixed `updateLocation` method
2. `backend/src/controllers/customerAuthController.js` - Fixed `updateLocation` method

## How to Test

### Step 1: Restart Backend
```bash
cd backend
npm start
```

### Step 2: Update Retailer Location
1. Login as retailer
2. Go to Profile Settings
3. Click "Update Location" or "Capture Location"
4. Check console logs for:
   ```
   📍 Location updated for user: ...
   📍 GeoJSON location: { type: 'Point', coordinates: [lng, lat] }
   ```

### Step 3: Verify in Database
```javascript
// In MongoDB shell or Compass
db.users.findOne({ role: 'retailer' })

// Should have:
{
  latitude: 28.6139,
  longitude: 77.2090,
  location: {
    type: 'Point',
    coordinates: [77.2090, 28.6139]  // [lng, lat] order
  }
}
```

### Step 4: Test Customer Discovery
1. Login as customer
2. Update your location in Profile Settings
3. Go to "Browse Stores" or "Nearby Shops"
4. Should see retailers within range

### Step 5: Run Test Script (Optional)
```bash
node backend/test-location-update.js
```

Expected output:
```
✅ SUCCESS: GeoJSON location is correctly set!
✅ Geospatial query works!
```

## Verification Checklist

- [ ] Backend restarted
- [ ] Retailer updates location in Profile Settings
- [ ] Console shows GeoJSON location in logs
- [ ] Database has `location` field with GeoJSON format
- [ ] Customer can see retailer in nearby shops
- [ ] Distance calculation works correctly
- [ ] Geospatial queries return results

## Technical Details

### GeoJSON Format
MongoDB requires GeoJSON format for geospatial queries:
```javascript
{
  type: 'Point',
  coordinates: [longitude, latitude]  // Note: [lng, lat] order!
}
```

### 2dsphere Index
The User model has a 2dsphere index on the `location` field:
```javascript
userSchema.index({ location: '2dsphere' });
```

This enables efficient geospatial queries like `$near`, `$geoWithin`, etc.

### Pre-Save Hook
The pre-save hook automatically updates the GeoJSON location when latitude/longitude changes:
```javascript
userSchema.pre('save', async function (next) {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    if (this.latitude && this.longitude) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude]
      };
    }
  }
  next();
});
```

## Why findByIdAndUpdate Doesn't Work

`findByIdAndUpdate()` is a direct MongoDB operation that bypasses Mongoose middleware:
- ❌ Doesn't trigger `pre('save')` hooks
- ❌ Doesn't trigger `post('save')` hooks
- ❌ Doesn't run custom validation in hooks
- ✅ Faster for simple updates
- ✅ Atomic operation

For location updates, we need the pre-save hook to run, so we use `find()` + `save()`.

## Common Issues

### Issue 1: Still Not Showing
**Solution**: Make sure to restart backend server after code changes

### Issue 2: Old Retailers Not Showing
**Solution**: Old retailers need to update their location once to set the GeoJSON field
```javascript
// Migration script to fix old retailers
db.users.find({ role: 'retailer', latitude: { $exists: true } }).forEach(user => {
  if (user.latitude && user.longitude) {
    db.users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          location: {
            type: 'Point',
            coordinates: [user.longitude, user.latitude]
          }
        }
      }
    );
  }
});
```

### Issue 3: Geospatial Query Fails
**Solution**: Ensure 2dsphere index exists
```javascript
// In MongoDB shell
db.users.getIndexes()

// Should see:
{
  "key": { "location": "2dsphere" },
  "name": "location_2dsphere"
}

// If not, create it:
db.users.createIndex({ location: "2dsphere" })
```

## Migration for Existing Retailers

If you have existing retailers with latitude/longitude but no GeoJSON location:

```bash
# Create migration script
node backend/migrate-location-geojson.js
```

Or manually in MongoDB:
```javascript
db.users.find({ 
  role: 'retailer', 
  latitude: { $exists: true, $ne: null },
  longitude: { $exists: true, $ne: null }
}).forEach(user => {
  db.users.updateOne(
    { _id: user._id },
    { 
      $set: { 
        location: {
          type: 'Point',
          coordinates: [user.longitude, user.latitude]
        }
      }
    }
  );
  print('Updated: ' + user.name);
});
```

## Benefits of This Fix

1. ✅ Retailers show up immediately after location update
2. ✅ Geospatial queries work correctly
3. ✅ Distance calculations are accurate
4. ✅ Nearby shops feature works as expected
5. ✅ Pre-save hooks run properly
6. ✅ Consistent data format in database

---

**Status**: ✅ Fixed and Ready to Test
**Priority**: High - Core Discovery Feature
**Impact**: All retailer location updates
**Testing**: Restart backend and update retailer location
