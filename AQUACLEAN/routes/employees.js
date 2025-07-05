const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { protect, authorize, canAccessEmployee } = require('../middleware/auth');
const ErrorResponse = require('../utils/errorResponse');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Employee.countDocuments();

    let query = Employee.find().populate('user', 'username email role');

    // Filter by department
    if (req.query.department) {
      query = query.where('department', req.query.department);
    }

    // Filter by position
    if (req.query.position) {
      query = query.where('position', req.query.position);
    }

    // Filter by employment status
    if (req.query.status) {
      query = query.where('employmentStatus', req.query.status);
    }

    // Search by name
    if (req.query.search) {
      query = query.where({
        $or: [
          { firstName: { $regex: req.query.search, $options: 'i' } },
          { lastName: { $regex: req.query.search, $options: 'i' } },
          { employeeId: { $regex: req.query.search, $options: 'i' } }
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

    const employees = await query;

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
      count: employees.length,
      pagination,
      data: employees
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
router.get('/:id', canAccessEmployee, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'username email role')
      .populate('approvedBy', 'firstName lastName');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private/Admin/Manager
router.post('/', authorize('admin', 'manager'), [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('position')
    .isIn(['manager', 'cashier', 'laundry_attendant', 'water_refiller', 'maintenance', 'security', 'cleaner'])
    .withMessage('Invalid position'),
  body('department')
    .isIn(['laundry', 'water_refilling', 'maintenance', 'security', 'administration'])
    .withMessage('Invalid department'),
  body('salary')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  body('emergencyContact.name')
    .trim()
    .notEmpty()
    .withMessage('Emergency contact name is required'),
  body('emergencyContact.phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid emergency contact phone number')
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

    // Create user account for employee
    const userData = {
      username: req.body.username || `${req.body.firstName.toLowerCase()}.${req.body.lastName.toLowerCase()}`,
      email: req.body.email,
      password: req.body.password || 'password123', // Default password
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      role: req.body.position === 'manager' ? 'manager' : 'employee',
      phone: req.body.phone
    };

    const user = await User.create(userData);

    // Create employee record
    const employeeData = {
      ...req.body,
      user: user._id
    };

    const employee = await Employee.create(employeeData);

    // Populate user data
    await employee.populate('user', 'username email role');

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private/Admin/Manager
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    let employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update employee
    employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user', 'username email role');

    // Update corresponding user if needed
    if (req.body.firstName || req.body.lastName || req.body.email || req.body.phone) {
      const userUpdate = {};
      if (req.body.firstName) userUpdate.firstName = req.body.firstName;
      if (req.body.lastName) userUpdate.lastName = req.body.lastName;
      if (req.body.email) userUpdate.email = req.body.email;
      if (req.body.phone) userUpdate.phone = req.body.phone;

      await User.findByIdAndUpdate(employee.user._id, userUpdate, {
        new: true,
        runValidators: true
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete associated user account
    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }

    await employee.remove();

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get employee statistics
// @route   GET /api/employees/statistics
// @access  Private/Admin/Manager
router.get('/statistics/overview', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const stats = await Employee.getStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get employees by department
// @route   GET /api/employees/department/:department
// @access  Private/Admin/Manager
router.get('/department/:department', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employees = await Employee.find({ 
      department: req.params.department,
      employmentStatus: 'active'
    }).populate('user', 'username email role');

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get employees by position
// @route   GET /api/employees/position/:position
// @access  Private/Admin/Manager
router.get('/position/:position', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employees = await Employee.find({ 
      position: req.params.position,
      employmentStatus: 'active'
    }).populate('user', 'username email role');

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update employee status
// @route   PUT /api/employees/:id/status
// @access  Private/Admin
router.put('/:id/status', authorize('admin'), [
  body('employmentStatus')
    .isIn(['active', 'inactive', 'terminated', 'resigned', 'suspended'])
    .withMessage('Invalid employment status')
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

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { employmentStatus: req.body.employmentStatus },
      { new: true, runValidators: true }
    ).populate('user', 'username email role');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update user account status if employee is terminated or resigned
    if (['terminated', 'resigned'].includes(req.body.employmentStatus)) {
      await User.findByIdAndUpdate(employee.user._id, { isActive: false });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload employee profile image
// @route   PUT /api/employees/:id/photo
// @access  Private/Admin/Manager
router.put('/:id/photo', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Handle file upload here
    // This would typically use multer middleware
    // For now, we'll just update the field

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    employee.profileImage = req.file.filename;
    await employee.save();

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 