import { Injectable } from '@nestjs/common';
import { Farm } from '../domain/farm';
import { Wall } from '../../walls/domain/wall';

@Injectable()
export class FarmLevelService {
  /**
   * Calculate the appropriate level for a farm based on its connections
   * Level 1: Basic farm
   * Level 2: Village (farm is part of a closed loop of 3+ farms)
   * Level 3: Town (farm is part of 2 different villages)
   * Level 4: City (farm is part of 4+ different villages)
   */
  calculateFarmLevel(farm: Farm, allWalls: Wall[]): number {
    // Get all walls connected to this farm
    const connectedWalls = allWalls.filter(wall => 
      wall.fromFarm.id === farm.id || wall.toFarm.id === farm.id
    );

    if (connectedWalls.length === 0) {
      return 1; // No connections, basic farm
    }

    // Find all villages (closed loops) that this farm participates in
    const villages = this.findVillagesForFarm(farm, allWalls);
    
    if (villages.length === 0) {
      return 1; // Not part of any closed loops
    }

    if (villages.length === 1) {
      return 2; // Part of one village
    }

    if (villages.length === 2) {
      return 3; // Part of two villages (town)
    }

    return 4; // Part of 3+ villages (city)
  }

  /**
   * Find all villages (closed loops) that a specific farm participates in
   */
  private findVillagesForFarm(targetFarm: Farm, allWalls: Wall[]): Farm[][] {
    const villages: Farm[][] = [];
    const visited = new Set<string>();

    // For each wall connected to our target farm, try to find loops
    const connectedWalls = allWalls.filter(wall => 
      String(wall.fromFarm.id) === String(targetFarm.id) || String(wall.toFarm.id) === String(targetFarm.id)
    );

    for (const startWall of connectedWalls) {
      const otherFarm = String(startWall.fromFarm.id) === String(targetFarm.id) 
        ? startWall.toFarm 
        : startWall.fromFarm;

      // Try to find a path back to our target farm
      const path = this.findPathBackToFarm(otherFarm, targetFarm, allWalls, [targetFarm]);
      
      if (path && path.length >= 3) { // Minimum village size is 3 farms
        const villageKey = this.getVillageKey(path);
        if (!visited.has(villageKey)) {
          villages.push([...path]);
          visited.add(villageKey);
        }
      }
    }

    return villages;
  }

  /**
   * Find a path from start farm back to target farm
   */
  private findPathBackToFarm(
    currentFarm: Farm, 
    targetFarm: Farm, 
    allWalls: Wall[], 
    currentPath: Farm[]
  ): Farm[] | null {
    // Prevent infinite loops
    if (currentPath.length > 6) return null;

    // Check if we can get back to target farm directly
    const directConnection = allWalls.find(wall => 
      (String(wall.fromFarm.id) === String(currentFarm.id) && String(wall.toFarm.id) === String(targetFarm.id)) ||
      (String(wall.toFarm.id) === String(currentFarm.id) && String(wall.fromFarm.id) === String(targetFarm.id))
    );

    if (directConnection) {
      return [...currentPath, currentFarm];
    }

    // Try to continue the path through other farms
    const connectedWalls = allWalls.filter(wall => 
      (String(wall.fromFarm.id) === String(currentFarm.id) || String(wall.toFarm.id) === String(currentFarm.id)) &&
      !currentPath.some(farm => 
        String(farm.id) === String(wall.fromFarm.id) || String(farm.id) === String(wall.toFarm.id)
      )
    );

    for (const wall of connectedWalls) {
      const nextFarm = String(wall.fromFarm.id) === String(currentFarm.id) 
        ? wall.toFarm 
        : wall.fromFarm;

      const result = this.findPathBackToFarm(
        nextFarm, 
        targetFarm, 
        allWalls, 
        [...currentPath, currentFarm]
      );

      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * Generate a unique key for a village (sorted farm IDs)
   */
  private getVillageKey(farms: Farm[]): string {
    return farms
      .map(farm => String(farm.id))
      .sort()
      .join(',');
  }

  /**
   * Recalculate levels for all affected farms when walls change
   */
  async recalculateFarmLevels(
    affectedFarmIds: string[], 
    allFarms: Farm[], 
    allWalls: Wall[]
  ): Promise<Map<string, number>> {
    const newLevels = new Map<string, number>();

    for (const farmId of affectedFarmIds) {
      const farm = allFarms.find(f => String(f.id) === String(farmId));
      if (farm) {
        const newLevel = this.calculateFarmLevel(farm, allWalls);
        newLevels.set(String(farmId), newLevel);
      }
    }

    return newLevels;
  }

  /**
   * Get all farms that might be affected by a wall change
   * This includes the direct farms and their neighbors up to 2 degrees
   */
  getAffectedFarms(directFarmIds: string[], allWalls: Wall[]): string[] {
    const affected = new Set<string>(directFarmIds);

    // Add immediate neighbors
    for (const farmId of directFarmIds) {
      const neighborWalls = allWalls.filter(wall => 
        String(wall.fromFarm.id) === String(farmId) || String(wall.toFarm.id) === String(farmId)
      );

      for (const wall of neighborWalls) {
        affected.add(String(wall.fromFarm.id));
        affected.add(String(wall.toFarm.id));
      }
    }

    // Add second-degree neighbors (neighbors of neighbors)
    const firstDegree = Array.from(affected);
    for (const farmId of firstDegree) {
      const neighborWalls = allWalls.filter(wall => 
        String(wall.fromFarm.id) === String(farmId) || String(wall.toFarm.id) === String(farmId)
      );

      for (const wall of neighborWalls) {
        affected.add(String(wall.fromFarm.id));
        affected.add(String(wall.toFarm.id));
      }
    }

    return Array.from(affected);
  }
}