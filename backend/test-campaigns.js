const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

// Create a test token (you'll need a real user ID from your database)
const createTestToken = (userId) => {
    return jwt.sign(
        { userId, userType: 'retailer' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

async function testCampaignEndpoints() {
    try {
        console.log('🧪 Testing Campaign Endpoints...\n');

        // First, let's try to login or get a user
        console.log('1️⃣ Testing login...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            phone: '9876543210',
            password: 'password123'
        }).catch(err => {
            console.log('❌ Login failed:', err.response?.data?.message || err.message);
            console.log('💡 You may need to create a test user first\n');
            return null;
        });

        if (!loginResponse) {
            console.log('⚠️ Skipping authenticated tests - no valid token\n');
            return;
        }

        const token = loginResponse.data.data?.token || loginResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('✅ Login successful');
        console.log('   User:', loginResponse.data.user?.name);
        console.log('   Token:', token ? token.substring(0, 20) + '...' : 'MISSING');
        console.log('   Full response:', JSON.stringify(loginResponse.data, null, 2), '\n');

        // Test recommendations endpoint
        console.log('2️⃣ Testing GET /campaigns/recommendations...');
        const recsResponse = await axios.get(`${API_URL}/campaigns/recommendations`, { headers });
        console.log('✅ Recommendations:', recsResponse.data);
        console.log(`   Found ${recsResponse.data.count} recommendations\n`);

        // Test active campaigns endpoint
        console.log('3️⃣ Testing GET /campaigns/active...');
        const campaignsResponse = await axios.get(`${API_URL}/campaigns/active`, { headers });
        console.log('✅ Active Campaigns:', campaignsResponse.data);
        console.log(`   Found ${campaignsResponse.data.count} active campaigns\n`);

        // Test analytics endpoint
        console.log('4️⃣ Testing GET /campaigns/analytics...');
        const analyticsResponse = await axios.get(`${API_URL}/campaigns/analytics`, { headers });
        console.log('✅ Analytics:', analyticsResponse.data);
        console.log(`   Total campaigns: ${analyticsResponse.data.data.total_campaigns}\n`);

        console.log('🎉 All campaign endpoints are working!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testCampaignEndpoints();
