/**
 * Test Payment Confirmation Feature
 * Run: node test-payment-confirmation.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const CustomerRequest = require('./src/models/CustomerRequest');

async function testPaymentConfirmation() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB');

    // Find a billed request
    const billedRequest = await CustomerRequest.findOne({ status: 'billed' })
      .populate('customer_id', 'name phone')
      .populate('retailer_id', 'name shop_name upi_id');

    if (!billedRequest) {
      console.log('⚠️ No billed requests found. Create one first:');
      console.log('1. Customer creates request');
      console.log('2. Retailer generates bill');
      console.log('3. Then run this test again');
      process.exit(0);
    }

    console.log('\n📋 Found Billed Request:');
    console.log('ID:', billedRequest._id);
    console.log('Customer:', billedRequest.customer_id?.name);
    console.log('Retailer:', billedRequest.retailer_id?.shop_name);
    console.log('Total:', billedRequest.bill_details?.total);
    console.log('Status:', billedRequest.status);
    console.log('Retailer UPI:', billedRequest.retailer_id?.upi_id || 'Not set');

    console.log('\n✅ Payment confirmation route should work with:');
    console.log(`PUT /api/customer-requests/${billedRequest._id}/confirm-payment`);
    console.log('Body: { "payment_method": "UPI" }');
    console.log('Authorization: Bearer <customer_token>');

    // Check if model has payment_confirmation field
    console.log('\n📊 Model Schema Check:');
    const schema = CustomerRequest.schema.obj;
    console.log('Has payment_confirmation field:', !!schema.payment_confirmation);
    console.log('Status enum:', schema.status.enum);

    await mongoose.connection.close();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPaymentConfirmation();
