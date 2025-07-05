const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Item reference is required']
  },
  type: {
    type: String,
    required: [true, 'Movement type is required'],
    enum: ['in', 'out', 'adjustment', 'damaged', 'expired', 'returned']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  previousQuantity: {
    type: Number,
    required: [true, 'Previous quantity is required'],
    min: [0, 'Previous quantity cannot be negative']
  },
  newQuantity: {
    type: Number,
    required: [true, 'New quantity is required'],
    min: [0, 'New quantity cannot be negative']
  },
  unitPrice: {
    type: Number,
    min: [0, 'Unit price cannot be negative']
  },
  totalValue: {
    type: Number,
    min: [0, 'Total value cannot be negative']
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [200, 'Reason cannot exceed 200 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  performedByName: {
    type: String,
    required: [true, 'Performer name is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for movement description
stockMovementSchema.virtual('description').get(function() {
  const typeDescriptions = {
    'in': 'Stock In',
    'out': 'Stock Out',
    'adjustment': 'Stock Adjustment',
    'damaged': 'Damaged Stock',
    'expired': 'Expired Stock',
    'returned': 'Returned Stock'
  };
  
  return typeDescriptions[this.type] || 'Stock Movement';
});

// Virtual for formatted quantity change
stockMovementSchema.virtual('quantityChange').get(function() {
  const change = this.newQuantity - this.previousQuantity;
  return change > 0 ? `+${change}` : `${change}`;
});

// Indexes for better query performance
stockMovementSchema.index({ 
  item: 1, 
  type: 1, 
  createdAt: -1,
  performedBy: 1 
});

// Pre-save middleware to calculate total value
stockMovementSchema.pre('save', function(next) {
  if (this.unitPrice) {
    this.totalValue = this.quantity * this.unitPrice;
  }
  next();
});

// Static method to get movement statistics
stockMovementSchema.statics.getStatistics = async function(startDate, endDate, itemId = null) {
  const matchStage = {};
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (itemId) {
    matchStage.item = itemId;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' }
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
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$totalValue' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  
  return {
    byType: stats,
    daily: dailyStats
  };
};

// Instance method to get movement summary
stockMovementSchema.methods.getSummary = function() {
  return {
    id: this._id,
    item: this.item,
    type: this.type,
    quantity: this.quantity,
    previousQuantity: this.previousQuantity,
    newQuantity: this.newQuantity,
    reason: this.reason,
    performedByName: this.performedByName,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('StockMovement', stockMovementSchema); 