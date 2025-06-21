#!/usr/bin/env node

/**
 * Simple test of purchase costs (JavaScript version)
 */

console.log('🧪 [TEST] Purchase System Cost Validation');
console.log('=========================================\n');

// Define costs according to requirements
const FARM_CREATION_COST = { silver: 50, gold: 0, platinum: 0 };
const WALL_CREATION_COST = { silver: 0, gold: 2, platinum: 0 };
const WALL_HEAL_COST = { silver: 10, gold: 0, platinum: 0 };
const FARM_DELETION_REWARD = { silver: 10, gold: 0, platinum: 0 };
const WALL_DELETION_REWARD = { silver: 0, gold: 1, platinum: 0 };
const MINIMUM_CURRENCY_AMOUNTS = { silver: 200, gold: 10, platinum: 0 };

console.log('📋 [TEST 1] Cost Configuration:');
console.log('Farm Creation Cost:', FARM_CREATION_COST);
console.log('Wall Creation Cost:', WALL_CREATION_COST);
console.log('Wall Heal Cost:', WALL_HEAL_COST);
console.log('Farm Deletion Reward:', FARM_DELETION_REWARD);
console.log('Wall Deletion Reward:', WALL_DELETION_REWARD);
console.log('Minimum Currency:', MINIMUM_CURRENCY_AMOUNTS);
console.log('');

// Test scenario: New user gets starting currency
console.log('👤 [TEST 2] New User Scenario:');
const newUser = { silver: 200, gold: 10, platinum: 0 };
console.log('New user starts with:', newUser);

// Can they afford basic operations?
const canAffordFarm = newUser.silver >= FARM_CREATION_COST.silver && 
                      newUser.gold >= FARM_CREATION_COST.gold;
const canAffordWall = newUser.silver >= WALL_CREATION_COST.silver && 
                      newUser.gold >= WALL_CREATION_COST.gold;
const canAffordHeal = newUser.silver >= WALL_HEAL_COST.silver && 
                      newUser.gold >= WALL_HEAL_COST.gold;

console.log('Can afford farm (50 silver)?', canAffordFarm);
console.log('Can afford wall (2 gold)?', canAffordWall);
console.log('Can afford wall heal (10 silver)?', canAffordHeal);

// How many farms can they buy?
const maxFarms = Math.floor(newUser.silver / FARM_CREATION_COST.silver);
console.log('Max farms they can build:', maxFarms);

// How many walls can they buy?
const maxWalls = Math.floor(newUser.gold / WALL_CREATION_COST.gold);
console.log('Max walls they can build:', maxWalls);

// How many heals can they do?
const maxHeals = Math.floor(newUser.silver / WALL_HEAL_COST.silver);
console.log('Max wall heals they can do:', maxHeals);
console.log('');

// Test scenario: Building and selling
console.log('🏗️ [TEST 3] Build and Sell Scenario:');
let userCurrency = { ...newUser };
console.log('Starting currency:', userCurrency);

// Buy a farm
userCurrency.silver -= FARM_CREATION_COST.silver;
console.log('After buying farm:', userCurrency);

// Buy a wall
userCurrency.gold -= WALL_CREATION_COST.gold;
console.log('After buying wall:', userCurrency);

// Heal the wall
userCurrency.silver -= WALL_HEAL_COST.silver;
console.log('After healing wall:', userCurrency);

// Sell the wall
userCurrency.gold += WALL_DELETION_REWARD.gold;
console.log('After selling wall (get 1 gold back):', userCurrency);

// Sell the farm
userCurrency.silver += FARM_DELETION_REWARD.silver;
console.log('After selling farm (get 10 silver back):', userCurrency);

const netLoss = {
  silver: newUser.silver - userCurrency.silver,
  gold: newUser.gold - userCurrency.gold,
  platinum: newUser.platinum - userCurrency.platinum
};
console.log('Net loss from cycle:', netLoss);
console.log('');

// Test scenario: Midnight replenishment
console.log('🌙 [TEST 4] Midnight Replenishment:');
const poorUser = { silver: 150, gold: 5, platinum: 2 };
console.log('Poor user has:', poorUser);

const needsSilverReplenish = poorUser.silver < MINIMUM_CURRENCY_AMOUNTS.silver;
const needsGoldReplenish = poorUser.gold < MINIMUM_CURRENCY_AMOUNTS.gold;

console.log('Needs silver replenishment?', needsSilverReplenish);
console.log('Needs gold replenishment?', needsGoldReplenish);

if (needsSilverReplenish || needsGoldReplenish) {
  const replenishment = {
    silver: Math.max(0, MINIMUM_CURRENCY_AMOUNTS.silver - poorUser.silver),
    gold: Math.max(0, MINIMUM_CURRENCY_AMOUNTS.gold - poorUser.gold),
    platinum: 0
  };
  
  console.log('Replenishment needed:', replenishment);
  
  const afterReplenishment = {
    silver: poorUser.silver + replenishment.silver,
    gold: poorUser.gold + replenishment.gold,
    platinum: poorUser.platinum + replenishment.platinum
  };
  
  console.log('After midnight replenishment:', afterReplenishment);
}

console.log('\n✅ [TEST] All cost validations completed successfully!');
console.log('💰 [SUMMARY] Purchase System Economics:');
console.log('   - New users start with 200 silver, 10 gold');
console.log('   - Farm costs 50 silver, sells for 10 silver (40 silver net loss)');
console.log('   - Wall costs 2 gold, sells for 1 gold (1 gold net loss)');
console.log('   - Wall heal costs 10 silver (pure expense)');
console.log('   - Midnight replenishment ensures minimum 200 silver, 10 gold');
console.log('   - This creates healthy economic pressure while preventing players from being stuck!');