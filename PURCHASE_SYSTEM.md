# Purchase System Implementation

## Overview

A comprehensive purchase system has been implemented for the farming simulation game. This system manages in-game currency (silver, gold, platinum) and controls costs for creating/deleting farms and walls, as well as wall healing operations.

## Features Implemented

### 💰 Currency System
- **Silver**: Primary currency for farms and wall healing
- **Gold**: Currency for walls and higher-tier operations  
- **Platinum**: Premium currency (for future features)

### 🏗️ Purchase Costs
- **Farm Creation**: 50 silver
- **Wall Creation**: 2 gold
- **Wall Healing**: 10 silver

### 💎 Deletion Rewards
- **Farm Deletion**: 10 silver (20% of creation cost)
- **Wall Deletion**: 1 gold (50% of creation cost)

### 🌙 Midnight Replenishment
- Every night at midnight (00:00), users with less than minimum amounts are replenished
- **Minimum Silver**: 200
- **Minimum Gold**: 10
- **Platinum**: No minimum (premium currency)

### 👤 New User Defaults
- **Starting Silver**: 200
- **Starting Gold**: 10
- **Starting Platinum**: 0

## Technical Implementation

### Core Components

#### 1. Purchase Configuration (`src/purchases/config/purchase-costs.config.ts`)
Contains all cost definitions and utility functions:
- Cost constants for all operations
- Currency manipulation functions (add, subtract, validate)
- Replenishment logic
- Fund validation

#### 2. Purchase Service (`src/purchases/purchases.service.ts`)
Main service handling:
- Currency deduction with validation
- Reward distribution
- Midnight currency replenishment
- User-friendly error messages for insufficient funds

#### 3. Midnight Reward Service (`src/purchases/services/midnight-reward.service.ts`)
Scheduled service that:
- Runs daily at midnight using NestJS Schedule
- Checks all active users for currency below minimum thresholds
- Automatically replenishes currency to minimum amounts
- Provides manual trigger for testing

#### 4. Integration with Existing Services
- **Farms Service**: Integrated purchase/reward logic for farm creation/deletion
- **Walls Service**: Integrated purchase/reward logic for wall creation/deletion/healing
- **User Creation**: New users automatically start with correct currency amounts

### Database Integration

#### User Currency Fields
The existing user model already includes:
```typescript
platinum: number;  // Premium currency
gold: number;      // Secondary currency  
silver: number;    // Primary currency
```

#### Migration Script
Created migration script (`src/database/migrations/add-minimum-currency-to-existing-users.js`) to:
- Set existing users to minimum currency amounts
- Works with both MongoDB and PostgreSQL
- Can be run manually: `node src/database/migrations/add-minimum-currency-to-existing-users.js`

### API Integration

All existing endpoints now return updated currency information:

#### Farm Creation Response
```json
{
  "farm": { ... },
  "cost": { "silver": 50, "gold": 0, "platinum": 0 },
  "userCurrency": { "platinum": 0, "gold": 10, "silver": 150 }
}
```

#### Wall Creation Response  
```json
{
  "wall": { ... },
  "loopFormed": { ... },
  "cost": { "silver": 0, "gold": 2, "platinum": 0 },
  "userCurrency": { "platinum": 0, "gold": 8, "silver": 200 }
}
```

#### Deletion Responses
```json
{
  "success": true,
  "reward": { "silver": 10, "gold": 0, "platinum": 0 },
  "userCurrency": { "platinum": 0, "gold": 10, "silver": 210 }
}
```

### Error Handling

The system provides user-friendly error messages:
- **Insufficient Funds**: "Insufficient funds. Required: 50 silver. Available: 25 silver."
- **Invalid Operations**: Clear messages about what went wrong
- **No Hard Crashes**: All purchase failures are graceful with proper error responses

## Game Economics

### Starting Economy
New players receive enough currency to:
- Build 4 farms (4 × 50 = 200 silver)
- Build 5 walls (5 × 2 = 10 gold)  
- Perform 20 wall heals (20 × 10 = 200 silver)

### Economic Pressure
- **Farm Cycle**: 50 silver cost → 10 silver reward = 40 silver net loss
- **Wall Cycle**: 2 gold cost → 1 gold reward = 1 gold net loss
- **Wall Healing**: 10 silver pure expense
- Creates meaningful resource management without preventing gameplay

### Midnight Safety Net
- Players can never be completely stuck
- Automatic replenishment ensures minimum viable currency
- Encourages daily engagement

## Testing

### Validation Script
Created comprehensive test script (`test-costs.js`) that validates:
- All cost configurations match requirements
- Currency operations work correctly
- Replenishment logic functions properly
- Economic balance is maintained

### Test Results
```
✅ New users can afford basic operations
✅ Economic pressure exists but isn't punitive  
✅ Midnight replenishment prevents players from getting stuck
✅ Net costs create meaningful resource management
```

## Configuration

All costs are centrally configured and easily adjustable:

```typescript
// Easy to modify for game balance
export const FARM_CREATION_COST = { silver: 50, gold: 0, platinum: 0 };
export const WALL_CREATION_COST = { silver: 0, gold: 2, platinum: 0 };
export const WALL_HEAL_COST = { silver: 10, gold: 0, platinum: 0 };
```

## Mobile App Integration

The mobile app will automatically receive:
- Real-time currency updates after purchases
- Updated user currency in all API responses
- Proper error handling for insufficient funds
- No code changes needed on mobile side - API contract maintained

## Future Enhancements

The system is designed to easily support:
- **Premium Features**: Platinum currency usage
- **Dynamic Pricing**: Market-based costs
- **Special Events**: Temporary cost modifications
- **Achievement Rewards**: Bonus currency distribution
- **In-App Purchases**: Real money to platinum conversion

## Deployment

### Prerequisites
1. Ensure NestJS Schedule module is installed (already done)
2. Run database migration for existing users
3. Restart backend service

### Migration Command
```bash
# Set existing users to minimum currency
node src/database/migrations/add-minimum-currency-to-existing-users.js
```

### Verification
```bash
# Test the purchase system
node test-costs.js
```

## Summary

The purchase system is now fully integrated and provides:
- ✅ Correct costs as specified (50 silver for farms, 2 gold for walls, 10 silver for healing)
- ✅ Appropriate rewards for deletions (10 silver for farms, 1 gold for walls)  
- ✅ New users start with 200 silver and 10 gold
- ✅ Midnight replenishment to minimum amounts
- ✅ User-friendly error handling
- ✅ Real-time currency updates
- ✅ Economic balance that creates pressure without blocking progression

The system is ready for immediate use and will enhance the gaming experience by adding meaningful resource management!