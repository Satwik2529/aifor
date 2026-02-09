# Quick Test Guide - Fractional Quantities

## What Was Fixed
Users can now enter fractional quantities (0.5, 2.5, 10.5) in both Inventory and Sales forms without getting validation errors.

## Test Steps

### Test 1: Add Inventory with Fractional Quantity
1. Start the application (run `npm run dev` from root)
2. Login to the system
3. Go to **Inventory** page
4. Click **"Add Item"** button
5. Fill in the form:
   - Item Name: "Rice"
   - Unit: Select **"Kilogram (kg)"**
   - Stock Quantity: Enter **"10.5"** (fractional)
   - Cost Price: 40
   - Selling Price: 50
   - Category: Food & Beverages
6. Click **"Add Item"**
7. ✅ **Expected**: Item should be created successfully with 10.5 kg stock
8. ❌ **Before Fix**: Would show "Failed to create" error

### Test 2: Create Sale with Fractional Quantity
1. Go to **Sales** page
2. Click **"New Sale"** button
3. In the form:
   - Select Item: Choose "Rice" (or any item with kg/litre unit)
   - Quantity: Enter **"2.5"** (fractional)
   - Price should auto-fill
4. Click **"Create Sale"**
5. ✅ **Expected**: Sale should be created successfully
6. ❌ **Before Fix**: Would show "Request failed with status code 400"

### Test 3: Edge Cases

**Test 3a: Very Small Fractions**
- Try entering **0.5** or **0.001** in quantity
- ✅ Should work

**Test 3b: Whole Numbers**
- Try entering **10** or **100** in quantity
- ✅ Should work (backward compatible)

**Test 3c: Invalid Values**
- Try entering **0** in quantity
- ❌ Should show error: "must be greater than 0"

**Test 3d: Negative Values**
- Try entering **-5** in quantity
- ❌ Should show error: "must be greater than 0"

**Test 3e: Empty Field**
- Leave quantity field empty and try to submit
- ❌ Should show error: "Please enter valid quantities"

## What to Look For

### Success Indicators
- ✅ No "400 Bad Request" errors in console
- ✅ No "Failed to create" toast messages
- ✅ Items appear in the table with correct fractional quantities
- ✅ Stock deduction works correctly with fractions
- ✅ Profit calculations work with fractional quantities

### Console Logs
If you see errors, check browser console (F12) for:
- Network tab: Look for 400 errors on `/api/sales` or `/api/inventory`
- Console tab: Look for "Error saving sale" or "Error saving inventory item"

## Quick Verification Commands

### Backend Test
```bash
cd backend
node test-fractional-validation.js
```
Should show all tests passing (✅ PASS)

### Check Backend is Running
```bash
# Backend should be running on port 5000
curl http://localhost:5000/api/health
```

### Check Frontend is Running
```bash
# Frontend should be running on port 3000
# Open browser: http://localhost:3000
```

## Common Issues

### Issue 1: "Failed to create" with fractional quantity
**Solution**: This fix addresses this issue. Make sure you've restarted both frontend and backend after the changes.

### Issue 2: Quantity shows as integer instead of decimal
**Solution**: Check that the unit is set to "kg" or "litre" (not "piece"). Piece unit only accepts whole numbers.

### Issue 3: Stock not deducting correctly
**Solution**: The fix includes proper normalization to 3 decimals to prevent floating-point errors.

## Files Changed
- ✅ `frontend/src/pages/Sales.jsx` - Sales form validation
- ✅ `frontend/src/pages/Inventory.jsx` - Inventory form validation
- ✅ `backend/src/controllers/salesController.js` - Backend validation
- ✅ `backend/src/controllers/inventoryController.js` - Already had good validation

## Restart Instructions
After making changes, restart both servers:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

Or use the provided script:
```bash
# Windows
start-dev.bat

# Linux/Mac
./start-dev.sh
```

## Success Criteria
- [x] Can add inventory items with fractional quantities (0.5, 2.5, 10.5)
- [x] Can create sales with fractional quantities
- [x] Stock deduction works correctly with fractions
- [x] Profit calculations work with fractions
- [x] No validation errors for valid fractional inputs
- [x] Proper error messages for invalid inputs (0, negative, empty)
- [x] Backward compatible with integer quantities
