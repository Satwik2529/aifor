# 🚀 BizNova - AI-Powered Business Management

> Smart retail management with AI automation, voice commands, and real-time insights

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/)

## 🎯 Overview

BizNova is an AI-powered platform for small retailers that automates inventory, sales, and customer management. Save 90% of time on daily operations with intelligent automation and voice commands.

**Built for:** Small retail shops, grocery stores, general merchandise businesses

## ✨ Key Features

### 🤖 AI Bill Scanner
- Scan wholesale bills → AI extracts items → Auto-add to inventory
- Extracts: item name, quantity, cost price, selling price, category
- Review and edit before confirming
- **Saves 15 minutes per bill**

### 🎙️ Voice-Controlled AI Assistant
**Retailer Chatbot:**
- "Show me today's sales"
- "Add 50 rice bags at 100 rupees each"
- "Which items are low in stock?"
- Voice input/output in 5 languages

**Customer Shopping Assistant:**
- "I want to make chicken curry for 4 people"
- AI suggests ingredients from store inventory
- Shows TOP 3 essential items
- One-click order placement

### 📊 Core Management
- **Inventory:** Stock tracking, low stock alerts, profit calculation
- **Sales:** Record transactions, auto-inventory deduction, COGS tracking
- **Expenses:** Category-wise tracking, profit analysis
- **Customers:** Database, purchase history, credit management
- **Analytics:** Real-time profit, revenue trends, top products

### 🌐 Additional Features
- **Multilingual:** English, Hindi, Telugu, Tamil, Kannada
- **Dark Mode:** Comfortable viewing
- **Notifications:** Real-time order alerts
- **Customer Orders:** 24/7 self-service ordering
- **Secure Auth:** JWT-based with role management

## 🛠️ Tech Stack

**Frontend:** React 18, Tailwind CSS, React Router, Axios, i18next  
**Backend:** Node.js, Express, MongoDB, Mongoose, JWT  
**AI:** Google Gemini 2.5 Flash (free tier)  
**Hosting:** Render (backend), Vercel/Netlify (frontend)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free)
- Google Gemini API key (free from [ai.google.dev](https://ai.google.dev))

### Installation

**1. Clone & Install**
```bash
git clone https://github.com/YOUR_USERNAME/biznova.git
cd biznova

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Frontend
cd ../frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000" > .env
```

**2. Start Development**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

**3. Access**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## 🌐 Deployment

### Backend (Render)
1. Push code to GitHub
2. Create Web Service on [render.com](https://render.com)
3. Settings:
   - Root: `backend`
   - Build: `npm install`
   - Start: `node src/server.js`
4. Add environment variables from `.env`
5. Deploy

### Frontend (Vercel)
1. Create project on [vercel.com](https://vercel.com)
2. Settings:
   - Root: `frontend`
   - Framework: Create React App
3. Add env: `REACT_APP_API_URL=https://your-backend.onrender.com`
4. Deploy

### MongoDB Setup
- MongoDB Atlas → Network Access → Add IP: `0.0.0.0/0`

**Cost:** $0/month (all free tiers)

## 🔐 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
PORT=5000
JWT_SECRET=your_random_secret_key
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
```

**Get API Keys:**
- MongoDB: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Gemini: [ai.google.dev](https://ai.google.dev) (free tier: 60 req/min)
- Gmail: Google Account → Security → App Password
