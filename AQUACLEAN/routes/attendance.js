const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { protect, authorize, canAccessEmployee } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Attendance.countDocuments();

    let query = Attendance.find().populate('employee', 'firstName lastName employeeId');

    // Filter by employee
    if (req.query.employee) {
      query = query.where('employee', req.query.employee);
    }

    // Filter by status
    if (req.query.status) {
      query = query.where('status', req.query.status);
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query = query.where('date', {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      });
    }

    // Filter by approved status
    if (req.query.approved !== undefined) {
      query = query.where('isApproved', req.query.approved === 'true');
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
      query = query.sort('-date');
    }

    // Pagination
    query = query.skip(startIndex).limit(limit);

    const attendance = await query;

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
      count: attendance.length,
      pagination,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
router.get('/:id', canAccessEmployee, async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Private/Admin/Manager
router.post('/', authorize('admin', 'manager'), [
  body('employee')
    .isMongoId()
    .withMessage('Valid employee ID is required'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('timeIn')
    .isISO8601()
    .withMessage('Valid time in is required')
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

    // Check if employee exists
    const employee = await Employee.findById(req.body.employee);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if attendance record already exists for this date and employee
    const existingAttendance = await Attendance.findOne({
      employee: req.body.employee,
      date: {
        $gte: new Date(req.body.date).setHours(0, 0, 0, 0),
        $lt: new Date(req.body.date).setHours(23, 59, 59, 999)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date'
      });
    }

    const attendanceData = {
      ...req.body,
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`
    };

    const attendance = await Attendance.create(attendanceData);

    await attendance.populate('employee', 'firstName lastName employeeId');

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Admin/Manager
router.put('/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('employee', 'firstName lastName employeeId');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await attendance.remove();

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Clock in
// @route   POST /api/attendance/clock-in
// @access  Private
router.post('/clock-in', [
  body('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters')
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

    // Find employee by employee ID
    const employee = await Employee.findOne({ employeeId: req.body.employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if already clocked in today
    const today = new Date();
    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      date: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });

    if (existingAttendance && existingAttendance.timeIn) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked in today'
      });
    }

    const timeIn = new Date();
    let attendance;

    if (existingAttendance) {
      // Update existing record
      existingAttendance.timeIn = timeIn;
      if (req.body.location) existingAttendance.location = req.body.location;
      attendance = await existingAttendance.save();
    } else {
      // Create new record
      attendance = await Attendance.create({
        employee: employee._id,
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: today,
        timeIn,
        location: req.body.location
      });
    }

    await attendance.populate('employee', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      message: 'Clocked in successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Clock out
// @route   POST /api/attendance/clock-out
// @access  Private
router.post('/clock-out', [
  body('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required')
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

    // Find employee by employee ID
    const employee = await Employee.findOne({ employeeId: req.body.employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Find today's attendance record
    const today = new Date();
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });

    if (!attendance || !attendance.timeIn) {
      return res.status(400).json({
        success: false,
        message: 'No clock-in record found for today'
      });
    }

    if (attendance.timeOut) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked out today'
      });
    }

    await attendance.clockOut();
    await attendance.populate('employee', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get attendance statistics
// @route   GET /api/attendance/statistics
// @access  Private/Admin/Manager
router.get('/statistics/overview', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate || new Date();
    const employeeId = req.query.employeeId;
    
    const stats = await Attendance.getStatistics(startDate, endDate, employeeId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get employee attendance summary
// @route   GET /api/attendance/employee/:employeeId
// @access  Private
router.get('/employee/:employeeId', canAccessEmployee, async (req, res, next) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate || new Date();
    
    const summary = await Attendance.getEmployeeSummary(req.params.employeeId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Approve attendance record
// @route   PUT /api/attendance/:id/approve
// @access  Private/Admin/Manager
router.put('/:id/approve', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    attendance.isApproved = true;
    attendance.approvedBy = req.user.id;
    attendance.approvedAt = new Date();

    await attendance.save();
    await attendance.populate('employee', 'firstName lastName employeeId');
    await attendance.populate('approvedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Attendance record approved',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 