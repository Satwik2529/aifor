const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const inventoryController = require('../controllers/inventoryController');
const imageInventoryController = require('../controllers/imageInventoryController');
const billScanController = require('../controllers/billScanController');
const { authenticateToken } = require('../middleware/auth');
const { validateInventory } = require('../middleware/validation');

// Configure multer for image uploads - Use memory storage for Render compatibility
const storage = multer.memoryStorage(); // Store in memory instead of disk

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// All inventory routes require authentication
router.use(authenticateToken);

// Bill scanning routes (parse → confirm → execute pattern)
router.post('/parse-bill', upload.single('image'), billScanController.parseBillImage);
router.post('/execute-bill', billScanController.executeBillItems);

// Image upload route for inventory (direct add)
router.post('/upload-image', upload.single('image'), imageInventoryController.processInventoryImage);

// Standard inventory routes
router.get('/', inventoryController.getAllInventory);
router.get('/analytics', inventoryController.getInventoryAnalytics);
router.get('/low-stock', inventoryController.getLowStockItems);
router.get('/:id', inventoryController.getInventoryById);
router.post('/', validateInventory, inventoryController.createInventoryItem);
router.put('/:id', validateInventory, inventoryController.updateInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;
