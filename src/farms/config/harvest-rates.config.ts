export interface HarvestRate {
  silver: number;
  gold: number;
  platinum: number;
}

/**
 * Harvest rates per 5-minute cycle for each farm level
 * 
 * Level 1: 1 silver every 5 minutes
 * Level 2: 5 silver and 1 gold every 5 minutes
 * Level 3: 25 silver and 5 gold every 5 minutes
 * Level 4: 100 silver and 20 gold every 5 minutes
 * Level 5: 200 silver, 40 gold and 1 platinum every 5 minutes
 * Level 6: 400 silver, 100 gold, 5 platinum every 5 minutes
 */
export const HARVEST_RATES: Record<number, HarvestRate> = {
  1: { silver: 1, gold: 0, platinum: 0 },
  2: { silver: 5, gold: 1, platinum: 0 },
  3: { silver: 25, gold: 5, platinum: 0 },
  4: { silver: 100, gold: 20, platinum: 0 },
  5: { silver: 200, gold: 40, platinum: 1 },
  6: { silver: 400, gold: 100, platinum: 5 },
};

// Default rate for any level above 6
export const DEFAULT_HARVEST_RATE: HarvestRate = HARVEST_RATES[6];

export function getHarvestRate(level: number): HarvestRate {
  return HARVEST_RATES[level] || DEFAULT_HARVEST_RATE;
}