const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * CustomerUser Model - Independent customers who can message retailers
 * Fields: name, email, password, phone, address
 * Used for customer authentication and profile management
 */
const customerUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
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
  // Password reset fields
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
customerUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    // Update GeoJSON location if latitude/longitude changed
    if (this.isModified('latitude') || this.isModified('longitude')) {
      if (this.latitude && this.longitude) {
        this.location = {
          type: 'Point',
          coordinates: [this.longitude, this.latitude] // [lng, lat] order for GeoJSON
        };
        console.log(`📍 Updated customer location: [${this.longitude}, ${this.latitude}]`);
      }
    }
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // Update GeoJSON location if latitude/longitude exists
    if (this.latitude && this.longitude) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude]
      };
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
customerUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for customer profile (excludes password)
customerUserSchema.virtual('profile').get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    address: this.address,
    // Location fields
    locality: this.locality,
    latitude: this.latitude,
    longitude: this.longitude,
    has_gps: !!(this.latitude && this.longitude),
    createdAt: this.createdAt
  };
});

// Index for efficient queries (email already has unique: true in schema)
customerUserSchema.index({ phone: 1 });
// Locality-based discovery indexes
customerUserSchema.index({ locality: 1 });
customerUserSchema.index({ pincode: 1 });
customerUserSchema.index({ 'address.city': 1 });
// Geospatial index for distance-based queries
customerUserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('CustomerUser', customerUserSchema);
