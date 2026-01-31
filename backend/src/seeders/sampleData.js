const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');
const AiInsight = require('../models/AiInsight');
const Message = require('../models/Message');

/**
 * Sample Data Seeder
 * Creates sample data for testing the BizNova API
 * Run with: node src/seeders/sampleData.js
 */

const sampleData = {
  users: [
    {
      name: 'Rajesh Kumar',
      phone: '9876543210',
      password: 'password123',
      shop_name: 'Rajesh General Store',
      language: 'Hindi',
      upi_id: 'rajesh@paytm'
    },
    {
      name: 'Priya Sharma',
      phone: '9876543211',
      password: 'password123',
      shop_name: 'Priya Electronics',
      language: 'English',
      upi_id: 'priya@phonepe'
    }
  ],

  customers: [
    {
      name: 'Amit Singh',
      phone: '9876543212',
      credit_balance: 500
    },
    {
      name: 'Sunita Devi',
      phone: '9876543213',
      credit_balance: 0
    },
    {
      name: 'Vikram Patel',
      phone: '9876543214',
      credit_balance: 1200
    }
  ],

  sales: [
    {
      items: [
        { item_name: 'Rice (1kg)', quantity: 2, price_per_unit: 50 },
        { item_name: 'Dal (1kg)', quantity: 1, price_per_unit: 80 }
      ],
      payment_method: 'Cash',
      date: new Date('2024-01-15')
    },
    {
      items: [
        { item_name: 'Mobile Phone', quantity: 1, price_per_unit: 15000 },
        { item_name: 'Charger', quantity: 1, price_per_unit: 500 }
      ],
      payment_method: 'UPI',
      date: new Date('2024-01-16')
    }
  ],

  expenses: [
    {
      amount: 5000,
      description: 'Shop rent for January',
      category: 'Rent',
      date: new Date('2024-01-01')
    },
    {
      amount: 2000,
      description: 'Electricity bill',
      category: 'Utilities',
      date: new Date('2024-01-05')
    },
    {
      amount: 1500,
      description: 'Staff salary',
      category: 'Salary',
      date: new Date('2024-01-10')
    }
  ],

  inventory: [
    {
      item_name: 'Rice (1kg)',
      stock_qty: 50,
      price_per_unit: 50
    },
    {
      item_name: 'Dal (1kg)',
      stock_qty: 30,
      price_per_unit: 80
    },
    {
      item_name: 'Mobile Phone',
      stock_qty: 5,
      price_per_unit: 15000
    },
    {
      item_name: 'Charger',
      stock_qty: 20,
      price_per_unit: 500
    },
    {
      item_name: 'Biscuits',
      stock_qty: 2,
      price_per_unit: 20
    }
  ],

  aiInsights: [
    {
      summary_text: 'Your sales have increased by 15% this month compared to last month. Consider stocking more popular items.',
      insights_data: {
        type: 'sales_analysis',
        metrics: {
          sales_growth: 15,
          top_items: ['Rice (1kg)', 'Mobile Phone'],
          recommendations: ['Stock more rice', 'Promote mobile accessories']
        }
      }
    },
    {
      summary_text: 'Your inventory has 2 items with low stock. Consider reordering to avoid stockouts.',
      insights_data: {
        type: 'inventory_alert',
        metrics: {
          low_stock_items: 2,
          items: ['Biscuits'],
          recommendations: ['Reorder biscuits', 'Set up automatic reorder alerts']
        }
      }
    }
  ],

  messages: [
    {
      direction: 'in',
      content: 'Hello, do you have rice available?',
      timestamp: new Date('2024-01-15T10:30:00Z')
    },
    {
      direction: 'out',
      content: 'Yes, we have rice available. ₹50 per kg. How much do you need?',
      timestamp: new Date('2024-01-15T10:32:00Z')
    },
    {
      direction: 'in',
      content: 'I need 2 kg. Can you deliver?',
      timestamp: new Date('2024-01-15T10:35:00Z')
    },
    {
      direction: 'out',
      content: 'Yes, we can deliver. Total ₹100. Your order will be ready in 30 minutes.',
      timestamp: new Date('2024-01-15T10:36:00Z')
    }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznova');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Sale.deleteMany({});
    await Expense.deleteMany({});
    await Inventory.deleteMany({});
    await AiInsight.deleteMany({});
    await Message.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create users
    const users = await User.insertMany(sampleData.users);
    console.log(`👥 Created ${users.length} users`);

    // Create customers for first user
    const customers = await Customer.insertMany(
      sampleData.customers.map(customer => ({
        ...customer,
        user_id: users[0]._id
      }))
    );
    console.log(`👤 Created ${customers.length} customers`);

    // Create sales for first user
    const sales = await Sale.insertMany(
      sampleData.sales.map(sale => ({
        ...sale,
        user_id: users[0]._id
      }))
    );
    console.log(`💰 Created ${sales.length} sales`);

    // Create expenses for first user
    const expenses = await Expense.insertMany(
      sampleData.expenses.map(expense => ({
        ...expense,
        user_id: users[0]._id
      }))
    );
    console.log(`💸 Created ${expenses.length} expenses`);

    // Create inventory for first user
    const inventory = await Inventory.insertMany(
      sampleData.inventory.map(item => ({
        ...item,
        user_id: users[0]._id
      }))
    );
    console.log(`📦 Created ${inventory.length} inventory items`);

    // Create AI insights for first user
    const aiInsights = await AiInsight.insertMany(
      sampleData.aiInsights.map(insight => ({
        ...insight,
        user_id: users[0]._id
      }))
    );
    console.log(`🤖 Created ${aiInsights.length} AI insights`);

    // Create messages for first user
    const messages = await Message.insertMany(
      sampleData.messages.map(message => ({
        ...message,
        user_id: users[0]._id
      }))
    );
    console.log(`💬 Created ${messages.length} messages`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Sample Data Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Customers: ${customers.length}`);
    console.log(`- Sales: ${sales.length}`);
    console.log(`- Expenses: ${expenses.length}`);
    console.log(`- Inventory Items: ${inventory.length}`);
    console.log(`- AI Insights: ${aiInsights.length}`);
    console.log(`- Messages: ${messages.length}`);

    console.log('\n🔑 Test Credentials:');
    console.log('User 1: Phone: 9876543210, Password: password123');
    console.log('User 2: Phone: 9876543211, Password: password123');

    console.log('\n🚀 You can now test the API endpoints!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
}

// Run seeder if called directly
if (require.main === module) {
  require('dotenv').config();
  seedDatabase();
}

module.exports = { sampleData, seedDatabase };
