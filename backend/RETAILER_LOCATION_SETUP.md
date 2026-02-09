# Retailer Location Setup - Complete Guide

## ✅ Changes Made

The retailer registration and profile endpoints now **fully support location fields** including GPS coordinates.

## 🎯 What Was Updated

### 1. Retailer Registration (POST /api/auth/register)
Now accepts location fields during signup:
- `locality` - Store locality/area name
- `latitude` - GPS latitude coordinate
- `longitude` - GPS longitude coordinate
- `address` - Complete address object

### 2. Retailer Profile Update (PATCH /api/users/profile)
Now accepts location fields for updates:
- `locality` - Update store locality
- `latitude` - Update GPS latitude
- `longitude` - Update GPS longitude
- `address` - Update address details

### 3. Retailer Profile Response (GET /api/auth/profile)
Now returns location fields:
- `locality` - Store locality
- `latitude` - GPS latitude
- `longitude` - GPS longitude
- `has_gps` - Boolean indicating if GPS is set

### 4. User Model Profile Virtual
Updated to include location fields in profile response

## 📝 API Examples

### Retailer Registration with Location

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Raj Kumar",
  "phone": "9876543210",
  "password": "password123",
  "shop_name": "Raj Grocery Store",
  "language": "Hindi",
  
  // Location fields (NEW)
  "locality": "Banjara Hills",
  "latitude": 17.4239,
  "longitude": 78.4738,
  "address": {
    "street": "Road No 12",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500034"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "Raj Kumar",
      "shop_name": "Raj Grocery Store",
      "locality": "Banjara Hills",
      "latitude": 17.4239,
      "longitude": 78.4738,
      "has_gps": true,
      "address": {
        "street": "Road No 12",
        "city": "Hyderabad",
        "pincode": "500034"
      }
    },
    "token": "..."
  }
}
```

### Update Retailer Location

```bash
PATCH /api/users/profile
Authorization: Bearer <retailer_token>
Content-Type: application/json

{
  "locality": "Banjara Hills",
  "latitude": 17.4239,
  "longitude": 78.4738,
  "address": {
    "street": "Road No 12",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500034"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "Raj Kumar",
      "shop_name": "Raj Grocery Store",
      "locality": "Banjara Hills",
      "latitude": 17.4239,
      "longitude": 78.4738,
      "has_gps": true,
      "address": {
        "street": "Road No 12",
        "city": "Hyderabad",
        "pincode": "500034"
      }
    }
  }
}
```

### Get Retailer Profile

```bash
GET /api/auth/profile
Authorization: Bearer <retailer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "Raj Kumar",
      "shop_name": "Raj Grocery Store",
      "locality": "Banjara Hills",
      "latitude": 17.4239,
      "longitude": 78.4738,
      "has_gps": true,
      "address": {
        "city": "Hyderabad",
        "pincode": "500034"
      }
    }
  }
}
```

## 🧪 Testing Scenarios

### Test 1: Register Retailer with GPS
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Raj Kumar",
    "phone": "9876543210",
    "password": "password123",
    "shop_name": "Raj Grocery Store",
    "locality": "Banjara Hills",
    "latitude": 17.4239,
    "longitude": 78.4738,
    "address": {
      "city": "Hyderabad",
      "pincode": "500034"
    }
  }'
```

**Expected:** Registration successful with `has_gps: true`

### Test 2: Register Retailer without GPS
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sharma Store",
    "phone": "9876543211",
    "password": "password123",
    "shop_name": "Sharma Kirana",
    "locality": "Jubilee Hills"
  }'
```

**Expected:** Registration successful with `has_gps: false`, `latitude: null`, `longitude: null`

### Test 3: Update Retailer GPS Location
```bash
curl -X PATCH http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 17.4239,
    "longitude": 78.4738,
    "locality": "Banjara Hills"
  }'
```

**Expected:** Profile updated with GPS coordinates, `has_gps: true`

### Test 4: Verify GPS in Profile
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

**Expected:** Profile includes `latitude`, `longitude`, `locality`, `has_gps`

### Test 5: Customer Searches for Retailer
```bash
# Customer with GPS searches
curl -X GET "http://localhost:5000/api/customer-requests/retailers?range=10" \
  -H "Authorization: Bearer <customer_token>"
```

**Expected:** 
- Retailers WITH GPS appear with `distance_km`
- Retailers WITHOUT GPS do NOT appear
- Response shows `filter_method: "gps"`

## 📱 Frontend Integration

### Retailer Signup Form

```javascript
const RetailerSignup = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    shop_name: '',
    locality: '',
    latitude: null,
    longitude: null,
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  const requestGPSLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          alert('✅ Store location captured!');
        },
        (error) => {
          console.error('GPS error:', error);
          alert('⚠️ Please enter your store location manually');
        }
      );
    } else {
      alert('⚠️ GPS not supported by your browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    if (data.success) {
      alert('✅ Store registered successfully!');
      if (data.data.user.has_gps) {
        alert('📍 Your store is now discoverable by nearby customers!');
      } else {
        alert('⚠️ Set GPS location to be discovered by nearby customers');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register Your Store</h2>
      
      {/* Basic fields */}
      <input
        type="text"
        placeholder="Your Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Shop Name"
        value={formData.shop_name}
        onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
        required
      />
      
      {/* Location Section */}
      <div className="location-section">
        <h3>📍 Store Location</h3>
        <p>Help customers find your store easily!</p>
        
        <button type="button" onClick={requestGPSLocation} className="gps-button">
          📍 Capture Store Location (GPS)
        </button>
        
        {formData.latitude && formData.longitude ? (
          <div className="gps-status success">
            ✅ GPS Location Captured
            <br />
            Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
          </div>
        ) : (
          <div className="gps-status warning">
            ⚠️ GPS Not Set - Set location to be discovered by nearby customers
          </div>
        )}
        
        <input
          type="text"
          placeholder="Locality (e.g., Banjara Hills)"
          value={formData.locality}
          onChange={(e) => setFormData({...formData, locality: e.target.value})}
        />
        
        <input
          type="text"
          placeholder="Street Address"
          value={formData.address.street}
          onChange={(e) => setFormData({
            ...formData,
            address: {...formData.address, street: e.target.value}
          })}
        />
        
        <input
          type="text"
          placeholder="City"
          value={formData.address.city}
          onChange={(e) => setFormData({
            ...formData,
            address: {...formData.address, city: e.target.value}
          })}
        />
        
        <input
          type="text"
          placeholder="Pincode"
          value={formData.address.pincode}
          onChange={(e) => setFormData({
            ...formData,
            address: {...formData.address, pincode: e.target.value}
          })}
        />
      </div>
      
      <button type="submit">Register Store</button>
    </form>
  );
};
```

### Retailer Profile Page

```javascript
const RetailerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const response = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setProfile(data.data.user);
    }
    setLoading(false);
  };

  const updateGPSLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const response = await fetch('/api/users/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setProfile(data.data.user);
          alert('✅ Store location updated successfully!');
        }
      },
      (error) => {
        alert('⚠️ Could not get GPS location');
      }
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <h2>Store Profile</h2>
      
      <div className="profile-section">
        <h3>Store Information</h3>
        <p><strong>Shop Name:</strong> {profile.shop_name}</p>
        <p><strong>Owner:</strong> {profile.name}</p>
        <p><strong>Phone:</strong> {profile.phone}</p>
      </div>
      
      <div className="location-section">
        <h3>📍 Store Location</h3>
        
        {profile.has_gps ? (
          <div className="gps-status success">
            <p>✅ GPS Location Set</p>
            <p>Latitude: {profile.latitude}</p>
            <p>Longitude: {profile.longitude}</p>
            <p>Locality: {profile.locality}</p>
            <p className="success-message">
              🎉 Your store is discoverable by nearby customers!
            </p>
          </div>
        ) : (
          <div className="gps-status warning">
            <p>⚠️ GPS Location Not Set</p>
            <p className="warning-message">
              Set your GPS location to be discovered by nearby customers
            </p>
          </div>
        )}
        
        <button onClick={updateGPSLocation} className="update-gps-button">
          📍 {profile.has_gps ? 'Update' : 'Set'} Store Location
        </button>
        
        <div className="address-info">
          <p><strong>Address:</strong></p>
          <p>{profile.address.street}</p>
          <p>{profile.address.city}, {profile.address.pincode}</p>
        </div>
      </div>
    </div>
  );
};
```

## ✅ Verification Checklist

### Backend
- [x] Retailer registration accepts location fields
- [x] Retailer profile update accepts location fields
- [x] Retailer profile response includes location fields
- [x] User model profile virtual includes location
- [x] GeoJSON location auto-syncs on save

### Frontend (To Do)
- [ ] Add GPS capture button to retailer signup
- [ ] Add location fields to signup form
- [ ] Show GPS status in profile page
- [ ] Add "Update Location" button in profile
- [ ] Display GPS coordinates in profile
- [ ] Show "has_gps" status indicator

### Testing
- [ ] Register retailer with GPS
- [ ] Register retailer without GPS
- [ ] Update retailer GPS location
- [ ] Verify GPS in profile response
- [ ] Customer searches show GPS retailers
- [ ] Customer searches hide non-GPS retailers

## 🎉 Result

Retailers can now set their GPS location during registration or update it later in their profile. This makes them discoverable by nearby customers using distance-based filtering!

**Both customer and retailer location capture is now fully implemented on the backend. Frontend integration is the next step.**
