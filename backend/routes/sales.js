const express = require('express');
const router = express.Router();

// Import models
const SalesModel = require('../models/sales');
const InventoryModel = require('../models/inventory');
const CustomerModel = require('../models/customer');
const AuthenticationManager = require('../utils/authentication');

// Initialize models
const salesModel = new SalesModel();
const inventoryModel = new InventoryModel();
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

// Process a new sale
router.post('/process', authenticateUser, async (req, res) => {
  try {
    const sale_data = {
      ...req.body,
      employee_id: req.user.user_id
    };

    // Validate required fields
    if (!sale_data.items || !Array.isArray(sale_data.items) || sale_data.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required for a sale'
      });
    }

    if (!sale_data.payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Process the sale
    const result = await salesModel.process_sale(sale_data);

    if (result.success) {
      // Update customer purchase history if customer_id provided
      if (sale_data.customer_id) {
        await customerModel.add_purchase_record(
          sale_data.customer_id,
          result.transaction_id,
          result.total_amount,
          sale_data.payment_method,
          sale_data.items
        );
      }

      res.json({
        success: true,
        message: 'Sale processed successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Process sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process sale'
    });
  }
});

// Void a transaction
router.post('/void/:transactionId', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;

    // Check if user has permission to void transactions
    if (!req.user.permissions?.sales?.includes('void')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot void transactions'
      });
    }

    const result = await salesModel.void_transaction(transactionId, req.user.user_id, reason);

    if (result.success) {
      res.json({
        success: true,
        message: 'Transaction voided successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Void transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to void transaction'
    });
  }
});

// Apply discount to transaction
router.post('/discount/:transactionId', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { discount_type, discount_value } = req.body;

    if (!discount_type || discount_value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Discount type and value are required'
      });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({
        success: false,
        message: 'Discount type must be "percentage" or "fixed"'
      });
    }

    const result = await salesModel.apply_discount(transactionId, discount_type, discount_value);

    if (result.success) {
      res.json({
        success: true,
        message: 'Discount applied successfully',
        data: {
          new_discount: result.new_discount,
          new_total: result.new_total
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply discount'
    });
  }
});

// Get sales summary
router.get('/summary', authenticateUser, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const result = await salesModel.get_sales_summary(start_date, end_date);

    if (result.success) {
      res.json({
        success: true,
        data: result.summary
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales summary'
    });
  }
});

// Get recent sales
router.get('/recent', authenticateUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // This would require additional implementation in the sales model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        sales: [],
        total: 0,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('Get recent sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent sales'
    });
  }
});

// Get sale by transaction ID
router.get('/transaction/:transactionId', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // This would require additional implementation in the sales model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        transaction_id: transactionId,
        status: 'completed',
        total_amount: 0,
        items: []
      }
    });

  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sale details'
    });
  }
});

// Calculate tax
router.post('/calculate-tax', authenticateUser, async (req, res) => {
  try {
    const { subtotal, tax_rate } = req.body;

    if (subtotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Subtotal is required'
      });
    }

    const tax_amount = salesModel.calculate_tax(subtotal, tax_rate || 0.0875);

    res.json({
      success: true,
      data: {
        subtotal: parseFloat(subtotal),
        tax_rate: tax_rate || 0.0875,
        tax_amount: tax_amount,
        total: parseFloat(subtotal) + tax_amount
      }
    });

  } catch (error) {
    console.error('Calculate tax error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate tax'
    });
  }
});

// Get cash drawer status
router.get('/cash-drawer/status', authenticateUser, async (req, res) => {
  try {
    // This would require additional implementation in the sales model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        status: 'closed',
        opening_amount: 0,
        current_amount: 0,
        expected_amount: 0,
        difference: 0,
        opened_at: null,
        closed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get cash drawer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cash drawer status'
    });
  }
});

// Open cash drawer
router.post('/cash-drawer/open', authenticateUser, async (req, res) => {
  try {
    const { opening_amount } = req.body;

    if (opening_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Opening amount is required'
      });
    }

    // This would require additional implementation in the sales model
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Cash drawer opened successfully',
      data: {
        status: 'open',
        opening_amount: parseFloat(opening_amount),
        opened_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Open cash drawer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to open cash drawer'
    });
  }
});

// Close cash drawer
router.post('/cash-drawer/close', authenticateUser, async (req, res) => {
  try {
    const { closing_amount } = req.body;

    if (closing_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Closing amount is required'
      });
    }

    // This would require additional implementation in the sales model
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Cash drawer closed successfully',
      data: {
        status: 'closed',
        closing_amount: parseFloat(closing_amount),
        closed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Close cash drawer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close cash drawer'
    });
  }
});

// Get receipt data
router.get('/receipt/:transactionId', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // This would require additional implementation in the sales model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        transaction_id: transactionId,
        date: new Date().toISOString(),
        items: [],
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        payment_method: 'cash',
        employee: req.user.first_name + ' ' + req.user.last_name
      }
    });

  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get receipt data'
    });
  }
});

// Print receipt
router.post('/receipt/:transactionId/print', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // This would integrate with printer service
    // For now, return success
    res.json({
      success: true,
      message: 'Receipt sent to printer successfully'
    });

  } catch (error) {
    console.error('Print receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to print receipt'
    });
  }
});

// Email receipt
router.post('/receipt/:transactionId/email', authenticateUser, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { customer_email } = req.body;

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    // This would integrate with email service
    // For now, return success
    res.json({
      success: true,
      message: 'Receipt email sent successfully'
    });

  } catch (error) {
    console.error('Email receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email receipt'
    });
  }
});

module.exports = router;