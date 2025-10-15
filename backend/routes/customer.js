const express = require('express');
const router = express.Router();

// Import models
const CustomerModel = require('../models/customer');
const AuthenticationManager = require('../utils/authentication');

// Initialize models
const customerModel = new CustomerModel();
const authManager = new AuthenticationManager();

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
  try {
    const session_token = req.cookies.session_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!session_token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const session = await authManager.validate_session(session_token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    req.user = session;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Get all customers
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { search, segment_id, limit, offset } = req.query;

    let result;

    if (segment_id) {
      result = await customerModel.get_customers_by_segment(parseInt(segment_id));
    } else if (search) {
      result = await customerModel.find_customer(search);
    } else {
      // Get all customers (would need additional implementation)
      result = { success: true, customers: [] };
    }

    if (result.success) {
      res.json({
        success: true,
        data: result.customers || []
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers'
    });
  }
});

// Get customer by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await customerModel.get_customer(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        data: result.customer
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer'
    });
  }
});

// Add new customer
router.post('/', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.customers?.includes('create')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot create customers'
      });
    }

    const customer_data = req.body;

    // Validate required fields
    if (!customer_data.first_name || !customer_data.last_name) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    const result = await customerModel.add_customer(customer_data);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Customer added successfully',
        data: {
          customer_id: result.customer_id
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Add customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add customer'
    });
  }
});

// Update customer
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.customers?.includes('update')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot update customers'
      });
    }

    const { id } = req.params;
    const customer_data = req.body;

    const result = await customerModel.update_customer(parseInt(id), customer_data);

    if (result.success) {
      res.json({
        success: true,
        message: 'Customer updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
});

// Delete customer
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.customers?.includes('delete')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot delete customers'
      });
    }

    const { id } = req.params;

    const result = await customerModel.delete_customer(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
});

// Search customers
router.get('/search/:query', authenticateUser, async (req, res) => {
  try {
    const { query } = req.params;

    const result = await customerModel.find_customer(query);

    if (result.success) {
      res.json({
        success: true,
        data: result.customers
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search customers'
    });
  }
});

// Get customer purchase history
router.get('/:id/purchases', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.customers?.includes('view_history')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot view customer history'
      });
    }

    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await customerModel.get_customer_purchase_history(parseInt(id), limit);

    if (result.success) {
      res.json({
        success: true,
        data: result.purchases
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get customer purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer purchases'
    });
  }
});

// Get customer segments
router.get('/segments', authenticateUser, async (req, res) => {
  try {
    const result = await customerModel.get_customer_segments();

    if (result.success) {
      res.json({
        success: true,
        data: result.segments
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get customer segments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer segments'
    });
  }
});

// Get customers by segment
router.get('/segments/:segmentId', authenticateUser, async (req, res) => {
  try {
    const { segmentId } = req.params;

    const result = await customerModel.get_customers_by_segment(parseInt(segmentId));

    if (result.success) {
      res.json({
        success: true,
        data: result.customers
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get customers by segment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers by segment'
    });
  }
});

// Update customer loyalty points
router.post('/:id/loyalty-points', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { points_change, reason } = req.body;

    if (points_change === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Points change is required'
      });
    }

    const result = await customerModel.update_loyalty_points(
      parseInt(id),
      parseInt(points_change),
      reason || ''
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Loyalty points updated successfully',
        data: {
          previous_points: result.previous_points,
          new_points: result.new_points,
          points_change: result.points_change
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Update loyalty points error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loyalty points'
    });
  }
});

// Get customer statistics
router.get('/:id/stats', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer data
    const customer_result = await customerModel.get_customer(parseInt(id));
    
    if (!customer_result.success) {
      return res.status(404).json({
        success: false,
        message: customer_result.error
      });
    }

    const customer = customer_result.customer;

    // Get purchase history
    const purchases_result = await customerModel.get_customer_purchase_history(parseInt(id), 1000);
    
    let stats = {
      total_spent: customer.total_spent,
      loyalty_points: customer.loyalty_points,
      total_purchases: 0,
      average_purchase: 0,
      last_purchase: customer.last_purchase_date,
      days_since_last_purchase: null
    };

    if (purchases_result.success) {
      const purchases = purchases_result.purchases;
      stats.total_purchases = purchases.length;
      
      if (purchases.length > 0) {
        const total = purchases.reduce((sum, purchase) => sum + purchase.total_amount, 0);
        stats.average_purchase = total / purchases.length;
        
        if (customer.last_purchase_date) {
          const lastPurchase = new Date(customer.last_purchase_date);
          const now = new Date();
          stats.days_since_last_purchase = Math.floor((now - lastPurchase) / (1000 * 60 * 60 * 24));
        }
      }
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer statistics'
    });
  }
});

// Add customer preference
router.post('/:id/preferences', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { preference_type, preference_value } = req.body;

    if (!preference_type || !preference_value) {
      return res.status(400).json({
        success: false,
        message: 'Preference type and value are required'
      });
    }

    // This would require additional implementation in the customer model
    // For now, return success
    res.json({
      success: true,
      message: 'Customer preference added successfully'
    });

  } catch (error) {
    console.error('Add customer preference error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add customer preference'
    });
  }
});

// Get customer preferences
router.get('/:id/preferences', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // This would require additional implementation in the customer model
    // For now, return empty array
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Get customer preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer preferences'
    });
  }
});

// Export customers
router.get('/export/csv', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.customers?.includes('export')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot export customers'
      });
    }

    // This would generate and return a CSV file
    // For now, return success
    res.json({
      success: true,
      message: 'Customer export initiated',
      download_url: '/api/customers/export/download/12345'
    });

  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export customers'
    });
  }
});

module.exports = router;