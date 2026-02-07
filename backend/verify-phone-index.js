/**
 * Verify Phone Index
 * Checks if the sparse index is correctly configured
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifyPhoneIndex() {
  try {
    console.log('🔍 Verifying phone index...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all indexes
    console.log('📋 Current indexes on users collection:');
    const indexes = await usersCollection.indexes();
    
    indexes.forEach(index => {
      console.log('\n' + JSON.stringify(index, null, 2));
    });

    // Check phone_1 index specifically
    const phoneIndex = indexes.find(idx => idx.name === 'phone_1');
    
    if (phoneIndex) {
      console.log('\n✅ phone_1 index found:');
      console.log('   - unique:', phoneIndex.unique);
      console.log('   - sparse:', phoneIndex.sparse);
      
      if (phoneIndex.sparse && phoneIndex.unique) {
        console.log('\n✅ Index is correctly configured!');
        console.log('   Multiple users can have empty phone values.');
      } else if (phoneIndex.unique && !phoneIndex.sparse) {
        console.log('\n❌ Index is NOT sparse!');
        console.log('   This will cause duplicate key errors for empty phone.');
        console.log('   Run: node backend/fix-phone-index.js');
      }
    } else {
      console.log('\n❌ phone_1 index not found!');
    }

    // Count users with empty phone
    const emptyPhoneCount = await usersCollection.countDocuments({ phone: '' });
    console.log('\n📊 Users with empty phone:', emptyPhoneCount);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error verifying index:', error);
    process.exit(1);
  }
}

verifyPhoneIndex();
