# 💰 Bill Price Auto-Fetch Fix

## Issue
When generating a bill, item prices were showing as ₹0 instead of automatically fetching the selling prices from inventory. The tax rate was also defaulting to 0.

## Root Cause
The frontend was initializing bill items with `price_per_unit: 0` and sending this to the backend. The backend logic to fetch prices from inventory was only triggered when NO items array was sent, but the frontend was always sending items with zero prices.

## Solution Applied

### Frontend Changes
**File:** `frontend/src/components/CustomerRequests.jsx`

#### 1. Updated `handleGenerateBill` Function
Now intelligently decides whether to send items array:

```javascript
// Check if any items have zero price
const hasZeroPrices = billForm.items.some(item => !item.price_per_unit || item.price_per_unit === 0);

const requestBody = {
  taxRate: billForm.taxRate
};

// Only send items if user has manually set prices (all non-zero)
if (!hasZeroPrices) {
  requestBody.items = billForm.items;
  console.log('Using manual prices');
} else {
  console.log('Backend will fetch prices from inventory');
}
```

**Logic:**
- If ANY item has price = 0 → Don't send items array, let backend fetch from inventory
- If ALL items have prices > 0 → Send items array with manual prices
- Always send taxRate (retailer can set this)

### Backend Logic (Already Working)
**File:** `backend/src/controllers/customerRequestController.js`

The backend already had the correct logic:

```javascript
if (items && Array.isArray(items)) {
  // Use provided prices (manual entry)
  // Update request.items with provided prices
} else {
  // No items provided - fetch prices from inventory
  for (let i = 0; i < request.items.length; i++) {
    const inventoryItem = await Inventory.findOne({
      user_id: retailer_id,
      item_name: { $regex: new RegExp(`^${request.items[i].item_name}`, 'i') }
    });
    
    if (inventoryItem) {
      const inventoryPrice = inventoryItem.price_per_unit || 
                            inventoryItem.selling_price || 
                            inventoryItem.price || 0;
      request.items[i].price_per_unit = inventoryPrice;
    }
  }
}
```

## How It Works Now

### Scenario 1: Auto-Fetch Prices (Default)
```
1. Retailer clicks "Generate Bill"
2. Bill modal opens with items showing ₹0
3. Retailer can optionally set tax rate (e.g., 5%)
4. Retailer clicks "Generate Bill"
5. Frontend detects zero prices
6. Frontend sends only taxRate (no items array)
7. Backend fetches prices from inventory automatically
8. Bill generated with correct prices + tax
```

### Scenario 2: Manual Prices (Optional)
```
1. Retailer clicks "Generate Bill"
2. Bill modal opens with items showing ₹0
3. Retailer manually enters custom prices
4. Retailer sets tax rate
5. Retailer clicks "Generate Bill"
6. Frontend detects non-zero prices
7. Frontend sends items array with manual prices + taxRate
8. Backend uses provided prices
9. Bill generated with manual prices + tax
```

## Example

### Inventory Data
```
- Rice: ₹50/kg
- Dal: ₹120/kg
- Oil: ₹180/litre
```

### Customer Request
```
- Rice: 5 kg
- Dal: 2 kg
- Oil: 1 litre
```

### Bill Generation (Auto-Fetch)
```
Retailer opens bill modal:
  Rice: 5 kg × ₹0 = ₹0
  Dal: 2 kg × ₹0 = ₹0
  Oil: 1 litre × ₹0 = ₹0
  Tax Rate: 0%

Retailer sets tax to 5% and clicks "Generate Bill"

Backend fetches prices:
  Rice: 5 kg × ₹50 = ₹250
  Dal: 2 kg × ₹120 = ₹240
  Oil: 1 litre × ₹180 = ₹180
  
  Subtotal: ₹670
  Tax (5%): ₹33.50
  Total: ₹703.50
```

## Benefits

1. **Automatic Pricing** - Prices fetched from inventory automatically
2. **Manual Override** - Retailer can still set custom prices if needed
3. **Flexible Tax** - Tax rate can be set per order
4. **Consistent Pricing** - Uses inventory selling prices by default
5. **Less Work** - Retailer doesn't need to enter prices manually

## Price Priority (Backend)

When fetching from inventory, backend checks in this order:
1. `price_per_unit`
2. `selling_price`
3. `price`
4. Default to 0 if none found

## Tax Calculation

- Tax rate is a percentage (e.g., 5 = 5%)
- Applied to subtotal: `tax = subtotal × (taxRate / 100)`
- Total = subtotal + tax

## Files Modified

1. `frontend/src/components/CustomerRequests.jsx`
   - Updated `handleGenerateBill` to conditionally send items array
   - Added logic to detect zero prices

## Status
✅ **FIXED AND DEPLOYED**

Frontend compiled successfully. Changes are live - just refresh your browser!

## Testing

1. Login as retailer
2. Go to Customer Requests
3. Find a processing order
4. Click "Generate Bill"
5. Modal opens with items at ₹0
6. Optionally set tax rate (e.g., 5%)
7. Click "Generate Bill"
8. ✅ Prices should be fetched from inventory automatically
9. ✅ Tax should be calculated correctly
10. ✅ Bill total should be correct

---

**Fixed:** February 11, 2026  
**Issue:** Bill prices showing as ₹0  
**Solution:** Auto-fetch from inventory when prices are zero  
**Status:** ✅ RESOLVED
