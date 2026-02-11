# 🎯 How to Use Discount Campaigns - Quick Guide

## 📍 Where to Find It

### Method 1: From Sidebar Navigation (Main Way)
1. **Login** to your retailer account
2. Look at the **left sidebar**
3. Click on **"Discount Campaigns"** (with TrendingDown icon 📉)
4. You'll see the Discount Campaigns page with 3 tabs

### Method 2: From Inventory Page (Quick Access)
1. Go to **Inventory** page
2. If you have items expiring within 30 days, you'll see an **orange alert box** at the top
3. Click the **"Apply AI Discounts"** button in the alert
4. This takes you directly to Discount Campaigns page

---

## 🎨 What You'll See

### Tab 1: AI Recommendations (Main Tab)
This is where the magic happens! 🤖

**What it shows:**
- All items that need discounts (expiring or slow-moving)
- AI-calculated discount percentage for each item
- Urgency level (Critical, High, Medium, Low)
- Potential revenue vs loss if expired
- Reason for discount (e.g., "Expires in 3 days + Slow moving")

**Actions you can take:**
1. **Apply X% Discount** (Blue button) - Accept AI recommendation with 1-click
2. **Customize** (Border button) - Adjust discount % and duration
3. **Ignore** (Gray button) - Skip this item

**Example Card:**
```
┌─────────────────────────────────────────────┐
│ 🥛 Milk                    [CRITICAL PRIORITY]│
│                                              │
│ Stock: 50 units  |  Original: ₹50          │
│ AI Discount: 65% |  New Price: ₹17.50      │
│                                              │
│ Reason: Expires in 3 days + Slow moving     │
│ Potential Revenue: ₹875                      │
│ Loss if Expired: ₹2,500                      │
│                                              │
│ [Apply 65% Discount] [Customize] [Ignore]   │
└─────────────────────────────────────────────┘
```

### Tab 2: Active Campaigns
Shows all your running discount campaigns

**What it shows:**
- Items currently on discount
- Discount percentage applied
- Views, clicks, and sales count
- Revenue generated
- Days remaining

**Actions:**
- **Pause/Resume** campaign
- **End Campaign** (remove discount)

### Tab 3: Analytics
Track performance of all campaigns

**Metrics shown:**
- Total campaigns created
- Total revenue generated
- Total views, clicks, sales
- Average effectiveness
- Campaigns by type

---

## 🚀 Step-by-Step: Apply Your First Discount

### Step 1: Navigate to Discount Campaigns
- Click **"Discount Campaigns"** in sidebar
- OR click **"Apply AI Discounts"** button in Inventory expiry alert

### Step 2: Review AI Recommendations
You'll see cards for each item needing discount:
- **Red cards** = Critical urgency (expired or 1-3 days)
- **Orange cards** = High urgency (4-7 days)
- **Yellow cards** = Medium urgency (8-30 days)

### Step 3: Choose Your Action

**Option A: Accept AI Recommendation (Fastest)**
1. Click **"Apply X% Discount"** button
2. Done! Discount is now active
3. Item appears in "Active Campaigns" tab

**Option B: Customize Discount**
1. Click **"Customize"** button
2. Adjust discount percentage (5-75%)
3. Set campaign duration (1-30 days)
4. See preview of new price
5. Click **"Apply Custom Discount"**

**Option C: Ignore**
1. Click **"Ignore"** if you don't want to discount this item
2. Item is skipped

### Step 4: Monitor Performance
1. Go to **"Active Campaigns"** tab
2. See how many customers viewed/clicked your deals
3. Track sales and revenue generated

---

## 💡 Pro Tips

### When to Use Each Discount Level

**70% OFF (Critical)**
- Items already expired
- Need to clear immediately
- Better to get some money than throw away

**50-60% OFF (High)**
- 1-3 days until expiry
- Very urgent
- High chance of selling

**35% OFF (Medium)**
- 4-7 days until expiry
- Good balance of profit and urgency

**15-25% OFF (Low)**
- 8-30 days until expiry
- Early bird discount
- Still maintain good profit margin

### Best Practices

1. **Act Fast on Critical Items**
   - Don't wait for expired items
   - Apply discounts when you see the alert

2. **Monitor Analytics**
   - Check which discounts work best
   - Adjust strategy based on data

3. **Combine with Marketing**
   - Tell customers about hot deals
   - Share on WhatsApp/social media

4. **Regular Checks**
   - Visit Discount Campaigns page daily
   - New recommendations appear as items approach expiry

---

## 🎯 Real Example Walkthrough

### Scenario: You have 50 units of Milk expiring in 2 days

**Step 1: See the Alert**
- Go to Inventory page
- See orange alert: "⚠️ Expiry Alert - 1 Item(s)"
- Click "Apply AI Discounts" button

**Step 2: Review AI Recommendation**
```
Item: Milk (50 units)
Original Price: ₹50
AI Discount: 60%
New Price: ₹20
Reason: Expires in 2 days
Urgency: CRITICAL
```

**Step 3: Understand the Math**
- Without discount: All 50 units expire = ₹1,500 loss (cost price ₹30 × 50)
- With 60% discount: Sell 40 units @ ₹20 = ₹800 revenue
- Net benefit: Save ₹1,100 vs total loss!

**Step 4: Apply Discount**
- Click "Apply 60% Discount"
- Campaign is now active for 7 days

**Step 5: Customers See It**
- Your discount appears on Hot Deals page
- Customers see: "🔥 Milk - 60% OFF - Only ₹20 (Save ₹30)"
- They buy quickly because of urgency

**Step 6: Track Results**
- Go to "Active Campaigns" tab
- See: 45 views, 12 clicks, 8 sales
- Revenue: ₹160 (8 units sold)
- Success! You avoided ₹240 loss on those 8 units

---

## 🔍 Troubleshooting

### "I don't see any recommendations"
**Possible reasons:**
1. No items have expiry dates set
2. No items are expiring within 30 days
3. All items have good sales velocity

**Solution:**
- Add expiry dates to inventory items
- Wait for items to approach expiry
- System automatically generates recommendations

### "The button doesn't work"
**Check:**
1. Backend server is running (`npm run dev` in backend folder)
2. Frontend is running (`npm start` in frontend folder)
3. You're logged in as a retailer (not customer)

### "I can't find the Discount Campaigns link"
**Solution:**
1. Refresh the page (Ctrl+R or Cmd+R)
2. Check you're on retailer dashboard (not customer/wholesaler)
3. Look in left sidebar for "Discount Campaigns" with 📉 icon

---

## 📱 Mobile Access

The Discount Campaigns page is fully responsive:
- Works on mobile phones
- Works on tablets
- Works on desktop

All features available on all devices!

---

## 🎉 Success Metrics

After using Discount Campaigns, you should see:

✅ **Reduced Waste**: Fewer items thrown away  
✅ **Increased Revenue**: Money from items that would've expired  
✅ **Happy Customers**: They love getting deals  
✅ **Better Inventory Management**: Data-driven decisions  
✅ **Higher Profit**: Sell before expiry instead of total loss  

---

## 📞 Need Help?

If you're still having trouble:
1. Check that both backend and frontend servers are running
2. Clear browser cache and refresh
3. Check browser console for errors (F12)
4. Verify you're logged in as a retailer

---

## 🚀 Quick Start Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] Logged in as retailer
- [ ] Have items with expiry dates in inventory
- [ ] Navigate to "Discount Campaigns" in sidebar
- [ ] See AI recommendations
- [ ] Click "Apply X% Discount"
- [ ] Check "Active Campaigns" tab
- [ ] Monitor analytics

**You're all set! Start maximizing your revenue today! 🎯**
