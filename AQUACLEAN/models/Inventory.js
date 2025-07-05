const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['laundry', 'water_refilling', 'equipment', 'supplies', 'maintenance']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Subcategory cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['piece', 'kg', 'liter', 'gallon', 'bottle', 'box', 'pack', 'roll', 'set', 'pair']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  minimumStock: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock cannot be negative'],
    default: 10
  },
  maximumStock: {
    type: Number,
    min: [0, 'Maximum stock cannot be negative']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalValue: {
    type: Number,
    min: [0, 'Total value cannot be negative'],
    default: 0
  },
  supplier: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Supplier name cannot exceed 100 characters']
    },
    contact: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    phone: {
      type: String,
      trim: true
    },
    address: String
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  isLowStock: {
    type: Boolean,
    default: false
  },
  lastRestocked: {
    type: Date,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
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

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity <= 0) return 'out_of_stock';
  if (this.quantity <= this.minimumStock) return 'low_stock';
  if (this.maximumStock && this.quantity >= this.maximumStock) return 'overstocked';
  return 'normal';
});

// Virtual for stock percentage
inventorySchema.virtual('stockPercentage').get(function() {
  if (!this.maximumStock) return null;
  return Math.round((this.quantity / this.maximumStock) * 100);
});

// Virtual for days until expiry
inventorySchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for expiry status
inventorySchema.virtual('expiryStatus').get(function() {
  if (!this.expiryDate) return 'no_expiry';
  const daysUntilExpiry = this.daysUntilExpiry;
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
});

// Indexes for better query performance
inventorySchema.index({ 
  itemCode: 1, 
  category: 1, 
  status: 1, 
  isLowStock: 1,
  expiryDate: 1 
});

// Pre-save middleware to generate item code if not provided
inventorySchema.pre('save', async function(next) {
  if (!this.itemCode) {
    const prefix = this.category === 'laundry' ? 'LAU' : 
                  this.category === 'water_refilling' ? 'WAT' : 'INV';
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      category: this.category,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.itemCode = `${prefix}${year}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate total value
  this.totalValue = this.quantity * this.unitPrice;
  
  // Check if stock is low
  this.isLowStock = this.quantity <= this.minimumStock;
  
  next();
});

// Pre-save middleware to update lastUpdated
inventorySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to get inventory statistics
inventorySchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalValue: { $sum: '$totalValue' },
        lowStockItems: {
          $sum: { $cond: ['$isLowStock', 1, 0] }
        },
        outOfStockItems: {
          $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
        }
      }
    }
  ]);
  
  const categoryStats = await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalValue' },
        avgPrice: { $avg: '$unitPrice' }
      }
    }
  ]);
  
  const expiringItems = await this.find({
    expiryDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  }).countDocuments();
  
  return {
    overall: stats[0] || {
      totalItems: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0
    },
    byCategory: categoryStats,
    expiringItems
  };
};

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = async function() {
  return await this.find({
    $or: [
      { quantity: { $lte: '$minimumStock' } },
      { quantity: 0 }
    ]
  }).sort({ quantity: 1 });
};

// Static method to get expiring items
inventorySchema.statics.getExpiringItems = async function(days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return await this.find({
    expiryDate: {
      $gte: new Date(),
      $lte: expiryDate
    }
  }).sort({ expiryDate: 1 });
};

// Instance method to update stock
inventorySchema.methods.updateStock = async function(quantity, type = 'adjustment', notes = '') {
  const oldQuantity = this.quantity;
  
  if (type === 'in') {
    this.quantity += quantity;
  } else if (type === 'out') {
    this.quantity -= quantity;
  } else {
    this.quantity = quantity;
  }
  
  if (this.quantity < 0) {
    throw new Error('Stock cannot be negative');
  }
  
  this.totalValue = this.quantity * this.unitPrice;
  this.isLowStock = this.quantity <= this.minimumStock;
  
  if (type === 'in') {
    this.lastRestocked = new Date();
  }
  
  await this.save();
  
  // Create stock movement record
  const StockMovement = require('./StockMovement');
  await StockMovement.create({
    item: this._id,
    type: type,
    quantity: type === 'adjustment' ? quantity - oldQuantity : quantity,
    previousQuantity: oldQuantity,
    newQuantity: this.quantity,
    notes: notes
  });
  
  return this;
};

// Instance method to get item summary
inventorySchema.methods.getSummary = function() {
  return {
    id: this._id,
    itemCode: this.itemCode,
    name: this.name,
    category: this.category,
    quantity: this.quantity,
    unit: this.unit,
    unitPrice: this.unitPrice,
    totalValue: this.totalValue,
    stockStatus: this.stockStatus,
    isLowStock: this.isLowStock,
    status: this.status,
    image: this.image
  };
};

module.exports = mongoose.model('Inventory', inventorySchema); 