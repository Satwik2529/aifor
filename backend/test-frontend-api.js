const axios = require('axios');

// Simulate what the frontend does
const API_URL = 'http://localhost:5000/api';

async function testFrontendFlow() {
    try {
        console.log('🧪 Testing Frontend API Flow...\n');

        // Step 1: Login
        console.log('1️⃣ Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            phone: '9876543210',
            password: 'password123'
        });

        const token = loginRes.data.data.token;
        console.log('✅ Login successful');
        console.log('   Token:', token.substring(0, 30) + '...\n');

        // Step 2: Test the exact API calls the frontend makes
        const headers = { Authorization: `Bearer ${token}` };

        console.log('2️⃣ Fetching recommendations...');
        const recsRes = await axios.get(`${API_URL}/campaigns/recommendations`, { headers });
        console.log('✅ Status:', recsRes.status);
        console.log('   Data structure:', {
            success: recsRes.data.success,
            hasData: !!recsRes.data.data,
            dataIsArray: Array.isArray(recsRes.data.data),
            count: recsRes.data.count
        });
        console.log('   First item:', recsRes.data.data[0] ? {
            item_id: recsRes.data.data[0].item_id,
            item_name: recsRes.data.data[0].item_name,
            discount: recsRes.data.data[0].discount
        } : 'No items\n');

        console.log('\n3️⃣ Fetching active campaigns...');
        const campaignsRes = await axios.get(`${API_URL}/campaigns/active`, { headers });
        console.log('✅ Status:', campaignsRes.status);
        console.log('   Data structure:', {
            success: campaignsRes.data.success,
            hasData: !!campaignsRes.data.data,
            dataIsArray: Array.isArray(campaignsRes.data.data),
            count: campaignsRes.data.count
        });

        console.log('\n4️⃣ Fetching analytics...');
        const analyticsRes = await axios.get(`${API_URL}/campaigns/analytics`, { headers });
        console.log('✅ Status:', analyticsRes.status);
        console.log('   Data structure:', {
            success: analyticsRes.data.success,
            hasData: !!analyticsRes.data.data,
            total_campaigns: analyticsRes.data.data?.total_campaigns
        });

        console.log('\n🎉 All API calls successful!');
        console.log('\n📊 Summary:');
        console.log(`   - Recommendations: ${recsRes.data.count} items`);
        console.log(`   - Active Campaigns: ${campaignsRes.data.count} campaigns`);
        console.log(`   - Total Campaigns: ${analyticsRes.data.data.total_campaigns}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testFrontendFlow();
