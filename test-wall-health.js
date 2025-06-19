#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.0.194:3030/api/v1';
const USER_CREDENTIALS = {
  email: 'aloha@ixplor.app',
  password: 'secret' // You'll need to update this with the actual password
};

let authToken = '';
let testUserId = '';

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const apiRequest = async (method, endpoint, data = null, requireAuth = true) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(requireAuth && authToken && { Authorization: `Bearer ${authToken}` })
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status 
    };
  }
};

const log = (message, data = null) => {
  console.log(`\n🧪 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const logError = (message, error) => {
  console.log(`\n❌ ${message}: ${error}`);
};

const logSuccess = (message, data = null) => {
  console.log(`\n✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Test 1: Authentication
async function testAuthentication() {
  log('Testing authentication...');
  
  const result = await apiRequest('POST', '/auth/email/login', USER_CREDENTIALS, false);
  
  if (result.success) {
    authToken = result.data.token;
    testUserId = result.data.user.id;
    logSuccess('Authentication successful', { userId: testUserId });
    return true;
  } else {
    logError('Authentication failed', result.error);
    return false;
  }
}

// Test 2: Get all walls
async function testGetWalls() {
  log('Testing GET /walls...');
  
  const result = await apiRequest('GET', '/walls');
  
  if (result.success) {
    const walls = result.data.data || result.data;
    logSuccess(`Retrieved ${walls.length} walls`);
    
    if (walls.length > 0) {
      const firstWall = walls[0];
      log('First wall structure:', {
        id: firstWall.id,
        health: firstWall.health,
        level: firstWall.level,
        lastDamageAt: firstWall.lastDamageAt,
        lastHealAt: firstWall.lastHealAt,
        hasFromFarm: !!firstWall.fromFarm,
        hasToFarm: !!firstWall.toFarm,
        hasOwner: !!firstWall.owner
      });
    }
    
    return walls;
  } else {
    logError('Failed to get walls', result.error);
    return null;
  }
}

// Test 3: Get user's walls
async function testGetMyWalls() {
  log('Testing GET /walls/my-walls...');
  
  const result = await apiRequest('GET', '/walls/my-walls');
  
  if (result.success) {
    const walls = result.data;
    logSuccess(`Retrieved ${walls.length} user walls`);
    return walls;
  } else {
    logError('Failed to get user walls', result.error);
    return null;
  }
}

// Test 4: Get wall by ID
async function testGetWallById(wallId) {
  log(`Testing GET /walls/${wallId}...`);
  
  const result = await apiRequest('GET', `/walls/${wallId}`);
  
  if (result.success) {
    logSuccess('Retrieved wall by ID', {
      id: result.data.id,
      health: result.data.health,
      level: result.data.level
    });
    return result.data;
  } else {
    logError('Failed to get wall by ID', result.error);
    return null;
  }
}

// Test 5: Heal wall
async function testHealWall(wallId) {
  log(`Testing POST /walls/${wallId}/heal...`);
  
  // Use coordinates from Hawaii (where the test farms are)
  const userLocation = {
    latitude: 21.2753635,
    longitude: -157.8214599
  };
  
  const result = await apiRequest('POST', `/walls/${wallId}/heal`, userLocation);
  
  if (result.success) {
    logSuccess('Wall healed successfully', {
      wallId: result.data.wall?.id,
      healResult: result.data.healResult
    });
    return result.data;
  } else {
    logError('Failed to heal wall', result.error);
    return null;
  }
}

// Test 6: Test wall update (simulate damage)
async function testWallUpdate(wallId, healthUpdate) {
  log(`Testing PATCH /walls/${wallId} (simulating damage)...`);
  
  const updateData = {
    health: healthUpdate,
    lastDamageAt: new Date()
  };
  
  const result = await apiRequest('PATCH', `/walls/${wallId}`, updateData);
  
  if (result.success) {
    logSuccess('Wall updated successfully', {
      id: result.data.id,
      health: result.data.health,
      lastDamageAt: result.data.lastDamageAt
    });
    return result.data;
  } else {
    logError('Failed to update wall', result.error);
    return null;
  }
}

// Test 7: Test wall health boundaries
async function testWallHealthBoundaries(wallId) {
  log('Testing wall health boundaries...');
  
  // Test setting health to 0 (should work)
  let result = await testWallUpdate(wallId, 0);
  if (!result) return false;
  
  await delay(1000);
  
  // Test setting health to 100 (should work)
  result = await testWallUpdate(wallId, 100);
  if (!result) return false;
  
  await delay(1000);
  
  // Test setting health above 100 (should fail validation)
  log('Testing health > 100 (should fail)...');
  const invalidResult = await apiRequest('PATCH', `/walls/${wallId}`, { health: 150 });
  
  if (!invalidResult.success) {
    logSuccess('Validation correctly rejected health > 100');
  } else {
    logError('Validation failed - accepted health > 100', 'Should have been rejected');
  }
  
  return true;
}

// Test 8: Test heal cooldown
async function testHealCooldown(wallId) {
  log('Testing heal cooldown mechanism...');
  
  // First, set wall health to 50%
  await testWallUpdate(wallId, 50);
  await delay(1000);
  
  // First heal
  const firstHeal = await testHealWall(wallId);
  if (!firstHeal) return false;
  
  // Immediate second heal (should fail due to cooldown)
  log('Attempting immediate second heal (should fail)...');
  const secondHeal = await testHealWall(wallId);
  
  if (!secondHeal) {
    logSuccess('Cooldown correctly prevented immediate second heal');
  } else {
    logError('Cooldown failed - allowed immediate second heal', 'Should have been prevented');
  }
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Wall Health System Tests\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Authentication
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Authentication failed - stopping tests');
      return;
    }
    
    await delay(500);
    
    // Test 2: Get all walls
    const walls = await testGetWalls();
    if (!walls || walls.length === 0) {
      console.log('\n❌ No walls found - stopping tests');
      return;
    }
    
    await delay(500);
    
    // Test 3: Get user walls
    const userWalls = await testGetMyWalls();
    if (!userWalls || userWalls.length === 0) {
      console.log('\n❌ No user walls found - stopping tests');
      return;
    }
    
    const testWallId = userWalls[0].id;
    log(`Using test wall ID: ${testWallId}`);
    
    await delay(500);
    
    // Test 4: Get wall by ID
    await testGetWallById(testWallId);
    await delay(500);
    
    // Test 5: Basic heal test
    await testHealWall(testWallId);
    await delay(500);
    
    // Test 6: Wall update test
    await testWallUpdate(testWallId, 85);
    await delay(500);
    
    // Test 7: Health boundaries
    await testWallHealthBoundaries(testWallId);
    await delay(500);
    
    // Test 8: Heal cooldown
    await testHealCooldown(testWallId);
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n💥 Unexpected error during tests:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAuthentication,
  testGetWalls,
  testGetMyWalls,
  testHealWall,
  testWallUpdate
};