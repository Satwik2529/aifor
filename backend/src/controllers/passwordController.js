const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const CustomerUser = require('../models/CustomerUser');

/**
 * Password Reset Controller
 * Handles forgot password for both Retailers (phone-based) and Customers (email-based)
 * Uses nodemailer for email delivery and crypto for secure token generation
 */

// Configure nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// @desc    Request password reset (Retailer - Phone based)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPasswordRetailer = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  console.log('🔑 ============ RETAILER FORGOT PASSWORD ============');
  console.log('Phone:', phone);

  // Validation
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  // Find retailer by phone
  const user = await User.findOne({ phone });

  if (!user) {
    console.log('❌ Retailer not found with phone:', phone);
    return res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset link has been sent to your registered email'
    });
  }

  // Check if user has email
  if (!user.email) {
    console.log('❌ Retailer has no email configured');
    return res.status(400).json({
      success: false,
      message: 'No email address found for this account. Please contact support or add an email in profile settings first.'
    });
  }

  console.log('✅ Retailer found:', user.name, user.phone, user.email);

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  await user.save();

  console.log('✅ Reset token generated');

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  // Email template
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🔐 Biznova</h1>
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937;">Hello, ${user.name}!</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; line-height: 1.6;">
                We received a request to reset your password for your Biznova retailer account (Phone: ${phone}).
              </p>
              <p style="margin: 0 0 16px 0; color: #4b5563; line-height: 1.6;">
                Click the button below to create a new password:
              </p>
              <table role="presentation" style="margin: 30px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  ⚠️ This link will expire in <strong>15 minutes</strong>. If you didn't request this, please ignore this email.
                </p>
              </div>
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
                Link: <span style="word-break: break-all; color: #2563eb;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Biznova. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    // Development mode: Log reset link instead of sending email
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
      console.log('🔗 ============ PASSWORD RESET LINK (DEV MODE) ============');
      console.log('📧 Email would be sent to:', user.email);
      console.log('🔗 Reset Link:', resetUrl);
      console.log('⏰ Expires:', new Date(user.resetPasswordExpires).toLocaleString());
      console.log('============================================================');

      return res.status(200).json({
        success: true,
        message: 'Password reset link generated successfully. Check server console for the link.',
        devMode: true,
        resetLink: resetUrl // Only in development!
      });
    }

    // Production mode: Send actual email
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Biznova" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Biznova Password Reset Request',
      html: emailTemplate
    });

    console.log('✅ Password reset email sent to:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(500).json({
      success: false,
      message: 'Failed to send reset email. Please try again later.'
    });
  }
});

// @desc    Request password reset (Customer - Email based)
// @route   POST /api/customer-auth/forgot-password
// @access  Public
const forgotPasswordCustomer = asyncHandler(async (req, res) => {
  const { email } = req.body;

  console.log('🔑 ============ CUSTOMER FORGOT PASSWORD ============');
  console.log('Email:', email);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  const customer = await CustomerUser.findOne({ email: email.toLowerCase() });

  if (!customer) {
    console.log('❌ Customer not found with email:', email);
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  }

  console.log('✅ Customer found:', customer.name, customer.email);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  customer.resetPasswordToken = hashedToken;
  customer.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

  await customer.save();
  console.log('✅ Reset token generated');

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🔐 Biznova</h1>
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937;">Hello, ${customer.name}!</h2>
              <p style="margin: 0 0 16px 0; color: #4b5563; line-height: 1.6;">
                We received a request to reset your password for your Biznova customer account.
              </p>
              <p style="margin: 0 0 16px 0; color: #4b5563; line-height: 1.6;">
                Click the button below to create a new password:
              </p>
              <table role="presentation" style="margin: 30px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  ⚠️ This link will expire in <strong>15 minutes</strong>. If you didn't request this, please ignore this email.
                </p>
              </div>
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
                Link: <span style="word-break: break-all; color: #2563eb;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Biznova. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    // Development mode: Log reset link instead of sending email
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
      console.log('🔗 ============ PASSWORD RESET LINK (DEV MODE) ============');
      console.log('📧 Email would be sent to:', email);
      console.log('🔗 Reset Link:', resetUrl);
      console.log('⏰ Expires:', new Date(customer.resetPasswordExpires).toLocaleString());
      console.log('============================================================');

      return res.status(200).json({
        success: true,
        message: 'Password reset link generated successfully. Check server console for the link.',
        devMode: true,
        resetLink: resetUrl // Only in development!
      });
    }

    // Production mode: Send actual email
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Biznova" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Biznova Password Reset Request',
      html: emailTemplate
    });

    console.log('✅ Password reset email sent to:', email);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;
    await customer.save();

    return res.status(500).json({
      success: false,
      message: 'Failed to send reset email. Please try again later.'
    });
  }
});

// @desc    Reset password with token (works for both retailers and customers)
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  console.log('🔐 ============ RESET PASSWORD REQUEST ============');

  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password and confirm password are required'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Try to find retailer
  let user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  let userType = 'retailer';

  // If not found in retailers, try customers
  if (!user) {
    user = await CustomerUser.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    userType = 'customer';
  }

  if (!user) {
    console.log('❌ Invalid or expired token');
    return res.status(400).json({
      success: false,
      message: 'Password reset token is invalid or has expired'
    });
  }

  console.log(`✅ Valid token found for ${userType}:`, user.name);

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  await user.save();
  console.log('✅ Password updated successfully');

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. You can now log in with your new password.'
  });
});

module.exports = {
  forgotPasswordRetailer,
  forgotPasswordCustomer,
  resetPassword
};
