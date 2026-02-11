const Inventory = require('../models/Inventory');
const Campaign = require('../models/Campaign');
const Sale = require('../models/Sale');

/**
 * Discount Service - AI-powered discount calculation and campaign management
 */

class DiscountService {
  /**
   * Calculate AI-recommended discount based on expiry and velocity
   */
  calculateSmartDiscount(item) {
    let discount = 0;
    let reason = '';
    let urgency = 'low';

    // Check expiry status
    if (item.expiry_date) {
      const now = new Date();
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        // Expired - Maximum discount
        discount = 70;
        reason = `Expired ${Math.abs(daysUntilExpiry)} days ago - Clear immediately`;
        urgency = 'critical';
      } else if (daysUntilExpiry <= 1) {
        discount = 60;
        reason = `Expires in ${daysUntilExpiry} day - Urgent clearance`;
        urgency = 'critical';
      } else if (daysUntilExpiry <= 3) {
        discount = 50;
        reason = `Expires in ${daysUntilExpiry} days - High urgency`;
        urgency = 'high';
      } else if (daysUntilExpiry <= 7) {
        discount = 35;
        reason = `Expires in ${daysUntilExpiry} days - Moderate urgency`;
        urgency = 'medium';
      } else if (daysUntilExpiry <= 14) {
        discount = 25;
        reason = `Expires in ${daysUntilExpiry} days`;
        urgency = 'medium';
      } else if (daysUntilExpiry <= 30) {
        discount = 15;
        reason = `Expires in ${daysUntilExpiry} days`;
        urgency = 'low';
      }
    }

    // Adjust for slow velocity (add 10-15% more discount)
    if (item.sales_velocity < 1 && item.sales_velocity >= 0) {
      const velocityBonus = item.sales_velocity < 0.5 ? 15 : 10;
      discount += velocityBonus;
      reason += ` + Slow moving (${item.sales_velocity.toFixed(2)} units/week)`;
      
      if (urgency === 'low') urgency = 'medium';
    }

    // Cap discount at 75%
    discount = Math.min(discount, 75);

    // Calculate discounted price
    const discountedPrice = item.selling_price * (1 - discount / 100);

    return {
      discount: Math.round(discount),
      discountedPrice: Math.round(discountedPrice * 100) / 100,
      reason,
      urgency,
      originalPrice: item.selling_price,
      savings: Math.round((item.selling_price - discountedPrice) * 100) / 100
    };
  }

  /**
   * Generate AI discount recommendations for all eligible items
   */
  async generateDiscountRecommendations(userId) {
    try {
      // Get all inventory items
      const inventory = await Inventory.find({ user_id: userId });

      // Calculate sales velocity for each item (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sales = await Sale.find({
        user_id: userId,
        createdAt: { $gte: thirtyDaysAgo }
      });

      // Calculate velocity for each item
      const velocityMap = {};
      sales.forEach(sale => {
        sale.items.forEach(saleItem => {
          const itemName = saleItem.item_name;
          if (!velocityMap[itemName]) {
            velocityMap[itemName] = 0;
          }
          velocityMap[itemName] += saleItem.quantity;
        });
      });

      // Convert to units per week
      Object.keys(velocityMap).forEach(itemName => {
        velocityMap[itemName] = (velocityMap[itemName] / 30) * 7; // Convert to weekly
      });

      // Update inventory with velocity data
      const updatePromises = inventory.map(item => {
        const velocity = velocityMap[item.item_name] || 0;
        return Inventory.findByIdAndUpdate(item._id, {
          sales_velocity: velocity,
          last_velocity_update: new Date()
        });
      });
      await Promise.all(updatePromises);

      // Get updated inventory
      const updatedInventory = await Inventory.find({ user_id: userId });

      // Generate recommendations
      const recommendations = [];
      const now = new Date();

      for (const item of updatedInventory) {
        let shouldRecommend = false;

        // Check if expiring within 30 days
        if (item.expiry_date) {
          const daysUntilExpiry = Math.ceil((new Date(item.expiry_date) - now) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 30) {
            shouldRecommend = true;
          }
        }

        // Check if slow moving
        if (item.sales_velocity < 1) {
          shouldRecommend = true;
        }

        if (shouldRecommend && item.stock_qty > 0) {
          const discountData = this.calculateSmartDiscount(item);
          
          recommendations.push({
            item_id: item._id,
            item_name: item.item_name,
            stock_qty: item.stock_qty,
            category: item.category,
            ...discountData,
            expiry_date: item.expiry_date,
            sales_velocity: item.sales_velocity,
            potential_revenue: discountData.discountedPrice * item.stock_qty,
            potential_loss_if_expired: item.cost_price * item.stock_qty
          });
        }
      }

      // Sort by urgency and potential loss
      recommendations.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return b.potential_loss_if_expired - a.potential_loss_if_expired;
      });

      return recommendations;
    } catch (error) {
      console.error('Error generating discount recommendations:', error);
      throw error;
    }
  }

  /**
   * Apply discount to inventory item and create campaign
   */
  async applyDiscount(userId, inventoryId, discountPercentage, durationDays, campaignType = 'expiry_based') {
    try {
      const item = await Inventory.findOne({ _id: inventoryId, user_id: userId });
      
      if (!item) {
        throw new Error('Inventory item not found');
      }

      // Calculate discounted price
      const discountedPrice = item.selling_price * (1 - discountPercentage / 100);

      // Update inventory
      await Inventory.findByIdAndUpdate(inventoryId, {
        active_discount: discountPercentage,
        discounted_price: Math.round(discountedPrice * 100) / 100
      });

      // Create campaign
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const discountData = this.calculateSmartDiscount(item);

      const campaign = new Campaign({
        user_id: userId,
        inventory_id: inventoryId,
        campaign_type: campaignType,
        discount_percentage: discountPercentage,
        original_price: item.selling_price,
        discounted_price: Math.round(discountedPrice * 100) / 100,
        status: 'active',
        end_date: endDate,
        reason: discountData.reason,
        ai_confidence: 0.85,
        created_by: 'manual'
      });

      await campaign.save();

      return {
        success: true,
        campaign,
        item: await Inventory.findById(inventoryId)
      };
    } catch (error) {
      console.error('Error applying discount:', error);
      throw error;
    }
  }

  /**
   * Remove discount from inventory item
   */
  async removeDiscount(userId, inventoryId) {
    try {
      await Inventory.findOneAndUpdate(
        { _id: inventoryId, user_id: userId },
        {
          active_discount: 0,
          discounted_price: null
        }
      );

      // Mark campaigns as completed
      await Campaign.updateMany(
        { inventory_id: inventoryId, status: 'active' },
        { status: 'completed' }
      );

      return { success: true };
    } catch (error) {
      console.error('Error removing discount:', error);
      throw error;
    }
  }

  /**
   * Get active campaigns for user
   */
  async getActiveCampaigns(userId) {
    try {
      const campaigns = await Campaign.find({
        user_id: userId,
        status: 'active'
      })
        .populate('inventory_id')
        .sort({ createdAt: -1 });

      return campaigns;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Track campaign view (when customer sees the discount)
   */
  async trackCampaignView(campaignId) {
    try {
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { views_count: 1 }
      });
    } catch (error) {
      console.error('Error tracking campaign view:', error);
    }
  }

  /**
   * Track campaign click (when customer clicks on discounted item)
   */
  async trackCampaignClick(campaignId) {
    try {
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { clicks_count: 1 }
      });
    } catch (error) {
      console.error('Error tracking campaign click:', error);
    }
  }

  /**
   * Track campaign sale (when discounted item is sold)
   */
  async trackCampaignSale(inventoryId, saleAmount) {
    try {
      const campaign = await Campaign.findOne({
        inventory_id: inventoryId,
        status: 'active'
      });

      if (campaign) {
        await Campaign.findByIdAndUpdate(campaign._id, {
          $inc: {
            sales_count: 1,
            revenue_generated: saleAmount
          }
        });
      }
    } catch (error) {
      console.error('Error tracking campaign sale:', error);
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(userId) {
    try {
      const campaigns = await Campaign.find({ user_id: userId })
        .populate('inventory_id');

      const analytics = {
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'active').length,
        completed_campaigns: campaigns.filter(c => c.status === 'completed').length,
        total_revenue: campaigns.reduce((sum, c) => sum + c.revenue_generated, 0),
        total_views: campaigns.reduce((sum, c) => sum + c.views_count, 0),
        total_clicks: campaigns.reduce((sum, c) => sum + c.clicks_count, 0),
        total_sales: campaigns.reduce((sum, c) => sum + c.sales_count, 0),
        avg_effectiveness: campaigns.length > 0 
          ? (campaigns.reduce((sum, c) => sum + parseFloat(c.effectiveness), 0) / campaigns.length).toFixed(2)
          : 0,
        campaigns_by_type: {
          expiry_based: campaigns.filter(c => c.campaign_type === 'expiry_based').length,
          slow_velocity: campaigns.filter(c => c.campaign_type === 'slow_velocity').length,
          clearance: campaigns.filter(c => c.campaign_type === 'clearance').length,
          festival: campaigns.filter(c => c.campaign_type === 'festival').length,
          flash_sale: campaigns.filter(c => c.campaign_type === 'flash_sale').length
        }
      };

      return analytics;
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  }
}

module.exports = new DiscountService();
