const express = require('express');
const { body, validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Inventory.countDocuments();

    let query = Inventory.find();

    // Filter by category
    if (req.query.category) {
      query = query.where('category', req.query.category);
    }

    // Filter by status
    if (req.query.status) {
      query = query.where('status', req.query.status);
    }

    // Filter by low stock
    if (req.query.lowStock === 'true') {
      query = query.where('isLowStock', true);
    }

    // Search by name or item code
    if (req.query.search) {
      query = query.where({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { itemCode: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',');
      const sortOrder = {};
      sortBy.forEach(item => {
        if (item.startsWith('-')) {
          sortOrder[item.substring(1)] = -1;
        } else {
          sortOrder[item] = 1;
        }
      });
      query = query.sort(sortOrder);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    query = query.skip(startIndex).limit(limit);

    const items = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
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
      count: items.length,
      pagination,
      data: items
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
router.get('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private/Admin/Manager
router.post('/', authorize('admin', 'manager'), [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  body('category')
    .isIn(['laundry', 'water_refilling', 'equipment', 'supplies', 'maintenance'])
    .withMessage('Invalid category'),
  body('unit')
    .isIn(['piece', 'kg', 'liter', 'gallon', 'bottle', 'box', 'pack', 'roll', 'set', 'pair'])
    .withMessage('Invalid unit'),
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('minimumStock')
    .isFloat({ min: 0 })
    .withMessage('Minimum stock must be a positive number'),
  body('unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number')
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

    const item = await Inventory.create(req.body);

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Admin/Manager
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.remove();

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get inventory statistics
// @route   GET /api/inventory/statistics
// @access  Private/Admin/Manager
router.get('/statistics/overview', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const stats = await Inventory.getStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get low stock items
// @route   GET /api/inventory/low-stock
// @access  Private/Admin/Manager
router.get('/low-stock/items', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const items = await Inventory.getLowStockItems();

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get expiring items
// @route   GET /api/inventory/expiring
// @access  Private/Admin/Manager
router.get('/expiring/items', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const items = await Inventory.getExpiringItems(days);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update stock quantity
// @route   PUT /api/inventory/:id/stock
// @access  Private/Admin/Manager
router.put('/:id/stock', authorize('admin', 'manager'), [
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('type')
    .isIn(['in', 'out', 'adjustment'])
    .withMessage('Type must be in, out, or adjustment'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
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

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.updateStock(req.body.quantity, req.body.type, req.body.notes);

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 