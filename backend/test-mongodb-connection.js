/**
 * Test MongoDB Connection
 * Run with: node test-mongodb-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found in .env' : '❌ NOT FOUND in .env');
console.log('Connection string preview:', process.env.MONGODB_URI ?
    process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@') : 'N/A');
console.log('\n⏳ Attempting to connect...\n');

const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
};

mongoose.connect(process.env.MONGODB_URI, options)
    .then(() => {
        console.log('✅ SUCCESS! MongoDB Connected');
        console.log('📊 Database:', mongoose.connection.name);
        console.log('🌐 Host:', mongoose.connection.host);
        console.log('🔌 Port:', mongoose.connection.port);
        console.log('\n✨ Your MongoDB connection is working perfectly!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ CONNECTION FAILED!\n');
        console.error('Error:', error.message);
        console.error('\n🔧 Possible solutions:');
        console.error('1. Check if password in .env is correct');
        console.error('2. Make sure MongoDB Atlas allows connections from your IP');
        console.error('3. Verify the database name is correct');
        console.error('4. Check if MongoDB Atlas cluster is running');
        console.error('\n💡 To fix:');
        console.error('- Go to https://cloud.mongodb.com/');
        console.error('- Check Database Access → User password');
        console.error('- Check Network Access → IP Whitelist (add 0.0.0.0/0 for testing)');
        console.error('\n');
        process.exit(1);
    });
