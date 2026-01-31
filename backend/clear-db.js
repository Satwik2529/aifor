const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function clearDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
        console.log('Connected to MongoDB');

        // Clear all users
        const result = await User.deleteMany({});
        console.log(`Deleted ${result.deletedCount} users from database`);

        console.log('Database cleared successfully');
    } catch (error) {
        console.error('Error clearing database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

clearDatabase();
