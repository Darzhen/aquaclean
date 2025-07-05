const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee reference is required']
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required']
  },
  employeeName: {
    type: String,
    required: [true, 'Employee name is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  timeIn: {
    type: Date,
    required: [true, 'Time in is required']
  },
  timeOut: {
    type: Date,
    default: null
  },
  breakStart: {
    type: Date,
    default: null
  },
  breakEnd: {
    type: Date,
    default: null
  },
  totalHours: {
    type: Number,
    default: 0,
    min: [0, 'Total hours cannot be negative']
  },
  breakHours: {
    type: Number,
    default: 0,
    min: [0, 'Break hours cannot be negative']
  },
  workHours: {
    type: Number,
    default: 0,
    min: [0, 'Work hours cannot be negative']
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: [0, 'Overtime hours cannot be negative']
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'early_departure', 'half_day', 'leave', 'holiday'],
    default: 'present'
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night', 'flexible'],
    default: 'morning'
  },
  shiftStart: {
    type: String,
    default: '08:00'
  },
  shiftEnd: {
    type: String,
    default: '17:00'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedAt: {
    type: Date,
    default: null
  },
  // For manual entry
  isManualEntry: {
    type: Boolean,
    default: false
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted time in
attendanceSchema.virtual('formattedTimeIn').get(function() {
  return this.timeIn.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for formatted time out
attendanceSchema.virtual('formattedTimeOut').get(function() {
  if (!this.timeOut) return 'Not clocked out';
  return this.timeOut.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for late minutes
attendanceSchema.virtual('lateMinutes').get(function() {
  if (!this.timeIn) return 0;
  
  const shiftStartTime = new Date(this.date);
  const [hours, minutes] = this.shiftStart.split(':');
  shiftStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const timeIn = new Date(this.timeIn);
  const diffMs = timeIn - shiftStartTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes > 0 ? diffMinutes : 0;
});

// Virtual for early departure minutes
attendanceSchema.virtual('earlyDepartureMinutes').get(function() {
  if (!this.timeOut) return 0;
  
  const shiftEndTime = new Date(this.date);
  const [hours, minutes] = this.shiftEnd.split(':');
  shiftEndTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const timeOut = new Date(this.timeOut);
  const diffMs = shiftEndTime - timeOut;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes > 0 ? diffMinutes : 0;
});

// Virtual for attendance status based on time
attendanceSchema.virtual('calculatedStatus').get(function() {
  if (!this.timeIn) return 'absent';
  
  const lateMinutes = this.lateMinutes;
  const earlyDepartureMinutes = this.earlyDepartureMinutes;
  
  if (lateMinutes > 30) return 'late';
  if (earlyDepartureMinutes > 60) return 'early_departure';
  if (this.workHours < 4) return 'half_day';
  
  return 'present';
});

// Indexes for better query performance
attendanceSchema.index({ 
  employee: 1, 
  date: 1, 
  status: 1,
  isApproved: 1 
});

// Compound index for date range queries
attendanceSchema.index({ date: 1, employee: 1 });

// Pre-save middleware to calculate hours
attendanceSchema.pre('save', function(next) {
  if (this.timeIn && this.timeOut) {
    const timeIn = new Date(this.timeIn);
    const timeOut = new Date(this.timeOut);
    
    // Calculate total hours
    const totalMs = timeOut - timeIn;
    this.totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
    
    // Calculate break hours
    if (this.breakStart && this.breakEnd) {
      const breakStart = new Date(this.breakStart);
      const breakEnd = new Date(this.breakEnd);
      const breakMs = breakEnd - breakStart;
      this.breakHours = Math.round((breakMs / (1000 * 60 * 60)) * 100) / 100;
    }
    
    // Calculate work hours (total - break)
    this.workHours = Math.round((this.totalHours - this.breakHours) * 100) / 100;
    
    // Calculate overtime (assuming 8 hours is normal work day)
    const normalHours = 8;
    this.overtimeHours = Math.max(0, this.workHours - normalHours);
  }
  
  // Set status based on calculated status
  if (!this.status || this.status === 'present') {
    this.status = this.calculatedStatus;
  }
  
  next();
});

// Static method to get attendance statistics
attendanceSchema.statics.getStatistics = async function(startDate, endDate, employeeId = null) {
  const matchStage = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  if (employeeId) {
    matchStage.employee = employeeId;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        totalWorkHours: { $sum: '$workHours' },
        totalOvertimeHours: { $sum: '$overtimeHours' },
        avgWorkHours: { $avg: '$workHours' }
      }
    }
  ]);
  
  const dailyStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        totalWorkHours: { $sum: '$workHours' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  
  return {
    overall: stats[0] || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalWorkHours: 0,
      totalOvertimeHours: 0,
      avgWorkHours: 0
    },
    daily: dailyStats
  };
};

// Static method to get employee attendance summary
attendanceSchema.statics.getEmployeeSummary = async function(employeeId, startDate, endDate) {
  const attendance = await this.find({
    employee: employeeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: 1 });
  
  const stats = await this.getStatistics(startDate, endDate, employeeId);
  
  return {
    attendance,
    statistics: stats.overall
  };
};

// Instance method to clock out
attendanceSchema.methods.clockOut = async function() {
  this.timeOut = new Date();
  await this.save();
  return this;
};

// Instance method to start break
attendanceSchema.methods.startBreak = async function() {
  this.breakStart = new Date();
  await this.save();
  return this;
};

// Instance method to end break
attendanceSchema.methods.endBreak = async function() {
  this.breakEnd = new Date();
  await this.save();
  return this;
};

// Instance method to get attendance summary
attendanceSchema.methods.getSummary = function() {
  return {
    id: this._id,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    date: this.date,
    timeIn: this.timeIn,
    timeOut: this.timeOut,
    totalHours: this.totalHours,
    workHours: this.workHours,
    status: this.status,
    isApproved: this.isApproved
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema); 