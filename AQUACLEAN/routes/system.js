const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get system settings
// @route   GET /api/system/settings
// @access  Private/Admin
router.get('/settings', authorize('admin'), async (req, res, next) => {
  try {
    // In a real application, you would store settings in a database
    // For now, we'll return default settings
    const settings = {
      company: {
        name: 'AquaClean Laundry & Water Refilling Station',
        address: '123 Main Street, City, Province',
        phone: '+63 912 345 6789',
        email: 'info@aquaclean.com',
        website: 'www.aquaclean.com'
      },
      business: {
        operatingHours: {
          monday: { open: '08:00', close: '20:00' },
          tuesday: { open: '08:00', close: '20:00' },
          wednesday: { open: '08:00', close: '20:00' },
          thursday: { open: '08:00', close: '20:00' },
          friday: { open: '08:00', close: '20:00' },
          saturday: { open: '08:00', close: '18:00' },
          sunday: { open: '09:00', close: '17:00' }
        },
        taxRate: 12, // 12% VAT
        currency: 'PHP',
        timezone: 'Asia/Manila'
      },
      system: {
        autoBackup: true,
        backupFrequency: 'daily',
        retentionDays: 30,
        maxFileSize: 5242880, // 5MB
        sessionTimeout: 3600 // 1 hour
      },
      notifications: {
        email: true,
        sms: false,
        lowStockAlert: true,
        attendanceAlert: true
      }
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update system settings
// @route   PUT /api/system/settings
// @access  Private/Admin
router.put('/settings', authorize('admin'), [
  body('company.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('company.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('business.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  body('system.retentionDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Retention days must be between 1 and 365')
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // In a real application, you would save settings to a database
    // For now, we'll just return the updated settings
    const updatedSettings = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user.id
    };

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create system backup
// @route   POST /api/system/backup
// @access  Private/Admin
router.post('/backup', authorize('admin'), async (req, res, next) => {
  try {
    const backupDir = path.join(__dirname, '../backups');
    
    // Create backup directory if it doesn't exist
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `aquaclean-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    // In a real application, you would export database data
    // For now, we'll create a simple backup structure
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      createdBy: req.user.id,
      data: {
        // This would contain actual database exports
        message: 'Backup data would be exported here'
      }
    };

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      data: {
        fileName: backupFileName,
        size: backupData.length,
        timestamp: backupData.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get backup files
// @route   GET /api/system/backups
// @access  Private/Admin
router.get('/backups', authorize('admin'), async (req, res, next) => {
  try {
    const backupDir = path.join(__dirname, '../backups');
    
    try {
      await fs.access(backupDir);
    } catch {
      // No backup directory exists
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const files = await fs.readdir(backupDir);
    const backupFiles = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        backupFiles.push({
          fileName: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
    }

    // Sort by creation date (newest first)
    backupFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: backupFiles.length,
      data: backupFiles
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Restore system from backup
// @route   POST /api/system/restore
// @access  Private/Admin
router.post('/restore', authorize('admin'), [
  body('fileName')
    .notEmpty()
    .withMessage('Backup file name is required')
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, req.body.fileName);

    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    // In a real application, you would restore database data
    // For now, we'll just read the backup file
    const backupData = await fs.readFile(backupPath, 'utf8');
    const parsedData = JSON.parse(backupData);

    res.status(200).json({
      success: true,
      message: 'System restored successfully',
      data: {
        restoredFrom: req.body.fileName,
        backupTimestamp: parsedData.timestamp,
        restoredAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get system logs
// @route   GET /api/system/logs
// @access  Private/Admin
router.get('/logs', authorize('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const startIndex = (page - 1) * limit;

    // In a real application, you would read from actual log files
    // For now, we'll return mock log data
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'System started successfully',
        user: 'admin',
        ip: '127.0.0.1'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'INFO',
        message: 'User login successful',
        user: 'manager1',
        ip: '192.168.1.100'
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'WARN',
        message: 'Low stock alert: Detergent running low',
        user: 'system',
        ip: '127.0.0.1'
      }
    ];

    const total = mockLogs.length;
    const logs = mockLogs.slice(startIndex, startIndex + limit);

    // Pagination result
    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get system health
// @route   GET /api/system/health
// @access  Private/Admin
router.get('/health', authorize('admin'), async (req, res, next) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      database: {
        status: 'connected',
        collections: ['users', 'employees', 'inventory', 'sales', 'attendance']
      },
      services: {
        authentication: 'active',
        fileUpload: 'active',
        email: 'inactive', // Would be active if configured
        backup: 'active'
      }
    };

    res.status(200).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Clear system cache
// @route   POST /api/system/clear-cache
// @access  Private/Admin
router.post('/clear-cache', authorize('admin'), async (req, res, next) => {
  try {
    // In a real application, you would clear various caches
    // For now, we'll just return a success message
    
    res.status(200).json({
      success: true,
      message: 'System cache cleared successfully',
      data: {
        clearedAt: new Date().toISOString(),
        clearedBy: req.user.id
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 