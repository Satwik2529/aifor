/**
 * Manage Google Users
 * View and optionally delete Google-linked accounts
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function manageGoogleUsers() {
  try {
    console.log('🔍 Managing Google-linked users...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const customersCollection = db.collection('customerusers');

    // Find all Google-linked retailers
    console.log('👥 RETAILERS with Google accounts:');
    const retailers = await usersCollection.find({ google_id: { $exists: true, $ne: null } }).toArray();
    
    if (retailers.length === 0) {
      console.log('   (none)');
    } else {
      retailers.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.name}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Google ID: ${user.google_id}`);
        console.log(`      Phone: ${user.phone || '(not set)'}`);
        console.log(`      Shop: ${user.shop_name || '(not set)'}`);
        console.log(`      Created: ${user.createdAt}`);
      });
    }

    // Find all Google-linked customers
    console.log('\n\n👥 CUSTOMERS with Google accounts:');
    const customers = await customersCollection.find({ google_id: { $exists: true, $ne: null } }).toArray();
    
    if (customers.length === 0) {
      console.log('   (none)');
    } else {
      customers.forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.name}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Google ID: ${user.google_id}`);
        console.log(`      Phone: ${user.phone || '(not set)'}`);
        console.log(`      Created: ${user.createdAt}`);
      });
    }

    console.log('\n\n📊 Summary:');
    console.log(`   Retailers with Google: ${retailers.length}`);
    console.log(`   Customers with Google: ${customers.length}`);
    console.log(`   Total: ${retailers.length + customers.length}`);

    console.log('\n\n💡 To delete a Google-linked account:');
    console.log('   1. Note the email address');
    console.log('   2. Run: node backend/delete-google-user.js <email>');
    console.log('   3. Then you can sign up again with that Google account');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

manageGoogleUsers();
