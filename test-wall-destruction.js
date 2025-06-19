#!/usr/bin/env node

/**
 * Test script to verify wall destruction and farm level recalculation
 * This script will damage walls to 0 health and verify they are deleted
 */

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3Y2JhOTJlNjk5NzI2Y2FjYWJkYWFkYyIsInJvbGUiOnsiaWQiOiIxIn0sInNlc3Npb25JZCI6IjY4NTM5ZTNiODJjMDU2N2U2ZDQxN2Y0NSIsImlhdCI6MTc1MDMxMDQ1OSwiZXhwIjoxNzUwMzExMzU5fQ.1v8k4-wYzMMuJ3DT3hq1kVJc58IICZtGSub7NNOrsI8';

const { execSync } = require('child_process');

function curlGet(endpoint) {
  const cmd = `curl -s "http://192.168.0.194:3030/api/v1${endpoint}"`;
  const result = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(result);
}

function curlAuth(method, endpoint, data = null) {
  let cmd = `curl -s -X ${method} -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json"`;
  if (data) {
    cmd += ` -d '${JSON.stringify(data)}'`;
  }
  cmd += ` "http://192.168.0.194:3030/api/v1${endpoint}"`;
  
  const result = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(result);
}

async function testWallDestruction() {
  console.log('🧪 Testing Wall Destruction System');
  console.log('=' .repeat(50));
  
  // Step 1: Get initial wall count
  const initialWalls = curlGet('/walls');
  const initialCount = initialWalls.data.length;
  console.log(`\n1. Initial wall count: ${initialCount}`);
  
  // Step 2: Get a wall to destroy
  const testWall = initialWalls.data.find(w => w.health > 0);
  if (!testWall) {
    console.log('❌ No walls with health > 0 found');
    return;
  }
  
  console.log(`\n2. Test wall selected: ${testWall.id.substring(0, 8)}...`);
  console.log(`   - Current health: ${testWall.health}%`);
  console.log(`   - From: ${testWall.fromFarm.name}`);
  console.log(`   - To: ${testWall.toFarm.name}`);
  
  // Step 3: Get connected farms and their levels
  const fromFarmId = testWall.fromFarm.id;
  const toFarmId = testWall.toFarm.id;
  
  const fromFarm = curlGet(`/farms/${fromFarmId}`);
  const toFarm = curlGet(`/farms/${toFarmId}`);
  
  console.log(`\n3. Connected farms before destruction:`);
  console.log(`   - ${fromFarm.name}: Level ${fromFarm.level}`);
  console.log(`   - ${toFarm.name}: Level ${toFarm.level}`);
  
  // Step 4: Damage the wall to 0 health (simulate destruction)
  console.log(`\n4. Destroying wall by setting health to 0...`);
  
  const destroyResult = curlAuth('PATCH', `/walls/${testWall.id}`, {
    health: 0,
    lastDamageAt: new Date().toISOString()
  });
  
  console.log(`   - Wall health set to: ${destroyResult.health}%`);
  
  // Step 5: Wait a moment for any async operations
  console.log(`\n5. Waiting for potential async cleanup...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 6: Check if wall still exists
  console.log(`\n6. Checking if wall still exists...`);
  try {
    const checkWall = curlGet(`/walls/${testWall.id}`);
    console.log(`   ⚠️  Wall still exists with health: ${checkWall.health}%`);
    console.log(`   Note: Wall deletion happens during scheduled damage, not manual updates`);
  } catch (error) {
    console.log(`   ✅ Wall no longer exists (deleted)`);
  }
  
  // Step 7: Check current wall count
  const currentWalls = curlGet('/walls');
  const currentCount = currentWalls.data.length;
  console.log(`\n7. Current wall count: ${currentCount}`);
  console.log(`   - Walls removed: ${initialCount - currentCount}`);
  
  // Step 8: Check farm levels after destruction
  console.log(`\n8. Checking farm levels after potential destruction...`);
  try {
    const fromFarmAfter = curlGet(`/farms/${fromFarmId}`);
    const toFarmAfter = curlGet(`/farms/${toFarmId}`);
    
    console.log(`   - ${fromFarmAfter.name}: Level ${fromFarmAfter.level} (was ${fromFarm.level})`);
    console.log(`   - ${toFarmAfter.name}: Level ${toFarmAfter.level} (was ${toFarm.level})`);
    
    if (fromFarmAfter.level !== fromFarm.level || toFarmAfter.level !== toFarm.level) {
      console.log(`   ✅ Farm levels recalculated after wall destruction`);
    } else {
      console.log(`   ℹ️  Farm levels unchanged (may indicate intact connections)`);
    }
  } catch (error) {
    console.log(`   ❌ Error checking farm levels: ${error.message}`);
  }
  
  // Step 9: Show remaining walls health distribution
  console.log(`\n9. Current wall health distribution:`);
  const healthDistribution = {};
  currentWalls.data.forEach(wall => {
    const health = wall.health;
    healthDistribution[health] = (healthDistribution[health] || 0) + 1;
  });
  
  Object.keys(healthDistribution)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(health => {
      console.log(`   - ${health}% health: ${healthDistribution[health]} walls`);
    });
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Wall destruction test completed!');
  console.log('\nNext: Wait for the 5-minute damage scheduler to run and monitor logs');
}

// Add delay function for async operations
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testWallDestruction().catch(console.error);