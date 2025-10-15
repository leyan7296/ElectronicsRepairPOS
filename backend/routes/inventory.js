const express = require('express');
const router = express.Router();

// Import models
const InventoryModel = require('../models/inventory');
const BarcodeGenerator = require('../utils/barcode_maker');
const AuthenticationManager = require('../utils/authentication');

// Initialize models
const inventoryModel = new InventoryModel();
const barcodeGenerator = new BarcodeGenerator();
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

// Get all products
router.get('/products', authenticateUser, async (req, res) => {
  try {
    const { category_id, search, low_stock_only } = req.query;

    const result = await inventoryModel.get_products(
      category_id ? parseInt(category_id) : null,
      search || null,
      low_stock_only === 'true'
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.products
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products'
    });
  }
});

// Get product by ID
router.get('/products/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await inventoryModel.get_products();
    
    if (result.success) {
      const product = result.products.find(p => p.id === parseInt(id));
      
      if (product) {
        res.json({
          success: true,
          data: product
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product'
    });
  }
});

// Add new product
router.post('/products', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.inventory?.includes('create')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot create products'
      });
    }

    const product_data = {
      ...req.body,
      employee_id: req.user.user_id
    };

    // Validate required fields
    if (!product_data.name || !product_data.price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required'
      });
    }

    const result = await inventoryModel.add_product(product_data);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          product_id: result.product_id,
          sku: result.sku,
          barcode: result.barcode
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product'
    });
  }
});

// Update product
router.put('/products/:id', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.inventory?.includes('update')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot update products'
      });
    }

    const { id } = req.params;
    const product_data = req.body;

    const result = await inventoryModel.update_product(parseInt(id), product_data);

    if (result.success) {
      res.json({
        success: true,
        message: 'Product updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// Delete product
router.delete('/products/:id', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.inventory?.includes('delete')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot delete products'
      });
    }

    const { id } = req.params;

    const result = await inventoryModel.delete_product(parseInt(id));

    if (result.success) {
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// Update stock
router.post('/products/:id/stock', authenticateUser, async (req, res) => {
  try {
    // Check permissions
    if (!req.user.permissions?.inventory?.includes('update')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot update inventory'
      });
    }

    const { id } = req.params;
    const { quantity_change, movement_type, reason } = req.body;

    if (quantity_change === undefined || !movement_type) {
      return res.status(400).json({
        success: false,
        message: 'Quantity change and movement type are required'
      });
    }

    const result = await inventoryModel.update_stock(
      parseInt(id),
      parseInt(quantity_change),
      movement_type,
      reason || '',
      req.user.user_id
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: {
          previous_quantity: result.previous_quantity,
          new_quantity: result.new_quantity,
          quantity_change: result.quantity_change
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
});

// Search products
router.get('/search', authenticateUser, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await inventoryModel.search_products(q);

    if (result.success) {
      res.json({
        success: true,
        data: result.products
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', authenticateUser, async (req, res) => {
  try {
    const result = await inventoryModel.get_low_stock_alerts();

    if (result.success) {
      res.json({
        success: true,
        data: result.alerts
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get low stock alerts'
    });
  }
});

// Generate barcode for product
router.post('/products/:id/barcode', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode_type } = req.body;

    // Get product data
    const products_result = await inventoryModel.get_products();
    
    if (!products_result.success) {
      return res.status(500).json({
        success: false,
        message: products_result.error
      });
    }

    const product = products_result.products.find(p => p.id === parseInt(id));
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const result = await barcodeGenerator.generate_product_barcode(product);

    if (result.success) {
      res.json({
        success: true,
        data: {
          barcode_data: result.barcode_data,
          barcode_type: result.barcode_type,
          barcode_image: result.barcode_image,
          product_info: result.product_info
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate barcode'
    });
  }
});

// Generate batch barcodes
router.post('/barcodes/batch', authenticateUser, async (req, res) => {
  try {
    const { product_ids, barcode_type } = req.body;

    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    // Get products data
    const products_result = await inventoryModel.get_products();
    
    if (!products_result.success) {
      return res.status(500).json({
        success: false,
        message: products_result.error
      });
    }

    const products = products_result.products.filter(p => product_ids.includes(p.id));

    const result = await barcodeGenerator.generate_batch_barcodes(products);

    if (result.success) {
      res.json({
        success: true,
        data: {
          generated_count: result.generated_count,
          failed_count: result.failed_count,
          barcodes: result.barcodes,
          failed_products: result.failed_products
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Generate batch barcodes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate batch barcodes'
    });
  }
});

// Create barcode sheet
router.post('/barcodes/sheet', authenticateUser, async (req, res) => {
  try {
    const { barcodes, labels_per_row, labels_per_column } = req.body;

    if (!barcodes || !Array.isArray(barcodes)) {
      return res.status(400).json({
        success: false,
        message: 'Barcodes array is required'
      });
    }

    const result = await barcodeGenerator.create_barcode_sheet(
      barcodes,
      labels_per_row || 3,
      labels_per_column || 10
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          sheet_image: result.sheet_image,
          labels_count: result.labels_count,
          sheet_dimensions: result.sheet_dimensions
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Create barcode sheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create barcode sheet'
    });
  }
});

// Print barcode
router.post('/barcodes/:barcodeId/print', authenticateUser, async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const { printer_name } = req.body;

    // This would integrate with printer service
    // For now, return success
    res.json({
      success: true,
      message: 'Barcode sent to printer successfully'
    });

  } catch (error) {
    console.error('Print barcode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to print barcode'
    });
  }
});

// Get categories
router.get('/categories', authenticateUser, async (req, res) => {
  try {
    // This would require additional implementation in the inventory model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Electronics', description: 'Electronic devices and accessories', color_code: '#00D4FF' },
        { id: 2, name: 'Clothing', description: 'Apparel and fashion items', color_code: '#00FFAB' },
        { id: 3, name: 'Food & Beverage', description: 'Food and drink items', color_code: '#FFD700' },
        { id: 4, name: 'Accessories', description: 'Miscellaneous accessories', color_code: '#E8E8E8' }
      ]
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
});

// Get suppliers
router.get('/suppliers', authenticateUser, async (req, res) => {
  try {
    // This would require additional implementation in the inventory model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: [
        { id: 1, name: 'ABC Electronics', contact_person: 'John Smith', email: 'john@abcelectronics.com', phone: '(555) 123-4567' },
        { id: 2, name: 'Fashion Forward', contact_person: 'Jane Doe', email: 'jane@fashionforward.com', phone: '(555) 234-5678' }
      ]
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suppliers'
    });
  }
});

// Get inventory statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    // This would require additional implementation in the inventory model
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        total_products: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_value: 0,
        categories_count: 4,
        suppliers_count: 2
      }
    });

  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory statistics'
    });
  }
});

module.exports = router;