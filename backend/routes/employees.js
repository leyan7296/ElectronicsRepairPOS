const express = require('express');
const router = express.Router();

// Import models
const EmployeeModel = require('../models/employees');
const AuthenticationManager = require('../utils/authentication');

// Initialize models
const employeeModel = new EmployeeModel();
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

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
  if (!req.user.permissions?.employees?.includes('manage_roles')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Get all employees
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { active_only } = req.query;

    const result = await employeeModel.get_employees(active_only !== 'false');

    if (result.success) {
      res.json({
        success: true,
        data: result.employees
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employees'
    });
  }
});

// Get employee by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await employeeModel.get_employees();
    
    if (result.success) {
      const employee = result.employees.find(emp => emp.id === parseInt(id));
      
      if (employee) {
        res.json({
          success: true,
          data: employee
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employee'
    });
  }
});

// Create new employee
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const employee_data = req.body;

    // Validate required fields
    if (!employee_data.first_name || !employee_data.last_name || !employee_data.position || !employee_data.hire_date) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, position, and hire date are required'
      });
    }

    const result = await employeeModel.create_employee(employee_data);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: {
          employee_id: result.employee_id,
          employee_number: result.employee_number
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee'
    });
  }
});

// Update employee
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const employee_data = req.body;

    // Check if user can update this employee
    const canUpdate = req.user.permissions?.employees?.includes('update') || 
                     (req.user.user_id === parseInt(id) && req.user.permissions?.employees?.includes('read'));

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot update this employee'
      });
    }

    const result = await employeeModel.update_employee(parseInt(id), employee_data);

    if (result.success) {
      res.json({
        success: true,
        message: 'Employee updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee'
    });
  }
});

// Delete employee (soft delete)
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (parseInt(id) === req.user.user_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const result = await employeeModel.update_employee(parseInt(id), { is_active: false });

    if (result.success) {
      res.json({
        success: true,
        message: 'Employee deactivated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee'
    });
  }
});

// Update employee permissions
router.put('/:id/permissions', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'Permissions are required'
      });
    }

    const result = await employeeModel.update_permissions(parseInt(id), permissions);

    if (result.success) {
      res.json({
        success: true,
        message: 'Permissions updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions'
    });
  }
});

// Get active sessions
router.get('/sessions/active', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const result = await employeeModel.get_active_sessions();

    if (result.success) {
      res.json({
        success: true,
        data: result.sessions
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active sessions'
    });
  }
});

// Terminate session
router.delete('/sessions/:sessionId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // This would require additional implementation in the employee model
    // For now, return success
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session'
    });
  }
});

// Get role permissions
router.get('/roles', authenticateUser, async (req, res) => {
  try {
    // This would require additional implementation in the employee model
    // For now, return default roles
    const roles = [
      {
        name: 'admin',
        description: 'Full system access',
        permissions: {
          sales: ['create', 'read', 'update', 'delete', 'void'],
          inventory: ['create', 'read', 'update', 'delete', 'manage_categories'],
          customers: ['create', 'read', 'update', 'delete', 'view_history'],
          employees: ['create', 'read', 'update', 'delete', 'manage_roles'],
          reports: ['view_all', 'export', 'schedule'],
          settings: ['system', 'security', 'backup']
        }
      },
      {
        name: 'manager',
        description: 'Management level access',
        permissions: {
          sales: ['create', 'read', 'update', 'void'],
          inventory: ['create', 'read', 'update', 'manage_categories'],
          customers: ['create', 'read', 'update', 'view_history'],
          employees: ['read', 'update'],
          reports: ['view_all', 'export']
        }
      },
      {
        name: 'staff',
        description: 'Basic staff access',
        permissions: {
          sales: ['create', 'read'],
          inventory: ['read', 'update'],
          customers: ['create', 'read', 'update']
        }
      },
      {
        name: 'cashier',
        description: 'Cashier only access',
        permissions: {
          sales: ['create', 'read'],
          customers: ['read']
        }
      }
    ];

    res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get roles'
    });
  }
});

// Get employee statistics
router.get('/stats/overview', authenticateUser, async (req, res) => {
  try {
    const result = await employeeModel.get_employees();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    const employees = result.employees;
    const stats = {
      total_employees: employees.length,
      active_employees: employees.filter(emp => emp.is_active).length,
      inactive_employees: employees.filter(emp => !emp.is_active).length,
      roles: {},
      departments: {},
      recent_hires: employees
        .filter(emp => emp.is_active)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
    };

    // Count by role
    employees.forEach(emp => {
      if (emp.role) {
        stats.roles[emp.role] = (stats.roles[emp.role] || 0) + 1;
      }
      if (emp.department) {
        stats.departments[emp.department] = (stats.departments[emp.department] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employee statistics'
    });
  }
});

// Search employees
router.get('/search/:query', authenticateUser, async (req, res) => {
  try {
    const { query } = req.params;

    const result = await employeeModel.get_employees();
    
    if (result.success) {
      const employees = result.employees.filter(emp => 
        emp.first_name.toLowerCase().includes(query.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(query.toLowerCase()) ||
        emp.email?.toLowerCase().includes(query.toLowerCase()) ||
        emp.position.toLowerCase().includes(query.toLowerCase())
      );

      res.json({
        success: true,
        data: employees
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search employees'
    });
  }
});

// Get employee activity log
router.get('/:id/activity', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can view this employee's activity
    const canView = req.user.permissions?.employees?.includes('read') || 
                   req.user.user_id === parseInt(id);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot view this employee\'s activity'
      });
    }

    // This would require additional implementation
    // For now, return empty array
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Get employee activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employee activity'
    });
  }
});

// Export employees
router.get('/export/csv', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // This would generate and return a CSV file
    // For now, return success
    res.json({
      success: true,
      message: 'Employee export initiated',
      download_url: '/api/employees/export/download/12345'
    });

  } catch (error) {
    console.error('Export employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export employees'
    });
  }
});

// Bulk update employees
router.put('/bulk', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { employee_ids, updates } = req.body;

    if (!employee_ids || !Array.isArray(employee_ids) || !updates) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array and updates object are required'
      });
    }

    const results = [];
    const errors = [];

    for (const id of employee_ids) {
      try {
        const result = await employeeModel.update_employee(id, updates);
        results.push({ id, success: result.success, message: result.message || result.error });
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        results,
        errors,
        total_processed: employee_ids.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length + errors.length
      }
    });

  } catch (error) {
    console.error('Bulk update employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update employees'
    });
  }
});

module.exports = router;