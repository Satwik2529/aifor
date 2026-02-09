# 🚀 Complete Deployment Guide

## Overview
This guide covers deploying your BizNova application to Render.com with Google OAuth support.

---

## Prerequisites

- [ ] GitHub repository with your code
- [ ] Render.com account
- [ ] MongoDB Atlas account (for database)
- [ ] Supabase account (for Google OAuth)
- [ ] Google Cloud Console project (for OAuth credentials)

---

## Part 1: Backend Deployment (Render.com)

### Step 1: Create Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `biznova-backend` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 2: Set Backend Environment Variables

In Render dashboard, go to **Environment** tab and add:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.onrender.com

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-here

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=BizNova <your-email@gmail.com>

# AI Services
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-key (optional)
DEEPGRAM_API_KEY=your-deepgram-key (optional)
IMAGE_API_KEY=your-image-api-key (optional)
```

### Step 3: Deploy Backend

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://biznova-backend.onrender.com`

---

## Part 2: Frontend Deployment (Render.com)

### Step 1: Update API URL in Code

Before deploying, update `frontend/src/services/api.js`:

```javascript
// Production - Update with your actual backend URL
return 'https://biznova-backend.onrender.com'; // Your backend URL here
```

Commit and push this change.

### Step 2: Create Frontend Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Static Site**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `biznova-frontend` (or your choice)
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

### Step 3: Set Frontend Environment Variables

In Render dashboard, go to **Environment** tab and add:

```env
# API Configuration
REACT_APP_API_URL=https://biznova-backend.onrender.com

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 4: Deploy Frontend

1. Click **Create Static Site**
2. Wait for deployment (5-10 minutes)
3. Note your frontend URL: `https://biznova-frontend.onrender.com`

---

## Part 3: Supabase Configuration

### Step 1: Configure Redirect URLs

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add these to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://biznova-frontend.onrender.com/auth/callback
   ```
5. Set **Site URL** to: `https://biznova-frontend.onrender.com`
6. Click **Save**

### Step 2: Verify Google OAuth Provider

1. In Supabase, go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Click **Save**

---

## Part 4: Google Cloud Console

### Step 1: Configure Authorized Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add these to **Authorized redirect URIs**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
6. Add these to **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://biznova-frontend.onrender.com
   ```
7. Click **Save**

---

## Part 5: Backend CORS Configuration

Update `backend/src/server.js` to allow your frontend URL:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://biznova-frontend.onrender.com' // Your frontend URL
  ],
  credentials: true
}));
```

Commit, push, and Render will auto-redeploy.

---

## Part 6: Testing

### Test Locally:
1. ✅ `npm start` in backend folder
2. ✅ `npm start` in frontend folder
3. ✅ Test all features including Google Sign-In

### Test on Production:
1. ✅ Visit your frontend URL
2. ✅ Test regular login/register
3. ✅ Test Google Sign-In
4. ✅ Verify no localhost redirects
5. ✅ Test all main features

---

## Common Issues & Solutions

### Issue: "Network Error" or "ERR_CONNECTION_REFUSED"
**Solution**: 
- Check `REACT_APP_API_URL` is set correctly in frontend
- Verify backend is deployed and running
- Check backend URL in `frontend/src/services/api.js`

### Issue: "Redirect URL not allowed"
**Solution**: 
- Add production URL to Supabase redirect URLs
- Add Supabase callback URL to Google Cloud Console

### Issue: "CORS Error"
**Solution**: 
- Update backend CORS to allow frontend URL
- Redeploy backend after changes

### Issue: Google Sign-In redirects to localhost
**Solution**: 
- Set Supabase Site URL to production URL
- Clear browser cache and cookies
- Verify redirect URLs in Supabase

### Issue: Backend not connecting to MongoDB
**Solution**: 
- Check `MONGODB_URI` is correct
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Check MongoDB Atlas user has correct permissions

---

## Deployment Checklist

### Backend:
- [ ] Service created on Render
- [ ] Environment variables set
- [ ] MongoDB connection working
- [ ] JWT_SECRET set (secure random string)
- [ ] Email configuration set
- [ ] Gemini API key set
- [ ] CORS allows frontend URL
- [ ] Service deployed and running

### Frontend:
- [ ] Static site created on Render
- [ ] Environment variables set
- [ ] API URL points to backend
- [ ] Supabase credentials set
- [ ] Build successful
- [ ] Site deployed and accessible

### Supabase:
- [ ] Redirect URLs configured
- [ ] Site URL set to production
- [ ] Google provider enabled
- [ ] OAuth credentials added

### Google Cloud:
- [ ] Authorized redirect URIs added
- [ ] Authorized JavaScript origins added
- [ ] OAuth consent screen configured

### Testing:
- [ ] Regular login works
- [ ] Regular registration works
- [ ] Google Sign-In works
- [ ] No localhost redirects
- [ ] All features functional
- [ ] Mobile responsive

---

## URLs Summary

After deployment, you should have:

- **Frontend**: `https://biznova-frontend.onrender.com`
- **Backend**: `https://biznova-backend.onrender.com`
- **Database**: `mongodb+srv://...`
- **Supabase**: `https://your-project.supabase.co`

---

## Maintenance

### Free Tier Limitations (Render.com):
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month free (enough for 1 service 24/7)

### Upgrade Recommendations:
- **Paid Plan** ($7/month): No spin-down, better performance
- **Database**: MongoDB Atlas M0 (free) or M2+ (paid)
- **CDN**: Consider Cloudflare for better performance

---

## Support

If you encounter issues:
1. Check Render logs: Dashboard → Service → Logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test API endpoints directly using Postman
5. Check MongoDB Atlas network access

---

**Last Updated**: February 7, 2026  
**Status**: Ready for Deployment  
**Estimated Setup Time**: 30-45 minutes
