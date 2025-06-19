#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.0.194:3030/api/v1';

// You'll need to get a valid JWT token from your app or login endpoint
const TEST_TOKEN = 'your-jwt-token-here'; // Update this with actual token

const apiRequest = async (method, endpoint, data = null, useAuth = true) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(useAuth && TEST_TOKEN && { Authorization: `Bearer ${TEST_TOKEN}` })
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Status: ${error.response?.status} - Error: ${error.response?.data?.message || error.message}`);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status 
    };
  }
};

async function testBasicEndpoints() {
  console.log('🧪 Testing Basic Wall Endpoints\n');
  
  // Test 1: Get all walls (no auth needed)
  console.log('1. Testing GET /walls (public)');
  await apiRequest('GET', '/walls', null, false);
  
  // Test 2: Get user walls (auth required)
  console.log('\n2. Testing GET /walls/my-walls (authenticated)');
  const myWallsResult = await apiRequest('GET', '/walls/my-walls');
  
  if (myWallsResult.success && myWallsResult.data.length > 0) {
    const testWallId = myWallsResult.data[0].id;
    console.log(`   Found ${myWallsResult.data.length} user walls, using: ${testWallId}`);
    
    // Test 3: Get specific wall
    console.log('\n3. Testing GET /walls/:id');
    await apiRequest('GET', `/walls/${testWallId}`);
    
    // Test 4: Test heal endpoint
    console.log('\n4. Testing POST /walls/:id/heal');
    const healData = {
      latitude: 21.2753635,  // Hawaii coordinates where test farms are located
      longitude: -157.8214599
    };
    await apiRequest('POST', `/walls/${testWallId}/heal`, healData);
    
    // Test 5: Test wall update
    console.log('\n5. Testing PATCH /walls/:id');
    const updateData = {
      health: 95,
      lastDamageAt: new Date().toISOString()
    };
    await apiRequest('PATCH', `/walls/${testWallId}`, updateData);
    
  } else {
    console.log('   ⚠️  No user walls found or authentication failed');
  }
}

async function testHealWithoutAuth() {
  console.log('\n🔒 Testing Heal Endpoint Without Authentication\n');
  
  // This should fail with 401
  console.log('6. Testing POST /walls/test-id/heal (no auth - should fail)');
  const healData = {
    latitude: 21.2753635,
    longitude: -157.8214599
  };
  await apiRequest('POST', '/walls/test-id/heal', healData, false);
}

async function main() {
  console.log('🧪 Wall Health API Endpoint Tests');
  console.log('=' .repeat(50));
  
  if (!TEST_TOKEN || TEST_TOKEN === 'your-jwt-token-here') {
    console.log('⚠️  WARNING: No valid JWT token provided!');
    console.log('   Update TEST_TOKEN in this script with a valid token');
    console.log('   You can get one by logging in through the app or API\n');
  }
  
  await testBasicEndpoints();
  await testHealWithoutAuth();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Endpoint tests completed!');
  console.log('\nTo get a valid token:');
  console.log('1. POST /auth/email/login with valid credentials');
  console.log('2. Copy the "token" from the response');
  console.log('3. Update TEST_TOKEN in this script');
}

if (require.main === module) {
  main();
}