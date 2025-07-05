const mongoose = require('mongoose');

const salesItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Item reference is required']
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  finalPrice: {
    type: Number,
    required: [true, 'Final price is required'],
    min: [0, 'Final price cannot be negative']
  }
}, {
  timestamps: true
});

const salesSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: [true, 'Sale type is required'],
    enum: ['laundry', 'water_refilling', 'mixed']
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    address: String
  },
  items: [salesItemSchema],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'online']
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'paid', 'partially_paid', 'cancelled', 'refunded'],
    default: 'pending'
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Cashier reference is required']
  },
  cashierName: {
    type: String,
    required: [true, 'Cashier name is required']
  },
  status: {
    type: String,
    required: [true, 'Sale status is required'],
    enum: ['completed', 'pending', 'cancelled', 'refunded'],
    default: 'completed'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  // For laundry specific fields
  laundryDetails: {
    serviceType: {
      type: String,
      enum: ['wash_only', 'wash_and_dry', 'dry_clean', 'press_only', 'express']
    },
    weight: Number,
    pieces: Number,
    expectedReady: Date,
    actualReady: Date,
    pickupDate: Date,
    isPickedUp: {
      type: Boolean,
      default: false
    }
  },
  // For water refilling specific fields
  waterDetails: {
    containerType: {
      type: String,
      enum: ['gallon', 'bottle', 'container']
    },
    containerSize: Number,
    refillCount: Number,
    isReturned: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for profit calculation (if cost data is available)
salesSchema.virtual('profit').get(function() {
  // This would need cost data from inventory items
  // For now, return null
  return null;
});

// Virtual for profit margin
salesSchema.virtual('profitMargin').get(function() {
  if (!this.profit || !this.totalAmount) return null;
  return ((this.profit / this.totalAmount) * 100).toFixed(2);
});

// Virtual for formatted total amount
salesSchema.virtual('formattedTotal').get(function() {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(this.totalAmount);
});

// Indexes for better query performance
salesSchema.index({ 
  transactionId: 1, 
  type: 1, 
  status: 1, 
  paymentStatus: 1,
  createdAt: -1,
  'customer.name': 1
});

// Pre-save middleware to generate transaction ID if not provided
salesSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const prefix = this.type === 'laundry' ? 'LAU' : 
                  this.type === 'water_refilling' ? 'WAT' : 'SAL';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      type: this.type,
      createdAt: {
        $gte: new Date(year, new Date().getMonth(), 1),
        $lt: new Date(year, new Date().getMonth() + 1, 1)
      }
    });
    this.transactionId = `${prefix}${year}${month}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Generate receipt number if not provided
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.receiptNumber = `RCP${year}${String(count + 1).padStart(6, '0')}`;
  }
  
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
  this.totalAmount = this.subtotal + this.tax - this.discount;
  
  next();
});

// Static method to get sales statistics
salesSchema.statics.getStatistics = async function(startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        avgTransactionValue: { $avg: '$totalAmount' },
        totalItems: { $sum: { $size: '$items' } }
      }
    }
  ]);
  
  const typeStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
        avgValue: { $avg: '$totalAmount' }
      }
    }
  ]);
  
  const paymentMethodStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  const dailyStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  
  return {
    overall: stats[0] || {
      totalSales: 0,
      totalRevenue: 0,
      avgTransactionValue: 0,
      totalItems: 0
    },
    byType: typeStats,
    byPaymentMethod: paymentMethodStats,
    daily: dailyStats
  };
};

// Static method to get top selling items
salesSchema.statics.getTopSellingItems = async function(limit = 10, startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return await this.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.item',
        itemName: { $first: '$items.itemName' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.finalPrice' },
        avgPrice: { $avg: '$items.unitPrice' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit }
  ]);
};

// Instance method to get sale summary
salesSchema.methods.getSummary = function() {
  return {
    id: this._id,
    transactionId: this.transactionId,
    type: this.type,
    customerName: this.customer.name,
    totalAmount: this.totalAmount,
    paymentStatus: this.paymentStatus,
    status: this.status,
    createdAt: this.createdAt,
    cashierName: this.cashierName,
    receiptNumber: this.receiptNumber
  };
};

// Instance method to calculate totals
salesSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
  this.totalAmount = this.subtotal + this.tax - this.discount;
  return this;
};

module.exports = mongoose.model('Sales', salesSchema); 