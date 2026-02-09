/**
 * Database Migration Script
 * Adds security fields (loginAttempts, lockUntil) to existing user documents
 * Run this once after deploying security updates
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const CustomerUser = require('./src/models/CustomerUser');

const migrateSecurityFields = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all retailer users
    console.log('\n📝 Updating retailer users...');
    const retailerResult = await User.updateMany(
      { loginAttempts: { $exists: false } },
      { 
        $set: { 
          loginAttempts: 0,
          lockUntil: null
        } 
      }
    );
    console.log(`✅ Updated ${retailerResult.modifiedCount} retailer users`);

    // Update all customer users
    console.log('\n📝 Updating customer users...');
    const customerResult = await CustomerUser.updateMany(
      { loginAttempts: { $exists: false } },
      { 
        $set: { 
          loginAttempts: 0,
          lockUntil: null
        } 
      }
    );
    console.log(`✅ Updated ${customerResult.modifiedCount} customer users`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Retailer users updated: ${retailerResult.modifiedCount}`);
    console.log(`   - Customer users updated: ${customerResult.modifiedCount}`);
    console.log(`   - Total users updated: ${retailerResult.modifiedCount + customerResult.modifiedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run migration
migrateSecurityFields();
