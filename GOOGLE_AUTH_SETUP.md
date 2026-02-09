# Google Authentication with Supabase - Setup Guide 🔐

## 📋 Overview

Added "Continue with Google" button to login page using Supabase OAuth. Users can sign in with their Google account instead of phone/email and password.

## 🎯 What Was Implemented

### Frontend Changes:
1. ✅ Installed `@supabase/supabase-js`
2. ✅ Created Supabase configuration (`frontend/src/config/supabase.js`)
3. ✅ Added Google sign-in button to LoginNew page
4. ✅ Created AuthCallback page for OAuth redirect
5. ✅ Added `/auth/callback` route to App.jsx
6. ✅ Updated `.env` with Supabase credentials

### Backend Changes:
1. ✅ Created Google Auth controller (`backend/src/controllers/googleAuthController.js`)
2. ✅ Added `/api/auth/google-login` endpoint
3. ✅ Updated User model with `google_id` and `avatar_url` fields
4. ✅ Handles both new user creation and existing user login

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (or create account)
4. Click "New Project"
5. Fill in:
   - **Name:** biznova (or your choice)
   - **Database Password:** (generate strong password)
   - **Region:** Choose closest to you
6. Click "Create new project"
7. Wait 2-3 minutes for project to be ready

### Step 2: Get Supabase Credentials

1. In your Supabase project dashboard
2. Go to **Settings** (gear icon) → **API**
3. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 3: Configure Google OAuth in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Click to expand Google settings
4. Toggle **Enable Sign in with Google** to ON
5. You'll need Google OAuth credentials (next step)

### Step 4: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: **BizNova**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Add `email` and `profile` (or skip)
   - Test users: Add your email (for testing)
   - Click **Save and Continue**
6. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: **BizNova Web**
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://your-production-domain.com`
   - Authorized redirect URIs:
     - `https://YOUR_SUPABASE_PROJECT_URL/auth/v1/callback`
     - Example: `https://xxxxx.supabase.co/auth/v1/callback`
   - Click **Create**
7. Copy **Client ID** and **Client Secret**

### Step 5: Add Google Credentials to Supabase

1. Back in Supabase dashboard → **Authentication** → **Providers** → **Google**
2. Paste:
   - **Client ID** (from Google Console)
   - **Client Secret** (from Google Console)
3. Click **Save**

### Step 6: Update Frontend .env

Edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual values from Step 2.

### Step 7: Restart Frontend

```bash
cd frontend
npm start
```

## 🧪 Testing

### Test 1: Google Sign In
1. Go to `http://localhost:3000/login`
2. Click **"Continue with Google"** button
3. Should redirect to Google sign-in page
4. Select your Google account
5. Grant permissions
6. Should redirect back to `/auth/callback`
7. Should then redirect to `/dashboard`
8. ✅ You're logged in!

### Test 2: Existing User
1. If you already have an account with the same email
2. Google sign-in will link to existing account
3. Updates account with Google ID and avatar

### Test 3: New User
1. Sign in with Google account not in database
2. Creates new retailer account automatically
3. Uses Google name and email
4. Shop name set to "{Name}'s Shop"

## 📊 How It Works

### Flow Diagram:
```
User clicks "Continue with Google"
    ↓
Frontend calls signInWithGoogle()
    ↓
Redirects to Google OAuth page
    ↓
User signs in with Google
    ↓
Google redirects to Supabase
    ↓
Supabase redirects to /auth/callback
    ↓
AuthCallback page gets session
    ↓
Sends Google data to backend /api/auth/google-login
    ↓
Backend checks if user exists
    ↓
If exists: Login and return token
If new: Create account and return token
    ↓
Frontend stores token
    ↓
Redirects to /dashboard
```

### Data Flow:

**From Google:**
- Email
- Name
- Google ID
- Avatar URL

**To Backend:**
```json
{
  "email": "user@gmail.com",
  "name": "John Doe",
  "google_id": "1234567890",
  "avatar_url": "https://...",
  "provider": "google"
}
```

**Backend Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "user@gmail.com",
      "shop_name": "John's Shop",
      "avatar_url": "https://...",
      "userType": "retailer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 🔧 Files Created/Modified

### Frontend:
1. ✅ `frontend/src/config/supabase.js` - Supabase client setup
2. ✅ `frontend/src/pages/AuthCallback.jsx` - OAuth callback handler
3. ✅ `frontend/src/pages/LoginNew.jsx` - Added Google button
4. ✅ `frontend/src/App.jsx` - Added /auth/callback route
5. ✅ `frontend/.env` - Added Supabase credentials
6. ✅ `frontend/package.json` - Added @supabase/supabase-js

### Backend:
1. ✅ `backend/src/controllers/googleAuthController.js` - Google auth logic
2. ✅ `backend/src/routes/authRoutes.js` - Added /google-login route
3. ✅ `backend/src/models/User.js` - Added google_id and avatar_url fields

## 🎨 UI Features

### Google Button Design:
- Full-width button below regular login
- Google logo (4-color)
- "Continue with Google" text
- Loading state with spinner
- Disabled state during authentication
- Hover effects
- Dark mode support

### Divider:
- "Or continue with" text
- Horizontal line on both sides
- Clean separation from regular login

## 🔒 Security Features

1. **OAuth 2.0:** Industry-standard authentication
2. **JWT Tokens:** Secure session management
3. **HTTPS Only:** Production requires HTTPS
4. **Token Expiry:** 30-day expiration
5. **Session Persistence:** Auto-refresh tokens
6. **CORS Protection:** Backend validates origins

## ⚠️ Important Notes

### For Development:
- Works on `http://localhost:3000`
- Google OAuth allows localhost for testing
- No HTTPS required for localhost

### For Production:
- **MUST use HTTPS** (Google requirement)
- Update authorized origins in Google Console
- Update redirect URI in Google Console
- Update `REACT_APP_SUPABASE_URL` in production .env

### Redirect URIs:
Make sure these match exactly:
- Google Console: `https://YOUR_SUPABASE_URL/auth/v1/callback`
- Supabase: Automatically configured
- Frontend: `${window.location.origin}/auth/callback`

## 🐛 Troubleshooting

### Problem: "Invalid redirect URI"
**Solution:**
1. Check Google Console authorized redirect URIs
2. Must include: `https://YOUR_SUPABASE_URL/auth/v1/callback`
3. No trailing slash
4. Exact match required

### Problem: "Supabase client error"
**Solution:**
1. Check `.env` has correct `REACT_APP_SUPABASE_URL`
2. Check `.env` has correct `REACT_APP_SUPABASE_ANON_KEY`
3. Restart frontend after changing .env
4. Clear browser cache

### Problem: "Google sign in failed"
**Solution:**
1. Check Google OAuth is enabled in Supabase
2. Check Client ID and Secret are correct
3. Check Google Cloud project is active
4. Check OAuth consent screen is configured

### Problem: "Backend error 500"
**Solution:**
1. Check backend is running
2. Check `/api/auth/google-login` route exists
3. Check User model has google_id field
4. Check MongoDB connection

### Problem: "Stuck on callback page"
**Solution:**
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify backend endpoint is reachable
4. Check token is being stored in localStorage

## 📱 Mobile Support

- ✅ Responsive design
- ✅ Works on mobile browsers
- ✅ Touch-friendly button size
- ✅ Mobile OAuth flow supported

## 🚀 Next Steps (Optional)

1. **Add More Providers:**
   - Facebook Login
   - Apple Sign In
   - Microsoft Account

2. **Profile Completion:**
   - After Google sign-in, ask for phone number
   - Ask for shop details
   - Onboarding flow

3. **Avatar Display:**
   - Show Google avatar in header
   - Use in profile settings
   - Display in user menu

4. **Account Linking:**
   - Link Google account to existing phone-based account
   - Merge accounts if email matches

## 📊 Current Status

✅ Supabase client installed
✅ Google OAuth configured
✅ Login button added
✅ Callback page created
✅ Backend endpoint created
✅ User model updated
✅ Routes configured
✅ **Navigation fixed** - Uses `window.location.href` for hard redirect
✅ **Phone validation fixed** - Google users can sign up without phone number
✅ **Language validation fixed** - Defaults to 'English' for Google users
✅ **FULLY WORKING** - End-to-end OAuth flow tested and confirmed

### Recent Fixes:

#### Navigation Fix:
The initial implementation used `navigate()` from react-router, which doesn't trigger a page reload. This meant AuthContext wasn't re-checking authentication after Google login. Fixed by using `window.location.href` for a hard redirect that forces the app to reload and AuthContext to re-initialize with the new token.

#### Phone & Language Validation Fix:
Google OAuth doesn't provide phone numbers, and returns language codes like 'en' instead of full names. Fixed by:
1. Making phone field optional for Google users (using `google_id` check)
2. Using `sparse: true` to allow multiple empty phone values
3. Defaulting language to 'English' for Google users
4. Custom validator that allows empty phone if user has `google_id`

## 🎯 Quick Start Checklist

- [ ] Create Supabase project
- [ ] Get Supabase URL and anon key
- [ ] Create Google OAuth app
- [ ] Get Google Client ID and Secret
- [ ] Add credentials to Supabase
- [ ] Update frontend/.env
- [ ] Restart frontend
- [ ] Test Google sign in
- [ ] ✅ Working!

**Need help? Check the troubleshooting section or console logs for errors.**
