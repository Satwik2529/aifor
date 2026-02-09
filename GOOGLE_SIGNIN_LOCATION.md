# 📍 Google Sign-In with Location Capture

## Overview
Location is now captured during Google sign-in, just like during normal signup.

## How It Works

### User Flow:
1. User clicks "Continue with Google"
2. **Location permission popup appears**
3. User allows/denies location
4. Redirects to Google OAuth
5. Completes Google authentication
6. Location sent to backend (if captured)
7. Account created/updated with location

### Technical Flow:
1. **LoginNew.jsx**: Captures location before OAuth redirect
2. **Stores in localStorage**: `pendingGoogleLocation`
3. **AuthCallback.jsx**: Retrieves location after OAuth
4. **Sends to backend**: Includes location in API request
5. **googleAuthController.js**: Saves location to database

## Files Modified

### Frontend:
- ✅ `frontend/src/pages/LoginNew.jsx` - Added location capture
- ✅ `frontend/src/pages/AuthCallback.jsx` - Send location to backend

### Backend:
- ✅ `backend/src/controllers/googleAuthController.js` - Handle location data

## Features

- ✅ Location captured before Google OAuth
- ✅ Non-blocking (continues if denied)
- ✅ Toast notifications for feedback
- ✅ 10-second timeout
- ✅ Works for both retailers and customers
- ✅ Updates location on each sign-in

## User Experience

### Success Flow:
1. Click "Continue with Google"
2. Toast: "Requesting location permission..."
3. Browser shows location popup
4. User clicks "Allow"
5. Toast: "Location captured!" ✅
6. Redirects to Google
7. Completes authentication
8. Location saved to database

### Denied Flow:
1. Click "Continue with Google"
2. Toast: "Requesting location permission..."
3. Browser shows location popup
4. User clicks "Block"
5. Toast: "Location permission denied - continuing without location" ℹ️
6. Redirects to Google
7. Completes authentication
8. Account created without location

## API Request

```javascript
POST /api/auth/google-login
{
  "email": "user@example.com",
  "name": "John Doe",
  "google_id": "...",
  "avatar_url": "...",
  "intended_user_type": "retailer",
  "location": {  // Optional
    "latitude": 26.249273,
    "longitude": 78.169700,
    "accuracy": 84,
    "timestamp": "2026-02-09T12:29:42.219Z"
  }
}
```

## Backend Handling

### For Existing Users:
- Updates location on each sign-in
- Keeps user data fresh

### For New Users:
- Location saved during account creation
- Available immediately for features

## Testing

1. Go to http://localhost:3000/login
2. Click "Continue with Google"
3. **Allow location** when prompted
4. Complete Google sign-in
5. Check backend logs: `✅ Updated user location` or `with location: true`

## Console Logs

### Frontend:
```
📍 Requesting location permission...
✅ Location captured: {latitude, longitude, accuracy, timestamp}
🔵 Proceeding to Google OAuth...
```

### Backend:
```
🔐 Google login attempt: {email, name, google_id, intended_user_type, hasLocation: true}
✅ Updated user location
or
✅ New retailer created via Google: user@example.com with location: true
```

## Privacy

- ✅ Location only requested during sign-in
- ✅ User can deny permission
- ✅ Sign-in continues without location
- ✅ Clear feedback via toast messages
- ✅ Stored securely in MongoDB

---

**Status**: ✅ Complete
**Version**: 1.0
**Last Updated**: February 9, 2026
