# 🔒 Security Features - Quick Reference

## Active Security Policies

### Account Lockout
- **Trigger**: 5 failed login attempts
- **Duration**: 30 minutes
- **Reset**: Automatic on successful login
- **Applies to**: Both retailers and customers

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Registration | 5 accounts | 1 hour |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |

### Role-Based Access

| Role | Can Access |
|------|------------|
| Retailer | `/api/inventory`, `/api/sales`, `/api/expenses`, `/api/customers` |
| Customer | `/api/customer/*`, `/api/customer-requests` |

**Cross-access is blocked** - Customers cannot access retailer endpoints and vice versa.

### Data Integrity

- ✅ Same phone/email cannot be used for both retailer and customer accounts
- ✅ Email addresses are case-insensitive
- ✅ JWT tokens include user role for automatic enforcement

---

## Error Messages

### Account Locked
```json
{
  "success": false,
  "message": "Account locked due to too many failed login attempts. Please try again in 30 minutes."
}
```

### Rate Limited
```json
{
  "success": false,
  "message": "Too many login attempts. Please try again in 15 minutes."
}
```

### Cross-Role Duplicate
```json
{
  "success": false,
  "message": "Phone number already registered as retailer. Please use a different phone number."
}
```

### Unauthorized Access
```json
{
  "success": false,
  "message": "Access denied",
  "error": "Retailer account required"
}
```

---

## Testing Commands

```bash
# Test all security features
node backend/test-security-features.js

# Re-run database migration
node backend/migrate-security-fields.js

# Check server status
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

---

## Manual Unlock (Database)

If you need to manually unlock an account:

```javascript
// For retailer
db.users.updateOne(
  { phone: "1234567890" },
  { $set: { loginAttempts: 0, lockUntil: null } }
)

// For customer
db.customerusers.updateOne(
  { email: "user@example.com" },
  { $set: { loginAttempts: 0, lockUntil: null } }
)
```

---

## Environment Variables

Required in `backend/.env`:

```env
JWT_SECRET=<128-character-secure-secret>
MONGODB_URI=<your-mongodb-connection-string>
```

**Never commit `.env` to version control!**

---

## Middleware Usage

### Protect Retailer Routes
```javascript
router.get('/inventory', authenticateToken, requireRetailer, inventoryController.getAll);
```

### Protect Customer Routes
```javascript
router.get('/profile', authenticateToken, requireCustomer, customerController.getProfile);
```

### Apply Rate Limiting
```javascript
router.post('/login', loginLimiter, validateLogin, authController.login);
```

---

## JWT Token Structure

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "userType": "retailer",
  "iat": 1707302400,
  "exp": 1707907200
}
```

**Important**: Always include `userType` when generating tokens:
```javascript
const token = generateToken(user._id, 'retailer');
```

---

## Security Checklist

- [x] Account lockout active
- [x] Rate limiting applied
- [x] RBAC enforced
- [x] Cross-role duplicates prevented
- [x] Case-insensitive emails
- [x] Secure JWT secret set
- [x] JWT includes userType
- [x] Database migration completed
- [x] Servers restarted
- [x] All features tested

---

**Status**: ✅ All Security Features Active  
**Last Updated**: February 7, 2026
