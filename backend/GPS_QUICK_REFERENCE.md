# GPS Feature - Quick Reference Card

## 🎯 One-Line Summary
**GPS distance filtering requires BOTH customer AND retailer to have GPS coordinates set.**

## ✅ Requirements

### Customer
- `latitude` (required for GPS filtering)
- `longitude` (required for GPS filtering)
- `locality` (optional, for fallback)

### Retailer
- `latitude` (required for GPS filtering)
- `longitude` (required for GPS filtering)
- `locality` (optional, for fallback)

## 📊 Quick Matrix

| Customer | Retailer | Result |
|----------|----------|--------|
| GPS ✅ | GPS ✅ | **Distance filtering** |
| GPS ✅ | No GPS ❌ | **Retailer hidden** |
| No GPS ❌ | GPS ✅ | **Locality filtering** |
| No GPS ❌ | No GPS ❌ | **Default list** |

## 🔧 API Endpoints

### Set Customer GPS
```bash
PATCH /api/customer-auth/profile
{"latitude": 17.4399, "longitude": 78.4089}
```

### Set Retailer GPS
```bash
PATCH /api/users/profile
{"latitude": 17.4239, "longitude": 78.4738}
```

### Search with Range
```bash
GET /api/customer-requests/retailers?range=10
# range: 5, 10, 15, 20 (km)
```

## 📱 Response Fields

```json
{
  "filter_method": "gps|locality|default",
  "range_km": 10,
  "retailers": [{
    "distance_km": 2.5  // Only if GPS active
  }],
  "gps_info": {
    "customer_has_gps": true,
    "retailers_require_gps": true
  }
}
```

## 🧪 Quick Test

```bash
# 1. Set both GPS
curl -X PATCH .../customer-auth/profile -d '{"latitude":17.4399,"longitude":78.4089}'
curl -X PATCH .../users/profile -d '{"latitude":17.4239,"longitude":78.4738}'

# 2. Search
curl ".../retailers?range=10"

# 3. Check response
# Should show: distance_km, filter_method: "gps"
```

## 🚨 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No retailers shown | Retailers don't have GPS | Retailers set GPS |
| No distance shown | Customer doesn't have GPS | Customer sets GPS |
| Wrong distances | Invalid coordinates | Verify lat/lng values |

## 📚 Full Documentation

- `GPS_REQUIREMENTS.md` - Complete requirements guide
- `FINAL_GPS_SUMMARY.md` - Implementation summary
- `GPS_DISTANCE_FILTERING.md` - Detailed GPS guide
- `LOCATION_SETUP_GUIDE.md` - Frontend integration

## ✨ Key Takeaway

**Both parties need GPS for distance-based filtering. Otherwise, system falls back to locality/default filtering.**
