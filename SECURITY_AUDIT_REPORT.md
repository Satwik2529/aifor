# 🔒 Authentication Security Audit Report

**Date:** February 7, 2026  
**System:** BizNova (React Frontend + Node/Express Backend + MongoDB)  
**Roles:** Customer & Retailer

---

## 📋 EXECUTIVE SUMMARY

### ✅ Strengths
- Separate authentication systems for customers and retailers
- Password hashing with bcrypt (cost factor 10-12)
- JWT-based authentication with 7-day expiry
- Password reset with secure token generation
- Input validation using express-validator
- Google OAuth integration

### ⚠️ Critical Issues Found
1. **No unique constraint on phone across roles** - Same phone can be used for both customer and retailer
2. **Missing rate limiting** - No protection against brute force attacks
3. **No OTP system** - Password reset uses email tokens only
4. **Weak JWT secret** - Hardcoded fallback secret in code
5. **No refresh token mechanism** - Users must re-login after 7 days
6. **Case-sensitive email checks** - Can create duplicate accounts with different cases
7. **No account lockout** - Unlimited login attempts allowed
8. **Missing CORS configuration audit** - Need to verify production settings
9. **No session invalidation on logout** - JWT remains valid until expiry
10. **Validation bypass possible** - Backend doesn't re-validate all fields

---

## 🔍 DETAILED FINDINGS

### 1. DUPLICATE PREVENTION

#### ❌ CRITICAL: Cross-Role Phone Duplication
**Issue:** Same phone number can be registered as both customer and retailer.

**Current State:**
- Retailer model: `phone` field with sparse index (allows empty for Google users)
- Customer model: `phone` field with regular index
- No cross-collection uniqueness check

**Test Case:**
```javascript
// This will succeed - SECURITY ISSUE!
1. Register as retailer: phone=9876543210
2. Register as customer: phone=9876543210 (different collection)
// Both accounts created successfully
```

**Impact:** HIGH - Identity confusion, potential fraud

**Fix Required:**
```javascript
// In authController.register (Retailer)
const existingUser = await User.findOne({ phone });
const existingCustomer = await CustomerUser.findOne({ phone }); // ADD THIS

if (existingUser || existingCustomer) {
  return res.status(400).json({
    success: false,
    message: 'Phone number already registered',
    error: 'Phone number in use'
  });
}

// In customerAuthController.register (Customer)
const existingCustomer = await CustomerUser.findOne({ email });
const existingRetailer = await User.findOne({ email }); // ADD THIS

if (existingCustomer || existingRetailer) {
  return res.status(400).json({
    success: false,
    message: 'Email already registered',
    error: 'Email in use'
  });
}
```

#### ❌ CRITICAL: Case-Sensitive Email
**Issue:** Email checks are case-sensitive, allowing duplicates.

**Current State:**
```javascript
// These will create 2 accounts:
user@example.com
User@Example.com
USER@EXAMPLE.COM
```

**Fix Required:**
```javascript
// In customerAuthController.register
const existingCustomer = await CustomerUser.findOne({ 
  email: email.toLowerCase() // ADD .toLowerCase()
});

// In customerAuthController.login
const customer = await CustomerUser.findOne({ 
  email: email.toLowerCase() // ADD .toLowerCase()
});
```

#### ✅ GOOD: Race Condition Handling
**Status:** Partially handled in Google auth, but missing in regular registration.

**Fix Required:**
```javascript
// Add unique indexes at database level
// Run this migration:
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.customerusers.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
```

---

### 2. VALIDATION

#### ⚠️ MEDIUM: Backend Validation Incomplete
**Issue:** Some validations only in express-validator, not in model.

**Current State:**
- UPI ID validation only in middleware, not enforced in model
- Phone validation can be bypassed if middleware is skipped
- No validation for special characters in names

**Fix Required:**
```javascript
// In User model, add custom validators:
name: {
  type: String,
  required: [true, 'Name is required'],
  trim: true,
  maxlength: [100, 'Name cannot exceed 100 characters'],
  validate: {
    validator: function(v) {
      // Prevent SQL injection, XSS
      return !/[<>\"'%;()&+]/.test(v);
    },
    message: 'Name contains invalid characters'
  }
}
```

#### ❌ CRITICAL: Password Validation Weak
**Issue:** Only 6 character minimum, no complexity requirements.

**Current State:**
```javascript
password: {
  type: String,
  required: [true, 'Password is required'],
  minlength: [6, 'Password must be at least 6 characters']
}
```

**Fix Required:**
```javascript
// In validation.js
body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain uppercase, lowercase, and number')
```

#### ✅ GOOD: Input Sanitization
**Status:** Trim and lowercase applied to emails.

---

### 3. ROLE SEPARATION

#### ⚠️ MEDIUM: No Role-Based Middleware
**Issue:** JWT doesn't include role, middleware doesn't enforce role separation.

**Current State:**
```javascript
// JWT payload only has userId
{ userId: "..." }

// Middleware finds user in both collections
let user = await User.findOne(...);
if (!user) user = await CustomerUser.findOne(...);
```

**Fix Required:**
```javascript
// 1. Include role in JWT
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType }, // ADD userType
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 2. Create role-specific middleware
const requireRetailer = (req, res, next) => {
  if (req.userType !== 'retailer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Retailer account required.'
    });
  }
  next();
};

const requireCustomer = (req, res, next) => {
  if (req.userType !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer account required.'
    });
  }
  next();
};

// 3. Apply to routes
router.get('/sales', authenticateToken, requireRetailer, salesController.getSales);
router.get('/orders', authenticateToken, requireCustomer, ordersController.getOrders);
```

#### ✅ GOOD: Separate Collections
**Status:** Customers and retailers in different collections.

---

### 4. SECURITY

#### ❌ CRITICAL: Weak JWT Secret
**Issue:** Hardcoded fallback secret in code.

**Current Code:**
```javascript
process.env.JWT_SECRET || 'your_jwt_secret_here'
```

**Fix Required:**
```javascript
// Remove fallback, fail fast if not set
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

// Generate strong secret (run once):
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### ❌ CRITICAL: No Rate Limiting
**Issue:** No protection against brute force attacks.

**Fix Required:**
```javascript
// Install: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 1 hour.'
  }
});

// Apply to routes
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/forgot-password', resetLimiter, passwordController.forgotPassword);
```

#### ❌ CRITICAL: No Account Lockout
**Issue:** Unlimited failed login attempts allowed.

**Fix Required:**
```javascript
// Add to User and CustomerUser models:
loginAttempts: {
  type: Number,
  default: 0
},
lockUntil: {
  type: Date,
  default: null
},

// Add method to check if locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// In login controller:
if (user.isLocked()) {
  return res.status(423).json({
    success: false,
    message: 'Account temporarily locked. Try again later.'
  });
}

if (!isPasswordValid) {
  user.loginAttempts += 1;
  
  if (user.loginAttempts >= 5) {
    user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
  }
  
  await user.save();
  
  return res.status(401).json({
    success: false,
    message: 'Invalid credentials',
    attemptsRemaining: Math.max(0, 5 - user.loginAttempts)
  });
}

// Reset on successful login
user.loginAttempts = 0;
user.lockUntil = null;
await user.save();
```

#### ⚠️ MEDIUM: Password Reset Token Not Invalidated on Use
**Issue:** Token remains in database after successful reset.

**Current Code:**
```javascript
user.resetPasswordToken = null;
user.resetPasswordExpires = null;
await user.save();
```

**Status:** ✅ GOOD - Already implemented correctly.

#### ⚠️ MEDIUM: No Logout Mechanism
**Issue:** JWT remains valid until expiry, no server-side invalidation.

**Fix Required:**
```javascript
// Option 1: Token Blacklist (Redis recommended)
const redis = require('redis');
const client = redis.createClient();

const logout = async (req, res) => {
  const token = req.headers['authorization'].split(' ')[1];
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
  
  // Add to blacklist
  await client.setex(`blacklist_${token}`, expiresIn, 'true');
  
  res.json({ success: true, message: 'Logged out successfully' });
};

// Check blacklist in auth middleware
const isBlacklisted = await client.get(`blacklist_${token}`);
if (isBlacklisted) {
  return res.status(401).json({ message: 'Token invalidated' });
}

// Option 2: Refresh Token Pattern (Recommended)
// Implement short-lived access tokens (15min) + long-lived refresh tokens (7d)
```

#### ✅ GOOD: Password Hashing
**Status:** Using bcrypt with cost factor 10-12.

#### ✅ GOOD: Secure Token Generation
**Status:** Using crypto.randomBytes(32) for password reset tokens.

---

### 5. EDGE CASES

#### ❌ MISSING: OTP System
**Issue:** No OTP-based authentication, only email-based password reset.

**Required Implementation:**
```javascript
// Add OTP fields to models
otpCode: {
  type: String,
  default: null
},
otpExpires: {
  type: Date,
  default: null
},
otpAttempts: {
  type: Number,
  default: 0
},

// OTP generation
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP endpoint
const sendOTP = async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  const otp = generateOTP();
  user.otpCode = await bcrypt.hash(otp, 10);
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.otpAttempts = 0;
  await user.save();
  
  // Send SMS (integrate with Twilio/MSG91)
  await sendSMS(phone, `Your OTP is: ${otp}`);
  
  res.json({ success: true, message: 'OTP sent' });
};

// Verify OTP endpoint
const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ phone });
  
  if (!user || !user.otpCode || user.otpExpires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
  
  if (user.otpAttempts >= 3) {
    return res.status(429).json({ message: 'Too many attempts' });
  }
  
  const isValid = await bcrypt.compare(otp, user.otpCode);
  
  if (!isValid) {
    user.otpAttempts += 1;
    await user.save();
    return res.status(400).json({ 
      message: 'Invalid OTP',
      attemptsRemaining: 3 - user.otpAttempts
    });
  }
  
  user.otpCode = null;
  user.otpExpires = null;
  user.otpAttempts = 0;
  await user.save();
  
  const token = generateToken(user._id, 'retailer');
  res.json({ success: true, token });
};
```

#### ⚠️ MEDIUM: Phone Format Normalization Missing
**Issue:** Different formats of same number can create duplicates.

**Examples:**
```
9876543210
+919876543210
(987) 654-3210
```

**Fix Required:**
```javascript
// Add phone normalization utility
const normalizePhone = (phone) => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Remove country code if present
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  
  return digits;
};

// Use in registration/login
const normalizedPhone = normalizePhone(req.body.phone);
const user = await User.findOne({ phone: normalizedPhone });
```

#### ⚠️ MEDIUM: Email Trimming Not Consistent
**Issue:** Spaces in email can cause issues.

**Fix Required:**
```javascript
// In validation middleware
body('email')
  .trim() // ADD THIS
  .toLowerCase() // ADD THIS
  .isEmail()
  .withMessage('Invalid email')
  .normalizeEmail() // ADD THIS - removes dots from Gmail, etc.
```

#### ❌ MISSING: Partial Signup State Handling
**Issue:** If user is created but email fails to send, user exists but can't reset password.

**Fix Required:**
```javascript
// Add email verification status
emailVerified: {
  type: Boolean,
  default: false
},
verificationToken: {
  type: String,
  default: null
},

// Send verification email on registration
// Block login until verified (optional, depends on requirements)
if (!user.emailVerified) {
  return res.status(403).json({
    message: 'Please verify your email first'
  });
}
```

---

## 📊 DATABASE SCHEMA CHANGES REQUIRED

### Migration Script
```javascript
// backend/migrations/001-add-security-fields.js
const mongoose = require('mongoose');
const User = require('../src/models/User');
const CustomerUser = require('../src/models/CustomerUser');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Add indexes
  await User.collection.createIndex(
    { phone: 1 }, 
    { unique: true, sparse: true }
  );
  
  await User.collection.createIndex(
    { email: 1 }, 
    { unique: true, sparse: true }
  );
  
  await CustomerUser.collection.createIndex(
    { email: 1 }, 
    { unique: true }
  );
  
  // Add new fields to existing documents
  await User.updateMany(
    { loginAttempts: { $exists: false } },
    { 
      $set: { 
        loginAttempts: 0,
        lockUntil: null,
        emailVerified: false
      } 
    }
  );
  
  await CustomerUser.updateMany(
    { loginAttempts: { $exists: false } },
    { 
      $set: { 
        loginAttempts: 0,
        lockUntil: null,
        emailVerified: false
      } 
    }
  );
  
  console.log('Migration completed');
  process.exit(0);
}

migrate();
```

---

## 🧪 TEST CHECKLIST

### Unit Tests Required

```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const CustomerUser = require('../src/models/CustomerUser');

describe('Authentication Security Tests', () => {
  
  // 1. Duplicate Prevention
  describe('Duplicate Prevention', () => {
    it('should prevent same phone for retailer and customer', async () => {
      // Register retailer
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Retailer',
          phone: '9876543210',
          password: 'password123',
          upi_id: 'test@paytm'
        })
        .expect(201);
      
      // Try to register customer with same phone
      const res = await request(app)
        .post('/api/customer-auth/register')
        .send({
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'password123'
        })
        .expect(400);
      
      expect(res.body.message).toContain('already registered');
    });
    
    it('should prevent case-insensitive email duplicates', async () => {
      await request(app)
        .post('/api/customer-auth/register')
        .send({
          name: 'Test',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'password123'
        })
        .expect(201);
      
      const res = await request(app)
        .post('/api/customer-auth/register')
        .send({
          name: 'Test2',
          email: 'TEST@EXAMPLE.COM',
          phone: '9876543211',
          password: 'password123'
        })
        .expect(400);
      
      expect(res.body.message).toContain('already registered');
    });
    
    it('should handle race conditions', async () => {
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test',
            phone: '9876543210',
            password: 'password123',
            upi_id: 'test@paytm'
          })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.value?.status === 201);
      
      expect(successful.length).toBe(1);
    });
  });
  
  // 2. Validation
  describe('Validation', () => {
    it('should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          phone: '9876543210',
          password: '12345', // Too short
          upi_id: 'test@paytm'
        })
        .expect(400);
      
      expect(res.body.message).toContain('at least 6 characters');
    });
    
    it('should reject invalid phone numbers', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          phone: '1234567890', // Doesn't start with 6-9
          password: 'password123',
          upi_id: 'test@paytm'
        })
        .expect(400);
      
      expect(res.body.message).toContain('valid Indian phone');
    });
    
    it('should sanitize XSS attempts', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '<script>alert("xss")</script>',
          phone: '9876543210',
          password: 'password123',
          upi_id: 'test@paytm'
        })
        .expect(400);
      
      expect(res.body.message).toContain('invalid characters');
    });
  });
  
  // 3. Rate Limiting
  describe('Rate Limiting', () => {
    it('should block after 5 failed login attempts', async () => {
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          phone: '9876543210',
          password: 'correct123',
          upi_id: 'test@paytm'
        });
      
      // Try 5 wrong passwords
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            phone: '9876543210',
            password: 'wrong123'
          })
          .expect(401);
      }
      
      // 6th attempt should be rate limited
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9876543210',
          password: 'wrong123'
        })
        .expect(429);
      
      expect(res.body.message).toContain('Too many');
    });
  });
  
  // 4. Account Lockout
  describe('Account Lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      const user = await User.create({
        name: 'Test',
        phone: '9876543210',
        password: 'correct123',
        upi_id: 'test@paytm'
      });
      
      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            phone: '9876543210',
            password: 'wrong'
          });
      }
      
      // Check if locked
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isLocked()).toBe(true);
      
      // Try with correct password - should still fail
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9876543210',
          password: 'correct123'
        })
        .expect(423);
      
      expect(res.body.message).toContain('locked');
    });
  });
  
  // 5. Password Reset
  describe('Password Reset', () => {
    it('should expire reset token after 15 minutes', async () => {
      const user = await User.create({
        name: 'Test',
        phone: '9876543210',
        email: 'test@example.com',
        password: 'password123',
        upi_id: 'test@paytm'
      });
      
      // Request reset
      const resetRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ phone: '9876543210' })
        .expect(200);
      
      const token = resetRes.body.resetLink.split('/').pop();
      
      // Manually expire token
      user.resetPasswordExpires = Date.now() - 1000;
      await user.save();
      
      // Try to reset
      const res = await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({
          password: 'newpassword123',
          confirmPassword: 'newpassword123'
        })
        .expect(400);
      
      expect(res.body.message).toContain('expired');
    });
    
    it('should invalidate token after use', async () => {
      const user = await User.create({
        name: 'Test',
        phone: '9876543210',
        email: 'test@example.com',
        password: 'password123',
        upi_id: 'test@paytm'
      });
      
      // Request reset
      const resetRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ phone: '9876543210' })
        .expect(200);
      
      const token = resetRes.body.resetLink.split('/').pop();
      
      // Reset password
      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({
          password: 'newpassword123',
          confirmPassword: 'newpassword123'
        })
        .expect(200);
      
      // Try to use same token again
      const res = await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({
          password: 'anotherpassword',
          confirmPassword: 'anotherpassword'
        })
        .expect(400);
      
      expect(res.body.message).toContain('invalid or expired');
    });
  });
  
  // 6. JWT Security
  describe('JWT Security', () => {
    it('should reject expired tokens', async () => {
      // Create token that expires immediately
      const token = jwt.sign(
        { userId: 'test123' },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' }
      );
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      
      expect(res.body.message).toContain('expired');
    });
    
    it('should reject tampered tokens', async () => {
      const validToken = jwt.sign(
        { userId: 'test123' },
        process.env.JWT_SECRET
      );
      
      // Tamper with token
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
      
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
      
      expect(res.body.message).toContain('Invalid token');
    });
  });
  
  // 7. Role Separation
  describe('Role Separation', () => {
    it('should prevent customer from accessing retailer endpoints', async () => {
      // Create customer
      const customer = await CustomerUser.create({
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '9876543210',
        password: 'password123'
      });
      
      const token = generateToken(customer._id, 'customer');
      
      // Try to access retailer endpoint
      const res = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      
      expect(res.body.message).toContain('Retailer account required');
    });
  });
});
```

---

## 🔧 IMMEDIATE ACTION ITEMS

### Priority 1 (Critical - Fix Immediately)
1. ✅ Add cross-role phone/email duplicate checks
2. ✅ Implement rate limiting on login/password reset
3. ✅ Add account lockout after failed attempts
4. ✅ Fix case-insensitive email checks
5. ✅ Remove hardcoded JWT secret fallback
6. ✅ Add role to JWT and enforce role-based access

### Priority 2 (High - Fix This Week)
1. ✅ Implement phone number normalization
2. ✅ Add password complexity requirements
3. ✅ Implement logout/token blacklist
4. ✅ Add email verification
5. ✅ Implement OTP system for phone verification

### Priority 3 (Medium - Fix This Month)
1. ✅ Add refresh token mechanism
2. ✅ Implement CSRF protection
3. ✅ Add security headers (helmet.js)
4. ✅ Implement audit logging
5. ✅ Add 2FA support

---

## 📝 SECURITY BEST PRACTICES CHECKLIST

- [ ] Environment variables properly secured
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] SQL injection prevention (using Mongoose)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection
- [ ] Rate limiting implemented
- [ ] Account lockout implemented
- [ ] Password complexity enforced
- [ ] Secure password reset flow
- [ ] JWT properly secured
- [ ] Role-based access control
- [ ] Audit logging
- [ ] Error messages don't leak info
- [ ] Dependencies regularly updated

---

## 🎯 CONCLUSION

**Overall Security Score: 6/10**

The system has a solid foundation with bcrypt password hashing and JWT authentication, but lacks critical security features like rate limiting, account lockout, and proper duplicate prevention. The most critical issues are:

1. Cross-role duplicate accounts possible
2. No brute force protection
3. Weak password requirements
4. No role enforcement in middleware

**Recommendation:** Address Priority 1 items immediately before production deployment.

