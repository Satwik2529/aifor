const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model - Core user schema for BizNova business owners
 * Fields: name, phone, password, shop_name, language, upi_id
 * Used for authentication and business profile management
 * Future: Integration with AI services and WhatsApp communication
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: function() {
      // Phone is not required if user has google_id
      return !this.google_id;
    },
    sparse: true, // Allows multiple empty values
    trim: true,
    validate: {
      validator: function(v) {
        // If empty and has google_id, it's valid
        if (!v && this.google_id) return true;
        // Otherwise must match Indian phone pattern
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please enter a valid Indian phone number'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['retailer', 'customer'],
    default: 'retailer',
    required: [true, 'Role is required']
  },
  shop_name: {
    type: String,
    trim: true,
    maxlength: [100, 'Shop name cannot exceed 100 characters']
  },
  shop_description: {
    type: String,
    trim: true,
    maxlength: [500, 'Shop description cannot exceed 500 characters'],
    default: ''
  },
  business_type: {
    type: String,
    trim: true,
    enum: ['Retail', 'Wholesale', 'Both', 'Other'],
    default: 'Retail'
  },
  gst_number: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number'],
    default: ''
  },
  address: {
    street: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
      default: ''
    }
  },
  // Locality-based discovery fields (optional, backward-compatible)
  locality: {
    type: String,
    trim: true,
    default: null
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  // GeoJSON location for distance-based queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  avatar: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'Hindi',
    enum: ['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Marathi', 'Kannada', 'Malayalam', 'Punjabi'],
    trim: true
  },
  upi_id: {
    type: String,
    trim: true,
    match: [/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/, 'Please enter a valid UPI ID']
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  // Account lockout fields
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  // Google OAuth fields
  google_id: {
    type: String,
    sparse: true,
    unique: true
  },
  avatar_url: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's full profile
userSchema.virtual('profile').get(function () {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    email: this.email,
    shop_name: this.shop_name,
    shop_description: this.shop_description,
    business_type: this.business_type,
    gst_number: this.gst_number,
    address: this.address,
    avatar: this.avatar,
    language: this.language,
    upi_id: this.upi_id,
    // Location fields
    locality: this.locality,
    latitude: this.latitude,
    longitude: this.longitude,
    has_gps: !!(this.latitude && this.longitude),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Update GeoJSON location if latitude/longitude changed
  if (this.isModified('latitude') || this.isModified('longitude')) {
    if (this.latitude && this.longitude) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude] // [lng, lat] order for GeoJSON
      };
    }
  }

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Locality-based discovery indexes for retailers
userSchema.index({ locality: 1 });
userSchema.index({ 'address.pincode': 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ role: 1, locality: 1 }); // Compound index for retailer discovery
// Geospatial index for distance-based queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
