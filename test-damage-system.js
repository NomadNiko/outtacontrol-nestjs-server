#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.0.194:3030/api/v1';

const apiRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
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

async function testWallDataStructure() {
  console.log('🔍 Testing wall data structure...\n');
  
  const result = await apiRequest('GET', '/walls');
  
  if (result.success) {
    const walls = result.data.data || result.data;
    console.log(`✅ Found ${walls.length} walls`);
    
    if (walls.length > 0) {
      const wall = walls[0];
      console.log('\n📊 Wall data structure:');
      console.log(`  ID: ${wall.id}`);
      console.log(`  Health: ${wall.health} (type: ${typeof wall.health})`);
      console.log(`  Level: ${wall.level} (type: ${typeof wall.level})`);
      console.log(`  Last Damage: ${wall.lastDamageAt || 'null'}`);
      console.log(`  Last Heal: ${wall.lastHealAt || 'null'}`);
      console.log(`  From Farm: ${wall.fromFarm ? 'populated' : 'not populated'}`);
      console.log(`  To Farm: ${wall.toFarm ? 'populated' : 'not populated'}`);
      console.log(`  Owner: ${wall.owner ? 'populated' : 'not populated'}`);
      
      // Check if farms have required fields
      if (wall.fromFarm) {
        console.log(`\n🏠 From Farm:`, {
          id: wall.fromFarm.id,
          name: wall.fromFarm.name,
          hasLocation: !!wall.fromFarm.location
        });
      }
      
      if (wall.toFarm) {
        console.log(`🏠 To Farm:`, {
          id: wall.toFarm.id,
          name: wall.toFarm.name,
          hasLocation: !!wall.toFarm.location
        });
      }
      
      return wall;
    }
  } else {
    console.log('❌ Failed to get walls:', result.error);
  }
  
  return null;
}

async function testWallHealthValues() {
  console.log('\n🧮 Testing wall health values...\n');
  
  const result = await apiRequest('GET', '/walls');
  
  if (result.success) {
    const walls = result.data.data || result.data;
    
    let healthStats = {
      total: walls.length,
      withHealth: 0,
      nullHealth: 0,
      validHealth: 0,
      invalidHealth: 0,
      healthValues: []
    };
    
    walls.forEach(wall => {
      if (wall.health !== null && wall.health !== undefined) {
        healthStats.withHealth++;
        if (typeof wall.health === 'number' && wall.health >= 0 && wall.health <= 100) {
          healthStats.validHealth++;
        } else {
          healthStats.invalidHealth++;
        }
        healthStats.healthValues.push(wall.health);
      } else {
        healthStats.nullHealth++;
      }
    });
    
    console.log('📈 Health Statistics:');
    console.log(`  Total walls: ${healthStats.total}`);
    console.log(`  With health values: ${healthStats.withHealth}`);
    console.log(`  Null/undefined health: ${healthStats.nullHealth}`);
    console.log(`  Valid health (0-100): ${healthStats.validHealth}`);
    console.log(`  Invalid health: ${healthStats.invalidHealth}`);
    console.log(`  Health values: [${healthStats.healthValues.join(', ')}]`);
    
    return healthStats;
  }
  
  return null;
}

async function main() {
  console.log('🔬 Wall Damage System Diagnostic Test');
  console.log('=' .repeat(50));
  
  // Test 1: Check wall data structure
  const sampleWall = await testWallDataStructure();
  
  // Test 2: Analyze health values
  await testWallHealthValues();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Diagnostic complete!');
  console.log('\nNext steps:');
  console.log('1. Rebuild the backend with the fixes');
  console.log('2. Run the full test suite: node test-wall-health.js');
  console.log('3. Monitor logs for any remaining errors');
}

if (require.main === module) {
  main();
}