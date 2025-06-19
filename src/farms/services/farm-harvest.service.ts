import { Injectable } from '@nestjs/common';
import { Farm } from '../domain/farm';
import { getHarvestRate } from '../config/harvest-rates.config';

export interface HarvestResult {
  silverEarned: number;
  goldEarned: number;
  platinumEarned: number;
  totalMinutes: number;
  lastHarvestAt: Date;
}

@Injectable()
export class FarmHarvestService {
  /**
   * Calculate harvestable currency from a farm based on time since last harvest
   * Uses configurable harvest rates per level from harvest-rates.config.ts
   * @param farm The farm to calculate harvest for
   * @returns HarvestResult with currency amounts and updated harvest time
   */
  calculateHarvest(farm: Farm): HarvestResult {
    const now = new Date();
    const lastHarvest = farm.lastHarvestAt || farm.createdAt;
    
    // Calculate time difference in milliseconds
    const timeDifference = now.getTime() - lastHarvest.getTime();
    
    // Convert to minutes
    const totalMinutes = Math.floor(timeDifference / (1000 * 60));
    
    // Calculate harvest cycles (5 minutes per cycle)
    const harvestCycles = Math.floor(totalMinutes / 5);
    
    // Calculate currency based on farm level using config
    const harvestRate = getHarvestRate(farm.level);
    
    const silverEarned = harvestCycles * harvestRate.silver;
    const goldEarned = harvestCycles * harvestRate.gold;
    const platinumEarned = harvestCycles * harvestRate.platinum;
    
    return {
      silverEarned,
      goldEarned,
      platinumEarned,
      totalMinutes,
      lastHarvestAt: now,
    };
  }


  /**
   * Check if a farm can be harvested (has earned at least some currency)
   * @param farm The farm to check
   * @returns True if farm can be harvested
   */
  canHarvest(farm: Farm): boolean {
    const result = this.calculateHarvest(farm);
    return result.silverEarned > 0 || result.goldEarned > 0 || result.platinumEarned > 0;
  }

  /**
   * Get time until next harvest is available
   * @param farm The farm to check
   * @returns Minutes until next harvest, or 0 if ready
   */
  getTimeUntilNextHarvest(farm: Farm): number {
    const now = new Date();
    const lastHarvest = farm.lastHarvestAt || farm.createdAt;
    
    // Calculate time since last harvest in minutes
    const timeSinceHarvest = Math.floor((now.getTime() - lastHarvest.getTime()) / (1000 * 60));
    
    // Time until next 5-minute cycle completes
    const timeUntilNext = 5 - (timeSinceHarvest % 5);
    
    return timeUntilNext === 5 ? 0 : timeUntilNext;
  }
}