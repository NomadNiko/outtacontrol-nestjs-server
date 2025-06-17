import { Injectable } from '@nestjs/common';
import { Farm } from '../domain/farm';

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
   * Level 1 farms generate 1 silver per 5 minutes
   * Level 2 farms (villages) generate 5 silver + 1 gold per 5 minutes
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
    
    // Calculate currency based on farm level
    const silverPerCycle = this.getSilverPerCycle(farm.level);
    const goldPerCycle = this.getGoldPerCycle(farm.level);
    const platinumPerCycle = this.getPlatinumPerCycle(farm.level);
    
    const silverEarned = harvestCycles * silverPerCycle;
    const goldEarned = harvestCycles * goldPerCycle;
    const platinumEarned = harvestCycles * platinumPerCycle;
    
    return {
      silverEarned,
      goldEarned,
      platinumEarned,
      totalMinutes,
      lastHarvestAt: now,
    };
  }

  /**
   * Get silver earned per harvest cycle based on farm level
   * @param level Farm level
   * @returns Silver amount per 5-minute cycle
   */
  private getSilverPerCycle(level: number): number {
    switch (level) {
      case 1:
        return 1; // Level 1: 1 silver per 5-minute cycle
      case 2:
        return 5; // Level 2 (village): 5 silver per 5-minute cycle
      default:
        return 1;
    }
  }

  /**
   * Get gold earned per harvest cycle based on farm level
   * @param level Farm level
   * @returns Gold amount per 5-minute cycle
   */
  private getGoldPerCycle(level: number): number {
    switch (level) {
      case 1:
        return 0; // Level 1: No gold
      case 2:
        return 1; // Level 2 (village): 1 gold per 5-minute cycle
      default:
        return 0;
    }
  }

  /**
   * Get platinum earned per harvest cycle based on farm level
   * @param level Farm level
   * @returns Platinum amount per 5-minute cycle
   */
  private getPlatinumPerCycle(level: number): number {
    switch (level) {
      case 1:
      case 2:
        return 0; // No platinum for levels 1-2
      default:
        return 0;
    }
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