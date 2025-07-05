const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required']
    },
    country: {
      type: String,
      default: 'Philippines'
    }
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: ['manager', 'cashier', 'laundry_attendant', 'water_refiller', 'maintenance', 'security', 'cleaner']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['laundry', 'water_refilling', 'maintenance', 'security', 'administration']
  },
  hireDate: {
    type: Date,
    required: [true, 'Hire date is required'],
    default: Date.now
  },
  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: [0, 'Salary cannot be negative']
  },
  salaryType: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'monthly'
  },
  employmentStatus: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'resigned', 'suspended'],
    default: 'active'
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required']
    },
    address: String
  },
  documents: {
    resume: String,
    idCard: String,
    medicalCertificate: String,
    contract: String
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for initials
employeeSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// Virtual for age
employeeSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for years of service
employeeSchema.virtual('yearsOfService').get(function() {
  if (!this.hireDate) return 0;
  const today = new Date();
  const hireDate = new Date(this.hireDate);
  let years = today.getFullYear() - hireDate.getFullYear();
  const monthDiff = today.getMonth() - hireDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hireDate.getDate())) {
    years--;
  }
  
  return years;
});

// Indexes for better query performance
employeeSchema.index({ employeeId: 1, email: 1, position: 1, department: 1, employmentStatus: 1 });

// Pre-save middleware to generate employee ID if not provided
employeeSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      hireDate: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.employeeId = `EMP${year}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Static method to get employee statistics
employeeSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        activeEmployees: {
          $sum: { $cond: [{ $eq: ['$employmentStatus', 'active'] }, 1, 0] }
        },
        totalSalary: { $sum: '$salary' },
        avgSalary: { $avg: '$salary' }
      }
    }
  ]);
  
  const departmentStats = await this.aggregate([
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        avgSalary: { $avg: '$salary' }
      }
    }
  ]);
  
  const positionStats = await this.aggregate([
    {
      $group: {
        _id: '$position',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    overall: stats[0] || {
      totalEmployees: 0,
      activeEmployees: 0,
      totalSalary: 0,
      avgSalary: 0
    },
    byDepartment: departmentStats,
    byPosition: positionStats
  };
};

// Instance method to get employee summary
employeeSchema.methods.getSummary = function() {
  return {
    id: this._id,
    employeeId: this.employeeId,
    fullName: this.fullName,
    position: this.position,
    department: this.department,
    email: this.email,
    phone: this.phone,
    hireDate: this.hireDate,
    employmentStatus: this.employmentStatus,
    salary: this.salary,
    profileImage: this.profileImage,
    isActive: this.isActive
  };
};

module.exports = mongoose.model('Employee', employeeSchema); 