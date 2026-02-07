# 🚀 Deployment Google Auth Fix

## Issue
When using Google Sign-In on deployed URL (https://biznova1-fnd.onrender.com/), it redirects to localhost:3000 instead of staying on the deployed domain.

## Root Causes

1. **Supabase Redirect URL Not Configured**: Need to add production URL to Supabase allowed redirect URLs
2. **API URL Hardcoded**: Frontend .env has localhost hardcoded

## Solution

### Step 1: Configure Supabase Redirect URLs

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://biznova1-fnd.onrender.com/auth/callback
   ```
5. Set **Site URL** to: `https://biznova1-fnd.onrender.com`
6. Click **Save**

### Step 2: Update Frontend Environment Variables

For **Production** (Render.com):

1. Go to your Render dashboard
2. Select your frontend service
3. Go to **Environment** tab
4. Add/Update these variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   REACT_APP_SUPABASE_URL=https://xwbitqlrdrweyoialjdj.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Click **Save Changes**
6. Render will automatically redeploy

### Step 3: Update Backend CORS Settings

Make sure your backend allows requests from the production frontend URL.

Check `backend/src/server.js` or wherever CORS is configured:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://biznova1-fnd.onrender.com'
  ],
  credentials: true
}));
```

## Quick Fix for Local Development

Your current setup works fine for localhost. The code already uses `window.location.origin` for redirects, which is correct.

## Environment-Specific Configuration

### Option 1: Use Environment Variables (Recommended)

Update `frontend/.env`:
```env
# For local development
REACT_APP_API_URL=http://localhost:5000

# For production, set in Render dashboard:
# REACT_APP_API_URL=https://your-backend-url.onrender.com
```

### Option 2: Auto-detect Environment

Update `frontend/src/services/api.js` to auto-detect:

```javascript
// Auto-detect API URL based on environment
const getApiUrl = () => {
  // If running on localhost, use localhost backend
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:5000';
  }
  // If deployed, use production backend
  return process.env.REACT_APP_API_URL || 'https://your-backend-url.onrender.com';
};

const API_BASE_URL = getApiUrl();
```

## Testing

### Test Locally:
1. ✅ Google Sign-In should redirect to `http://localhost:3000/auth/callback`
2. ✅ Should login successfully
3. ✅ Should redirect to dashboard

### Test on Production:
1. ✅ Google Sign-In should redirect to `https://biznova1-fnd.onrender.com/auth/callback`
2. ✅ Should login successfully
3. ✅ Should stay on production URL

## Common Issues

### Issue: "Redirect URL not allowed"
**Solution**: Add the URL to Supabase allowed redirect URLs (Step 1)

### Issue: "Network Error" or "ERR_CONNECTION_REFUSED"
**Solution**: Update `REACT_APP_API_URL` to point to production backend (Step 2)

### Issue: "CORS Error"
**Solution**: Update backend CORS settings to allow production frontend URL (Step 3)

### Issue: Still redirecting to localhost
**Solution**: 
1. Clear browser cache and cookies
2. Check Supabase Site URL is set to production URL
3. Verify environment variables are set correctly in Render

## Deployment Checklist

- [ ] Supabase redirect URLs configured
- [ ] Supabase Site URL set to production URL
- [ ] Frontend environment variables set in Render
- [ ] Backend environment variables set in Render
- [ ] Backend CORS allows production frontend URL
- [ ] Both services deployed and running
- [ ] Test Google Sign-In on production URL
- [ ] Verify no localhost redirects

## Important Notes

1. **Supabase Configuration**: Must be done in Supabase dashboard, not in code
2. **Environment Variables**: Must be set in Render dashboard for production
3. **Redeploy**: After changing environment variables, Render will redeploy automatically
4. **Cache**: Clear browser cache after deployment to see changes

---

**Status**: 📋 Action Required  
**Priority**: 🔴 High  
**Estimated Time**: 5-10 minutes
