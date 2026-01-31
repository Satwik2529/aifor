const mongoose = require('mongoose');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Update all users with shop_name to have role 'retailer'
    const result = await User.updateMany(
      { shop_name: { $exists: true, $ne: '' } },
      { role: 'retailer' }
    );
    
    console.log('Updated', result.modifiedCount, 'users to retailer role');
    
    // Update all users without shop_name to have role 'customer'
    const customerResult = await User.updateMany(
      { shop_name: { $exists: false } },
      { role: 'customer' }
    );
    
    console.log('Updated', customerResult.modifiedCount, 'users to customer role');
    
    // Show current retailer count
    const retailers = await User.find({ role: 'retailer' });
    console.log('Total retailers:', retailers.length);
    
    retailers.forEach(r => {
      console.log('- ', r.shop_name || 'No shop name', '(', r.name, ')');
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
