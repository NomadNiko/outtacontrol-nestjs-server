export interface PurchaseCost {
  silver: number;
  gold: number;
  platinum: number;
}

export interface PurchaseReward {
  silver: number;
  gold: number;
  platinum: number;
}

/**
 * Purchase costs for creating farms
 * All farms cost 50 silver to build
 */
export const FARM_CREATION_COST: PurchaseCost = {
  silver: 50,
  gold: 0,
  platinum: 0,
};

/**
 * Purchase costs for creating walls
 * All walls cost 2 gold to build
 */
export const WALL_CREATION_COST: PurchaseCost = {
  silver: 0,
  gold: 2,
  platinum: 0,
};

/**
 * Cost for healing a wall
 * Wall healing costs 10 silver
 */
export const WALL_HEAL_COST: PurchaseCost = {
  silver: 10,
  gold: 0,
  platinum: 0,
};

/**
 * Rewards for deleting items
 */
export const FARM_DELETION_REWARD: PurchaseReward = {
  silver: 10,
  gold: 0,
  platinum: 0,
};

export const WALL_DELETION_REWARD: PurchaseReward = {
  silver: 0,
  gold: 1,
  platinum: 0,
};

/**
 * Minimum currency amounts for midnight replenishment
 */
export const MINIMUM_CURRENCY_AMOUNTS = {
  silver: 200,
  gold: 10,
  platinum: 0, // No minimum for platinum
};

/**
 * Add two currency amounts together
 */
export function addCurrency(
  base: { silver: number; gold: number; platinum: number },
  addition: { silver: number; gold: number; platinum: number },
): { silver: number; gold: number; platinum: number } {
  return {
    silver: (base.silver || 0) + (addition.silver || 0),
    gold: (base.gold || 0) + (addition.gold || 0),
    platinum: (base.platinum || 0) + (addition.platinum || 0),
  };
}

/**
 * Subtract currency amounts (for purchase validation)
 */
export function subtractCurrency(
  base: { silver: number; gold: number; platinum: number },
  cost: { silver: number; gold: number; platinum: number },
): { silver: number; gold: number; platinum: number } {
  return {
    silver: (base.silver || 0) - (cost.silver || 0),
    gold: (base.gold || 0) - (cost.gold || 0),
    platinum: (base.platinum || 0) - (cost.platinum || 0),
  };
}

/**
 * Check if user has sufficient funds for a purchase
 */
export function hasSufficientFunds(
  userCurrency: { silver: number; gold: number; platinum: number },
  cost: { silver: number; gold: number; platinum: number },
): boolean {
  return (
    (userCurrency.silver || 0) >= (cost.silver || 0) &&
    (userCurrency.gold || 0) >= (cost.gold || 0) &&
    (userCurrency.platinum || 0) >= (cost.platinum || 0)
  );
}

/**
 * Check if user needs midnight replenishment
 */
export function needsReplenishment(userCurrency: {
  silver: number;
  gold: number;
  platinum: number;
}): boolean {
  return (
    (userCurrency.silver || 0) < MINIMUM_CURRENCY_AMOUNTS.silver ||
    (userCurrency.gold || 0) < MINIMUM_CURRENCY_AMOUNTS.gold
  );
}

/**
 * Calculate replenishment amount needed
 */
export function calculateReplenishment(userCurrency: {
  silver: number;
  gold: number;
  platinum: number;
}): PurchaseReward {
  return {
    silver: Math.max(
      0,
      MINIMUM_CURRENCY_AMOUNTS.silver - (userCurrency.silver || 0),
    ),
    gold: Math.max(0, MINIMUM_CURRENCY_AMOUNTS.gold - (userCurrency.gold || 0)),
    platinum: 0, // No platinum replenishment
  };
}
