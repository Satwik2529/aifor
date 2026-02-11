const discountService = require('../services/discountService');
const Campaign = require('../models/Campaign');
const Inventory = require('../models/Inventory');

/**
 * Campaign Controller - Manage discount campaigns
 */

const campaignController = {
  /**
   * Get AI-generated discount recommendations
   */
  getDiscountRecommendations: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const recommendations = await discountService.generateDiscountRecommendations(userId);

      res.status(200).json({
        success: true,
        message: 'Discount recommendations generated successfully',
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('Get discount recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating discount recommendations',
        error: error.message
      });
    }
  },

  /**
   * Apply discount to inventory item
   */
  applyDiscount: async (req, res) => {
    try {
      const userId = req.user._id;
      const { inventory_id, discount_percentage, duration_days, campaign_type } = req.body;

      if (!inventory_id || !discount_percentage || !duration_days) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: inventory_id, discount_percentage, duration_days'
        });
      }

      if (discount_percentage < 0 || discount_percentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount percentage must be between 0 and 100'
        });
      }

      const result = await discountService.applyDiscount(
        userId,
        inventory_id,
        discount_percentage,
        duration_days,
        campaign_type || 'expiry_based'
      );

      res.status(200).json({
        success: true,
        message: 'Discount applied successfully',
        data: result
      });
    } catch (error) {
      console.error('Apply discount error:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying discount',
        error: error.message
      });
    }
  },

  /**
   * Remove discount from inventory item
   */
  removeDiscount: async (req, res) => {
    try {
      const userId = req.user._id;
      const { inventory_id } = req.body;

      if (!inventory_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: inventory_id'
        });
      }

      await discountService.removeDiscount(userId, inventory_id);

      res.status(200).json({
        success: true,
        message: 'Discount removed successfully'
      });
    } catch (error) {
      console.error('Remove discount error:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing discount',
        error: error.message
      });
    }
  },

  /**
   * Get all active campaigns
   */
  getActiveCampaigns: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const campaigns = await discountService.getActiveCampaigns(userId);

      res.status(200).json({
        success: true,
        message: 'Active campaigns retrieved successfully',
        data: campaigns,
        count: campaigns.length
      });
    } catch (error) {
      console.error('Get active campaigns error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching active campaigns',
        error: error.message
      });
    }
  },

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const analytics = await discountService.getCampaignAnalytics(userId);

      res.status(200).json({
        success: true,
        message: 'Campaign analytics retrieved successfully',
        data: analytics
      });
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching campaign analytics',
        error: error.message
      });
    }
  },

  /**
   * Pause/Resume campaign
   */
  toggleCampaignStatus: async (req, res) => {
    try {
      const userId = req.user._id;
      const { campaign_id, status } = req.body;

      if (!campaign_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: campaign_id, status'
        });
      }

      if (!['active', 'paused'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "active" or "paused"'
        });
      }

      const campaign = await Campaign.findOneAndUpdate(
        { _id: campaign_id, user_id: userId },
        { status },
        { new: true }
      ).populate('inventory_id');

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      res.status(200).json({
        success: true,
        message: `Campaign ${status === 'active' ? 'resumed' : 'paused'} successfully`,
        data: campaign
      });
    } catch (error) {
      console.error('Toggle campaign status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating campaign status',
        error: error.message
      });
    }
  },

  /**
   * Get hot deals for customers (public endpoint)
   */
  getHotDeals: async (req, res) => {
    try {
      const { shop_id, limit = 20 } = req.query;

      if (!shop_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: shop_id'
        });
      }

      // Get active campaigns with inventory
      const campaigns = await Campaign.find({
        user_id: shop_id,
        status: 'active',
        end_date: { $gte: new Date() }
      })
        .populate('inventory_id')
        .sort({ discount_percentage: -1 })
        .limit(parseInt(limit));

      // Filter out items with no stock
      const hotDeals = campaigns
        .filter(c => c.inventory_id && c.inventory_id.stock_qty > 0)
        .map(campaign => ({
          item_id: campaign.inventory_id._id,
          item_name: campaign.inventory_id.item_name,
          category: campaign.inventory_id.category,
          original_price: campaign.original_price,
          discounted_price: campaign.discounted_price,
          discount_percentage: campaign.discount_percentage,
          savings: campaign.original_price - campaign.discounted_price,
          stock_qty: campaign.inventory_id.stock_qty,
          campaign_type: campaign.campaign_type,
          reason: campaign.reason,
          ends_in_days: campaign.daysRemaining,
          urgency: campaign.discount_percentage >= 50 ? 'high' : 
                   campaign.discount_percentage >= 30 ? 'medium' : 'low'
        }));

      // Track views for these campaigns
      campaigns.forEach(campaign => {
        discountService.trackCampaignView(campaign._id);
      });

      res.status(200).json({
        success: true,
        message: 'Hot deals retrieved successfully',
        data: hotDeals,
        count: hotDeals.length
      });
    } catch (error) {
      console.error('Get hot deals error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching hot deals',
        error: error.message
      });
    }
  },

  /**
   * Track campaign interaction (click)
   */
  trackCampaignClick: async (req, res) => {
    try {
      const { inventory_id } = req.body;

      if (!inventory_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: inventory_id'
        });
      }

      const campaign = await Campaign.findOne({
        inventory_id,
        status: 'active'
      });

      if (campaign) {
        await discountService.trackCampaignClick(campaign._id);
      }

      res.status(200).json({
        success: true,
        message: 'Campaign click tracked'
      });
    } catch (error) {
      console.error('Track campaign click error:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking campaign click',
        error: error.message
      });
    }
  }
};

module.exports = campaignController;
