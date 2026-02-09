/**
 * Delete Google User by Email
 * Usage: node backend/delete-google-user.js <email>
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node backend/delete-google-user.js <email>');
  process.exit(1);
}

async function deleteGoogleUser() {
  try {
    console.log(`🗑️  Deleting Google user: ${email}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const customersCollection = db.collection('customerusers');

    // Check retailer
    const retailer = await usersCollection.findOne({ email, google_id: { $exists: true, $ne: null } });
    
    if (retailer) {
      console.log('👤 Found RETAILER:');
      console.log(`   Name: ${retailer.name}`);
      console.log(`   Email: ${retailer.email}`);
      console.log(`   Google ID: ${retailer.google_id}`);
      console.log(`   Created: ${retailer.createdAt}\n`);
      
      const result = await usersCollection.deleteOne({ _id: retailer._id });
      if (result.deletedCount > 0) {
        console.log('✅ Retailer account deleted successfully!\n');
      }
    }

    // Check customer
    const customer = await customersCollection.findOne({ email, google_id: { $exists: true, $ne: null } });
    
    if (customer) {
      console.log('👤 Found CUSTOMER:');
      console.log(`   Name: ${customer.name}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Google ID: ${customer.google_id}`);
      console.log(`   Created: ${customer.createdAt}\n`);
      
      const result = await customersCollection.deleteOne({ _id: customer._id });
      if (result.deletedCount > 0) {
        console.log('✅ Customer account deleted successfully!\n');
      }
    }

    if (!retailer && !customer) {
      console.log('❌ No Google-linked account found with that email\n');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('\n💡 You can now sign up again with this Google account');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteGoogleUser();
