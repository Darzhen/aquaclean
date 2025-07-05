const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { protect, authorize, canAccessEmployee } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all salary records
// @route   GET /api/salary
// @access  Private
router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Employee.countDocuments();

    let query = Employee.find().populate('user', 'username email');

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
      query = query.sort('firstName');
    }

    // Pagination
    query = query.skip(startIndex).limit(limit);

    const employees = await query;

    // Calculate salary information for each employee
    const salaryData = await Promise.all(
      employees.map(async (employee) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const attendance = await Attendance.find({
          employee: employee._id,
          date: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        });

        const totalWorkHours = attendance.reduce((sum, record) => sum + (record.workHours || 0), 0);
        const totalOvertimeHours = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
        
        // Calculate salary based on salary type
        let monthlySalary = employee.salary;
        if (employee.salaryType === 'hourly') {
          monthlySalary = totalWorkHours * employee.salary;
        } else if (employee.salaryType === 'daily') {
          const workDays = attendance.filter(record => record.status === 'present').length;
          monthlySalary = workDays * employee.salary;
        }

        // Add overtime pay (assuming 1.5x rate)
        const overtimePay = totalOvertimeHours * (employee.salary / 160) * 1.5; // 160 hours per month
        const totalSalary = monthlySalary + overtimePay;

        return {
          ...employee.toObject(),
          currentMonthWorkHours: totalWorkHours,
          currentMonthOvertimeHours: totalOvertimeHours,
          calculatedSalary: totalSalary,
          overtimePay
        };
      })
    );

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
      count: salaryData.length,
      pagination,
      data: salaryData
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get employee salary details
// @route   GET /api/salary/:employeeId
// @access  Private
router.get('/:employeeId', canAccessEmployee, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.employeeId)
      .populate('user', 'username email');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get attendance records for the current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const attendance = await Attendance.find({
      employee: employee._id,
      date: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    }).sort('date');

    const totalWorkHours = attendance.reduce((sum, record) => sum + (record.workHours || 0), 0);
    const totalOvertimeHours = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const presentDays = attendance.filter(record => record.status === 'present').length;
    const absentDays = attendance.filter(record => record.status === 'absent').length;
    const lateDays = attendance.filter(record => record.status === 'late').length;
    
    // Calculate salary
    let monthlySalary = employee.salary;
    if (employee.salaryType === 'hourly') {
      monthlySalary = totalWorkHours * employee.salary;
    } else if (employee.salaryType === 'daily') {
      monthlySalary = presentDays * employee.salary;
    }

    // Add overtime pay
    const overtimePay = totalOvertimeHours * (employee.salary / 160) * 1.5;
    const totalSalary = monthlySalary + overtimePay;

    const salaryData = {
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        position: employee.position,
        department: employee.department,
        salary: employee.salary,
        salaryType: employee.salaryType
      },
      attendance: {
        totalWorkHours,
        totalOvertimeHours,
        presentDays,
        absentDays,
        lateDays,
        records: attendance
      },
      salary: {
        baseSalary: monthlySalary,
        overtimePay,
        totalSalary,
        currency: 'PHP'
      }
    };

    res.status(200).json({
      success: true,
      data: salaryData
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Calculate salary for specific period
// @route   POST /api/salary/calculate
// @access  Private/Admin/Manager
router.post('/calculate', authorize('admin', 'manager'), [
  body('employeeId')
    .isMongoId()
    .withMessage('Valid employee ID is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required')
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

    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get attendance records for the specified period
    const attendance = await Attendance.find({
      employee: employee._id,
      date: {
        $gte: new Date(req.body.startDate),
        $lte: new Date(req.body.endDate)
      }
    }).sort('date');

    const totalWorkHours = attendance.reduce((sum, record) => sum + (record.workHours || 0), 0);
    const totalOvertimeHours = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const presentDays = attendance.filter(record => record.status === 'present').length;
    const absentDays = attendance.filter(record => record.status === 'absent').length;
    const lateDays = attendance.filter(record => record.status === 'late').length;
    
    // Calculate salary based on salary type
    let baseSalary = employee.salary;
    if (employee.salaryType === 'hourly') {
      baseSalary = totalWorkHours * employee.salary;
    } else if (employee.salaryType === 'daily') {
      baseSalary = presentDays * employee.salary;
    } else if (employee.salaryType === 'weekly') {
      const weeks = Math.ceil((new Date(req.body.endDate) - new Date(req.body.startDate)) / (1000 * 60 * 60 * 24 * 7));
      baseSalary = weeks * employee.salary;
    }

    // Calculate overtime pay
    const overtimePay = totalOvertimeHours * (employee.salary / 160) * 1.5;
    const totalSalary = baseSalary + overtimePay;

    const calculation = {
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        position: employee.position,
        department: employee.department,
        salary: employee.salary,
        salaryType: employee.salaryType
      },
      period: {
        startDate: req.body.startDate,
        endDate: req.body.endDate
      },
      attendance: {
        totalWorkHours,
        totalOvertimeHours,
        presentDays,
        absentDays,
        lateDays,
        totalDays: attendance.length
      },
      salary: {
        baseSalary,
        overtimePay,
        totalSalary,
        currency: 'PHP'
      },
      breakdown: {
        dailyRate: employee.salaryType === 'daily' ? employee.salary : employee.salary / 22,
        hourlyRate: employee.salaryType === 'hourly' ? employee.salary : employee.salary / 160,
        overtimeRate: (employee.salary / 160) * 1.5
      }
    };

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get salary statistics
// @route   GET /api/salary/statistics
// @access  Private/Admin/Manager
router.get('/statistics/overview', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employees = await Employee.find({ employmentStatus: 'active' });
    
    const totalEmployees = employees.length;
    const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);
    const avgSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;

    // Group by department
    const departmentStats = employees.reduce((acc, emp) => {
      if (!acc[emp.department]) {
        acc[emp.department] = { count: 0, totalSalary: 0 };
      }
      acc[emp.department].count++;
      acc[emp.department].totalSalary += emp.salary;
      return acc;
    }, {});

    // Calculate averages for departments
    Object.keys(departmentStats).forEach(dept => {
      departmentStats[dept].avgSalary = departmentStats[dept].totalSalary / departmentStats[dept].count;
    });

    // Group by position
    const positionStats = employees.reduce((acc, emp) => {
      if (!acc[emp.position]) {
        acc[emp.position] = { count: 0, totalSalary: 0 };
      }
      acc[emp.position].count++;
      acc[emp.position].totalSalary += emp.salary;
      return acc;
    }, {});

    // Calculate averages for positions
    Object.keys(positionStats).forEach(pos => {
      positionStats[pos].avgSalary = positionStats[pos].totalSalary / positionStats[pos].count;
    });

    const stats = {
      overall: {
        totalEmployees,
        totalSalary,
        avgSalary
      },
      byDepartment: departmentStats,
      byPosition: positionStats
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 