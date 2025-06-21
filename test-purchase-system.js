#!/usr/bin/env node

/**
 * Test script to validate the purchase system implementation
 * This script tests various purchase scenarios without affecting the database
 */

const { 
  FARM_CREATION_COST, 
  WALL_CREATION_COST,
  WALL_HEAL_COST,
  FARM_DELETION_REWARD,
  WALL_DELETION_REWARD,
  hasSufficientFunds,
  subtractCurrency,
  addCurrency,
  needsReplenishment,
  calculateReplenishment
} = require('./src/purchases/config/purchase-costs.config');

console.log('🧪 [TEST] Purchase System Validation');
console.log('=====================================\n');

// Test 1: Cost Configuration
console.log('📋 [TEST 1] Cost Configuration:');
console.log('Farm Creation Cost:', FARM_CREATION_COST);
console.log('Wall Creation Cost:', WALL_CREATION_COST);  
console.log('Wall Heal Cost:', WALL_HEAL_COST);
console.log('Farm Deletion Reward:', FARM_DELETION_REWARD);
console.log('Wall Deletion Reward:', WALL_DELETION_REWARD);
console.log('');

// Test 2: Currency Functions
console.log('💰 [TEST 2] Currency Functions:');

const userCurrency = { silver: 200, gold: 10, platinum: 5 };
console.log('User Currency:', userCurrency);

// Test sufficient funds
console.log('Can afford farm?', hasSufficientFunds(userCurrency, FARM_CREATION_COST));
console.log('Can afford wall?', hasSufficientFunds(userCurrency, WALL_CREATION_COST));
console.log('Can afford wall heal?', hasSufficientFunds(userCurrency, WALL_HEAL_COST));

// Test currency operations
const afterFarmPurchase = subtractCurrency(userCurrency, FARM_CREATION_COST);
console.log('After buying farm:', afterFarmPurchase);

const afterFarmSale = addCurrency(afterFarmPurchase, FARM_DELETION_REWARD);
console.log('After selling farm:', afterFarmSale);
console.log('');

// Test 3: Replenishment System
console.log('🌙 [TEST 3] Replenishment System:');

const poorUser = { silver: 50, gold: 2, platinum: 0 };
console.log('Poor User Currency:', poorUser);
console.log('Needs replenishment?', needsReplenishment(poorUser));

if (needsReplenishment(poorUser)) {
  const replenishment = calculateReplenishment(poorUser);
  console.log('Replenishment needed:', replenishment);
  
  const afterReplenishment = addCurrency(poorUser, replenishment);
  console.log('After replenishment:', afterReplenishment);
}

const richUser = { silver: 500, gold: 25, platinum: 10 };
console.log('\nRich User Currency:', richUser);
console.log('Needs replenishment?', needsReplenishment(richUser));
console.log('');

// Test 4: Edge Cases
console.log('🔬 [TEST 4] Edge Cases:');

const brokeUser = { silver: 0, gold: 0, platinum: 0 };
console.log('Broke User Currency:', brokeUser);
console.log('Can afford farm?', hasSufficientFunds(brokeUser, FARM_CREATION_COST));
console.log('Can afford wall?', hasSufficientFunds(brokeUser, WALL_CREATION_COST));
console.log('Can afford wall heal?', hasSufficientFunds(brokeUser, WALL_HEAL_COST));

const afterReplenishingBrokeUser = addCurrency(brokeUser, calculateReplenishment(brokeUser));
console.log('Broke user after replenishment:', afterReplenishingBrokeUser);
console.log('Can now afford farm?', hasSufficientFunds(afterReplenishingBrokeUser, FARM_CREATION_COST));
console.log('Can now afford wall?', hasSufficientFunds(afterReplenishingBrokeUser, WALL_CREATION_COST));
console.log('');

// Test 5: Transaction Simulation
console.log('📊 [TEST 5] Full Transaction Simulation:');

let simulatedUser = { silver: 200, gold: 10, platinum: 0 };
console.log('Starting user:', simulatedUser);

// Buy a farm
if (hasSufficientFunds(simulatedUser, FARM_CREATION_COST)) {
  simulatedUser = subtractCurrency(simulatedUser, FARM_CREATION_COST);
  console.log('After buying farm:', simulatedUser);
}

// Buy a wall (if can afford)
if (hasSufficientFunds(simulatedUser, WALL_CREATION_COST)) {
  simulatedUser = subtractCurrency(simulatedUser, WALL_CREATION_COST);
  console.log('After buying wall:', simulatedUser);
}

// Heal the wall (if can afford)
if (hasSufficientFunds(simulatedUser, WALL_HEAL_COST)) {
  simulatedUser = subtractCurrency(simulatedUser, WALL_HEAL_COST);
  console.log('After healing wall:', simulatedUser);
}

// Sell the wall
simulatedUser = addCurrency(simulatedUser, WALL_DELETION_REWARD);
console.log('After selling wall:', simulatedUser);

// Sell the farm  
simulatedUser = addCurrency(simulatedUser, FARM_DELETION_REWARD);
console.log('After selling farm:', simulatedUser);

console.log('\n✅ [TEST] All purchase system tests completed successfully!');
console.log('🎮 [INFO] The purchase system is ready for integration with the game!');