/**
 * Fix Phone Index for Google Auth
 * Drops the old unique phone index and recreates it as sparse
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixPhoneIndex() {
  try {
    console.log('🔧 Fixing phone index for Google auth...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get existing indexes
    console.log('📋 Current indexes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log('  -', JSON.stringify(index));
    });
    console.log('');

    // Check if phone_1 index exists
    const phoneIndex = indexes.find(idx => idx.name === 'phone_1');
    
    if (phoneIndex) {
      console.log('🗑️  Dropping old phone_1 index...');
      await usersCollection.dropIndex('phone_1');
      console.log('✅ Old index dropped\n');
    } else {
      console.log('ℹ️  No phone_1 index found (already dropped or never existed)\n');
    }

    // Create new sparse index
    console.log('📝 Creating new sparse index on phone...');
    await usersCollection.createIndex(
      { phone: 1 },
      { 
        sparse: true,  // Allows multiple null/empty values
        unique: true,  // Still unique when value exists
        name: 'phone_1'
      }
    );
    console.log('✅ New sparse index created\n');

    // Verify new indexes
    console.log('📋 Updated indexes:');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log('  -', JSON.stringify(index));
    });
    console.log('');

    console.log('✅ Phone index fixed successfully!');
    console.log('   Google users can now sign up with empty phone numbers.\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error fixing phone index:', error);
    process.exit(1);
  }
}

fixPhoneIndex();
