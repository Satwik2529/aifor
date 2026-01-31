/**
 * Data Synchronization Service
 * Ensures proper sync between kirana stores and customers data
 */

const Inventory = require('../models/Inventory');
const CustomerRequest = require('../models/CustomerRequest');
const User = require('../models/User');

class DataSyncService {
  /**
   * Sync retailer inventory with customer-facing data
   */
  static async syncRetailerInventory(retailerId) {
    try {
      const inventory = await Inventory.find({ user_id: retailerId });
      
      // Transform inventory data for customer consumption
      const customerInventory = inventory.map(item => ({
        id: item._id,
        name: item.item_name,
        quantity: item.stock_qty,
        price: item.price_per_unit,
        unit: this.getUnitFromItemName(item.item_name),
        category: item.category,
        minStock: item.min_stock_level,
        inStock: item.stock_qty > 0,
        lowStock: item.stock_qty <= item.min_stock_level,
        lastUpdated: item.updatedAt
      }));

      return {
        success: true,
        inventory: customerInventory,
        totalItems: customerInventory.length,
        inStockItems: customerInventory.filter(item => item.inStock).length,
        lowStockItems: customerInventory.filter(item => item.lowStock).length
      };
    } catch (error) {
      console.error('Inventory sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available retailers for customers
   */
  static async getAvailableRetailers(customerLocation = null) {
    try {
      const retailers = await User.find({ 
        role: 'retailer'
      }).select('name email shop_name shop_description business_type address phone language upi_id');

      // Transform retailer data for customer consumption
      const customerRetailers = retailers.map(retailer => ({
        id: retailer._id,
        name: retailer.name,
        businessName: retailer.shop_name,
        shopName: retailer.shop_name,
        phone: retailer.phone,
        address: retailer.address,
        languages: retailer.language ? [retailer.language] : ['English'],
        location: retailer.address,
        distance: customerLocation ? this.calculateDistance(customerLocation, retailer.address) : null,
        rating: this.generateMockRating(), // Would come from reviews in production
        isOpen: this.isStoreOpen(),
        nextAvailableTime: this.getNextAvailableTime(),
        businessType: retailer.business_type,
        description: retailer.shop_description
      }));

      // Sort by distance if location is provided, otherwise by rating
      if (customerLocation) {
        customerRetailers.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      } else {
        customerRetailers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      return {
        success: true,
        retailers: customerRetailers,
        totalRetailers: customerRetailers.length
      };
    } catch (error) {
      console.error('Retailers sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync customer orders with retailer data
   */
  static async syncCustomerOrders(customerId) {
    try {
      const orders = await CustomerRequest.find({ 
        customer_id: customerId 
      }).populate('retailer_id', 'name business_name shop_name phone address');

      // Transform order data
      const customerOrders = orders.map(order => ({
        id: order._id,
        retailer: {
          id: order.retailer_id._id,
          name: order.retailer_id.name,
          businessName: order.retailer_id.business_name,
          shopName: order.retailer_id.shop_name,
          phone: order.retailer_id.phone
        },
        items: order.items.map(item => ({
          name: item.item_name,
          quantity: item.quantity,
          price: item.price_per_unit,
          totalPrice: item.total_price
        })),
        status: order.status,
        total: order.bill_details?.total || 0,
        subtotal: order.bill_details?.subtotal || 0,
        tax: order.bill_details?.tax || 0,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        processedAt: order.processed_at,
        completedAt: order.completed_at,
        cancellationReason: order.cancellation_reason,
        estimatedDelivery: this.calculateEstimatedDelivery(order.status, order.createdAt)
      }));

      return {
        success: true,
        orders: customerOrders,
        totalOrders: customerOrders.length,
        pendingOrders: customerOrders.filter(o => o.status === 'pending').length,
        processingOrders: customerOrders.filter(o => o.status === 'processing').length,
        completedOrders: customerOrders.filter(o => o.status === 'completed').length
      };
    } catch (error) {
      console.error('Orders sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Real-time inventory update after order
   */
  static async updateInventoryAfterOrder(customerRequestId) {
    try {
      const customerRequest = await CustomerRequest.findById(customerRequestId);
      if (!customerRequest) {
        throw new Error('Customer request not found');
      }

      const retailerId = customerRequest.retailer_id;
      const items = customerRequest.items;

      // Update inventory for each item
      for (const item of items) {
        await Inventory.findOneAndUpdate(
          { 
            user_id: retailerId, 
            item_name: item.item_name 
          },
          { 
            $inc: { stock_qty: -item.quantity }
          },
          { new: true }
        );
      }

      // Get updated inventory
      const updatedInventory = await this.syncRetailerInventory(retailerId);

      return {
        success: true,
        updatedInventory: updatedInventory.inventory,
        message: 'Inventory updated successfully'
      };
    } catch (error) {
      console.error('Inventory update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive customer dashboard data
   */
  static async getCustomerDashboardData(customerId, customerLocation = null) {
    try {
      const [ordersResult, retailersResult] = await Promise.all([
        this.syncCustomerOrders(customerId),
        this.getAvailableRetailers(customerLocation)
      ]);

      if (!ordersResult.success || !retailersResult.success) {
        throw new Error('Failed to sync data');
      }

      // Calculate customer statistics
      const stats = {
        totalOrders: ordersResult.totalOrders,
        totalSpent: ordersResult.orders.reduce((sum, order) => sum + order.total, 0),
        averageOrderValue: ordersResult.totalOrders > 0 ? 
          ordersResult.orders.reduce((sum, order) => sum + order.total, 0) / ordersResult.totalOrders : 0,
        favoriteRetailer: this.getFavoriteRetailer(ordersResult.orders),
        recentActivity: ordersResult.orders.slice(0, 5)
      };

      return {
        success: true,
        customer: {
          orders: ordersResult.orders,
          stats,
          availableRetailers: retailersResult.retailers
        }
      };
    } catch (error) {
      console.error('Dashboard sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper methods
   */
  static getUnitFromItemName(itemName) {
    const name = itemName.toLowerCase();
    if (name.includes('rice') || name.includes('flour') || name.includes('sugar')) return 'kg';
    if (name.includes('milk') || name.includes('oil') || name.includes('ghee')) return 'litre';
    if (name.includes('powder') || name.includes('masala')) return 'grams';
    return 'pieces';
  }

  static calculateDistance(customerLocation, retailerAddress) {
    // Mock distance calculation - would use actual geolocation in production
    return Math.random() * 10 + 0.5; // 0.5 to 10.5 km
  }

  static generateMockRating() {
    return Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 to 5.0
  }

  static isStoreOpen() {
    const hour = new Date().getHours();
    return hour >= 8 && hour <= 20;
  }

  static getNextAvailableTime() {
    const now = new Date();
    if (this.isStoreOpen()) {
      return 'Open now';
    }
    
    const nextOpen = new Date();
    nextOpen.setHours(8, 0, 0, 0);
    if (nextOpen <= now) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    
    return `Opens at ${nextOpen.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`;
  }

  static calculateEstimatedDelivery(status, createdAt) {
    if (status === 'completed') return 'Delivered';
    if (status === 'cancelled') return 'Cancelled';
    
    const hoursSinceOrder = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60);
    
    if (status === 'pending') return 'Processing - ~30 mins';
    if (status === 'processing') return 'Out for delivery - ~15 mins';
    if (status === 'billed') return 'Preparing - ~20 mins';
    
    return 'Estimating...';
  }

  static getFavoriteRetailer(orders) {
    if (orders.length === 0) return null;
    
    const retailerCounts = {};
    orders.forEach(order => {
      const retailerId = order.retailer.id;
      retailerCounts[retailerId] = (retailerCounts[retailerId] || 0) + 1;
    });
    
    const favoriteRetailerId = Object.keys(retailerCounts).reduce((a, b) => 
      retailerCounts[a] > retailerCounts[b] ? a : b
    );
    
    return orders.find(order => order.retailer.id === favoriteRetailerId)?.retailer;
  }
}

module.exports = DataSyncService;
