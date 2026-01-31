/**
 * Data Sync Routes
 * API endpoints for synchronizing data between kirana stores and customers
 */

const express = require('express');
const router = express.Router();
const DataSyncService = require('../services/dataSyncService');
const { authenticateToken } = require('../middleware/auth');

// All data sync routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/sync/inventory/:retailerId
 * @desc    Get synchronized inventory for a retailer
 * @access  Private
 */
router.get('/inventory/:retailerId', async (req, res) => {
  try {
    const { retailerId } = req.params;
    const result = await DataSyncService.syncRetailerInventory(retailerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Inventory sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync inventory',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/retailers
 * @desc    Get available retailers with customer-facing data
 * @access  Private
 */
router.get('/retailers', async (req, res) => {
  try {
    const { location } = req.query; // Optional: customer location for distance calculation
    const customerLocation = location ? JSON.parse(location) : null;
    
    const result = await DataSyncService.getAvailableRetailers(customerLocation);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Retailers sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync retailers',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/orders/:customerId
 * @desc    Get synchronized customer orders
 * @access  Private
 */
router.get('/orders/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await DataSyncService.syncCustomerOrders(customerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Orders sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sync/inventory/update
 * @desc    Update inventory after order placement
 * @access  Private
 */
router.post('/inventory/update', async (req, res) => {
  try {
    const { customerRequestId } = req.body;
    
    if (!customerRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Customer request ID is required'
      });
    }
    
    const result = await DataSyncService.updateInventoryAfterOrder(customerRequestId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sync/dashboard/:customerId
 * @desc    Get comprehensive customer dashboard data
 * @access  Private
 */
router.get('/dashboard/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { location } = req.query;
    const customerLocation = location ? JSON.parse(location) : null;
    
    const result = await DataSyncService.getCustomerDashboardData(customerId, customerLocation);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Dashboard sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
