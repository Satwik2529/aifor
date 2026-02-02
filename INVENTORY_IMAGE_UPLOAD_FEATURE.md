# Inventory Image Upload Feature

## Overview
Added AI-powered image upload feature for inventory management. Users can now upload images containing product information, and the system will automatically extract and add items to inventory using Gemini Vision AI.

## Features Implemented

### 1. Backend Implementation
- **Controller**: `backend/src/controllers/imageInventoryController.js`
  - Processes uploaded images using Gemini Vision AI
  - Extracts product details: name, quantity, cost price, selling price, category
  - Validates data (selling price > cost price)
  - Handles multiple items in single image
  - Updates existing items or creates new ones
  - Returns detailed success/error reports

- **Route**: `backend/src/routes/inventoryRoutes.js`
  - Added `/api/inventory/upload-image` POST endpoint
  - Configured multer for image uploads
  - File size limit: 10MB
  - Supported formats: JPEG, JPG, PNG, GIF, WEBP
  - Files stored in: `backend/uploads/inventory/`

### 2. Frontend Implementation
- **UI Components**: `frontend/src/pages/Inventory.jsx`
  - Added "Upload Image" button with gradient purple-pink styling
  - Image upload modal with drag-and-drop area
  - Image preview before processing
  - Loading state during AI processing
  - Success/error toast notifications
  - Requirements info box

- **API Integration**: `frontend/src/services/api.js`
  - Added `uploadInventoryImage()` function
  - Handles multipart/form-data uploads

### 3. AI Processing
- **Model**: Gemini 2.0 Flash Exp (Vision)
- **Capabilities**:
  - Extracts multiple items from single image
  - Identifies product names, quantities, prices, categories
  - Makes reasonable estimates if data is unclear
  - Returns structured JSON array
  - Handles various image formats and layouts

## Usage

### For Users:
1. Click "Upload Image" button on Inventory page
2. Select/drag an image containing product information
3. Preview the image
4. Click "Process Image"
5. AI extracts data and adds items to inventory
6. View success message with item count

### Image Requirements:
- Product name clearly visible
- Quantity/Stock information
- Cost Price (CP) - what retailer paid
- Selling Price (SP) - what customers pay
- Category (optional but helpful)

### Example Use Cases:
- Upload photo of product labels
- Scan inventory sheets
- Process supplier invoices
- Bulk add items from catalogs
- Quick stock updates from photos

## Technical Details

### File Structure:
```
backend/
├── src/
│   ├── controllers/
│   │   └── imageInventoryController.js (NEW)
│   └── routes/
│       └── inventoryRoutes.js (UPDATED)
└── uploads/
    └── inventory/ (NEW)

frontend/
├── src/
│   ├── pages/
│   │   └── Inventory.jsx (UPDATED)
│   └── services/
│       └── api.js (UPDATED)
```

### API Endpoint:
```
POST /api/inventory/upload-image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- image: File (required)

Response:
{
  "success": true,
  "message": "Successfully processed X item(s) from image",
  "data": {
    "items": [...],
    "errors": [...],
    "summary": {
      "total_extracted": 5,
      "successful": 4,
      "failed": 1
    }
  }
}
```

### Validation Rules:
1. Selling price MUST be higher than cost price
2. All required fields must be present (name, quantity, prices)
3. Image must be valid format (JPEG, PNG, GIF, WEBP)
4. File size must be under 10MB
5. Duplicate items are updated (stock added)

## Benefits

1. **Time Saving**: Add multiple items instantly from photos
2. **Accuracy**: AI extracts exact values from images
3. **Convenience**: No manual data entry required
4. **Bulk Operations**: Process multiple items at once
5. **Error Handling**: Clear feedback on success/failures
6. **Smart Updates**: Automatically updates existing items

## Future Enhancements

- Support for PDF documents
- Batch image upload (multiple images at once)
- OCR for handwritten notes
- Barcode/QR code scanning
- Excel/CSV file upload
- Image history and re-processing
- Custom field mapping
- Multi-language support for product names

## Testing

To test the feature:
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Navigate to Inventory page
4. Click "Upload Image"
5. Upload a test image with product details
6. Verify items are added correctly

## Dependencies

- **Backend**: multer (already installed)
- **Frontend**: lucide-react (Image icon)
- **AI**: @google/generative-ai (Gemini Vision)

## Notes

- Requires valid GEMINI_API_KEY in backend/.env
- Images are deleted after processing (not stored permanently)
- Supports both new items and stock updates for existing items
- Category mapping is intelligent (handles variations)
