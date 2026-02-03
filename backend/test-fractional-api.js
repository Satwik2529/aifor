/**
 * Test script to verify fractional quantity API endpoints
 * This tests the actual API calls with fractional quantities
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let testItemId = '';

// Test user credentials (you may need to adjust these)
const TEST_USER = {
    email: 'test@example.com',
    password: 'test123'
};

async function login() {
    try {
        console.log('🔐 Attempting to login...');
        const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
        authToken = response.data.token;
        console.log('✅ Login successful');
        return true;
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data?.message || error.message);
        console.log('ℹ️  Please ensure you have a test user or update TEST_USER credentials');
        return false;
    }
}

async function testCreateInventoryWithFractional() {
    try {
        console.log('\n📦 Testing: Create Inventory with Fractional Quantity (10.5 kg)');
        
        const inventoryData = {
            item_name: `Test Rice ${Date.now()}`,
            stock_qty: 10.5,
            cost_price: 40,
            selling_price: 50,
            unit: 'kg',
            category: 'Food & Beverages',
            description: 'Test item with fractional quantity'
        };
        
        console.log('   Sending data:', JSON.stringify(inventoryData, null, 2));
        
        const response = await axios.post(`${BASE_URL}/inventory`, inventoryData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            testItemId = response.data.data._id;
            console.log('✅ SUCCESS: Item created with fractional quantity');
            console.log('   Item ID:', testItemId);
            console.log('   Stock Qty:', response.data.data.stock_qty, response.data.data.unit);
            return true;
        } else {
            console.log('❌ FAILED: Unexpected response');
            console.log('   Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAILED: Error creating inventory');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.message || error.message);
        console.log('   Details:', error.response?.data?.error);
        return false;
    }
}

async function testCreateSaleWithFractional() {
    try {
        console.log('\n💰 Testing: Create Sale with Fractional Quantity (2.5 kg)');
        
        // First, get the test item details
        const inventoryResponse = await axios.get(`${BASE_URL}/inventory/${testItemId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const item = inventoryResponse.data.data;
        
        const saleData = {
            items: [
                {
                    item_name: item.item_name,
                    quantity: 2.5,
                    price_per_unit: item.selling_price
                }
            ],
            payment_method: 'Cash',
            customer_name: 'Test Customer',
            customer_phone: '1234567890'
        };
        
        console.log('   Sending data:', JSON.stringify(saleData, null, 2));
        
        const response = await axios.post(`${BASE_URL}/sales`, saleData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log('✅ SUCCESS: Sale created with fractional quantity');
            console.log('   Sale ID:', response.data.data._id);
            console.log('   Quantity sold:', response.data.data.items[0].quantity, item.unit);
            console.log('   Total amount:', response.data.data.total_amount);
            
            // Verify stock was deducted
            const updatedInventory = await axios.get(`${BASE_URL}/inventory/${testItemId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            
            const newStock = updatedInventory.data.data.stock_qty;
            const expectedStock = 10.5 - 2.5; // 8.0
            
            console.log('   Stock before:', 10.5, item.unit);
            console.log('   Stock after:', newStock, item.unit);
            console.log('   Expected:', expectedStock, item.unit);
            
            if (Math.abs(newStock - expectedStock) < 0.001) {
                console.log('✅ Stock deduction correct!');
            } else {
                console.log('⚠️  Stock deduction mismatch!');
            }
            
            return true;
        } else {
            console.log('❌ FAILED: Unexpected response');
            console.log('   Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log('❌ FAILED: Error creating sale');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.message || error.message);
        console.log('   Details:', error.response?.data?.error);
        return false;
    }
}

async function testEdgeCases() {
    console.log('\n🧪 Testing: Edge Cases');
    
    // Test 1: Very small fraction (0.5)
    try {
        console.log('\n   Test 1: Small fraction (0.5 kg)');
        const response = await axios.post(`${BASE_URL}/inventory`, {
            item_name: `Test Small ${Date.now()}`,
            stock_qty: 0.5,
            cost_price: 10,
            selling_price: 15,
            unit: 'kg',
            category: 'Other'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success && response.data.data.stock_qty === 0.5) {
            console.log('   ✅ Small fraction (0.5) works');
        } else {
            console.log('   ❌ Small fraction failed');
        }
    } catch (error) {
        console.log('   ❌ Small fraction error:', error.response?.data?.message);
    }
    
    // Test 2: Zero quantity (should fail)
    try {
        console.log('\n   Test 2: Zero quantity (should fail)');
        const response = await axios.post(`${BASE_URL}/inventory`, {
            item_name: `Test Zero ${Date.now()}`,
            stock_qty: 0,
            cost_price: 10,
            selling_price: 15,
            unit: 'kg',
            category: 'Other'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('   ❌ Zero quantity should have been rejected but was accepted');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('   ✅ Zero quantity correctly rejected');
        } else {
            console.log('   ⚠️  Unexpected error:', error.response?.data?.message);
        }
    }
    
    // Test 3: Negative quantity (should fail)
    try {
        console.log('\n   Test 3: Negative quantity (should fail)');
        const response = await axios.post(`${BASE_URL}/inventory`, {
            item_name: `Test Negative ${Date.now()}`,
            stock_qty: -5,
            cost_price: 10,
            selling_price: 15,
            unit: 'kg',
            category: 'Other'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('   ❌ Negative quantity should have been rejected but was accepted');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('   ✅ Negative quantity correctly rejected');
        } else {
            console.log('   ⚠️  Unexpected error:', error.response?.data?.message);
        }
    }
}

async function cleanup() {
    try {
        console.log('\n🧹 Cleaning up test data...');
        if (testItemId) {
            await axios.delete(`${BASE_URL}/inventory/${testItemId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log('✅ Test item deleted');
        }
    } catch (error) {
        console.log('⚠️  Cleanup warning:', error.message);
    }
}

async function runTests() {
    console.log('=== Fractional Quantity API Test ===\n');
    console.log('Testing against:', BASE_URL);
    console.log('Time:', new Date().toISOString());
    
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('\n❌ Cannot proceed without authentication');
        console.log('Please create a test user or update credentials in the script');
        return;
    }
    
    // Run tests
    const test1 = await testCreateInventoryWithFractional();
    
    let test2 = false;
    if (test1 && testItemId) {
        test2 = await testCreateSaleWithFractional();
    }
    
    await testEdgeCases();
    
    // Cleanup
    await cleanup();
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('Inventory Creation (10.5 kg):', test1 ? '✅ PASS' : '❌ FAIL');
    console.log('Sale Creation (2.5 kg):', test2 ? '✅ PASS' : '❌ FAIL');
    console.log('\nIf tests failed, check the error messages above for details.');
}

// Run the tests
runTests().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});
