const express = require('express');
const { body, validationResult } = require('express-validator');
const Sales = require('../models/Sales');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Sales.countDocuments();

    let query = Sales.find().populate('cashier', 'firstName lastName');

    // Filter by type
    if (req.query.type) {
      query = query.where('type', req.query.type);
    }

    // Filter by status
    if (req.query.status) {
      query = query.where('status', req.query.status);
    }

    // Filter by payment status
    if (req.query.paymentStatus) {
      query = query.where('paymentStatus', req.query.paymentStatus);
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.where('createdAt', {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      });
    }

    // Search by customer name or transaction ID
    if (req.query.search) {
      query = query.where({
        $or: [
          { 'customer.name': { $regex: req.query.search, $options: 'i' } },
          { transactionId: { $regex: req.query.search, $options: 'i' } }
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

    const sales = await query;

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
      count: sales.length,
      pagination,
      data: sales
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
router.get('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const sale = await Sales.findById(req.params.id)
      .populate('cashier', 'firstName lastName')
      .populate('items.item', 'name itemCode unitPrice');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private/Admin/Manager
router.post('/', authorize('admin', 'manager'), [
  body('type')
    .isIn(['laundry', 'water_refilling', 'mixed'])
    .withMessage('Invalid sale type'),
  body('customer.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.item')
    .isMongoId()
    .withMessage('Invalid item ID'),
  body('items.*.quantity')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'online'])
    .withMessage('Invalid payment method')
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

    // Process items and calculate totals
    const processedItems = [];
    let subtotal = 0;

    for (const item of req.body.items) {
      const inventoryItem = await Inventory.findById(item.item);
      if (!inventoryItem) {
        return res.status(404).json({
          success: false,
          message: `Item with ID ${item.item} not found`
        });
      }

      if (inventoryItem.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${inventoryItem.name}`
        });
      }

      const totalPrice = inventoryItem.unitPrice * item.quantity;
      const discount = item.discount || 0;
      const finalPrice = totalPrice - discount;

      processedItems.push({
        item: item.item,
        itemName: inventoryItem.name,
        quantity: item.quantity,
        unitPrice: inventoryItem.unitPrice,
        totalPrice,
        discount,
        finalPrice
      });

      subtotal += finalPrice;

      // Update inventory
      await inventoryItem.updateStock(item.quantity, 'out', `Sale: ${req.body.transactionId || 'New Sale'}`);
    }

    // Calculate totals
    const tax = req.body.tax || 0;
    const discount = req.body.discount || 0;
    const totalAmount = subtotal + tax - discount;

    // Create sale
    const saleData = {
      ...req.body,
      items: processedItems,
      subtotal,
      totalAmount,
      cashier: req.user.id,
      cashierName: `${req.user.firstName} ${req.user.lastName}`
    };

    const sale = await Sales.create(saleData);

    // Populate related data
    await sale.populate('cashier', 'firstName lastName');
    await sale.populate('items.item', 'name itemCode unitPrice');

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update sale
// @route   PUT /api/sales/:id
// @access  Private/Admin/Manager
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const sale = await Sales.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('cashier', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete sale
// @route   DELETE /api/sales/:id
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const sale = await Sales.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Restore inventory if sale is deleted
    for (const item of sale.items) {
      const inventoryItem = await Inventory.findById(item.item);
      if (inventoryItem) {
        await inventoryItem.updateStock(item.quantity, 'in', `Sale deletion: ${sale.transactionId}`);
      }
    }

    await sale.remove();

    res.status(200).json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get sales statistics
// @route   GET /api/sales/statistics
// @access  Private/Admin/Manager
router.get('/statistics/overview', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    const stats = await Sales.getStatistics(startDate, endDate);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get top selling items
// @route   GET /api/sales/top-items
// @access  Private/Admin/Manager
router.get('/top-items/list', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    const items = await Sales.getTopSellingItems(limit, startDate, endDate);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 